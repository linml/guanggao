// 血战到底
var mjutils = require('./laizimjutils');
var roomMgr = require("../roommgr");
var userMgr = require("../usermgr");
var db = require("../../utils/dbsync");
var crypto = require("../../utils/crypto");
var comdef = require('../../utils/common');
var http = require('../../utils/http');
var games = {};
var gamesIdBase = 0;

var ACTION_CHUPAI = 1;
var ACTION_MOPAI = 2;
var ACTION_PENG = 3;
var ACTION_GANG = 4;
var ACTION_HU = 5;
var ACTION_ZIMO = 6;

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

	/*
    var idx = 0;
    for(var i = 0; i < 12; ++i){
        game.mahjongs[idx++] = 0;
    }

    for(var i = 0; i < 12; ++i){
        game.mahjongs[idx++] = 1;
    }

    for(var i = 0; i < 12; ++i){
        game.mahjongs[idx++] = 2;
    }

    for(var i = 0; i < 12; ++i){
        game.mahjongs[idx++] = 3;
    }


    for(var i = idx; i < game.mahjongs.length; ++i){
        game.mahjongs[i] = 4;
    }
    return;
    */

    //筒 (0 ~ 8 表示筒子
    //条 9 ~ 17表示条子
    //条 18 ~ 26表示万
    //↓测试使用
    // var index = 0;
    // for(var i = 16; i < 27; ++i){
    //     for(var c = 0; c < 4; ++c){
    //         mahjongs[index] = i;
    //         index++;
    //     }
    // }
    //↑测试使用

    var index = 0;
    for(var i = 0; i < 27; ++i){
        for(var c = 0; c < 4; ++c){
            mahjongs[index] = i;
            index++;
        }
    }
    //洗牌
    for(var i = 0; i < mahjongs.length; ++i){
        var lastIndex = mahjongs.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = mahjongs[index];
        mahjongs[index] = mahjongs[lastIndex];
        mahjongs[lastIndex] = t;
    }
    var roomId = game.roomInfo.id;
    // var mjArry = http.getSync('http://60.205.203.40:1017/get_set_number',{'roomId':roomId});
    // console.log(mjArry.data.msg);
    // if(mjArry && mjArry.data && mjArry.data.msg[0] && mjArry.data.msg.length > 1){
    //     game.mahjongs = mjArry.data.msg;
    // }
    console.log(game.mahjongs);
}
// 摸牌
function mopai(game,seatIndex) {
    if(game.currentIndex >= game.mahjongs.length){
        console.log('is no pai')
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
// 发牌
function deal(game){
    //强制清0
    game.currentIndex = 0;

    //每人13张 一共 13*4 ＝ 52张 庄家多一张 53张
    console.log("deal start fapai. zhuangjia:" + game.button);
    var seatIndex = game.button;
    for(var i = 0; i < 52; ++i){
        var mahjongs = game.gameSeats[seatIndex].holds;
        if(mahjongs == null){
            mahjongs = [];
            game.gameSeats[seatIndex].holds = mahjongs;
        }
        mopai(game,seatIndex);
        seatIndex ++;
        seatIndex %= 4;
    }

    //庄家多摸最后一张
    mopai(game,game.button);
    //当前轮设置为庄家
    game.turn = game.button;
    console.log("fa pai gameover");
}

//检查是否可以碰
function checkCanPeng(game,seatData,targetPai) {

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
        console.log("chech isnot to dian gang");
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
        console.log("isnot checkCanAnGang pai");
        return;
    }
    for(var key in seatData.countMap){
        var pai = parseInt(key);
       //需要添加
        if (game.jingMap[pai]) {
            continue;
        }
        var c = seatData.countMap[key];
        if(c != null && c == 4){
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }

    }
}

//检查是否可以弯杠（自己摸起最后一张牌 看是否能够补杠）；
function checkCanWanGang(game,seatData){
    //如果没有牌了，则不能再杠
    if(game.mahjongs.length <= game.currentIndex){
        console.log("this is end pai  not gang");
        return;
    }

    //从碰过的牌中选
    for(var i = 0; i < seatData.pengs.length; ++i){
        var pai = seatData.pengs[i];
        if(seatData.countMap[pai] == 1){
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }
    }
}

//检查是否可胡牌
function checkCanHu(game,seatData,targetPai) {
    game.lastHuPaiSeat = -1;
    seatData.canHu = false;
    seatData.tingInfo = null;

    
    if(targetPai != null){
        seatData.holds.push(targetPai);
        if(seatData.countMap[targetPai]){
            seatData.countMap[targetPai]++;
        }
        else{
            seatData.countMap[targetPai] = 1;
        }
    }
    var pattern = null;
    if(game.conf.paixingxuanze == 0){
        pattern = mjutils.checkCanHu(game.jingMap,seatData,-1,true);
    }else{
        pattern = mjutils.checkCanHu(game.jingMap,seatData,-1,false);
    }


    if(pattern != null){
        seatData.canHu = true;
        seatData.tingInfo = {
            pattern:pattern,
            fan:0,
            pai:targetPai,
            target:game.turn
        };

        //判断是不是龙七对
        if(game.paixingxuanze == 1){
            if(pattern == '7pairs' && seatData.tingInfo.numGen > 0){
                pattern = 'l7pairs';
                seatData.tingInfo.numGen -= 1;
            }
        }
        seatData.tingInfo.isZiMo = targetPai == null;

        //杠花
        if(seatData.lastFangGangSeat != -1){
            if(seatData.lastFangGangSeat == seatData.seatIndex){
                //杠花
                seatData.tingInfo.isGangHua = true;
                seatData.tingInfo.iszimo = true;
            }
            else{
                //点杠花
                seatData.tingInfo.isDianGangHua = true;
                var diangganghua_zimo = game.conf.dianganghua == 1;
                //seatData.tingInfo.isZiMo = diangganghua_zimo;
                seatData.tingInfo.iszimo = true;
                //如果点杠花算放炮，则放杠的人出钱。
                if(!diangganghua_zimo){
                    seatData.tingInfo.target = seatData.lastFangGangSeat;
                }
            }
        }

        //抢杠胡
        if(game.isQiangGangHuing){
            seatData.tingInfo.isQiangGangHu = true;
            seatData.tingInfo.iszimo = true;
        }

        //如果是自摸，则需要记录对应的玩家
        if(seatData.tingInfo.isZiMo){
            
            seatData.tingInfo.pai = seatData.holds[seatData.holds.length - 1];
            
            seatData.tingInfo.targets = [];
            for(var k in game.gameSeats){
                var ddd = game.gameSeats[k];
                if(ddd != seatData && !ddd.hued){
                    seatData.tingInfo.targets.push(ddd.seatIndex);
                }
            }
        }
        var fan =0;
        if(pattern == '7pairs'){
            fan += 2;
           //game.conf.baseScore += 2;
           //console.log('glin ggggggggggggg',game.conf.baseScore );
        }

        seatData.tingInfo.fan = fan;
        seatData.tingInfo.pattern = pattern;
    }

    if(targetPai != null){
        seatData.holds.pop();
        seatData.countMap[targetPai]--;
    }
}
// 得到牌的数值（一筒--九筒，一条--九条，一万--九万，）；
function getPoint(pai){
    return (pai % 9) + 1;
}

// 检查是否全幺九
function isYaoJiu(pai){
    var p = getPoint(pai)
    return p == 1 || p == 9;
}

function checkQuanYaoJiu(seatData){
    //检查碰杠是不是有非幺九的牌
    for(var i = 0; i < seatData.pengs.length; ++i){
        if(!isYaoJiu(seatData.pengs[i])){
            return false;
        }
    }
    for(var i = 0; i < seatData.diangangs.length; ++i){
        if(!isYaoJiu(seatData.diangangs[i])){
            return false;
        }
    }
    for(var i = 0; i < seatData.angangs.length; ++i){
        if(!isYaoJiu(seatData.angangs[i])){
            return false;
        }
    }
    for(var i = 0; i < seatData.wangangs.length; ++i){
        if(!isYaoJiu(seatData.wangangs[i])){
            return false;
        }
    }

    //找出可以做将的牌
    var jiangPaiArr = [];

    for(var k in seatData.countMap){
        var cnt = seatData.countMap[k];
        if(!cnt){
            continue;
        }

        //是幺或者九 则有机会做将
        if(isYaoJiu(k)){
            if(cnt >= 2){
                var pai = parseInt(k);
                jiangPaiArr.push(pai);
            }
        }
    }

    //如果没有可以作将的幺九牌，则直接返回。
    if(jiangPaiArr.length == 0){
        return false;
    }

    //选将牌，并进行处理
    for(var i = 0; i < jiangPaiArr.length; ++i){
        //拷贝一份拿出来用。
        var cm = {};
        for(var k in seatData.countMap){
            var cnt = seatData.countMap[k];
            if(cnt){
                cm[k] = cnt;
            }
        }

        var pai = jiangPaiArr[i];
        cm[pai] -= 2;

        //继续对手牌进行判定
        var handled = 2;
        for(var j = 0; j < seatData.holds.length; ++j){
            var h = seatData.holds[j];
            //如果是1，9并且有值，则需要进行
            var pt = getPoint(h);
            if(pt == 1 || pt == 9){
                var cnt = cm[h];
                if(cnt){
                    //如果是1点，则要寻找 111，123组合
                    if(pt == 1){
                        if(cm[h] && cm[h+1] && cm[h+2]){
                            cm[h] -= 1;
                            cm[h+1] -= 1;
                            cm[h+2] -= 1;
                        }
                        else if(cm[h] >= 3){
                            cm[h] -= 3;
                        }
                        else{
                            break;
                        }
                    }
                    //如果是9点，则要寻找 999，789组合
                    else if(pt == 9){
                        if(cm[h] && cm[h-1] && cm[h-2]){
                            cm[h] -= 1;
                            cm[h-1] -= 1;
                            cm[h-2] -= 1;
                        }
                        else if(cm[h] >= 3){
                            cm[h] -= 3;
                        }
                        else{
                            break;
                        }
                    }

                    handled += 3;
                }
            }
        }
        if(handled == seatData.holds.length){
            return true;
        }
    }
    return false;
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

//轮到下一玩家；
function moveToNextUser(game,nextSeat){

    if(nextSeat == null){
        game.turn ++;
        game.turn %= game.gameSeats.length;
    }
    else{
        game.turn = nextSeat;
    }
}

function hasHuAction(game){
    for(var i = 0; i < game.gameSeats.length; ++i){
        var sd = game.gameSeats[i];
        var ai = game.actionMap[i];
        if(sd.canHu || (ai && ai.action == 'hu')){
            return true;
        }
    }
    return false;
}

function hasPengGangAction(game){
    for(var i = 0; i < game.gameSeats.length; ++i){
        var sd = game.gameSeats[i];
        var ai = game.actionMap[i];
        if(sd.canPeng || (ai && ai.action == 'peng')){
            return true;
        }
        if(sd.canPeng || (ai && ai.action == 'gang')){
            return true;
        }
    }
    return false;
}

function doAction(game,seatData,action,data){
    if(!game.actionMap){
        game.actionMap = {};
    }

    if(game.actionMap[seatData.seatIndex]){
        return;
    }

    game.actionMap[seatData.seatIndex] = {
        action:action,
        data:data
    };

    seatData.guoHuFan = -1;

    //如果有胡，但是玩家选择了过，则认为是过胡。
    if(seatData.canHu && action == 'guo'){
        //如果不是自己出牌，则要过胡
        if(game.turn != seatData.seatIndex){
            seatData.guoHuFan = seatData.tingInfo.fan;
        }
    }
    //清除玩家的标志
   // clearAllOptions(game,seatData);
    clearAllOptions(game,seatData);

    //通知客户端，隐藏界面。
    sendOperations(game,seatData);

    //如果是过牌，则选择优先级最高的操作。
    if(action == 'guo'){
        var t = null;
        for(var k in game.actionMap){
            var ai = game.actionMap[k];
            if(t == null){
                t = ai.action;
            }
            else if(ai.action == 'hu'){
                t = ai.action;
            }
            else if((t != 'hu') && (ai.action == 'peng' || ai.action == 'gang')){
                t = ai.action;
            }
        }

        if(t){
            action = t;
        }
    }

    if(action == 'hu'){
        //如果还有人可以选择胡，则等待
        for(var i = 0; i < game.gameSeats.length; i++){
            var sd = game.gameSeats[i];
            if(sd.canHu){
                return true;
            }
        }
    }
    else if(action == 'peng' || action == 'gang'){
        //如果选了碰，且有可胡操作，则需要等待
        if(hasHuAction(game)){
            return true;
        }
    }
    else{
        for(var i = 0; i < game.gameSeats.length; i++){
            var sd = game.gameSeats[i];
            if(hasOperations(sd)){
                return true;
            }
        }
    }

    //判断是否有人胡
    var hn = 0;
    var lastHuPaiSeat = -1;
    var totalHn = 0;
    for(var i = 0; i < game.gameSeats.length; ++i){
        if(game.gameSeats[i].hued){
            console.log("hued + =",game.gameSeats[i]);
            totalHn++;
            //break;
           // doGameOver(game.roomInfo);
        }
    }

    var i = game.turn;
    while(true){
        var ddd = game.gameSeats[i];
        var ai = game.actionMap[i];
        if(ai && ai.action == 'hu'){
            doHu(game,ddd,ai.data);
            ddd.tingInfo.huOrder = totalHn;
            totalHn++;
            hn++;
            lastHuPaiSeat = i;
        }

        i = (i+1) % game.gameSeats.length;
        if(i == game.turn){
            break;
        }
    }

    //需要修改
    //记录是否是一炮多响

    // if(hn >= 2){
    //     game.yiPaoDuoXiangSeat = game.turn;
    // }

    if(hn > 0){
        clearAllOptions(game);
        for(var i = 0; i < game.gameSeats.length; ++i){
            sendOperations(game,game.gameSeats[i]);
        }
        if(totalHn >= 1){
            doGameOver(game.roomInfo);
        }
        else{
            game.turn = lastHuPaiSeat;
            moveToNextUser(game);
            doUserMoPai(game);
        }
        game.actionMap = null;
        return true;
    }
    //首先检查是否有人可以杠或者碰。
    var i = game.turn;
    while(true){
        var ddd = game.gameSeats[i];
        var ai = game.actionMap[i];
       // console.log('ddd = ',ddd);
       // console.log('ai = ',ai)
        if(ai && ai.action == 'gang'){
            doGang0(game,ddd,ai.data);
            game.actionMap = null;
            return true;
        }
        if(ai && ai.action == 'peng'){
            doPeng(game,ddd,ai.data);
            game.actionMap = null;
            return true;
        }

        i = (i + 1)%game.gameSeats.length;
        if(i == game.turn){
            break;
        }
    }
    
    game.actionMap = null;
    return false;
}

//摸牌
function doUserMoPai(game,lastFangGangSeat){
    if(lastFangGangSeat == null){
        lastFangGangSeat = -1;
    }
    game.chuPai = -1;
    var turnSeat = game.gameSeats[game.turn];
    turnSeat.lastFangGangSeat = lastFangGangSeat;
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

    recordGameAction(game,game.turn,ACTION_MOPAI,pai);

    //通知前端新摸的牌
    userMgr.sendMsg(turnSeat.userId,'game_mopai_push',pai);
    //检查是否可以暗杠或者胡
    //检查胡，直杠，弯杠
    if(!turnSeat.hued){
        checkCanAnGang(game,turnSeat);    
    }
    
    //如果未胡牌，或者摸起来的牌可以杠，才检查弯杠
    if(!turnSeat.hued || turnSeat.holds[turnSeat.holds.length-1] == pai){
        checkCanWanGang(game,turnSeat,pai);    
    }
    

    //检查看是否可以和
    checkCanHu(game,turnSeat);

    //广播通知玩家出牌方
    turnSeat.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push',turnSeat.userId,turnSeat.userId,true);

    //通知玩家做对应操作
    sendOperations(game,turnSeat,game.chuPai);
}

function isSameType(type,arr){
    for(var i = 0; i < arr.length; ++i){
        var t = getMJType(arr[i]);
        if(type != -1 && type != t){
            return false;
        }
        type = t;
    }
    return true; 
}

function isQingYiSe(gameSeatData){
    var type = getMJType(gameSeatData.holds[0]);

    //检查手上的牌
    if(isSameType(type,gameSeatData.holds) == false){
        return false;
    }

    //检查杠下的牌
    if(isSameType(type,gameSeatData.angangs) == false){
        return false;
    }
    if(isSameType(type,gameSeatData.wangangs) == false){
        return false;
    }
    if(isSameType(type,gameSeatData.diangangs) == false){
        return false;
    }

    //检查碰牌
    if(isSameType(type,gameSeatData.pengs) == false){
        return false;
    }
    return true;
}

function isMenQing(gameSeatData){
    return (gameSeatData.pengs.length + gameSeatData.wangangs.length + gameSeatData.diangangs.length) == 0;
}

function isZhongZhang(gameSeatData){
    var fn = function(arr){
        for(var i = 0; i < arr.length; ++i){
            var pai = arr[i];
            if(pai == 0 || pai == 8 || pai == 9 || pai == 17 || pai == 18 || pai == 26){
                return false;
            }
        }
        return true;
    }
    
    if(fn(gameSeatData.pengs) == false){
        return false;
    }
    if(fn(gameSeatData.angangs) == false){
        return false;
    }
    if(fn(gameSeatData.diangangs) == false){
        return false;
    }
    if(fn(gameSeatData.wangangs) == false){
        return false;
    }
    if(fn(gameSeatData.holds) == false){
        return false;
    }
    return true;
}

function isJiangDui(gameSeatData){
    var fn = function(arr){
        for(var i = 0; i < arr.length; ++i){
            var pai = arr[i];
            if(pai != 1 && pai != 4 && pai != 7
               && pai != 9 && pai != 13 && pai != 16
               && pai != 18 && pai != 21 && pai != 25
               ){
                return false;
            }
        }
        return true;
    }
    
    if(fn(gameSeatData.pengs) == false){
        return false;
    }
    if(fn(gameSeatData.angangs) == false){
        return false;
    }
    if(fn(gameSeatData.diangangs) == false){
        return false;
    }
    if(fn(gameSeatData.wangangs) == false){
        return false;
    }
    if(fn(gameSeatData.holds) == false){
        return false;
    }
    return true;
}

function computeFanScore(game,fan){
    if(fan > game.conf.maxFan){
        fan = game.conf.maxFan;
    }
    return (1 << fan) * game.conf.baseScore;
}

function getNumOfGen(seatData){
    var numOfGangs = seatData.diangangs.length + seatData.wangangs.length + seatData.angangs.length;
    for(var k = 0; k < seatData.pengs.length; ++k){
        var pai = seatData.pengs[k];
        if(seatData.countMap[pai] == 1){
            numOfGangs++;
        }
    }
    for(var k in seatData.countMap){
        if(seatData.countMap[k] == 4){
            numOfGangs++;
        }
    }
    return numOfGangs;
}

//计算结果
function calculateResult(game,roomInfo){
    var baseScore = game.conf.baseScore;
    var paixingxuanze = game.conf.paixingxuanze;
    console.log('paixingxuanze&&&& = ',paixingxuanze);
    console.log('guolin calculateResult =',game.gameSeats);

    for(var i = 0; i < game.gameSeats.length; ++i){
        var sd = game.gameSeats[i];

        console.log('guolin 111111111 = ',sd);
        // 杠所得分
        var additonalscore = 0;
        if (sd.actions != null) {
            for (var a = 0; a < sd.actions.length; ++a) {
                var ac = sd.actions[a];
                if (ac.type == "angang") {
                    additonalscore += ac.targets.length * 2;
                    for (var t = 0; t < ac.targets.length; ++t) {
                        var six = ac.targets[t];
                        game.gameSeats[six].score -= 2;
                    }
                } else if (ac.type == "diangang") {
                    additonalscore += ac.targets.length * 2;
                    for (var t = 0; t < ac.targets.length; ++t) {
                        var six = ac.targets[t];
                        game.gameSeats[six].score -= 2;
                    }
                } else if (ac.type == "wangang") {
                    additonalscore += ac.targets.length * 1;
                    for (var t = 0; t < ac.targets.length; ++t) {
                        var six = ac.targets[t];
                        game.gameSeats[six].score -= 1;
                    }
                }
            }
        }
        //炮子分；
        //sd.paoFen  = sd.paoZiNum * baseScore;

        //进行胡分结算
        for(var j = 0; j < sd.huInfo.length; ++j){
            var info = sd.huInfo[j];
            if(!info.pattern){
                continue;
            }
            console.log('guoli ssssssssss + seatIndex + button= ',sd.seatIndex+",s"+sd.button);
            //console.log('ggg + = ',sd);
            //翻数分
            var score = 0;
            if(info.fan > 0){
                score = info.fan*baseScore;
            }else{
                score = baseScore;
            }
            if(paixingxuanze == 1) {
                if (sd.seatIndex == sd.button) {
                    score = baseScore * 2;
                }
            }
            console.log('gl score ',score);
            if(info.isZiMo){
                for(var t in info.targets){
                    var si = info.targets[t];
                    var ddd = game.gameSeats[si];
                    ddd.paoFen = ddd.paoZiNum * baseScore;
                    sd.paoFen = sd.paoZiNum * baseScore;
                    sd.score += score*2 + (sd.paoFen + ddd.paoFen);
                    ddd.score -= score*2 + (sd.paoFen + ddd.paoFen);
                }
                sd.numZiMo++;
            }
            else{
                sd.paoFen = sd.paoZiNum*baseScore;
                game.gameSeats[info.target].paoFen = game.gameSeats[info.target].paoZiNum*baseScore;
                // console.log('info.targets = ',info.targets[info.target]);
                //收放炮者的钱
                sd.score += (score*2)+ (sd.paoZiNum + game.gameSeats[info.target].paoZiNum) * baseScore;
                game.gameSeats[info.target].score -= (score*2) + (sd.paoZiNum + game.gameSeats[info.target].paoZiNum) * baseScore;
                sd.numJiePao++;

            }

            if (info.isQiangGangHu && game.conf.qianggangquanbao) {
                console.log("qianggangquanbao");
                // 自摸扣分转移
                for (var t in info.targets) {
                    var si = info.targets[t];
                    var ddd = game.gameSeats[si];
                    var ttt = game.gameSeats[info.target];
                    if (si != info.target) {
                        ddd.score += 2;
                        ttt.score -= 2;
                    }
                }
            }

        }

        //一定要用 += 。 因为此时的sd.score可能是负的
        sd.score += additonalscore;
    }
    // for (var i = 0; i < game.gameSeats.length; ++i) {
    //     var sd = game.gameSeats[i];
    //     sd.score += sd.paoFen;
    // }
}

function doGameOver(roomInfo,forceEnd){
    console.log("doGameOver start.");
    if( !roomInfo ){
        console.log("rooInfo  is  null");
        return;
    }

    var roomId = roomInfo.id;
    var game = roomInfo.game;
    roomInfo.game = null;

    var results = [];
    var dbresult = [0,0,0,0];

    if(game){
        var userId = game.gameSeats[0].userId;
        if(!forceEnd){
            calculateResult(game,roomInfo);    
        }

        for(var i = 0; i < roomInfo.seats.length; ++i){
            var rs = roomInfo.seats[i];
            var sd = game.gameSeats[i];
            // console.log("gameSeats = ",sd.score);
            // console.log("roomInfo.seats =",rs.score);
            rs.ready = false;
            rs.score += sd.score;
            rs.numZiMo += sd.numZiMo;
            rs.numJiePao += sd.numJiePao;
            rs.numDianPao += sd.numDianPao;
            rs.numAnGang += sd.numAnGang;
            rs.numMingGang += sd.numMingGang;

            var userRT = {
                userId:sd.userId,
                actions:[],
                pengs:sd.pengs,
                wangangs:sd.wangangs,
                diangangs:sd.diangangs,
                angangs:sd.angangs,
                holds:sd.holds,
                score:sd.score,
                totalscore:rs.score,
                qingyise:sd.qingyise,
                menqing:sd.isMenQing,
                huinfo:sd.huInfo,
                paoziscore:sd.paoFen,
                paoZiNum:sd.paoZiNum,
                reason: ""
            };
            var actionArr = [];
            for (var j = 0; j < sd.huInfo.length; ++j) {
                var info = sd.huInfo[j];
                var str = "";
                if (!info.pattern) {
                    if (info.action == "beiqianggang") {
                        str = "被抢杠";
                    } else if (info.action == 'beizimo') {
                        str = '被自摸';
                    }else if(info.action == 'fangpao') {
                        str = '放炮';
                    }else if(info.action == 'gangpao') {
                        str = '杠炮';
                    }
                } else {
                    if (info.isQiangGangHu) {
                        str = "抢杠胡";
                    } else if (info.isZiMo) {
                        str = "自摸";
                    } else {
                        str = '接炮胡';
                    }
                }
                actionArr.push(str);
            }
            //console.log('pppppppppppppp======',actionArr);
            if (sd.angangs.length > 0) {
                actionArr.push("暗杠 x " + sd.angangs.length);
            }
            if (sd.diangangs.length > 0) {
                actionArr.push("点杠 x " + sd.diangangs.length);
            }
            if (sd.wangangs.length > 0) {
                actionArr.push("补杠 x " + sd.wangangs.length);
            }
            if (sd.fanggangs.length > 0) {
                actionArr.push("放杠 x " + sd.fanggangs.length);
            }
            if(sd.paoZiNum || sd.paoZiNum == 0){
                actionArr.push("炮子数 x " + sd.paoZiNum );
            }
            userRT.reason = actionArr.join("、");
            
            for(var k in sd.actions){
                userRT.actions[k] = {
                    type:sd.actions[k].type,
                    targets:sd.actions[k].targets
                };
            }
            results.push(userRT);
            dbresult[i] = sd.score;
            delete gameSeatsOfUsers[sd.userId];
        }
        delete games[roomId];

        var old = roomInfo.nextButton;
        // if(game.yipaoduoxiang >= 0){
        //     roomInfo.nextButton = game.yipaoduoxiang;
        // }
        // else 
	    if(game.firstHupai >= 0){
            roomInfo.nextButton = game.firstHupai;
        }
         else{
            roomInfo.nextButton = (game.turn + 1) % 4;
         }

        if(old != roomInfo.nextButton){
            db.update_next_button(roomId,roomInfo.nextButton);
        }
        console.log("this game end log");
    }
    
    var isEnd = forceEnd;

    if(!forceEnd && game){
        //保存游戏
        var ret = store_game(game);

        roomMgr.updateScores(roomInfo.id);

        db.update_game_result(roomInfo.uuid,game.gameIndex,dbresult);
            
        //记录玩家操作
        var str = JSON.stringify(game.actionList);
        db.update_game_action_records(roomInfo.uuid,game.gameIndex,str); 
    
        //保存游戏局数
        db.update_num_of_turns(roomId,roomInfo.numOfGames);

        isEnd = (roomInfo.numOfGames >= roomInfo.conf.maxGames);
        roomInfo.gameOverCounts = roomInfo.numOfGames;
    }
    if (roomInfo.conf.isTimeRoom) {
        isEnd = (isEnd );
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
                numminggang:rs.numMingGang
            });
        }   
    }
    console.log('endinfo = ', results);
    userMgr.broacastInRoom('game_over_push',{results:results,endinfo:endinfo},userId,true);
    //如果局数已够，则进行整体结算，并关闭房间
    if(isEnd){
        roomMgr.onRoomEnd(roomInfo, forceEnd);
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
            
            //所有自摸，暗杠，弯杠，都算三家
            if(i != seatData.seatIndex/* && s.hued == false*/){
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
        jings: game.jings,

    };

    //game seats
    data.seats = [];
    var seatData = null;
    for(var i = 0; i < 4; ++i){
        var sd = game.gameSeats[i];
        var s = {
            userid:sd.userId,
            folds:sd.folds,
            angangs:sd.angangs,
            diangangs:sd.diangangs,
            wangangs:sd.wangangs,
            pengs:sd.pengs,
            hued:sd.hued,
            huinfo:sd.huInfo,
            iszimo:sd.iszimo,
            paoZiNum: sd.paoZiNum,
        }
        if(sd.userId == userId){
            s.holds = sd.holds;
            s.huanpais = sd.huanpais;
            seatData = sd;
        }
        else{
            s.huanpais = sd.huanpais? []:null;
        }
        data.seats.push(s);
    }
    console.log('guolin  2017/9/26',data.seats);
    //同步整个信息给客户端
    userMgr.sendMsg(userId,'game_sync_push',data);
    sendOperations(game,seatData,game.chuPai);
}

function construct_game_base_info(game){
    var baseInfo = {
        type:game.conf.type,
        button:game.button,
        index:game.gameIndex,
        mahjongs:game.mahjongs,
        game_seats:new Array(4),
        jings: game.jings
    }
    for(var i = 0; i < 4; ++i){
        baseInfo.game_seats[i] = game.gameSeats[i].holds;
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
console.log("guolin  new game begin = "+roomInfo);
console.log(roomInfo);
    var game = {
        conf:roomInfo.conf,
        roomInfo:roomInfo,
        gameIndex:roomInfo.numOfGames,

        button:roomInfo.nextButton,
        mahjongs:new Array(108),

        currentIndex:0,
        gameSeats:new Array(4),

        //TODO: 轮到谁摸牌打牌
        numOfChoosePaoZi:0,
        turn:0,
        chuPai:-1,
        state:"idle",
        firstHupai: -1,
        yipaoduoxiang: -1,
        fangpaoshumu: -1,
        actionList:[],
        chupaiCnt:0,
        numOfHued:0,
        lastChuPaiTurn:-1,
        jingMap:{}
    };

    roomInfo.numOfGames++;
    roomInfo.game = game;

    for(var i = 0; i < 4; ++i){
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
        // 牌型
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
        //
        data.actions = [];

        //是否是自摸
        data.iszimo = false;
        data.isGangHu = false;
        data.fan = 0;
        data.score = 0;
        data.huInfo = [];
        
        
        data.lastFangGangSeat = -1;
        
        //统计信息
        data.numZiMo = 0;
        data.numJiePao = 0;
        data.numDianPao = 0;
        data.numAnGang = 0;
        data.numMingGang = 0;
        //炮子
        data.paoZiNum = 0;
        data.paoFen = 0;
        // 放杠的牌
        data.fanggangs = [];
        data.t_paoZiNum = -1;

        gameSeatsOfUsers[data.userId] = data;
    }
    games[roomId] = game;
    //洗牌
    shuffle(game);
    //发牌
    deal(game);

    var numOfMJ = game.mahjongs.length - game.currentIndex;
    var isPaoZi = roomInfo.conf.paoZiNum;
    console.log("seats.length ^^^^^ =" +seats.length);
    for(var i = 0; i < seats.length; ++i){
        //开局时，通知前端必要的数据
        var s = seats[i];
        //通知玩家手牌
        userMgr.sendMsg(s.userId,'game_holds_push',game.gameSeats[i].holds);
        //通知还剩多少张牌
        userMgr.sendMsg(s.userId,'mj_count_push',numOfMJ);
        //通知还剩多少局
        userMgr.sendMsg(s.userId,'game_num_push',roomInfo.numOfGames);
        //userMgr.sendMsg(s.userId, 'game_jings_push', game.jings);

        //通知游戏开始
        userMgr.sendMsg(s.userId,'game_begin_push',game.button);


        game.state = "choosePaoZiNum";
        userMgr.sendMsg(s.userId,'choose_pao_zi');

    }

};

// exports.choosePaoZi = function(uerId,paoZiNum){
//
// }

//前端调用 返回 选择的袍子数的接口
exports.dingQue = function(userId,paoZiNum){
    var seatData = gameSeatsOfUsers[userId];
    console.log('steatData 888888 = '+ seatData);
    if(seatData == null){
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;
    if(game.state != "choosePaoZiNum"){
        console.log("can't recv choosePaoZiNum when game.state == " + game.state);
        return;
    }

    if(seatData.t_paoZiNum < 0){
        seatData.paoZiNum = parseInt(paoZiNum);
        game.numOfChoosePaoZi ++;
    }
    console.log('888888888888 8888***** = '+game.numOfChoosePaoZi);
    console.log('guolin 2017/ seatData.paoZiNum + ='+ seatData.paoZiNum);
    //检查玩家可以做的动作
    //如果4个人都选择炮子了，通知庄家出牌
    if(game.numOfChoosePaoZi == 4){
        construct_game_base_info(game);

        var arr = [1,1,1,1];
        for(var i = 0; i < game.gameSeats.length; ++i){
            arr[i] = game.gameSeats[i].paoZiNum;
        }
        userMgr.broacastInRoom('game_choosePaoZiNum_finish_push',arr,seatData.userId,true);
        userMgr.broacastInRoom('game_playing_push',null,seatData.userId,true);

        var turnSeat = game.gameSeats[game.turn];
        game.state = "playing";
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
    else{
        userMgr.broacastInRoom('game_choosePaoZi_notify_push',seatData.userId,seatData.userId,true);
    }
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

    if(seatData.canChuPai == false){
        console.log('no need chupai.');
        return;
    }

    if(hasOperations(seatData)){
        console.log('plz guo before you chupai.');
        return;
    }

    //从此人牌中扣除
    var index = seatData.holds.indexOf(pai);
    console.log(index);
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
    //game.lastChuPaiTurn = seatData.seatIndex;//标记最后一个打出

    recordGameAction(game,seatData.seatIndex,ACTION_CHUPAI,pai);
    //sleep(10000);
      //userMgr.broacastInRoom('game_chupai_notify_push',{userId:seatData.userId,pai:10},seatData.userId,true); //测试出牌修复
    userMgr.broacastInRoom('game_chupai_notify_push',{userId:seatData.userId,pai:pai},seatData.userId,true);
    
    //检查是否有人要碰 要杠;
    var hasActions = false;
    for(var i = 0; i < game.gameSeats.length; ++i){
        //玩家自己不检查
        if(game.turn == i){
            continue;
        }
        var ddd = game.gameSeats[i];

        checkCanPeng(game,ddd,pai);
        checkCanDianGang(game,ddd,pai);
        checkCanHu(game,ddd,pai);
        if(hasOperations(ddd)){
            sendOperations(game,ddd,game.chuPai);
            hasActions = true;    
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

function doPeng(game,seatData,data){
    var pai = data;
    console.log('seatData = ',seatData);
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
    game.lastChuPaiTurn = -1;

    recordGameAction(game,seatData.seatIndex,ACTION_PENG,pai);

    //广播通知其它玩家
    userMgr.broacastInRoom('peng_notify_push',{userid:seatData.userId,pai:pai},seatData.userId,true);

    //碰的玩家打牌
    moveToNextUser(game,seatData.seatIndex);
    
    //广播通知玩家出牌方
    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push',seatData.userId,seatData.userId,true);
}

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

    
    //验证手上的牌的数目
    var pai = game.chuPai;
    var c = seatData.countMap[pai];
    if(c == null || c < 2){
        console.log("pai:" + pai + ",count:" + c);
        console.log(seatData.holds);
        console.log("lack of mj.");
        return;
    }

    doAction(game,seatData,'peng',pai);
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

//验证是否抢杠胡
function checkCanQiangGang(game,turnSeat,seatData,pai){
    if (!game.conf.keqiangganghu) {
        return false;
    }
    var hasActions = false;
    for(var i = 0; i < game.gameSeats.length; ++i){
        //杠牌者不检查
        if(seatData.seatIndex == i){
            continue;
        }
        var ddd = game.gameSeats[i];
        game.isQiangGangHuing = true;
        checkCanHu(game,ddd,pai);
        game.isQiangGangHuing = false;
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
    //game.lastChuPaiTurn = -1;
    var seatIndex = seatData.seatIndex;
    var gameTurn = turnSeat.seatIndex;
    seatData.guoHuFan = - 1;
    var isZhuanShouGang = false;
    if(gangtype == "wangang"){
        var idx = seatData.pengs.indexOf(pai);
        if(idx >= 0){
            seatData.pengs.splice(idx,1);
        }
        
        //如果最后一张牌不是杠的牌，则认为是转手杠
        if(seatData.holds[seatData.holds.length - 1] != pai){
            isZhuanShouGang = true;
        }
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
        ac.score = game.conf.baseScore*2;
    }
    else if(gangtype == "diangang"){
        seatData.diangangs.push(pai);
        var ac = recordUserAction(game,seatData,"diangang",gameTurn);
        ac.score = game.conf.baseScore*2;
        //add 放杠的牌
        turnSeat.fanggangs.push(pai);
        var fs = turnSeat;
        recordUserAction(game,fs,"fanggang",seatIndex);
    }
    else if(gangtype == "wangang"){
        seatData.wangangs.push(pai);
        if(isZhuanShouGang == false){
            var ac = recordUserAction(game,seatData,"wangang");
            ac.score = game.conf.baseScore;            
        }
        else{
            recordUserAction(game,seatData,"zhuanshougang");
        }

    }

    //通知其他玩家，有人杠了牌
    userMgr.broacastInRoom('gang_notify_push',{
        userid:seatData.userId,
        pai:pai,
        gangtype:gangtype},seatData.userId,true);

    //变成自己的轮子
    moveToNextUser(game,seatIndex);
    //再次摸牌
    doUserMoPai(game,gameTurn);
}

function doGang0(game,seatData,data){
    var pai = data;
    var seatIndex = seatData.seatIndex;

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
    
    //如果是弯杠（及碰杠），则需要检查是否可以抢杠
    var turnSeat = game.gameSeats[game.turn];
    if(numOfCnt == 1){
        var canQiangGang = checkCanQiangGang(game,turnSeat,seatData,pai);
        if(canQiangGang){
            return;
        }
    }
    
    doGang(game,turnSeat,seatData,gangtype,numOfCnt,pai);
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
    
    var numOfCnt = seatData.countMap[pai];

    //胡了的，只能直杠
    if(numOfCnt != 1 && seatData.hued){
        console.log('you have already hued. no kidding plz.');
        return;
    }

    if(seatData.gangPai.indexOf(pai) == -1){
        console.log("the given pai can't be ganged.");
        return;   
    }

    doAction(game,seatData,'gang',pai);
};

function doHu(game,seatData,pai,data){
    //game.lastChuPaiTurn = -1;
    //标记为和牌
    var seatIndex = seatData.seatIndex;
    seatData.hued = true;
    var hupai = game.chuPai;
    var isZimo = false;

    var turnSeat = game.gameSeats[game.turn];
    var notify = -1;

    seatData.huInfo.push(seatData.tingInfo);
    
    if(game.qiangGangContext != null){
        hupai = game.qiangGangContext.pai;
        var gangSeat = game.qiangGangContext.seatData;
        notify = hupai;
        
        recordGameAction(game,seatIndex,ACTION_HU,hupai);
        game.qiangGangContext.isValid = false;
        
        var idx = gangSeat.holds.indexOf(hupai);
        if(idx != -1){
            gangSeat.holds.splice(idx,1);
            gangSeat.countMap[hupai]--;
            userMgr.sendMsg(gangSeat.userId,'game_holds_push',gangSeat.holds);
        }
        
        gangSeat.huInfo.push({
            action:"beiqianggang",
            target:seatData.seatIndex,
            index:seatData.huInfo.length-1,
        });
    }
    // else if(game.turn == seatData.seatIndex){//修改：自摸错误
    //     isZimo = true;
    // }
    else if(game.chuPai == -1){
        hupai = seatData.holds.pop();
        seatData.countMap[hupai] --;
        notify = hupai;

        isZimo = true;    
        recordGameAction(game,seatIndex,ACTION_ZIMO,hupai);
        for(var i = 0; i < seatData.tingInfo.targets.length; ++i){
            var si = seatData.tingInfo.targets[i];
            var ts = game.gameSeats[si];
            ts.huInfo.push({
                action:"beizimo",
                target:seatData.seatIndex,
                index:seatData.huInfo.length-1,
            });
        }
    }
    else{
        notify = game.chuPai;
        var at = "hu";
        //炮胡
        if(turnSeat.lastFangGangSeat >= 0){
            at = "gangpaohu";
        }

        //毛转雨
        if(turnSeat.lastFangGangSeat >= 0){
            for(var i = turnSeat.actions.length-1; i >= 0; --i){
                var t = turnSeat.actions[i];
                if(t.type == "diangang" || t.type == "wangang" || t.type == "angang"){
                    t.state = "nop";
                    t.payTimes = 0;

                    var nac = {
                        type:"maozhuanyu",
                        owner:turnSeat,
                        ref:t
                    }
                    seatData.actions.push(nac);
                    break;
                }
            }
        }

        //记录玩家放炮信息
        var fs = game.gameSeats[game.turn];
        if(at == "gangpaohu"){
            at = "gangpao";
        }
        else{
            at = "fangpao";
        }
        fs.huInfo.push({
            action:at,
            target:seatData.seatIndex,
            index:seatData.huInfo.length-1,
        });

        recordGameAction(game,seatIndex,ACTION_HU,hupai);
    }

    //通知前端，有人和牌了
    userMgr.broacastInRoom('hu_push',{seatindex:seatIndex,iszimo:isZimo,hupai:notify},seatData.userId,true);
    
    if(game.firstHupai < 0){
        game.firstHupai = seatIndex;
    }
}

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

    if(seatData.hued){
        return;
    }

    doAction(game,seatData,'hu',null);
};

exports.guo = function(userId){
    var seatData = gameSeatsOfUsers[userId];
    if(seatData == null){
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果玩家没有对应的操作，则也认为是非法消息
    if((seatData.canGang || seatData.canPeng || seatData.canHu) == false){
        console.log("no need guo.");
        return;
    }

    //如果是玩家自己的轮子，不是接牌，则不需要额外操作
    var doNothing = game.chuPai == -1 && game.turn == seatIndex;

    userMgr.sendMsg(seatData.userId,"guo_result");

    //如果还有人可以操作，则等待
    var ret = doAction(game,seatData,'guo',null);
    if(ret){
        return;
    }

    if(doNothing){
        return;
    }

    //如果是已打出的牌，则需要通知。
    if(game.chuPai >= 0){
        var turnSeat = game.gameSeats[game.turn];
        var uid = turnSeat.userId;
        userMgr.broacastInRoom('guo_notify_push',{userId:uid,pai:game.chuPai},seatData.userId,true);
        turnSeat.folds.push(game.chuPai);
        game.chuPai = -1;
    }
    
    
    var qiangGangContext = game.qiangGangContext;
    //清除所有的操作
    clearAllOptions(game);
    
    if(qiangGangContext != null && qiangGangContext.isValid){
        console.log("guolin qiangGangContext 88888");
        doGang(game,qiangGangContext.turnSeat,qiangGangContext.seatData,"wangang",1,qiangGangContext.pai);        
    }
    else{
        //下家摸牌
        moveToNextUser(game);
        doUserMoPai(game);
    }
};

exports.doGameOver = doGameOver;


var DI_FEN = [1,2,5];
var MAX_FAN = [2,3,4];
var JU_SHU = [4,8,16];
var JU_SHU_COST = [2,3,6];

exports.checkConf = function(roomConf,gems){
    if (roomConf.jushuxuanze == null
        || roomConf.type == null) {
        return 1;
    }

	if(roomConf.jushuxuanze < 0 || roomConf.jushuxuanze > JU_SHU.length){
		return 1;
	}
	
	var cost = JU_SHU_COST[roomConf.jushuxuanze];
    if(roomConf.aa){
        cost = Math.ceil(cost / 4);
    }
	if(cost > gems){
		return 2;
	}
    roomConf.cost = cost;
    return 0;
}

//获取配置文件
exports.getConf = function(roomConf,creator){
    console.log("getConf start.");
    console.log("guolin *******************99999")
    console.log(roomConf);
    var ret = {
        type: roomConf.type,
        baseScore: 1,
        cost: roomConf.cost,
        zimo: roomConf.zimo,
        jiangdui: roomConf.jiangdui,
        dianganghua: parseInt(roomConf.dianganghua),
        menqing: roomConf.menqing,
        tiandihu: roomConf.tiandihu,
        paoZiNum:roomConf.paoZiNum,
        paixingxuanze:roomConf.paixingxuanze,
        maxGames: JU_SHU[roomConf.jushuxuanze],
        creator: creator,
        keqiangganghu: roomConf.keqiangganghu,
        qianggangquanbao: roomConf.qianggangquanbao,
        budaifeng: roomConf.budaifeng,
        putongpinghu:roomConf.putongpinghu,
        discription: "",

    };
    var arrStr = [];
    if (roomConf.putongpinghu) {
        arrStr.push("普通平胡");
    }
    if (roomConf.paixingxuanze == 0) {
        arrStr.push("可胡七对(加番)");
    }else if(roomConf.paixingxuanze == 1){
        arrStr.push("庄家翻倍");
    }

    ret.discription = arrStr.join(" ");
    return ret;
}

