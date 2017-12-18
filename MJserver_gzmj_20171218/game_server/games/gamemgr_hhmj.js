// 晃晃麻将
var roomMgr = require("../roommgr");
var userMgr = require("../usermgr");
var mjutils = require('./laizimjutils');
var db = require("../../utils/dbsync");
var crypto = require("../../utils/crypto");
var comdef = require('../../utils/common');

var games = {};
var gamesIdBase = 0;

var ACTION_CHUPAI = 1;
var ACTION_MOPAI = 2;
var ACTION_PENG = 3;
var ACTION_GANG = 4;
var ACTION_HU = 5;
var ACTION_ZIMO = 6;
var ACTION_BUHUA = 7;

var gameSeatsOfUsers = {};

function getMJType(id){
    if(id >= 0 && id < 9){
        //筒
        return 0;
    }
    else if(id >= 9 && id < 18){
        //条
        return 1;
    }
    else if(id >= 18 && id < 27){
        //万
        return 2;
    }
}

function shuffle(game) {
    
    var mahjongs = game.mahjongs;
    
    //筒 (0 ~ 8 表示筒子
    var index = 0;
    for(var i = 0; i < 9; ++i){
        for(var c = 0; c < 4; ++c){
            mahjongs[index] = i;
            index++;
        }
    }

    //条 9 ~ 17表示条子
    for(var i = 9; i < 18; ++i){
        for(var c = 0; c < 4; ++c){
            mahjongs[index] = i;
            index++;
        }
    }

    //万
    //条 18 ~ 26表示万
    for(var i = 18; i < 27; ++i){
        for(var c = 0; c < 4; ++c){
            mahjongs[index] = i;
            index++;
        }
    }
    
    //4个红中
    for(var c = 0; c < 4; ++c){
        mahjongs[index] = 31;
        index++;
    }

    for(var i = 0; i < mahjongs.length; ++i){
        var lastIndex = mahjongs.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = mahjongs[index];
        mahjongs[index] = mahjongs[lastIndex];
        mahjongs[lastIndex] = t;
    }

    //在筒条万牌里翻出一张作为搬子
    var banzi = Math.floor(Math.random()*27);
    game.banzi = banzi;
    index = mahjongs.indexOf(banzi);
    mahjongs.splice(index, 1);

    //搬子牌加一作为百搭牌
    var jing = banzi + 1;
    if(banzi >= 0 && banzi < 9) {
        jing = (jing % 9);
    }
    else if(banzi >= 9 && banzi < 18) {
        jing = ((jing - 9) % 9) + 9;
    }
    else if(banzi >= 18 && banzi < 27) {
        jing = ((jing - 18) % 9) + 18;
    }

    game.jings = [jing];
    game.jingMap[jing] = true;
}

function mopai(game,seatIndex) {
    if(game.currentIndex == game.mahjongs.length){
        return -1;
    }
    var data = game.gameSeats[seatIndex];
    var mahjongs = data.holds;
    var pai = game.mahjongs[game.currentIndex];
    mahjongs.push(pai);

    //统计牌的数目 ，用于快速判定（空间换时间）
    var c = data.countMap[pai];
    if(c == null) {
        c = 0;
    }
    data.countMap[pai] = c + 1;
    game.currentIndex ++;
    return pai;
}

function isHua(game,pai){
    //如果是红中，则要补花
    if(pai == 31){
        return true;
    }
    return false;
}

function buhua(game,seatData,pai){
    //移除花牌
    var index = seatData.holds.indexOf(pai);
    seatData.holds.splice(index,1);
    seatData.countMap[pai]--;
    //把花记录下来
    if(!seatData.huaMap[pai]){
        seatData.huaMap[pai] = 1;
    }
    else{
        seatData.huaMap[pai] ++;
    }
}

function deal(game){
    //强制清0
    game.currentIndex = 0;

    //每人13张 一共 13*4 ＝ 52张 庄家多一张 53张
    var seatIndex = game.button;
    while(true){
        var sd = game.gameSeats[seatIndex];
        if(sd.holds == null){
            sd.holds = [];
        }
        mopai(game,seatIndex);
        seatIndex ++;
        seatIndex %= game.gameSeats.length;
        if(sd.holds.length == 14){
            break;
        }
    }
    //当前轮设置为庄家
    game.turn = game.button;
}

//检查是否可以碰
function checkCanPeng(game,seatData,targetPai) {
    if(getMJType(targetPai) == seatData.que){
        return;
    }
    var count = seatData.countMap[targetPai];
    if(count != null && count >= 2){
        seatData.canPeng = true;
    }
}

//检查是否可以点杠
function checkCanDianGang(game,seatData,targetPai){
    //检查玩家手上的牌
    //如果没有牌了，则不能再杠
    if(game.mahjongs.length <= game.currentIndex){
        return;
    }
    if(getMJType(targetPai) == seatData.que){
        return;
    }
    var count = seatData.countMap[targetPai];
    if(count != null && count >= 3){
        seatData.canGang = true;
        seatData.gangPai.push(targetPai);
        return;
    }
}

//检查是否可以暗杠
function checkCanAnGang(game,seatData){
    //如果没有牌了，则不能再杠
    if(game.mahjongs.length <= game.currentIndex){
        return;
    }
    
    for(var key in seatData.countMap){
        var pai = parseInt(key);
        if(game.jingMap[pai]){
            continue;
        }
        if(getMJType(pai) != seatData.que){
            var c = seatData.countMap[key];
            if(c != null && c == 4){
                seatData.canGang = true;
                seatData.gangPai.push(pai);
            }
        }
    }
}

//检查是否可以弯杠(自己摸起来的时候)
function checkCanWanGang(game,seatData){
    //如果没有牌了，则不能再杠
    if(game.mahjongs.length <= game.currentIndex){
        return;
    }
    
    //安徽麻将不允许过手杠 所以只检查最后一张牌
    var pai = seatData.holds[seatData.holds.length - 1];
    if(seatData.pengs.indexOf(pai) != -1){
        seatData.canGang = true;
        seatData.gangPai.push(pai);        
    }
    
    /*
    for(var i = 0; i < seatData.pengs.length; ++i){
        var pai = seatData.pengs[i];
        if(seatData.countMap[pai] == 1){
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }
    }
    */
}

function checkCanHu(game,seatData,targetPai) {
    game.lastHuPaiSeat = -1;
    seatData.canHu = false;
    seatData.tingInfo = null;

    //如果手上有百搭牌时，不能点炮胡
    if(targetPai != null){
        for(var k in game.jings){
            var pai = game.jings[k];
            if(seatData.holds.indexOf(pai) != -1){
                return;
            }
        }
    }

    if(targetPai != null){
        seatData.holds.push(targetPai);
        if(seatData.countMap[targetPai]){
            seatData.countMap[targetPai]++;
        }
        else{
            seatData.countMap[targetPai] = 1;
        }
    }

    //如果手上4个百搭，则算自摸胡
    var pattern = null;
    if(targetPai == null){
        var jingCnt = 0;
        for(var k in game.jings){
            var pai = game.jings[k];
            var cnt = seatData.countMap[pai]; 
            if(cnt){
                jingCnt += cnt;
            }
        }
        if(jingCnt == 4){
            pattern = 'normal';
            seatData.sibaida = true;
        }
    }

    if(!pattern){
        pattern = mjutils.checkCanHu(game.jingMap,seatData);
    }

    if(pattern != null){
        seatData.canHu = true;
        seatData.tingInfo = {
            pattern:pattern,
            fan:0,
            pai:targetPai,   
        }
        if(pattern != "normal"){
            seatData.tingInfo.fan = 1;
        }
    }
    
    if(targetPai != null){
        seatData.holds.pop();
        seatData.countMap[targetPai]--;
    }
}

function clearAllOptions(game,seatData){
    var fnClear = function(sd){
        sd.canPeng = false;
        sd.canGang = false;
        sd.gangPai = [];
        sd.canHu = false;
        sd.lastFangGangSeat = -1;    
    }
    if(seatData){
        fnClear(seatData);
    }
    else{
        game.qiangGangContext = null;
        for(var i = 0; i < game.gameSeats.length; ++i){
            fnClear(game.gameSeats[i]);
        }
    }
}

function getSeatIndex(userId){
    var seatIndex = roomMgr.getUserSeat(userId);
    if(seatIndex == null){
        return null;
    }
    return seatIndex;
}

function getGameByUserID(userId){
    var roomId = roomMgr.getUserRoom(userId);
    if(roomId == null){
        return null;
    }
    var game = games[roomId];
    return game;
}

function hasOperations(seatData){
    if(seatData.canGang || seatData.canPeng || seatData.canHu){
        return true;
    }
    return false;
}

function sendOperations(game,seatData,pai) {
    if(hasOperations(seatData)){
        if(pai == -1){
            pai = seatData.holds[seatData.holds.length - 1]; //抢杠胡 这里 玩家重新 连接网络 会有问题 
        }
        
        var data = {
            pai:pai,
            hu:seatData.canHu,
            peng:seatData.canPeng,
            gang:seatData.canGang,
            gangpai:seatData.gangPai
        };

        //如果可以有操作，则进行操作
        userMgr.sendMsg(seatData.userId,'game_action_push',data);

        data.si = seatData.seatIndex;
    }
    else{
        userMgr.sendMsg(seatData.userId,'game_action_push');
    }
}

function moveToNextUser(game,nextSeat){
    //找到下一个没有和牌的玩家
    if(nextSeat == null){
        while(true){
            game.turn ++;
            game.turn %= game.gameSeats.length;
            var turnSeat = game.gameSeats[game.turn];
            if(turnSeat.hued == false){
                return;
            }
        }
    }
    else{
        game.turn = nextSeat;
    }
}

function doUserMoPai(game){
    game.chuPai = -1;
    var turnSeat = game.gameSeats[game.turn];
    turnSeat.lastFangGangSeat = -1;
    turnSeat.guoHuFan = -1;
    var pai = mopai(game,game.turn);

    //牌摸完了，结束
    if(pai == -1){
        doGameOver(game.roomInfo);
        return;
    }
    else{
        var numOfMJ = game.mahjongs.length - game.currentIndex;
        userMgr.broacastInRoom('mj_count_push',numOfMJ,turnSeat.userId,true);
    }

    //补花
    if(isHua(game,pai)){
        buhua(game,turnSeat,pai);
        recordGameAction(game,game.turn,ACTION_BUHUA,pai);
        userMgr.broacastInRoom('game_newhua_push',{si:turnSeat.seatIndex,pai:pai},turnSeat.userId,true);
        doUserMoPai(game);
        return;
    }

    recordGameAction(game,game.turn,ACTION_MOPAI,pai);

    //通知前端新摸的牌
    userMgr.sendMsg(turnSeat.userId,'game_mopai_push',pai);
    //检查是否可以暗杠或者胡
    //检查胡，直杠，弯杠
    checkCanAnGang(game,turnSeat);
    checkCanWanGang(game,turnSeat,pai);

    //检查看是否可以和
    checkCanHu(game,turnSeat);

    //广播通知玩家出牌方
    turnSeat.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push',turnSeat.userId,turnSeat.userId,true);

    //通知玩家做对应操作
    sendOperations(game,turnSeat,game.chuPai);
}

function computeFanScore(game,fan){
    if(fan > game.conf.maxFan){
        fan = game.conf.maxFan;
    }
    if(fan == 0){
        return 2;
    }
    return (1 << fan) * game.conf.baseScore * 6;
}

function check3BanZi(game,sd){
    var numBanzi = sd.countMap[game.banzi];
    if(numBanzi != 3){
        return false;
    }
    var oldHolds = sd.holds.concat();
    for(var i = 0; i < 3; ++i){
        var idx = sd.holds.indexOf(game.banzi);
        sd.holds.splice(idx,1);
    }
    sd.countMap[game.banzi] -= 3;

    var ret = mjutils.checkCanHu(game.jingMap,sd);
    //恢复
    sd.holds = oldHolds;
    sd.countMap[game.banzi] += 3;

    return ret != null;
}

function calculateResult(game,roomInfo){
    //找出胡牌的那家，然后统计胡牌的玩家应得的子
    var baseScore = game.conf.baseScore;
    
    for(var i = 0; i < game.gameSeats.length; ++i){
        var sd = game.gameSeats[i];
        
        //统计杠的数目
        sd.numAnGang = sd.angangs.length;
        sd.numMingGang = sd.wangangs.length + sd.diangangs.length;

        //统计红中的数量，多少个红中加多少分， 4个红中加6分。
        sd.numHongZhong = sd.huaMap[31];
        if(!sd.numHongZhong){
            sd.numHongZhong = 0;
        }
        sd.numChaJiao += sd.numHongZhong;
        
        //对所有胡牌的玩家进行统计
        if(sd.hued){
            var fan = sd.fan;
            var additonalscore = 0;

            //如果没有碰搬子，则检查三搬子
            if (!sd.isPengBanzi) {
                sd.sanBanzi = check3BanZi(game,sd);
            }

            for(var a = 0; a < sd.actions.length; ++a){
                var ac = sd.actions[a];
                if(ac.type == "zimo" || ac.type == "hu" || ac.type == "ganghua" || ac.type == "dianganghua" || ac.type == "gangpaohu" || ac.type == "qiangganghu"){
                    if(ac.iszimo){
                        sd.numZiMo ++;
                    }
                    else{
                        sd.numJiePao ++;
                    }

                    //成牌+2
                    var score = 2;
                    if(sd.numHongZhong){
                        //红中+1,4个红中+6
                        if(sd.numHongZhong == 4){
                            score += 6;
                        }
                        else{
                            score += sd.numHongZhong;
                        }
                    }

                    //每一个暗杠加2分
                    score += sd.numAnGang * 2;
                    //第一个明杠加1分
                    score += sd.numMingGang;

                    //碰搬子+1,三搬子+2
                    if(true == sd.isPengBanzi) {
                        score += 1;
                    }
                    else if(true == sd.sanBanzi) {
                        score += 2;
                    }

                    //杠开胡+1
                    if(ac.type == 'dianganghua' || ac.type == 'ganghua'){
                        //score += 1;
                    }

                    if(ac.iszimo){
                        //四百搭+2
                        if (true == sd.sibaida) {
                            //score += 2;
                        }

                        var hasJing = false;
                        for(var k in game.jings){
                            var jing = game.jings[k];
                            if(sd.countMap[jing]){
                                hasJing = true;
                                break;
                            }
                        }

                        if (!hasJing) {
                            sd.wubaida = true;

                            //无百搭+1
                            score += 1;
                            
                            //无百搭独调+1
                            if (sd.holds.length == 1) {
                                sd.wubaidadandiao = true;
                                score += 1;
                            }
                        }
                    }

                    //天胡+2
                    // score += (true == sd.isTianHu) ? 2 : 0;

                    //地胡+1
                    // score += (true == sd.isDiHu) ? 1 : 0;

                    //普通胡牌正常给钱
                    for(var t = 0; t < ac.targets.length; ++t){
                        var six = ac.targets[t];
                        var td = game.gameSeats[six];
                        if(td != sd){
                            td.score -= score * baseScore;
                            sd.score += score * baseScore;
                            
                            if(!ac.iszimo){
                                td.numDianPao ++;
                            }
                        }
                    }
                }
            }
        }
    }
}

function doGameOver(roomInfo,forceEnd){
    if(roomInfo == null){
        return;
    }

    var roomId = roomInfo.id;
    var game = roomInfo.game;
    roomInfo.game = null;

    var results = [];
    var dbresult = [0,0,0,0];

    if(game != null){
        //如果不是主动解散，并且有人胡牌，才进行分数统计。 否则就是平局
        if(!forceEnd && game.firstHupai >= 0){
            calculateResult(game,roomInfo);    
        }
       
        for(var i = 0; i < roomInfo.seats.length; ++i){
            var rs = roomInfo.seats[i];
            var sd = game.gameSeats[i];

            if(sd.score > 0){
                db.add_win_record(sd.userId);
                // db.add_user_coins(sd.userId,sd.score, comdef.CASH_CHANGE_RESONS.ADD_IN_GAME);
            }

            rs.ready = false;
            rs.score += sd.score;
            
            rs.numZiMo += sd.numZiMo;
            rs.numJiePao += sd.numJiePao;
            rs.numDianPao += sd.numDianPao;
            rs.numAnGang += sd.numAnGang;
            rs.numMingGang += sd.numMingGang;
            rs.numChaJiao += sd.numChaJiao;
            
            var userRT = {
                userId:sd.userId,
                actions:sd.actions,
                pengs:sd.pengs,
                wangangs:sd.wangangs,
                diangangs:sd.diangangs,
                angangs:sd.angangs,
                holds:sd.holds,
                score:sd.score,
                totalscore:rs.score,
                qingyise:sd.qingyise,
                haidihu:sd.isHaiDiHu,
                tianhu:sd.isTianHu,
                dihu:sd.isDiHu,
                numhz:sd.numHongZhong,
                pengbanzi:sd.isPengBanzi,
                sanbanzi:sd.sanBanzi,
                sibaida:sd.sibaida,
                wubaida:sd.wubaida,
                wubaidadandiao:sd.wubaidadandiao,
                huamap:sd.huaMap,
            };
            
            for(var k in sd.actions){
                userRT.actions[k] = {
                    type:sd.actions[k].type,
                };
            }
            results.push(userRT);


            dbresult[i] = sd.score;
            delete gameSeatsOfUsers[sd.userId];
        }
        delete games[roomId];
        
        var old = roomInfo.nextButton;
        //如果是自摸，由自摸者当庄，否则有点炮者当庄。
        if(game.firstHupai >= 0){
            roomInfo.nextButton = game.turn;
        }

        if(old != roomInfo.nextButton){
            db.update_next_button(roomId,roomInfo.nextButton);
        }
    }
    
    var isEnd = forceEnd;

    if(!forceEnd && game){
        //保存游戏
        store_game(game);
        db.update_game_result(roomInfo.uuid,game.gameIndex,dbresult);
        roomMgr.updateScores(roomId);
        //记录打牌信息
        var str = JSON.stringify(game.actionList);
        db.update_game_action_records(roomInfo.uuid,game.gameIndex,str);
    
        //保存游戏局数
        db.update_num_of_turns(roomId,roomInfo.numOfGames);

        var isEnd = (roomInfo.numOfGames >= roomInfo.conf.maxGames);  
    }

    var endinfo = null;
    if(isEnd){
        endinfo = [];
        for(var i = 0; i < roomInfo.seats.length; ++i){
            var rs = roomInfo.seats[i];
            endinfo.push({
                numzimo:rs.numZiMo,
                numjiepao:rs.numJiePao,
                numdianpao:rs.numDianPao,
                numangang:rs.numAnGang,
                numminggang:rs.numMingGang,
                numchadajiao:rs.numChaJiao, 
            });
        }   
    }
    userMgr.broacastInRoom('game_over_push',{results:results,endinfo:endinfo},roomInfo.seats[0].userId,true);
    //如果局数已够，则进行整体结算，并关闭房间
    if(isEnd){
        roomMgr.onRoomEnd(roomInfo,forceEnd);
    }
}

function recordUserAction(game,seatData,type,target){
    var d = {type:type,targets:[]};
    if(target != null){
        if(typeof(target) == 'number'){
            d.targets.push(target);    
        }
        else{
            d.targets = target;
        }
    }
    else{
        for(var i = 0; i < game.gameSeats.length; ++i){
            var s = game.gameSeats[i];
            if(i != seatData.seatIndex && s.hued == false){
                d.targets.push(i);
            }
        }        
    }

    seatData.actions.push(d);
    return d;
}

function recordGameAction(game,si,action,pai){
    game.actionList.push(si);
    game.actionList.push(action);
    if(pai != null){
        game.actionList.push(pai);
    }
}

exports.sync = function(userId){
    var roomId = roomMgr.getUserRoom(userId);
    if(roomId == null){
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return;
    }

    var game = roomInfo.game;

    var numOfMJ = game.mahjongs.length - game.currentIndex;
    var remainingGames = roomInfo.conf.maxGames - roomInfo.numOfGames;

    var data = {
        state:game.state,
        numofmj:numOfMJ,
        button:game.button,
        turn:game.turn,
        chuPai:game.chuPai,
        huanpaimethod:game.huanpaiMethod,
        jings:game.jings,
    };

    data.seats = [];
    var seatData = null;
    for(var i = 0; i < game.gameSeats.length; ++i){
        var sd = game.gameSeats[i];

        var s = {
            userid:sd.userId,
            folds:sd.folds,
            angangs:sd.angangs,
            diangangs:sd.diangangs,
            wangangs:sd.wangangs,
            pengs:sd.pengs,
            que:sd.que,
            hued:sd.hued,
            iszimo:sd.iszimo,
            hupai:sd.hupai,
            huamap:sd.huaMap,
        }
        if(sd.userId == userId){
            s.holds = sd.holds;
            seatData = sd;
        }
        data.seats.push(s);
    }

    //同步整个信息给客户端
    userMgr.sendMsg(userId,'game_sync_push',data);
    sendOperations(game,seatData,game.chuPai);
}

function store_history(roomInfo){
    db.archive_room(roomInfo.uuid);
}

function construct_game_base_info(game){
    var baseInfo = {
        type:game.conf.type,
        button:game.button,
        index:game.gameIndex,
        mahjongs:game.mahjongs,
        jings:game.jings,
        game_seats:[],
        game_huas:[],
    }
    
    for(var i = 0; i < game.gameSeats.length; ++i){
        baseInfo.game_seats[i] = game.gameSeats[i].holds;
        baseInfo.game_huas[i] = game.gameSeats[i].huaMap;
    }
    game.baseInfoJson = JSON.stringify(baseInfo);
}

function store_game(game){
    var ret = db.create_game(game.roomInfo.uuid,game.gameIndex,game.baseInfoJson);
    return ret;
}

//开始新的一局
exports.begin = function(roomId) {
    var roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo == null){
        return;
    }
    var seats = roomInfo.seats;

    var game = {
        conf:roomInfo.conf,
        roomInfo:roomInfo,
        gameIndex:roomInfo.numOfGames,

        button:roomInfo.nextButton,
        mahjongs:new Array(108),
        currentIndex:0,
        gameSeats:[],

        numOfQue:0,
        turn:0,
        chuPai:-1,
        state:"idle",
        firstHupai:-1,
        actionList:[],
        chupaiCnt:0,
        jingMap:{}
    };

    //如果是第一局，则随机决定庄家
    if(!roomInfo.numOfGames){
        game.button = Math.floor(Math.random()*roomInfo.conf.numPeople);
        roomInfo.nextButton = game.button;
    }

    roomInfo.numOfGames++;
    roomInfo.game = game;
    for(var i = 0; i < roomInfo.conf.numPeople; ++i){
        var data = game.gameSeats[i] = {};

        data.game = game;

        data.seatIndex = i;

        data.userId = seats[i].userId;
        //持有的牌
        data.holds = [];
        //打出的牌
        data.folds = [];
        //暗杠的牌
        data.angangs = [];
        //点杠的牌
        data.diangangs = [];
        //弯杠的牌
        data.wangangs = [];
        //碰了的牌
        data.pengs = [];
        //缺一门
        data.que = -1;

        //换三张的牌
        data.huanpais = null;

        //玩家手上的牌的数目，用于快速判定碰杠
        data.countMap = {};
        //玩家听牌，用于快速判定胡了的番数
        data.pattern = "";

        //是否可以杠
        data.canGang = false;
        //用于记录玩家可以杠的牌
        data.gangPai = [];

        //是否可以碰
        data.canPeng = false;
        //是否可以胡
        data.canHu = false;
        //是否可以出牌
        data.canChuPai = false;

        //如果guoHuFan >=0 表示处于过胡状态，
        //如果过胡状态，那么只能胡大于过胡番数的牌
        data.guoHuFan = -1;

        //是否胡了
        data.hued = false;
        //是否是自摸
        data.iszimo = false;

        data.isGangHu = false;

        //是否海底胡
        data.isHaiDiHu = false;

        //是否天胡
        data.isTianHu = false;

        //是否地胡
        data.isDiHu = false;

        //是否是碰搬子
        data.isPengBanzi = false;
        //是否有三搬子
        data.sanBanzi = false;
        //是否四百搭
        data.sibaida = false;
        //是否无百搭
        data.wubaida = false;
        //是否无百搭独调
        data.wubaidadandiao = false;

        //
        data.actions = [];

        data.fan = 0;
        data.score = 0;
        data.lastFangGangSeat = -1;
        
        //统计信息
        data.numZiMo = 0;
        data.numJiePao = 0;
        data.numDianPao = 0;
        data.numAnGang = 0;
        data.numMingGang = 0;
        data.numChaJiao = 0;

        data.huaMap = {};

        gameSeatsOfUsers[data.userId] = data;
    }
    games[roomId] = game;
    //洗牌
    shuffle(game);
    //发牌
    deal(game);

    

    var numOfMJ = game.mahjongs.length - game.currentIndex;
    var huansanzhang = roomInfo.conf.hsz;

    for(var i = 0; i < seats.length; ++i){
        //开局时，通知前端必要的数据
        var s = seats[i];
        //通知玩家手牌
        userMgr.sendMsg(s.userId,'game_holds_push',game.gameSeats[i].holds);
        //通知还剩多少张牌
        userMgr.sendMsg(s.userId,'mj_count_push',numOfMJ);
        //通知还剩多少局
        userMgr.sendMsg(s.userId,'game_num_push',roomInfo.numOfGames);

        userMgr.sendMsg(s.userId,'game_jings_push',game.jings);
        //通知游戏开始
        userMgr.sendMsg(s.userId,'game_begin_push',game.button);
    }
    start(game);
};

function start(game){        
    game.state = 'playing';
    var turnSeat = game.gameSeats[game.turn];
    
    userMgr.broacastInRoom('game_playing_push',null,turnSeat.userId,true);

    //等一秒
    sleep(1000);

    //补花
    for(var i = 0; i < game.gameSeats.length; ++i){
        var seatData = game.gameSeats[i];
        var huaCnt = 0;
        for(var j = seatData.holds.length - 1; j >= 0; --j){
            var pai = seatData.holds[j];
            if(isHua(game,pai)){
                buhua(game,seatData,pai);
                huaCnt++;
            }         
        }

        for(var j = 0; j < huaCnt; ++j){
            //如果是花，则需要补花
            var pai = mopai(game,seatData.seatIndex);
            while(isHua(game,pai)){
                buhua(game,seatData,pai);
                //摸新的一张牌
                pai = mopai(game,seatData.seatIndex);
            }
        }

        //通知房间里对应的玩家补花
        userMgr.broacastInRoom('game_buhua_push',{si:i,huamap:seatData.huaMap},turnSeat.userId,true);

        if(huaCnt){
            //通知玩家手牌
            userMgr.sendMsg(seatData.userId,'game_holds_push',seatData.holds);
        }
    }

    construct_game_base_info(game);
    //等0.5秒
    sleep(500);
    
    //通知玩家出牌方
    turnSeat.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push',turnSeat.userId,turnSeat.userId,true);
    //检查是否可以暗杠或者胡
    //直杠
    checkCanAnGang(game,turnSeat);
    //检查胡 用最后一张来检查
    checkCanHu(game,turnSeat);
    //通知前端
    sendOperations(game,turnSeat,game.chuPai);
}

exports.huanSanZhang = function(userId,p1,p2,p3,isMaipai){
};

exports.dingQue = function(userId,type){
};

exports.chuPai = function(userId,pai){

    pai = Number.parseInt(pai);
    var seatData = gameSeatsOfUsers[userId];
    if(seatData == null){
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;
    var seatIndex = seatData.seatIndex;
    //如果不该他出，则忽略
    if(game.turn != seatData.seatIndex){
        console.log("not your turn.");
        return;
    }

    if(seatData.hued){
        console.log('you have already hued. no kidding plz.');
        return;
    }

    if(seatData.canChuPai == false){
        console.log('no need chupai.');
        return;
    }

    if(hasOperations(seatData)){
        console.log('plz guo before you chupai.');
        return;
    }

    //不准出精牌。
    if(game.jingMap[pai]){
        return;
    }

    //从此人牌中扣除
    var index = seatData.holds.indexOf(pai);
    if(index == -1){
        console.log("holds:" + seatData.holds);
        console.log("can't find mj." + pai);
        return;
    }
    
    seatData.canChuPai = false;
    game.chupaiCnt ++;
    
    seatData.holds.splice(index,1);
    seatData.countMap[pai] --;
    game.chuPai = pai;
    recordGameAction(game,seatData.seatIndex,ACTION_CHUPAI,pai);
    userMgr.broacastInRoom('game_chupai_notify_push',{userId:seatData.userId,pai:pai},seatData.userId,true);
    
    //检查是否有人要胡，要碰 要杠
    var hasActions = false;

    if(!game.jingMap[pai]){
        for(var i = 0; i < game.gameSeats.length; ++i){
            //玩家自己不检查
            if(game.turn == i){
                continue;
            }
            var ddd = game.gameSeats[i];
            //已经和牌的不再检查
            if(ddd.hued){
                continue;
            }

            checkCanHu(game,ddd,pai,seatData.lastFangGangSeat != -1);
            if(true){
                if(ddd.canHu && ddd.guoHuFan >= 0 && ddd.tingInfo.fan <= ddd.guoHuFan){
                    console.log("ddd.guoHuFan:" + ddd.guoHuFan);
                    ddd.canHu = false;
                    userMgr.sendMsg(ddd.userId,'guohu_push');            
                }     
            }
            checkCanPeng(game,ddd,pai);
            checkCanDianGang(game,ddd,pai);
            if(hasOperations(ddd)){
                sendOperations(game,ddd,game.chuPai);
                hasActions = true;    
            }
        }
    }

    
    //如果没有人有操作，则向下一家发牌，并通知他出牌
    if(!hasActions){
        sleep(500);
        userMgr.broacastInRoom('guo_notify_push',{userId:seatData.userId,pai:game.chuPai},seatData.userId,true);
        seatData.folds.push(game.chuPai);
        game.chuPai = -1;
        moveToNextUser(game);
        doUserMoPai(game);
    }
};

exports.peng = function(userId){
    var seatData = gameSeatsOfUsers[userId];
    if(seatData == null){
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;

    //如果是他出的牌，则忽略
    if(game.turn == seatData.seatIndex){
        console.log("it's your turn.");
        return;
    }

    //如果没有碰的机会，则不能再碰
    if(seatData.canPeng == false){
        console.log("seatData.peng == false");
        return;
    }

    //和的了，就不要再来了
    if(seatData.hued){
        console.log('you have already hued. no kidding plz.');
        return;
    }
    
    //如果有人可以胡牌，则需要等待
    var i = game.turn;
    while(true){
        var i = (i + 1)%game.gameSeats.length;
        if(i == game.turn){
            break;
        }
        else{
            var ddd = game.gameSeats[i];
            if(ddd.canHu && i != seatData.seatIndex){
                return;    
            }
        }
    }

    seatData.guoHuFan = -1;
    clearAllOptions(game);

    //验证手上的牌的数目
    var pai = game.chuPai;
    var c = seatData.countMap[pai];
    if(c == null || c < 2){
        console.log("pai:" + pai + ",count:" + c);
        console.log(seatData.holds);
        console.log("lack of mj.");
        return;
    }

    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for(var i = 0; i < 2; ++i){
        var index = seatData.holds.indexOf(pai);
        if(index == -1){
            console.log("can't find mj.");
            return;
        }
        seatData.holds.splice(index,1);
        seatData.countMap[pai] --;
    }
    seatData.pengs.push(pai);
    game.chuPai = -1;

    //如果碰的牌是搬子
    if(pai == game.banzi) {
        seatData.isPengBanzi = true;
    }

    recordGameAction(game,seatData.seatIndex,ACTION_PENG,pai);

    //广播通知其它玩家
    userMgr.broacastInRoom('peng_notify_push',{userid:seatData.userId,pai:pai},seatData.userId,true);

    //碰的玩家打牌
    moveToNextUser(game,seatData.seatIndex);
    
    //广播通知玩家出牌方
    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);
    
    //通知玩家做对应操作
    sendOperations(game,seatData);
};

exports.isPlaying = function(userId){
    var seatData = gameSeatsOfUsers[userId];
    if(seatData == null){
        return false;
    }

    var game = seatData.game;

    if(game.state == "idle"){
        return false;
    }
    return true;
}


function checkCanQiangGang(game,turnSeat,seatData,pai){
    var hasActions = false;
    for(var i = 0; i < game.gameSeats.length; ++i){
        //杠牌者不检查
        if(seatData.seatIndex == i){
            continue;
        }
        var ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if(ddd.hued){
            continue;
        }

        checkCanHu(game,ddd,pai,true);
        if(ddd.canHu){
            sendOperations(game,ddd,pai);
            hasActions = true;
        }
    }
    if(hasActions){
        game.qiangGangContext = {
            turnSeat:turnSeat,
            seatData:seatData,
            pai:pai,
            isValid:true,
        }
    }
    else{
        game.qiangGangContext = null;
    }
    return game.qiangGangContext != null;
}

function doGang(game,turnSeat,seatData,gangtype,numOfCnt,pai){
    var seatIndex = seatData.seatIndex;
    var gameTurn = turnSeat.seatIndex;
    seatData.guoHuFan = -1;
    var isZhuanShouGang = false;
    if(gangtype == "wangang"){
        var idx = seatData.pengs.indexOf(pai);
        if(idx >= 0){
            seatData.pengs.splice(idx,1);
        }
        
        //如果最后一张牌不是杠的牌，则认为是转手杠
        //万州麻将里面，没有转手杠的说法，改这里最快
        //if(seatData.holds[seatData.holds.length - 1] != pai){
       //     isZhuanShouGang = true;
       // }
    }
    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for(var i = 0; i < numOfCnt; ++i){
        var index = seatData.holds.indexOf(pai);
        if(index == -1){
            console.log(seatData.holds);
            console.log("can't find mj.");
            return;
        }
        seatData.holds.splice(index,1);
        seatData.countMap[pai] --;
    }

    recordGameAction(game,seatData.seatIndex,ACTION_GANG,pai);

    //记录下玩家的杠牌
    if(gangtype == "angang"){
        seatData.angangs.push(pai);
        var ac = recordUserAction(game,seatData,"angang");
        ac.score = 2;
    }
    else if(gangtype == "diangang"){
        seatData.diangangs.push(pai);
        var ac = recordUserAction(game,seatData,"diangang",gameTurn);
        ac.score = 3;
        var fs = turnSeat;
        recordUserAction(game,fs,"fanggang",seatIndex);
    }
    else if(gangtype == "wangang"){
        seatData.wangangs.push(pai);
        if(isZhuanShouGang == false){
            var ac = recordUserAction(game,seatData,"wangang");
            ac.score = 1;
        }
        else{
            recordUserAction(game,seatData,"zhuanshougang");
        }

    }
    //通知其他玩家，有人杠了牌
    userMgr.broacastInRoom('gang_notify_push',{userid:seatData.userId,pai:pai,gangtype:gangtype},seatData.userId,true);

    //变成自己的轮子
    moveToNextUser(game,seatIndex);
    //再次摸牌
    doUserMoPai(game);
    
    //只能放在这里。因为过手就会清除杠牌标记
    seatData.lastFangGangSeat = gameTurn;
}

exports.gang = function(userId,pai){
    var seatData = gameSeatsOfUsers[userId];
    if(seatData == null){
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果没有杠的机会，则不能再杠
    if(seatData.canGang == false) {
        console.log("seatData.gang == false");
        return;
    }

    //和的了，就不要再来了
    if(seatData.hued){
        console.log('you have already hued. no kidding plz.');
        return;
    }

    if(seatData.gangPai.indexOf(pai) == -1){
        console.log("the given pai can't be ganged.");
        return;   
    }
    
    //如果有人可以胡牌，则需要等待
    var i = game.turn;
    while(true){
        var i = (i + 1)%game.gameSeats.length;
        if(i == game.turn){
            break;
        }
        else{
            var ddd = game.gameSeats[i];
            if(ddd.canHu && i != seatData.seatIndex){
                return;    
            }
        }
    }

    var numOfCnt = seatData.countMap[pai];

    var gangtype = ""   //对照 弯杠wangang：碰杠，点杠diangang：明杠，暗杠angang 含义相同
    //弯杠 去掉碰牌
    if(numOfCnt == 1){
        gangtype = "wangang"
    }
    else if(numOfCnt == 3){
        gangtype = "diangang"
    }
    else if(numOfCnt == 4){
        gangtype = "angang";
    }
    else{
        console.log("invalid pai count.");
        return;
    }
    
    game.chuPai = -1;
    clearAllOptions(game);
    seatData.canChuPai = false;
    
    userMgr.broacastInRoom('hangang_notify_push',seatIndex,seatData.userId,true);
    
    //如果是弯杠（及碰杠），则需要检查是否可以抢杠,(补充)明杠也能抢杠胡
    var turnSeat = game.gameSeats[game.turn];
    if(numOfCnt == 1){
        var canQiangGang = checkCanQiangGang(game,turnSeat,seatData,pai);//checkCanQiangGang ,checkCanQiangGgang
                           
        if(canQiangGang){
            return;
        }
    }
    
    doGang(game,turnSeat,seatData,gangtype,numOfCnt,pai);
};

exports.hu = function(userId){
    var seatData = gameSeatsOfUsers[userId];
    if(seatData == null){
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果他不能和牌，那和个啥啊
    if(seatData.canHu == false){
        console.log("invalid request.");
        return;
    }

    //和的了，就不要再来了
    if(seatData.hued){
        console.log('you have already hued. no kidding plz.');
        return;
    }

    //标记为和牌
    seatData.hued = true;
    var hupai = game.chuPai;
    var isZimo = false;

    var turnSeat = game.gameSeats[game.turn];
    seatData.isGangHu = turnSeat.lastFangGangSeat >= 0;
    var notify = -1;
    
    if(game.qiangGangContext != null){
        var gangSeat = game.qiangGangContext.seatData;
        hupai = game.qiangGangContext.pai;
        notify = hupai;
        var ac = recordUserAction(game,seatData,"qiangganghu",gangSeat.seatIndex);    
        ac.iszimo = false;
        recordGameAction(game,seatIndex,ACTION_HU,hupai);
        seatData.isQiangGangHu = true;
        game.qiangGangContext.isValid = false;
        
        
        var idx = gangSeat.holds.indexOf(hupai);
        if(idx != -1){
            gangSeat.holds.splice(idx,1);
            gangSeat.countMap[hupai]--;
            userMgr.sendMsg(gangSeat.userId,'game_holds_push',gangSeat.holds);
        }
        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(hupai);
        if(seatData.countMap[hupai]){
            seatData.countMap[hupai]++;
        }
        else{
            seatData.countMap[hupai] = 1;
        }
        
        recordUserAction(game,gangSeat,"beiqianggang",seatIndex);
    }
    else if(game.chuPai == -1){
        hupai = seatData.holds[seatData.holds.length - 1];
        notify = -1;
        if(seatData.isGangHu){
            if(turnSeat.lastFangGangSeat == seatIndex){
                var ac = recordUserAction(game,seatData,"ganghua");    
                ac.iszimo = true;
            }
            else{
                var diangganghua_zimo = true;//game.conf.dianganghua == 1;
                if(diangganghua_zimo){
                    var ac = recordUserAction(game,seatData,"dianganghua");
                    ac.iszimo = true;
                }
                else{
                    var ac = recordUserAction(game,seatData,"dianganghua",turnSeat.lastFangGangSeat);
                    ac.iszimo = false;
                }
            }
        }
        else{
            var ac = recordUserAction(game,seatData,"zimo");
            ac.iszimo = true;
        }

        isZimo = true;
        recordGameAction(game,seatIndex,ACTION_ZIMO,hupai);
    }
    else{
        notify = game.chuPai;
        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(game.chuPai);
        if(seatData.countMap[game.chuPai]){
            seatData.countMap[game.chuPai]++;
        }
        else{
            seatData.countMap[game.chuPai] = 1;
        }

        console.log(seatData.holds);

        var at = "hu";
        //炮胡
        if(turnSeat.lastFangGangSeat >= 0){
            at = "gangpaohu";
        }

        var ac = recordUserAction(game,seatData,at,game.turn);
        ac.iszimo = false;

        //记录玩家放炮信息
        var fs = game.gameSeats[game.turn];
        recordUserAction(game,fs,"fangpao",seatIndex);

        recordGameAction(game,seatIndex,ACTION_HU,hupai);
    }

    //保存番数
    var ti = seatData.tingInfo;
    seatData.fan = ti.fan;
    seatData.pattern = ti.pattern;
    seatData.iszimo = isZimo;
    seatData.hupai = hupai;

    //盐城麻将没有海底胡，天胡，地胡
    //如果是最后一张牌，则认为是海底胡
    // seatData.isHaiDiHu = game.currentIndex == game.mahjongs.length;
 
    /*
    if(game.conf.tiandihu){
        if (game.chupaiCnt == 0 && game.button == seatData.seatIndex && game.chuPai == -1) {
            seatData.isTianHu = true;
        }
        else if (game.chupaiCnt == 1 && game.turn == game.button && game.button != seatData.seatIndex && game.chuPai != -1) {
            seatData.isDiHu = true;
        }
    }
    */

    clearAllOptions(game,seatData);
    //通知前端，有人和牌了
    userMgr.broacastInRoom('hu_push',{seatindex:seatIndex,iszimo:isZimo,hupai:hupai},seatData.userId,true);

    //清空所有非胡牌操作
    for(var i = 0; i < game.gameSeats.length; ++i){
        var ddd = game.gameSeats[i];
        ddd.canPeng = false;
        ddd.canGang = false;
        ddd.canChuPai = false;
        sendOperations(game,ddd,hupai);
    }

    //如果还有人可以胡牌，则等待
    for(var i = 0; i < game.gameSeats.length; ++i){
        var ddd = game.gameSeats[i];
        if(ddd.canHu){
            return;
        }
    }

    if(isZimo){
        game.firstHupai = game.turn;
    }
    else{
        var i = (game.turn + 1) % game.gameSeats.length;
        while(i != game.turn){
            if(game.gameSeats[i].hued){
                game.firstHupai = i;
                break;
            }
            i = (i+1)%game.gameSeats.length;
        }
        game.fangPaoSeat = game.turn;
    }

    //只能有一个人胡，直接清除所有操作。
    clearAllOptions(game);

    sleep(500);
    doGameOver(game.roomInfo);
};

exports.guo = function(userId){
    var seatData = gameSeatsOfUsers[userId];
    if(seatData == null){
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;
    
    if(game.state == 'baoting'){
        var idx = game.couldBaoTing.indexOf(seatIndex);
        if(idx != -1){
            game.couldBaoTing.splice(idx,1);
            if(game.couldBaoTing.length == 0){
                start(game);
            }
        }
        userMgr.sendMsg(seatData.userId,"guo_result");
        return;
    }

    //如果玩家没有对应的操作，则也认为是非法消息
    if((seatData.canGang || seatData.canPeng || seatData.canHu) == false){
        console.log("no need guo.");
        return;
    }

    //如果是小于等于四张牌的精吊自摸，则不可以过。
    if(seatData.canHu && game.chuPai == -1){
        if(seatData.holds.length <= 4){
            if(mjutils.isJingDiao(game.jingMap,seatData,false)){
                return;
            }
        }
    }

    //如果是玩家自己的轮子，不是接牌，则不需要额外操作
    var doNothing = game.chuPai == -1 && game.turn == seatIndex;

    userMgr.sendMsg(seatData.userId,"guo_result");

    //这里还要处理过胡的情况
    if(seatData.canHu && game.chuPai != -1){
        seatData.guoHuFan = seatData.tingInfo.fan;
    }

    clearAllOptions(game,seatData);

    if(doNothing){
        return;
    }
    
    //如果还有人可以操作，则等待
    for(var i = 0; i < game.gameSeats.length; ++i){
        var ddd = game.gameSeats[i];
        if(hasOperations(ddd)){
            return;
        }
    }

    //如果是已打出的牌，则需要通知。
    if(game.chuPai >= 0){
        var uid = game.gameSeats[game.turn].userId;
        userMgr.broacastInRoom('guo_notify_push',{userId:uid,pai:game.chuPai},seatData.userId,true);
        game.gameSeats[game.turn].folds.push(game.chuPai);
        game.chuPai = -1;
    }
    
    
    var qiangGangContext = game.qiangGangContext;
    //清除所有的操作
    clearAllOptions(game);
    
    if(qiangGangContext != null && qiangGangContext.isValid){
        doGang(game,qiangGangContext.turnSeat,qiangGangContext.seatData,"wangang",1,qiangGangContext.pai);        
    }
    else{
        //下家摸牌
        moveToNextUser(game);
        doUserMoPai(game);   
    }
};

exports.hasBegan = function(roomId){
    var game = games[roomId];
    if(game != null){
        return true;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if(roomInfo != null){
        return roomInfo.numOfGames > 0;
    }
    return false;
};


var JU_SHU = [8,16,24];
var JU_SHU_COST = [4,8,12];
var DI_FEN = [1,2,3,4,5,10];
var REN_SHU = [2,3,4];

exports.checkConf = function(roomConf,gems){
    if(
		roomConf.type == null
        || roomConf.difen == null
		|| roomConf.jushuxuanze == null
        || roomConf.renshuxuanze == null){
		return 1;
	}

    if(roomConf.difen < 0 || roomConf.difen > DI_FEN.length){
        return 1;
    }

	if(roomConf.jushuxuanze < 0 || roomConf.jushuxuanze > JU_SHU.length){
		return 1;
	}

    if(roomConf.renshuxuanze < 0 || roomConf.renshuxuanze > REN_SHU.length){
        return 1;
    }

    var numPeople = REN_SHU[roomConf.renshuxuanze];
	
	var cost = JU_SHU_COST[roomConf.jushuxuanze];
    if(roomConf.aa){
        cost /= numPeople;
        cost = Math.ceil(cost);
    }
	if(cost > gems){
		return 2222;
	}

    roomConf.cost = cost;
    roomConf.numPeople = numPeople;

    return 0;
}

exports.getConf = function(roomConf,creator){
    return {
        type:roomConf.type,
        //晃晃麻将底分默认为1
        baseScore:1,//DI_FEN[roomConf.difen],
        maxGames:JU_SHU[roomConf.jushuxuanze],
        numPeople:roomConf.numPeople,
        cost:roomConf.cost,
        creator:creator,
    }
}

exports.doGameOver = doGameOver;

/*
var mokgame = {
    gameSeats:[{folds:[]}],
    mahjongs:[],
    currentIndex:-1,
    jings:[1],
    jingMap:{'1':true}
}
var mokseat = {
    holds:[1,1,2,3,4,5,14,15,16,24,24],
    isBaoTing:false,
    countMap:{},
    pengs:[4],
    feis:[],
    diangangs:[],
    angangs:[],
    wangangs:[],
    diansuos:[],
    wansuos:[],
    ansuos:[],
    gangPai:[]
}

for(var k in mokseat.holds){
    var pai = mokseat.holds[k];
    if(mokseat.countMap[pai]){
        mokseat.countMap[pai] ++;
    }
    else{
        mokseat.countMap[pai] = 1;
    }
}

var t = checkCanHu(mokgame,mokseat);

var tingMap = {}
for(var i = 0; i < 27; ++i){
    var t = checkCanHu(mokgame,mokseat,i,true);
    if(mokseat.tingInfo){
        tingMap[i] = true;
    }    
}
console.log(tingMap);
*/