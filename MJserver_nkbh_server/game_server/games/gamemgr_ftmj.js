// 飞听麻将
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

function getMJType(id) {
    if (id >= 0 && id < 9) {
        //筒
        return 0;
    }
    else if (id >= 9 && id < 18) {
        //条
        return 1;
    }
    else if (id >= 18 && id < 27) {
        //万
        return 2;
    }
}

function getPointOfPai(pai) {
    pai = parseInt(pai);
    var type = getMJType(pai);
    if (type == 0) {
        return pai + 1;
    }
    else if (type == 1) {
        return pai - 9 + 1;
    }
    else if (type == 2) {
        return pai - 18 + 1;
    }
    else {
        return 10;
    }
}

function shuffle(game) {

    var mahjongs = game.mahjongs;

    //筒 (0 ~ 8 表示筒子
    var index = 0;
    for (var i = 0; i < 9; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }

    //条 9 ~ 17表示条子
    for (var i = 9; i < 18; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }

    //万
    //条 18 ~ 26表示万
    for (var i = 18; i < 27; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }

    //东南西北中发白
    for (var i = 27; i < 34; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }

    //春夏秋冬梅兰竹菊
    for (var i = 34; i < 42; ++i) {
        mahjongs[index] = i;
        index++;
    }
    //return;
    for (var i = 0; i < mahjongs.length; ++i) {
        var lastIndex = mahjongs.length - 1 - i;
        var index = Math.floor(Math.random() * lastIndex);
        var t = mahjongs[index];
        mahjongs[index] = mahjongs[lastIndex];
        mahjongs[lastIndex] = t;
    }
}

function mopai(game, seatIndex) {
    if (game.currentIndex == game.mahjongs.length) {
        return -1;
    }
    var data = game.gameSeats[seatIndex];
    var mahjongs = data.holds;
    var pai = game.mahjongs[game.currentIndex];
    mahjongs.push(pai);

    //统计牌的数目 ，用于快速判定（空间换时间）
    var c = data.countMap[pai];
    if (c == null) {
        c = 0;
    }
    data.countMap[pai] = c + 1;
    game.currentIndex++;
    return pai;
}

function isHua(game, pai) {
    //如果是东南西北中发白，春夏秋冬，梅兰竹菊，则要补花
    if (pai >= 27) {
        return true;
    }
    return false;
}

function buhua(game, seatData, pai) {
    //移除花牌
    var index = seatData.holds.indexOf(pai);
    seatData.holds.splice(index, 1);
    seatData.countMap[pai]--;
    //把花记录下来
    if (!seatData.huaMap[pai]) {
        seatData.huaMap[pai] = 1;
    }
    else {
        seatData.huaMap[pai]++;
    }
}

function deal(game) {
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
function checkCanPeng(game, seatData, targetPai) {
    //默认可杠不可碰
    return;
    //if(!game.conf.kepenggang || seatData.isBaoTing){
    if (seatData.isBaoTing) {
        return;
    }
    if (getMJType(targetPai) == seatData.que) {
        return;
    }
    var count = seatData.countMap[targetPai];
    if (count != null && count >= 2) {
        seatData.canPeng = true;
    }
}

//检查是否可以点杠
function checkCanDianGang(game, seatData, targetPai) {
    //默认可杠不可碰
    //if(!game.conf.kepenggang || seatData.isBaoTing){
    //飞听麻将不可杠别人的牌
    return;
    if (seatData.isBaoTing) {
        return;
    }
    //检查玩家手上的牌
    //如果没有牌了，则不能再杠
    if (game.mahjongs.length <= game.currentIndex) {
        return;
    }
    if (getMJType(targetPai) == seatData.que) {
        return;
    }
    var count = seatData.countMap[targetPai];
    if (count != null && count >= 3) {
        seatData.canGang = true;
        seatData.gangPai.push(targetPai);
        return;
    }
}

function checkIfCanTingAfterGang(game,seatData,pai){
    //备份手牌
    var holds = seatData.holds.concat();

    //移除要杠的手牌
    for(var i = 0; i < 4; ++i){
        var index = seatData.holds.indexOf(pai);
        seatData.holds.splice(index,1);
    }
    seatData.countMap[pai] = 0;

    var canTing = false;

    for(var i = 0; i < 27; ++i){
        seatData.holds.push(i);
        if(seatData.countMap[i]){
            seatData.countMap[i]++;
        }
        else{
            seatData.countMap[i] = 1;
        }

        
        var ret = mjutils.checkCanHu(game.jingMap,seatData,-1,true);

        var index = seatData.holds.indexOf(i);
        seatData.holds.splice(index,1);
        seatData.countMap[i]--;

        if(ret){
            canTing = true;
            break;
        }
    }

    //恢复
    seatData.holds = holds;
    seatData.countMap[pai] = 4;

    return canTing;
}

//检查是否可以暗杠
function checkCanAnGang(game, seatData) {
    //如果没有牌了，则不能再杠
    if (game.mahjongs.length <= game.currentIndex) {
        return;
    }

    for (var key in seatData.countMap) {
        var pai = parseInt(key);
        if (game.jingMap[pai]) {
            continue;
        }
        var c = seatData.countMap[pai];
        if (c != null && c == 4) {
            //报听状态下，要检查杠牌后是否可以继续听牌
            if (seatData.isBaoTing) {
                var ret = checkIfCanTingAfterGang(game,seatData,pai);
                //如果不能叫牌，则跳过此牌。
                if(!ret){
                    continue;
                }
            }
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }
    }
}

//检查是否可以弯杠(自己摸起来的时候)
function checkCanWanGang(game, seatData) {
    //如果不能碰杠，则返回
    //默认可杠不可碰
    //if(!game.conf.kepenggang){
    //    return;
    //}
    //如果没有牌了，则不能再杠
    return;
    if (game.mahjongs.length <= game.currentIndex) {
        return;
    }

    //安徽麻将不允许过手杠 所以只检查最后一张牌
    var pai = seatData.holds[seatData.holds.length - 1];
    if (seatData.pengs.indexOf(pai) != -1) {
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


//检查是否为一条龙的规则很简单。 如果手上的牌能够抽出一条龙（包括混牌），则将牌去除，检查剩下的牌是否可以胡。

function checkYiTiaoLong(game,gameSeatData){
    var countMap = gameSeatData.countMap;
    var jingCnt = 0;
    for(var k in game.jingMap){
        var numPai = gameSeatData.countMap[k];
        if(numPai){
            jingCnt += numPai;
        }
    }

    var is9ones = function(a,b){
        var needJing = 0;
        var arr = [];
        for(var i = a; i < b; ++i){
            if(game.jingMap[i] || !countMap[i]){
                needJing++;
            }
            else if(countMap[i]){
                arr.push(i);
            }
            if(needJing > jingCnt){
                return null;
            }
        }
        if(arr.length + needJing == 9){
            for(var i = 0; i < needJing; ++i){
                arr.push(game.jings[0]);
            }
            return arr;
        }
        else{
            return null;
        }
    }

    var checkLong = function(a,b){
        var arr = is9ones(a,b);
        if(arr != null){
            var oldHolds = gameSeatData.holds.concat();
            for(var i = 0; i < arr.length; ++i){
                var pai = arr[i];
                var idx = gameSeatData.holds.indexOf(pai);
                gameSeatData.holds.splice(idx,1);
                gameSeatData.countMap[pai]--;
            }
            var ret = mjutils.checkCanHu(game.jingMap,gameSeatData);

            gameSeatData.holds = oldHolds;
            for(var i = 0; i < arr.length; ++i){
                var pai = arr[i];
                gameSeatData.countMap[pai]++;
            }

            return ret != null;
        }
        return false;
    }
    
    //检查筒条万是否为一条龙
    return checkLong(0,9) || checkLong(9,18) || checkLong(18,27);
}

function getTings(game, seatData) {
    var lastPai = seatData.holds.pop();
    seatData.countMap[lastPai]--;

    var oldTingInfo = seatData.tingInfo;
    var oldHu = seatData.canHu;

    var tingMap = {};
    var tingCount = 0;

    var holds = seatData.holds.concat();
    //逐个检查
    for (var i = 0; i < 27; ++i) {
        seatData.holds.push(i);
        if (seatData.countMap[i]) {
            seatData.countMap[i]++;
        }
        else {
            seatData.countMap[i] = 1;
        }

        var pattern = mjutils.checkCanHu(game.jingMap, seatData, -1, true);
        if (pattern != null) {
            tingMap[i] = i;
            tingCount++;
        }

        var index = seatData.holds.indexOf(i);
        seatData.holds.splice(index,1);
        seatData.countMap[i]--;
    }

    seatData.holds = holds;
    seatData.holds.push(lastPai);
    seatData.countMap[lastPai]++;

    seatData.tingInfo = oldTingInfo;
    seatData.canHu = oldHu;

    return { tingCount: tingCount, tingMap: tingMap };
}

//计算一、九花
//成对，成副，成杠，都算花。
function isYaoJiu(pai){
    pai %= 9;
    return pai == 0 || pai == 8;
}
function computeYaoJiuHua(game,seatData,is7pairs){
    var huaArr = [];
    if(is7pairs){
        for(var k in seatData.holds){
            var pai = seatData.holds[k];
            if(isYaoJiu(pai)){
                huaArr.push(pai);
            }
        }
        return huaArr;
    }

    //暗杠算花
    for(var i = 0; i < seatData.angangs.length; ++i){
        var pai = seatData.angangs[i];
        if(isYaoJiu(pai)){
            for(var k = 0; k < 4; ++k){
                huaArr.push(pai);
            }
        }
    }

    //统计出所有的数目大于等于2的一九牌
    var arr = [];
    for(var k in seatData.countMap){
        var pai = parseInt(k);
        var num = seatData.countMap[pai];
        if(num >= 2 && isYaoJiu(pai)){
            arr.push({
                pai:pai,
                num:seatData.countMap[pai],
            });
        }
    }

    //统计有多少牌成副。
    var fn = function(ignore){
        var ret = [];
        for(var k = 0; k < arr.length; ++k){
            if(k == ignore){
                continue;
            }
            var info = arr[k];
            if(info.num >= 3){
                //扣除掉3张牌，并判断是否能胡牌。
                for(var i = 0; i < 3; ++i){
                    var index = seatData.holds.indexOf(info.pai);
                    seatData.holds.splice(index,1);
                }
                seatData.countMap[info.pai] -= 3;

                //判断是否可以胡牌
                var canHu = mjutils.checkCanHu(game.jingMap,seatData,-1);

                //恢复手牌
                for(var i = 0; i < 3; ++i){
                    seatData.holds.push(info.pai);
                }
                seatData.countMap[info.pai] += 3;

                //+3花
                if(canHu){
                    for(var i = 0; i < 3; ++i){
                        ret.push(info.pai);
                    }
                }
            }
        }
        return ret;
    }

    var oldHolds = seatData.holds.concat();

    //假如是非一九作将，直接统计
    var huaOf19 = fn();

    //假如是一九作将
    for(var k = 0; k < arr.length; ++k){
        var info = arr[k];
        //扣除掉2张牌，并判断是否能成牌。
        for(var i = 0; i < 2; ++i){
            var index = seatData.holds.indexOf(info.pai);
            seatData.holds.splice(index,1);
        }
        seatData.countMap[info.pai] -= 2;

        //判断是否可以胡牌
        var canGo = mjutils.checkSingle(seatData,false);

        //恢复手牌
        for(var i = 0; i < 2; ++i){
            seatData.holds.push(info.pai);
        }
        seatData.countMap[info.pai] += 2;

        if(canGo){
            var huas = fn(k);
            for(var i = 0; i < 2; ++i){
                huas.push(info.pai);
            }
            if(huas.length > huaOf19.length){
                huaOf19 = huas;
            }
        }
    }

    huaArr = huaArr.concat(huaOf19);

    //恢复手牌。
    seatData.holds = oldHolds;
    return huaArr;
}

function checkCanHu(game, seatData, targetPai, baoTingCheck) {
    //未报听的不让胡。
    if (!baoTingCheck && !seatData.isBaoTing) {
        return;
    }
    game.lastHuPaiSeat = -1;
    seatData.canHu = false;
    seatData.tingInfo = null;

    if (targetPai != null) {
        seatData.holds.push(targetPai);
        if (seatData.countMap[targetPai]) {
            seatData.countMap[targetPai]++;
        }
        else {
            seatData.countMap[targetPai] = 1;
        }
    }

    var pattern = mjutils.checkCanHu(game.jingMap, seatData, -1, true);
    
    if (pattern != null) {
        seatData.canHu = true;
        seatData.tingInfo = {
            pattern: pattern,
            fan: 0,
            pai: targetPai,
        }
        //对七 + 20花
        if (pattern == "7pairs") {
            seatData.tingInfo.fan = 20;
        }
        //碰碰胡，20花
        else if (pattern == '4melds') {
            seatData.tingInfo.fan = 50;
        }

        //一条龙
        seatData.isYiTiaoLong = checkYiTiaoLong(game,seatData);
        seatData.isYaDang = false;
        seatData.isShuangYaDang = false;
        seatData.isDaDiaoChe = false;
        seatData.isDuiDao = false;
        //飞听模式下的其他加花情况
        /*
        压档：飞听中间的一张牌或飞听一二胡三、八九胡七的情况，加10花。 
        对倒：飞听两对牌的任意一张，加10花。 
        大吊车：飞听一对头子，加10花。 
        豪华七对：手中除5个对外，飞听磴字，加30花。 
        */
        if (seatData.isFeiTing) {
            //首先统计能胡的张数
            var tings = getTings(game, seatData);
            var lastPai = seatData.holds[seatData.holds.length - 1];
            //飞听情况下，如果是飞听蹬字，则算豪华7对，则再加20花
            if (pattern == '7pairs') {
                if (seatData.countMap[lastPai] == 4) {
                    seatData.tingInfo.pattern = 'l7pairs';
                    var cnt = 0;
                    for(var k in seatData.countMap){
                        if(seatData.countMap[k] == 4){
                            cnt++;
                        }
                    }
                    if(cnt == 2){
                        seatData.tingInfo.pattern = 'sl7pairs';
                    }
                    else if(cnt == 3){
                        seatData.tingInfo.pattern = 'sanl7pairs';
                    }
                }
                seatData.isDaDiaoChe = tings.tingCount == 1;
            }
            else {
                if (tings.tingCount == 1) {
                    //胡一张牌的情况中，可能是大吊车，也可能是压档
                    //判定方法， 移除一对牌，如果剩下的能熟列，则表示是大吊车。
                    if (seatData.countMap[lastPai] >= 2) {
                        seatData.countMap[lastPai] -= 2;
                        seatData.holds.pop();
                        var idx = seatData.holds.indexOf(lastPai);
                        seatData.holds.splice(idx, 1);

                        seatData.isDaDiaoChe = mjutils.checkSingle(seatData, false);

                        seatData.holds.push(lastPai);
                        seatData.holds.push(lastPai);
                        seatData.countMap[lastPai] += 2;
                    }

                    //大吊车和压档，其中一个。
                    seatData.isYaDang = !seatData.isDaDiaoChe;
                    seatData.isShuangYaDang = false;
                    //如果是压档，则判定是不是双压档
                    if (seatData.isYaDang) {
                        if (seatData.countMap[lastPai - 1] >= 2
                            && seatData.countMap[lastPai + 1] >= 2) {
                            seatData.isShuangYaDang = true;
                        }

                        //如果上一步判定双压档失败，还得考虑边张
                        if (!seatData.isShuangYaDang) {
                            var pt = getPointOfPai(lastPai);
                            if (pt == 3) {
                                if (seatData.countMap[lastPai - 1] >= 2
                                    && seatData.countMap[lastPai - 2] >= 2) {
                                    seatData.isShuangYaDang = true;
                                }
                            }
                            else if (pt == 7) {
                                if (seatData.countMap[lastPai + 1] >= 2
                                    && seatData.countMap[lastPai + 2] >= 2) {
                                    seatData.isShuangYaDang = true;
                                }
                            }
                        }
                    }
                }
                else if (tings.tingCount == 2) {
                    //胡两张牌的情况下，可能是对倒，也可能是普通胡。
                    //判定方法，移除3张胡牌，和2张另外的听了但是没胡的牌，剩余的牌可以熟列，则算对倒。

                    //检查牌是否足够
                    var isEnough = true;
                    for (var k in tings.tingMap) {
                        var pai = tings.tingMap[k];
                        var needCnt = 2;
                        if (pai == lastPai) {
                            needCnt = 3;
                        }
                        if (seatData.countMap[pai] < needCnt) {
                            isEnough = false;
                            break;
                        }
                    }

                    seatData.isDuiDao = false;
                    if (isEnough) {
                        //如果牌足，则进行接下来的处理
                        for (var k in tings.tingMap) {
                            var pai = tings.tingMap[k];
                            var cnt = 2;
                            if (pai == lastPai) {
                                cnt = 3;
                            }
                            for (var i = 0; i < cnt; ++i) {
                                var idx = seatData.holds.indexOf(pai);
                                seatData.holds.splice(idx, 1);
                            }
                            seatData.countMap[pai] -= cnt;
                        }

                        seatData.isDuiDao = mjutils.checkSingle(seatData, false);

                        //复原
                        for (var k in tings.tingMap) {
                            var pai = tings.tingMap[k];
                            for (var i = 0; i < 2; ++i) {
                                seatData.holds.push(pai);
                            }
                            seatData.countMap[pai] += 2;
                        }

                        seatData.holds.push(lastPai);
                        seatData.countMap[lastPai]++;
                    }
                }
            }
        }
    }

    if (targetPai != null) {
        seatData.holds.pop();
        seatData.countMap[targetPai]--;
    }
}

function clearAllOptions(game, seatData) {
    var fnClear = function (sd) {
        sd.canPeng = false;
        sd.canGang = false;
        sd.gangPai = [];
        sd.canHu = false;
        sd.lastFangGangSeat = -1;
    }
    if (seatData) {
        fnClear(seatData);
    }
    else {
        game.qiangGangContext = null;
        for (var i = 0; i < game.gameSeats.length; ++i) {
            fnClear(game.gameSeats[i]);
        }
    }
}

function getSeatIndex(userId) {
    var seatIndex = roomMgr.getUserSeat(userId);
    if (seatIndex == null) {
        return null;
    }
    return seatIndex;
}

function getGameByUserID(userId) {
    var roomId = roomMgr.getUserRoom(userId);
    if (roomId == null) {
        return null;
    }
    var game = games[roomId];
    return game;
}

function hasOperations(seatData) {
    if (seatData.canGang || seatData.canPeng || seatData.canHu) {
        return true;
    }
    return false;
}

function sendOperations(game, seatData, pai) {
    if (hasOperations(seatData)) {
        if (pai == -1) {
            pai = seatData.holds[seatData.holds.length - 1]; //抢杠胡 这里 玩家重新 连接网络 会有问题 
        }

        var data = {
            pai: pai,
            hu: seatData.canHu,
            peng: seatData.canPeng,
            gang: seatData.canGang,
            gangpai: seatData.gangPai
        };

        //如果可以有操作，则进行操作
        userMgr.sendMsg(seatData.userId, 'game_action_push', data);

        data.si = seatData.seatIndex;
    }
    else {
        userMgr.sendMsg(seatData.userId, 'game_action_push');
    }
}

function moveToNextUser(game, nextSeat) {
    //找到下一个没有和牌的玩家
    if (nextSeat == null) {
        while (true) {
            game.turn++;
            game.turn %= game.gameSeats.length;
            var turnSeat = game.gameSeats[game.turn];
            if (turnSeat.hued == false) {
                return;
            }
        }
    }
    else {
        game.turn = nextSeat;
    }
}

function doUserMoPai(game) {
    game.chuPai = -1;
    var turnSeat = game.gameSeats[game.turn];
    turnSeat.lastFangGangSeat = -1;
    turnSeat.guoHuFan = -1;
    var pai = mopai(game, game.turn);

    //牌摸完了，结束
    if (pai == -1) {
        doGameOver(game.roomInfo);
        return;
    }
    else {
        var numOfMJ = game.mahjongs.length - game.currentIndex;
        userMgr.broacastInRoom('mj_count_push', numOfMJ, turnSeat.userId, true);
    }

    //补花
    if (isHua(game, pai)) {
        buhua(game, turnSeat, pai);
        recordGameAction(game, game.turn, ACTION_BUHUA, pai);
        userMgr.broacastInRoom('game_newhua_push', { si: turnSeat.seatIndex, pai: pai }, turnSeat.userId, true);
        doUserMoPai(game);
        return;
    }

    recordGameAction(game, game.turn, ACTION_MOPAI, pai);

    //通知前端新摸的牌
    userMgr.sendMsg(turnSeat.userId, 'game_mopai_push', pai);
    //检查是否可以暗杠或者胡
    //检查胡，直杠，弯杠
    checkCanAnGang(game, turnSeat);
    checkCanWanGang(game, turnSeat, pai);

    //检查看是否可以和
    checkCanHu(game, turnSeat);


    userMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);

    //如果已要报听，则没有牌，则自动出牌
    if(turnSeat.isBaoTing){
        //如果
        if(turnSeat.canHu){
            exports.hu(turnSeat.userId);
            return;
        }
        //如果没有需要操作的，则自动出牌
        else if(!hasOperations(turnSeat)){
            turnSeat.canChuPai = true;
            var pai = turnSeat.holds[turnSeat.holds.length - 1];
            exports.chuPai(turnSeat.userId, pai);
            return;            
        }
    }

    //广播通知玩家出牌方
    turnSeat.canChuPai = true;
    //通知玩家做对应操作
    sendOperations(game, turnSeat, game.chuPai);
}

function isSameType(type, arr) {
    for (var i = 0; i < arr.length; ++i) {
        var pai = arr[i];
        //如果是替用，则忽略
        if (mjutils.isJing(pai)) {
            continue;
        }
        var t = getMJType(pai);
        if (type != -1 && type != t) {
            return false;
        }
        type = t;
    }
    return true;
}

function isQingYiSe(gameSeatData) {
    var checklist = [];
    checklist = checklist.concat(gameSeatData.holds);
    checklist = checklist.concat(gameSeatData.pengs);
    checklist = checklist.concat(gameSeatData.angangs);
    checklist = checklist.concat(gameSeatData.wangangs);
    checklist = checklist.concat(gameSeatData.diangangs);

    var type = -1;
    for (var i = 0; i < checklist.length; ++i) {
        var pai = checklist[i];
        //如果是替用，则忽略
        if (mjutils.isJing(pai)) {
            continue;
        }
        var t = getMJType(pai);
        if (type != -1 && type != t) {
            return false;
        }
        type = t;
    }
    return true;
}

function isTinged(game, seatData) {
    if (seatData.__has_checked_but_failed) {
        return false;
    }
    if (seatData.tingInfo != null) {
        return true;
    }

    for (var i = 0; i < 34; ++i) {
        checkCanHu(game, seatData, i, true);
        if (seatData.tingInfo) {
            return true;
        }
    }
    seatData.__has_checked_but_failed = true;
    return false;
}

function computeFanScore(game, fan) {
    if (fan > game.conf.maxFan) {
        fan = game.conf.maxFan;
    }
    if (fan == 0) {
        return 2;
    }
    return (1 << fan) * game.conf.baseScore * 6;
}

//是否需要查大叫(有两家以上未胡，且有人没有下叫)
function needChaDaJiao(game) {
    return false;
    //如果不是血战到底，就不用查了
    if (game.conf.wz_wanfa == 0) {
        return false;
    }
    //查叫
    var numOfHued = 0;
    var numOfTinged = 0;
    var numOfUntinged = 0;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ts = game.gameSeats[i];
        if (ts.hued) {
            numOfHued++;
            numOfTinged++;
        }
        else if (isTinged(game, ts)) {
            numOfTinged++;
        }
        else {
            numOfUntinged++;
        }
    }

    //如果三家都胡牌了，不需要查叫
    if (numOfHued == 3) {
        return false;
    }

    //如果没有任何一个人叫牌，也没有任何一个胡牌，则不需要查叫
    if (numOfTinged == 0) {
        return false;
    }

    //如果都听牌了，也不需要查叫
    if (numOfUntinged == 0) {
        return false;
    }
    return true;
}

function findUnTingedPlayers(game) {
    var arr = [];
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ts = game.gameSeats[i];
        //如果没有胡，且没有听牌
        if (!ts.hued && !isTinged(game, ts)) {
            arr.push(i);
            recordUserAction(game, ts, "beichadajiao", -1);
        }
    }
    return arr;
}

function chaJiao(game) {
    var arr = findUnTingedPlayers(game);
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ts = game.gameSeats[i];
        //如果没有胡，但是听牌了，则未叫牌的人要给钱
        if (!ts.hued && isTinged(game, ts)) {
            ts.fan = ts.tingInfo.fan;
            ts.pattern = ts.tingInfo.pattern;
            recordUserAction(game, ts, "chadajiao", arr);
        }
    }
}

//判断玩家手上有多少门
function computeTypeCount(sd) {
    //判断有几门
    var typeMap = {};
    var list = sd.holds.concat();
    list = list.concat(sd.pengs);
    list = list.concat(sd.diangangs);
    list = list.concat(sd.wangangs);
    list = list.concat(sd.angangs);

    for (var k in list) {
        var t = getMJType(list[k]);
        typeMap[t] = true;
    }

    var cnt = 0;
    for (var k in typeMap) {
        cnt++;
    }
    return cnt;
}

//判断玩家有多少蹬字
function computeDengZi(seatData) {
    var numOfDengZi = seatData.angangs.length + seatData.wangangs.length + seatData.diangangs.length;
    //判断花牌
    for (var k in seatData.huaMap) {
        if (seatData.huaMap[k] == 4) {
            numOfDengZi++;
        }
    }

    //判断春夏秋冬
    if (seatData.huaMap[34] && seatData.huaMap[35] && seatData.huaMap[36] && seatData.huaMap[37]) {
        numOfDengZi++;
    }

    //判断梅兰竹菊
    if (seatData.huaMap[38] && seatData.huaMap[39] && seatData.huaMap[40] && seatData.huaMap[41]) {
        numOfDengZi++;
    }
    return numOfDengZi;
}


function calculateResult(game, roomInfo) {
    //找出胡牌的那家，然后统计胡牌的玩家应得的子
    var baseScore = game.conf.baseScore;

    for (var i = 0; i < game.gameSeats.length; ++i) {
        var sd = game.gameSeats[i];

        sd.numAnGang = sd.angangs.length;
        sd.numMingGang = sd.wangangs.length + sd.diangangs.length;

        //算花
        sd.numOfHua = 0;
        for (var k in sd.huaMap) {
            var num = sd.huaMap[k];
            sd.numOfHua += num;
        }
        sd.numChaJiao += sd.numOfHua;

        //对所有胡牌的玩家进行统计
        if (sd.hued) {

            var fan = sd.fan;
            //判断是不是门清
            sd.isMengQing = (sd.wangangs.length + sd.diangangs.length + sd.pengs.length) == 0;
            if (sd.isMengQing) {
                fan += 10;
            }


            var typeCount = computeTypeCount(sd);
            //断门+10
            sd.isDuanMen = typeCount == 2;
            if (sd.isDuanMen) {
                fan += 10;
            }

            //清一色+10
            sd.isQingYiSe = typeCount == 1;
            if (sd.isQingYiSe) {
                fan += 50;
            }

            //一条龙+10
            if (sd.isYiTiaoLong) {
                fan += 10;
            }

            //对倒，大吊车 + 10
            if (sd.isDuiDao || sd.isDaDiaoChe) {
                fan += 10;
            }

            //压档+10，双压档+20
            if(sd.isShuangYaDang){
                fan += 20;
            }
            else if(sd.isYaDang){
                fan += 10;
            }

            //每个蹬字+10
            var numOfDengZi = computeDengZi(sd);
            fan += numOfDengZi * 10;
            sd.numOfDengZi = numOfDengZi;

            //黑字 + 36
            if (sd.isHeiZi) {
                sd.numOfHua += 36;
            }

            //1~10算10个花， 11~20算20个花， 21 ～ 30 算30个花
            sd.numOfHua = Math.ceil(sd.numOfHua / 10) * 10;
            fan += sd.numOfHua;

            //天胡，直接翻3倍
            if (sd.isTianHu) {
                fan *= 3;
            }

            //加价
            if (game.conf.daitijiao) {
                if (roomInfo.bonusFactor > 0) {
                    fan *= 2;
                    sd.isTiJiao = true;
                }
            }

            //对豪七进行加成
            if(sd.pattern == 'l7pairs'){
                fan *= 2;
            }
            else if(sd.pattern == 'sl7pairs'){
                fan *= 4;
            }
            else if(sd.pattern == 'sanl7pairs'){
                fan *= 8;
            }


            for (var a = 0; a < sd.actions.length; ++a) {
                var ac = sd.actions[a];
                if (ac.type == "zimo" || ac.type == "hu" || ac.type == "ganghua" || ac.type == "dianganghua" || ac.type == "gangpaohu" || ac.type == "qiangganghu") {
                    if (ac.iszimo) {
                        sd.numZiMo++;
                    }
                    else {
                        sd.numJiePao++;
                    }

                    //杠上花翻倍
                    if (ac.type == 'dianganghua' || ac.type == 'ganghua') {
                        //score *= 2;
                    }

                    //普通胡牌正常给钱
                    for (var t = 0; t < ac.targets.length; ++t) {
                        var six = ac.targets[t];
                        var td = game.gameSeats[six];

                        //平胡一台花
                        var score = fan * baseScore;

                        //如果胡牌者飞听了。
                        if (sd.isFeiTing) {
                            //如果被胡牌者也飞听了，就是对飞
                            if (td.isFeiTing) {
                                //对飞
                                score *= 6;
                                td.isDuiFei = true;
                            }
                            else {
                                //普通飞听
                                score *= 3;
                            }
                        }
                        else {
                            //如果胡牌者没有飞听

                            //如果被胡牌者飞听了，则是打飞机
                            if (td.isFeiTing) {
                                //打飞机
                                td.isDaFeiJi = true;

                                if (ac.iszimo) {
                                    //听牌自摸，打飞机X2
                                    score *= 2;
                                }
                                else {
                                    //听牌放炮，打飞机X4
                                    score *= 4;
                                }
                            }
                            else {
                                //普通炮胡，X2
                                if (!ac.iszimo) {
                                    score *= 2;
                                }
                            }
                        }

                        if (td != sd) {
                            td.score -= score;
                            sd.score += score;

                            if (!ac.iszimo) {
                                td.numDianPao++;
                            }
                        }
                    }
                }
            }
        }
    }
}

function doGameOver(roomInfo, forceEnd) {
    if (roomInfo == null) {
        return;
    }
    var roomId = roomInfo.id;

    var game = roomInfo.game;
    roomInfo.game = null;

    var results = [];
    var dbresult = [0, 0, 0, 0];

    if (game != null) {
        //如果不是主动解散，并且有人胡牌，才进行分数统计。 否则就是平局
        if (!forceEnd && game.firstHupai >= 0) {
            calculateResult(game, roomInfo);
        }

        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var rs = roomInfo.seats[i];
            var sd = game.gameSeats[i];

            if (sd.score > 0) {
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
                userId: sd.userId,
                actions: sd.actions,
                pengs: sd.pengs,
                wangangs: sd.wangangs,
                diangangs: sd.diangangs,
                angangs: sd.angangs,
                holds: sd.holds,
                score: sd.score,
                totalscore: rs.score,
                tianhu: sd.isTianHu,
                dihu: sd.isDiHu,
                numhua: sd.numOfHua,
                menqing: sd.isMengQing,
                duanmen: sd.isDuanMen,
                qingyise: sd.isQingYiSe,
                dengzi: sd.numOfDengZi,
                heizi: sd.isHeiZi,
                yitiaolong: sd.isYiTiaoLong,
                pattern: sd.pattern,
                yadang: sd.isYaDang,
                shuangyadang:sd.isShuangYaDang,
                duidao: sd.isDuiDao,
                dadiaoche: sd.isDaDiaoChe,
                dafeiji: sd.isDaFeiJi,
                feiting: sd.isFeiTing,
                duifei: sd.isDuiFei,
                tijiao: sd.isTiJiao,
                huamap:sd.huaMap,
            };

            for (var k in sd.actions) {
                userRT.actions[k] = {
                    type: sd.actions[k].type,
                };
            }
            results.push(userRT);


            dbresult[i] = sd.score;
            delete gameSeatsOfUsers[sd.userId];
        }
        delete games[roomId];

        var old = roomInfo.nextButton;
        if (game.firstHupai >= 0) {
            //非庄家胡牌，则下家当庄。
            if (game.firstHupai != game.button) {
                roomInfo.nextButton = (game.button + 1) % game.gameSeats.length;
            }

            //庄家胡牌 ++
            if(old == roomInfo.nextButton){
                roomInfo.bonusFactor += 1;
            }
            else{
                //加价局数不为0时，非庄家胡牌，踢脚 --。
                roomInfo.bonusFactor  -= 1;
                if(roomInfo.bonusFactor < 0){
                    roomInfo.bonusFactor = 0;
                }
            }
        }
        else {
            //流局，加价局数+1
            roomInfo.bonusFactor += 1;
        }

        if (old != roomInfo.nextButton) {
            db.update_next_button(roomId, roomInfo.nextButton);
        }
    }

    var isEnd = forceEnd;

    if (!forceEnd && game) {
        //保存游戏
        store_game(game);
        db.update_game_result(roomInfo.uuid, game.gameIndex, dbresult);
        roomMgr.updateScores(roomId);
        //记录打牌信息
        var str = JSON.stringify(game.actionList);
        db.update_game_action_records(roomInfo.uuid, game.gameIndex, str);

        //保存游戏局数
        db.update_num_of_turns(roomId, roomInfo.numOfGames);

        var isEnd = (roomInfo.numOfGames >= roomInfo.conf.maxGames);
    }

    var endinfo = null;
    if (isEnd) {
        endinfo = [];
        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var rs = roomInfo.seats[i];
            endinfo.push({
                numzimo: rs.numZiMo,
                numjiepao: rs.numJiePao,
                numdianpao: rs.numDianPao,
                numangang: rs.numAnGang,
                numminggang: rs.numMingGang,
                numchadajiao: rs.numChaJiao,
            });
        }
    }
    userMgr.broacastInRoom('game_over_push', { results: results, endinfo: endinfo }, roomInfo.seats[0].userId, true);
    //如果局数已够，则进行整体结算，并关闭房间
    if (isEnd) {
        roomMgr.onRoomEnd(roomInfo, forceEnd);
    }
}

function recordUserAction(game, seatData, type, target) {
    var d = { type: type, targets: [] };
    if (target != null) {
        if (typeof (target) == 'number') {
            d.targets.push(target);
        }
        else {
            d.targets = target;
        }
    }
    else {
        for (var i = 0; i < game.gameSeats.length; ++i) {
            var s = game.gameSeats[i];
            if (i != seatData.seatIndex && s.hued == false) {
                d.targets.push(i);
            }
        }
    }

    seatData.actions.push(d);
    return d;
}

function recordGameAction(game, si, action, pai) {
    game.actionList.push(si);
    game.actionList.push(action);
    if (pai != null) {
        game.actionList.push(pai);
    }
}

exports.sync = function (userId) {
    var roomId = roomMgr.getUserRoom(userId);
    if (roomId == null) {
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }

    var game = roomInfo.game;

    var numOfMJ = game.mahjongs.length - game.currentIndex;
    var remainingGames = roomInfo.conf.maxGames - roomInfo.numOfGames;

    var data = {
        state: game.state,
        numofmj: numOfMJ,
        button: game.button,
        turn: game.turn,
        chuPai: game.chuPai,
        huanpaimethod: game.huanpaiMethod,
        jings: game.jings,
        tijiao: roomInfo.bonusFactor
    };

    data.seats = [];
    var seatData = null;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var sd = game.gameSeats[i];

        var s = {
            userid: sd.userId,
            folds: sd.folds,
            angangs: sd.angangs,
            diangangs: sd.diangangs,
            wangangs: sd.wangangs,
            pengs: sd.pengs,
            que: sd.que,
            hued: sd.hued,
            iszimo: sd.iszimo,
            hupai: sd.hupai,
            huamap: sd.huaMap,
            isbaoting: sd.isBaoTing,
            isfeiting: sd.isFeiTing,
        }
        if (sd.userId == userId) {
            s.holds = sd.holds;
            seatData = sd;
        }
        data.seats.push(s);
    }

    //同步整个信息给客户端
    userMgr.sendMsg(userId, 'game_sync_push', data);
    sendOperations(game, seatData, game.chuPai);
}

function store_history(roomInfo) {
    db.archive_room(roomInfo.uuid);
}

function construct_game_base_info(game) {
    var baseInfo = {
        type: game.conf.type,
        button: game.button,
        index: game.gameIndex,
        mahjongs: game.mahjongs,
        game_seats: [],
        game_huas: [],
    }

    for (var i = 0; i < game.gameSeats.length; ++i) {
        baseInfo.game_seats[i] = game.gameSeats[i].holds;
        baseInfo.game_huas[i] = game.gameSeats[i].huaMap;
    }
    game.baseInfoJson = JSON.stringify(baseInfo);
}

function store_game(game) {
    var ret = db.create_game(game.roomInfo.uuid, game.gameIndex, game.baseInfoJson);
    return ret;
}

//开始新的一局
exports.begin = function (roomId) {
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }
    var seats = roomInfo.seats;

    var game = {
        conf: roomInfo.conf,
        roomInfo: roomInfo,
        gameIndex: roomInfo.numOfGames,

        button: roomInfo.nextButton,
        mahjongs: [],
        currentIndex: 0,
        gameSeats:[],

        numOfQue: 0,
        turn: 0,
        chuPai: -1,
        state: "idle",
        firstHupai: -1,
        actionList: [],
        chupaiCnt: 0,
        jingMap: {}
    };

    if (!roomInfo.numOfGames) {
        game.button = Math.floor(Math.random() * roomInfo.conf.numPeople);
        roomInfo.nextButton = game.button;
    }

    roomInfo.numOfGames++;
    roomInfo.game = game;

    if (!game.conf.daitijiao) {
        roomInfo.bonusFactor = 0;
    }

    for (var i = 0; i < roomInfo.conf.numPeople; ++i) {
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

    for (var i = 0; i < seats.length; ++i) {
        //开局时，通知前端必要的数据
        var s = seats[i];
        //通知玩家手牌
        userMgr.sendMsg(s.userId, 'game_holds_push', game.gameSeats[i].holds);
        //通知还剩多少张牌
        userMgr.sendMsg(s.userId, 'mj_count_push', numOfMJ);
        //通知还剩多少局
        userMgr.sendMsg(s.userId, 'game_num_push', roomInfo.numOfGames);
        //通知游戏开始
        userMgr.sendMsg(s.userId, 'game_begin_push', game.button);
    }

    //等一秒
    sleep(200);

    //补花
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var seatData = game.gameSeats[i];
        var huaCnt = 0;
        for (var j = seatData.holds.length - 1; j >= 0; --j) {
            var pai = seatData.holds[j];
            if (isHua(game, pai)) {
                buhua(game, seatData, pai);
                huaCnt++;
            }
        }

        for (var j = 0; j < huaCnt; ++j) {
            //如果是花，则需要补花
            var pai = mopai(game, seatData.seatIndex);
            while (isHua(game, pai)) {
                buhua(game, seatData, pai);
                //摸新的一张牌
                pai = mopai(game, seatData.seatIndex);
            }
        }

        //通知房间里对应的玩家补花
        userMgr.broacastInRoom('game_buhua_push', { si: i, huamap: seatData.huaMap }, seatData.userId, true);

        if (huaCnt) {
            //通知玩家手牌
            userMgr.sendMsg(seatData.userId, 'game_holds_push', seatData.holds);
        }
    }

    var couldBaoTing = [];
    //检查是否有人可以报听
    for (var i = 0; i < game.gameSeats.length; ++i) {
        if (i != game.button) {
            var sd = game.gameSeats[i];
            for (var p = 0; p < 34; ++p) {
                checkCanHu(game, sd, p, true);
                if (sd.canHu) {
                    sd.canHu = false;
                    sd.tingInfo = null;
                    couldBaoTing.push(i);
                    break;
                }
            }
        }
    }

    if (couldBaoTing.length) {
        game.couldBaoTing = couldBaoTing;
        game.state = 'baoting';
        userMgr.broacastInRoom('game_pre_baoting_push', null, game.gameSeats[0].userId, true);
    }
    else {
        start(game);
    }
};

function start(game) {
    construct_game_base_info(game);

    game.state = 'playing';
    var turnSeat = game.gameSeats[game.turn];

    userMgr.broacastInRoom('game_tijiao_push', game.roomInfo.bonusFactor, turnSeat.userId, true);
    userMgr.broacastInRoom('game_jings_push', game.jings, turnSeat.userId, true);

    userMgr.broacastInRoom('game_playing_push', null, turnSeat.userId, true);

    //等0.5秒
    sleep(500);

    //通知玩家出牌方
    turnSeat.canChuPai = true;


    userMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);
    //检查是否可以暗杠或者胡
    //直杠
    checkCanAnGang(game, turnSeat);
    //检查胡 用最后一张来检查
    checkCanHu(game, turnSeat);
    //通知前端
    sendOperations(game, turnSeat, game.chuPai);
}

exports.chuPai = function (userId, pai) {

    pai = Number.parseInt(pai);
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;
    var seatIndex = seatData.seatIndex;
    //如果不该他出，则忽略
    if (game.turn != seatData.seatIndex) {
        console.log("not your turn.");
        return;
    }

    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }

    if (seatData.canChuPai == false) {
        console.log('no need chupai.');
        return;
    }

    if (hasOperations(seatData)) {
        console.log('plz guo before you chupai.');
        return;
    }

    //从此人牌中扣除
    var index = seatData.holds.indexOf(pai);
    if (index == -1) {
        console.log("holds:" + seatData.holds);
        console.log("can't find mj." + pai);
        return;
    }

    seatData.canChuPai = false;
    game.chupaiCnt++;

    seatData.holds.splice(index, 1);
    seatData.countMap[pai]--;
    game.chuPai = pai;
    recordGameAction(game, seatData.seatIndex, ACTION_CHUPAI, pai);
    userMgr.broacastInRoom('game_chupai_notify_push', { userId: seatData.userId, pai: pai }, seatData.userId, true);

    //检查是否有人要胡，要碰 要杠
    var hasActions = false;

    if (pai != game.jingMap[pai]) {
        for (var i = 0; i < game.gameSeats.length; ++i) {
            //玩家自己不检查
            if (game.turn == i) {
                continue;
            }
            var ddd = game.gameSeats[i];
            //已经和牌的不再检查
            if (ddd.hued) {
                continue;
            }

            //如果飞听的，则不再检查
            if (ddd.isFeiTing) {
                continue;
            }

            checkCanHu(game, ddd, pai);
            if (true) {
                if (ddd.canHu && ddd.guoHuFan >= 0 && ddd.tingInfo.fan <= ddd.guoHuFan) {
                    console.log("ddd.guoHuFan:" + ddd.guoHuFan);
                    ddd.canHu = false;
                    userMgr.sendMsg(ddd.userId, 'guohu_push');
                }
            }
            checkCanPeng(game, ddd, pai);
            checkCanDianGang(game, ddd, pai);
            if (hasOperations(ddd)) {
                sendOperations(game, ddd, game.chuPai);
                hasActions = true;
            }
        }
    }


    //如果没有人有操作，则向下一家发牌，并通知他出牌
    if (!hasActions) {
        sleep(500);
        userMgr.broacastInRoom('guo_notify_push', { userId: seatData.userId, pai: game.chuPai }, seatData.userId, true);
        seatData.folds.push(game.chuPai);
        game.chuPai = -1;
        moveToNextUser(game);
        doUserMoPai(game);
    }
    else{
        //如果有人可以胡，则自动胡牌。
        var i = game.turn;
        while (true) {
            var i = (i + 1) % game.gameSeats.length;
            if (i == game.turn) {
                break;
            }
            else {
                var ddd = game.gameSeats[i];
                if (ddd.canHu) {
                    exports.hu(ddd.userId);
                    return;
                }
            }
        }
    }
};

exports.peng = function (userId) {
    //默认可杠不可碰
    return;
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;

    //如果是他出的牌，则忽略
    if (game.turn == seatData.seatIndex) {
        console.log("it's your turn.");
        return;
    }

    //如果没有碰的机会，则不能再碰
    if (seatData.canPeng == false) {
        console.log("seatData.peng == false");
        return;
    }

    //和的了，就不要再来了
    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }

    //如果有人可以胡牌，则需要等待
    var i = game.turn;
    while (true) {
        var i = (i + 1) % game.gameSeats.length;
        if (i == game.turn) {
            break;
        }
        else {
            var ddd = game.gameSeats[i];
            if (ddd.canHu && i != seatData.seatIndex) {
                return;
            }
        }
    }

    seatData.guoHuFan = -1;
    clearAllOptions(game);

    //验证手上的牌的数目
    var pai = game.chuPai;
    var c = seatData.countMap[pai];
    if (c == null || c < 2) {
        console.log("pai:" + pai + ",count:" + c);
        console.log(seatData.holds);
        console.log("lack of mj.");
        return;
    }

    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for (var i = 0; i < 2; ++i) {
        var index = seatData.holds.indexOf(pai);
        if (index == -1) {
            console.log("can't find mj.");
            return;
        }
        seatData.holds.splice(index, 1);
        seatData.countMap[pai]--;
    }
    seatData.pengs.push(pai);
    game.chuPai = -1;

    recordGameAction(game, seatData.seatIndex, ACTION_PENG, pai);

    //广播通知其它玩家
    userMgr.broacastInRoom('peng_notify_push', { userid: seatData.userId, pai: pai }, seatData.userId, true);

    //碰的玩家打牌
    moveToNextUser(game, seatData.seatIndex);

    //广播通知玩家出牌方
    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', seatData.userId, seatData.userId, true);

    //通知玩家做对应操作
    sendOperations(game, seatData);
};

exports.isPlaying = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        return false;
    }

    var game = seatData.game;

    if (game.state == "idle") {
        return false;
    }
    return true;
}


function checkCanQiangGang(game, turnSeat, seatData, pai) {
    var hasActions = false;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        //杠牌者不检查
        if (seatData.seatIndex == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        //已经和牌的不再检查
        if (ddd.hued) {
            continue;
        }

        checkCanHu(game, ddd, pai);
        if (ddd.canHu) {
            sendOperations(game, ddd, pai);
            hasActions = true;
        }
    }
    if (hasActions) {
        game.qiangGangContext = {
            turnSeat: turnSeat,
            seatData: seatData,
            pai: pai,
            isValid: true,
        }
    }
    else {
        game.qiangGangContext = null;
    }
    return game.qiangGangContext != null;
}

function doGang(game, turnSeat, seatData, gangtype, numOfCnt, pai) {
    var seatIndex = seatData.seatIndex;
    var gameTurn = turnSeat.seatIndex;
    seatData.guoHuFan = -1;
    var isZhuanShouGang = false;
    if (gangtype == "wangang") {
        var idx = seatData.pengs.indexOf(pai);
        if (idx >= 0) {
            seatData.pengs.splice(idx, 1);
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
    for (var i = 0; i < numOfCnt; ++i) {
        var index = seatData.holds.indexOf(pai);
        if (index == -1) {
            console.log(seatData.holds);
            console.log("can't find mj.");
            return;
        }
        seatData.holds.splice(index, 1);
        seatData.countMap[pai]--;
    }

    recordGameAction(game, seatData.seatIndex, ACTION_GANG, pai);

    //记录下玩家的杠牌
    if (gangtype == "angang") {
        seatData.angangs.push(pai);
        var ac = recordUserAction(game, seatData, "angang");
        ac.score = 2;
    }
    else if (gangtype == "diangang") {
        seatData.diangangs.push(pai);
        var ac = recordUserAction(game, seatData, "diangang", gameTurn);
        ac.score = 3;
        var fs = turnSeat;
        recordUserAction(game, fs, "fanggang", seatIndex);
    }
    else if (gangtype == "wangang") {
        seatData.wangangs.push(pai);
        if (isZhuanShouGang == false) {
            var ac = recordUserAction(game, seatData, "wangang");
            ac.score = 1;
        }
        else {
            recordUserAction(game, seatData, "zhuanshougang");
        }

    }
    //通知其他玩家，有人杠了牌
    userMgr.broacastInRoom('gang_notify_push', { userid: seatData.userId, pai: pai, gangtype: gangtype }, seatData.userId, true);

    //变成自己的轮子
    moveToNextUser(game, seatIndex);
    //再次摸牌
    doUserMoPai(game);

    //只能放在这里。因为过手就会清除杠牌标记
    seatData.lastFangGangSeat = gameTurn;
}

exports.gang = function (userId, pai) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果没有杠的机会，则不能再杠
    if (seatData.canGang == false) {
        console.log("seatData.gang == false");
        return;
    }

    //和的了，就不要再来了
    if (seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }

    if (seatData.gangPai.indexOf(pai) == -1) {
        console.log("the given pai can't be ganged.");
        return;
    }

    //如果有人可以胡牌，则需要等待
    var i = game.turn;
    while (true) {
        var i = (i + 1) % game.gameSeats.length;
        if (i == game.turn) {
            break;
        }
        else {
            var ddd = game.gameSeats[i];
            if (ddd.canHu && i != seatData.seatIndex) {
                return;
            }
        }
    }

    var numOfCnt = seatData.countMap[pai];

    var gangtype = ""   //对照 弯杠wangang：碰杠，点杠diangang：明杠，暗杠angang 含义相同
    //弯杠 去掉碰牌
    if (numOfCnt == 1) {
        gangtype = "wangang"
    }
    else if (numOfCnt == 3) {
        gangtype = "diangang"
    }
    else if (numOfCnt == 4) {
        gangtype = "angang";
    }
    else {
        console.log("invalid pai count.");
        return;
    }

    game.chuPai = -1;
    clearAllOptions(game);
    seatData.canChuPai = false;

    userMgr.broacastInRoom('hangang_notify_push', seatIndex, seatData.userId, true);

    //如果是弯杠（及碰杠），则需要检查是否可以抢杠,(补充)明杠也能抢杠胡
    var turnSeat = game.gameSeats[game.turn];
    if (numOfCnt == 1) {
        var canQiangGang = checkCanQiangGang(game, turnSeat, seatData, pai);//checkCanQiangGang ,checkCanQiangGgang

        if (canQiangGang) {
            return;
        }
    }

    doGang(game, turnSeat, seatData, gangtype, numOfCnt, pai);
};

exports.hu = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果他不能和牌，那和个啥啊
    if (seatData.canHu == false) {
        console.log("invalid request.");
        return;
    }

    //和的了，就不要再来了
    if (seatData.hued) {
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

    if (game.qiangGangContext != null) {
        var gangSeat = game.qiangGangContext.seatData;
        hupai = game.qiangGangContext.pai;
        notify = hupai;
        var ac = recordUserAction(game, seatData, "qiangganghu", gangSeat.seatIndex);
        ac.iszimo = false;
        recordGameAction(game, seatIndex, ACTION_HU, hupai);
        seatData.isQiangGangHu = true;
        game.qiangGangContext.isValid = false;


        var idx = gangSeat.holds.indexOf(hupai);
        if (idx != -1) {
            gangSeat.holds.splice(idx, 1);
            gangSeat.countMap[hupai]--;
            userMgr.sendMsg(gangSeat.userId, 'game_holds_push', gangSeat.holds);
        }
        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(hupai);
        if (seatData.countMap[hupai]) {
            seatData.countMap[hupai]++;
        }
        else {
            seatData.countMap[hupai] = 1;
        }

        recordUserAction(game, gangSeat, "beiqianggang", seatIndex);
    }
    else if (game.chuPai == -1) {
        hupai = seatData.holds[seatData.holds.length - 1];
        notify = -1;
        if (seatData.isGangHu) {
            if (turnSeat.lastFangGangSeat == seatIndex) {
                var ac = recordUserAction(game, seatData, "ganghua");
                ac.iszimo = true;
            }
            else {
                var diangganghua_zimo = true;//game.conf.dianganghua == 1;
                if (diangganghua_zimo) {
                    var ac = recordUserAction(game, seatData, "dianganghua");
                    ac.iszimo = true;
                }
                else {
                    var ac = recordUserAction(game, seatData, "dianganghua", turnSeat.lastFangGangSeat);
                    ac.iszimo = false;
                }
            }
        }
        else {
            var ac = recordUserAction(game, seatData, "zimo");
            ac.iszimo = true;
        }

        isZimo = true;
        recordGameAction(game, seatIndex, ACTION_ZIMO, hupai);
    }
    else {
        notify = game.chuPai;
        //将牌添加到玩家的手牌列表，供前端显示
        seatData.holds.push(game.chuPai);
        if (seatData.countMap[game.chuPai]) {
            seatData.countMap[game.chuPai]++;
        }
        else {
            seatData.countMap[game.chuPai] = 1;
        }

        console.log(seatData.holds);

        var at = "hu";
        //炮胡
        if (turnSeat.lastFangGangSeat >= 0) {
            at = "gangpaohu";
        }

        var ac = recordUserAction(game, seatData, at, game.turn);
        ac.iszimo = false;

        //记录玩家放炮信息
        var fs = game.gameSeats[game.turn];
        recordUserAction(game, fs, "fangpao", seatIndex);

        recordGameAction(game, seatIndex, ACTION_HU, hupai);
    }

    //保存番数
    var ti = seatData.tingInfo;
    seatData.fan = ti.fan;
    seatData.pattern = ti.pattern;
    seatData.iszimo = isZimo;
    seatData.hupai = hupai;

    var is7pairs = seatData.pattern == '7pairs' || seatData.pattern == 'l7pairs' || seatData.pattern == 'sl7pairs' || seatData.pattern == 'sanl7pairs';
    var huas = computeYaoJiuHua(game,seatData,is7pairs);
    for(var k in huas){
        var pai = huas[k];
        //把花记录下来
        if (!seatData.huaMap[pai]) {
            seatData.huaMap[pai] = 1;
        }
        else {
            seatData.huaMap[pai]++;
        }
    }

    //如果是最后一张牌，则认为是海底胡
    seatData.isHaiDiHu = game.currentIndex == game.mahjongs.length;

    if (game.conf.tiandihu) {
        if (game.chupaiCnt == 0 && game.button == seatData.seatIndex && game.chuPai == -1) {
            seatData.isTianHu = true;
        }
        else if (game.chupaiCnt == 1 && game.turn == game.button && game.button != seatData.seatIndex && game.chuPai != -1) {
            seatData.isDiHu = true;
        }
    }

    clearAllOptions(game, seatData);
    //通知前端，有人和牌了
    userMgr.broacastInRoom('hu_push', { seatindex: seatIndex, iszimo: isZimo, hupai: hupai }, seatData.userId, true);

    //清空所有非胡牌操作
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ddd = game.gameSeats[i];
        ddd.canPeng = false;
        ddd.canGang = false;
        ddd.canChuPai = false;
        sendOperations(game, ddd, hupai);
    }

    //如果还有人可以胡牌，则等待
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ddd = game.gameSeats[i];
        if (ddd.canHu) {
            return;
        }
    }

    if (isZimo) {
        game.firstHupai = game.turn;
    }
    else {
        var i = (game.turn + 1) % game.gameSeats.length;
        while (i != game.turn) {
            if (game.gameSeats[i].hued) {
                game.firstHupai = i;
                break;
            }
            i = (i + 1) % game.gameSeats.length;
        }
    }

    //清除所有操作。
    clearAllOptions(game);

    sleep(500);
    doGameOver(game.roomInfo);
};

exports.guo = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    if (game.state == 'baoting') {
        var idx = game.couldBaoTing.indexOf(seatIndex);
        if (idx != -1) {
            game.couldBaoTing.splice(idx, 1);
            if (game.couldBaoTing.length == 0) {
                start(game);
            }
        }
        userMgr.sendMsg(seatData.userId, "guo_result");
        return;
    }

    //如果玩家没有对应的操作，则也认为是非法消息
    if ((seatData.canGang || seatData.canPeng || seatData.canHu) == false) {
        console.log("no need guo.");
        return;
    }

    //如果是玩家自己的轮子，不是接牌，则不需要额外操作
    var doNothing = game.chuPai == -1 && game.turn == seatIndex;

    userMgr.sendMsg(seatData.userId, "guo_result");

    //这里还要处理过胡的情况
    if (seatData.canHu && game.chuPai != -1) {
        seatData.guoHuFan = seatData.tingInfo.fan;
    }

    clearAllOptions(game, seatData);

    if (doNothing) {
        if(seatData.isBaoTing){
            //自动出牌
            var pai = seatData.holds[seatData.holds.length - 1];
            exports.chuPai(seatData.userId, pai);
        }
        return;
    }

    //如果还有人可以操作，则等待
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ddd = game.gameSeats[i];
        if (hasOperations(ddd)) {
            return;
        }
    }

    //如果是已打出的牌，则需要通知。
    if (game.chuPai >= 0) {
        var uid = game.gameSeats[game.turn].userId;
        userMgr.broacastInRoom('guo_notify_push', { userId: uid, pai: game.chuPai }, seatData.userId, true);
        game.gameSeats[game.turn].folds.push(game.chuPai);
        game.chuPai = -1;
    }


    var qiangGangContext = game.qiangGangContext;
    //清除所有的操作
    clearAllOptions(game);

    if (qiangGangContext != null && qiangGangContext.isValid) {
        doGang(game, qiangGangContext.turnSeat, qiangGangContext.seatData, "wangang", 1, qiangGangContext.pai);
    }
    else {
        //下家摸牌
        moveToNextUser(game);
        doUserMoPai(game);
    }
};

exports.baoTing = function (userId, isFeiTing) {
    if (isFeiTing == 'false') {
        isFeiTing = false;
    }
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    if (seatData.isBaoTing) {
        return;
    }

    //检查是不是3不断
    var typeCount = computeTypeCount(seatData);
    if (typeCount == 3) {
        //如果3不断必飞，则强制飞听
        if (game.conf.sanbuduan == 1) {
            isFeiTing = true;
        }
    }

    //如果只能飞听，则强制飞听
    if (game.conf.sanbuduan == 2) {
        isFeiTing = true;
    }

    for (var i = 0; i < 27; ++i) {
        checkCanHu(game, seatData, i, true);
        if (seatData.tingInfo) {
            break;
        }
    }

    if (!seatData.canHu) {
        console.log("can't tingpai.. baoting failed.");
        return;
    }

    seatData.isHeiZi = true;
    //
    for (var k in seatData.huaMap) {
        seatData.isHeiZi = false;
        break;
    }

    seatData.tingInfo = null;
    seatData.canHu = false;

    clearAllOptions(game, seatData);
    seatData.isBaoTing = true;
    seatData.isFeiTing = isFeiTing;
    userMgr.broacastInRoom('game_baoting_notify_push', { userId: seatData.userId, isfeiting: isFeiTing }, seatData.userId, true);
    if (game.state == 'baoting') {
        var idx = game.couldBaoTing.indexOf(seatIndex);
        if (idx != -1) {
            game.couldBaoTing.splice(idx, 1);
        }
        if (game.couldBaoTing.length == 0) {
            start(game);
        }
    }
}

var JU_SHU = [8, 16, 24];
var JU_SHU_COST = [4, 8, 12];
//飞听麻将加入底分，且底分/10
var DI_FEN = [0.1, 0.2, 0.5];

var REN_SHU = [2,3,4];

exports.checkConf = function (roomConf, gems) {
    if (
        roomConf.type == null
        || roomConf.jushuxuanze == null
        || roomConf.daitijiao == null
        || roomConf.sanbuduan == null
        || roomConf.difen == null
        || roomConf.renshuxuanze == null) {
        //默认可杠不可碰
        //|| roomConf.kepenggang == null){
        return 1;
    }

    if(roomConf.difen < 0 || roomConf.difen > DI_FEN.length){
        return 1;
    }

    if (roomConf.jushuxuanze < 0 || roomConf.jushuxuanze > JU_SHU.length) {
        return 1;
    }

    if(roomConf.renshuxuanze < 0 || roomConf.renshuxuanze > REN_SHU.length){
        return 1;
    }

    var numPeople = REN_SHU[roomConf.renshuxuanze];

    var cost = JU_SHU_COST[roomConf.jushuxuanze];
    if (roomConf.aa) {
        cost /= numPeople;
        cost = Math.ceil(cost);
    }
    if (cost > gems) {
        return 2222;
    }

    roomConf.numPeople = numPeople;
    roomConf.cost = cost;
    return 0;
}

exports.getConf = function (roomConf, creator) {
    return {
        type: roomConf.type,
        baseScore: DI_FEN[roomConf.difen],
        daitijiao: roomConf.daitijiao,
        sanbuduan: roomConf.sanbuduan,
        //默认可杠不可碰
        //kepenggang:roomConf.kepenggang,
        maxGames: JU_SHU[roomConf.jushuxuanze],
        numPeople:roomConf.numPeople,
        cost:roomConf.cost,
        creator: creator,
    }
}

exports.doGameOver = doGameOver;

/*
var mokgame = {
    gameSeats:[{folds:[]}],
    mahjongs:[],
    currentIndex:-1,
    jings:[],
    jingMap:{}
}
var mokseat = {
    holds:[2,2,3,4,5,18,18,19,20,21,24,25,26,18],
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
    gangPai:[],
    isBaoTing:true,
    isFeiTing:true,
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
checkCanAnGang(mokgame,mokseat);
computeYaoJiuHua(mokgame,mokseat);
*/