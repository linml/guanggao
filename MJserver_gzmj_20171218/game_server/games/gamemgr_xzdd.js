// 血战到底
var mjutils = require('./laizimjutils');
var roomMgr = require("../roommgr");
var userMgr = require("../usermgr");
var db = require("../../utils/dbsync");
var crypto = require("../../utils/crypto");
var comdef = require('../../utils/common');
var tms = require('../tms');

var games = {};
var gamesIdBase = 0;

var ACTION_CHUPAI = 1;
var ACTION_MOPAI = 2;
var ACTION_PENG = 3;
var ACTION_GANG = 4;
var ACTION_HU = 5;
var ACTION_ZIMO = 6;

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
    for (var i = 0; i < 27; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }
    //洗牌
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
// 发牌
function deal(game) {
    //强制清0
    game.currentIndex = 0;

    //每人13张 一共 13*4 ＝ 52张 庄家多一张 53张
    var seatIndex = game.button;
    for (var i = 0; i < 52; ++i) {
        var mahjongs = game.gameSeats[seatIndex].holds;
        if (mahjongs == null) {
            mahjongs = [];
            game.gameSeats[seatIndex].holds = mahjongs;
        }
        mopai(game, seatIndex);
        seatIndex++;
        seatIndex %= 4;
    }

    //测试↓
    // var seatIndex = game.button;
    // game.turn = 0;
    // game.gameSeats[0].holds=[1,1,1,1,2,2,2,2,3,3,3,3,16];

    // game.gameSeats[1].holds=[5,5,5,5,6,6,6,6,7,7,7,7,15];
    // game.gameSeats[2].holds=[8,8,8,8,9,9,9,9,10,10,10,10,15];
    // game.gameSeats[3].holds=[11,11,11,11,12,12,12,12,13,13,13,13,15];
    // for(var i = 0; i < game.gameSeats.length; ++i){
    //     var data = game.gameSeats[i];
    //     for(var j = 0; j < data.holds.length; ++j){
    //         var pai = data.holds[j];
    //         var c = data.countMap[pai];
    //         if(c == null) {
    //             c = 0;
    //         }
    //         data.countMap[pai] = c + 1;
    //     }
    // }
    // mopai(game,seatIndex);
    //     seatIndex ++;
    //     seatIndex %= 4;
    //测试↑

    //庄家多摸最后一张
    mopai(game, game.button);
    //当前轮设置为庄家
    game.turn = game.button;
}

//检查是否可以碰
function checkCanPeng(game, seatData, targetPai) {
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

//检查是否可以暗杠
function checkCanAnGang(game, seatData) {
    //如果没有牌了，则不能再杠
    if (game.mahjongs.length <= game.currentIndex) {
        return;
    }

    for (var key in seatData.countMap) {
        var pai = parseInt(key);
        if (getMJType(pai) != seatData.que) {
            var c = seatData.countMap[key];
            if (c != null && c == 4) {
                seatData.canGang = true;
                seatData.gangPai.push(pai);
            }
        }
    }
}

//检查是否可以弯杠(自己摸起来的时候)
function checkCanWanGang(game, seatData) {
    //如果没有牌了，则不能再杠
    if (game.mahjongs.length <= game.currentIndex) {
        return;
    }

    //从碰过的牌中选
    for (var i = 0; i < seatData.pengs.length; ++i) {
        var pai = seatData.pengs[i];
        if (seatData.countMap[pai] == 1) {
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }
    }
}

function checkCanHu(game, seatData, targetPai) {
    game.lastHuPaiSeat = -1;
    seatData.canHu = false;
    seatData.tingInfo = null;

    if (targetPai != null) {
        seatData.holds.push(targetPai);
        if (seatData.countMap[targetPai]) {
            seatData.countMap[targetPai]++;
        } else {
            seatData.countMap[targetPai] = 1;
        }
    }

    var pattern = mjutils.checkCanHu({}, seatData, -1, true);

    if (pattern != null) {
        seatData.canHu = true;
        seatData.tingInfo = {
            pattern: pattern,
            fan: 0,
            pai: targetPai,
            target: game.turn,
        }

        //如果是最后一张牌，则认为是海底胡
        seatData.tingInfo.isHaiDiHu = game.currentIndex == game.mahjongs.length;

        //判断是不是天地胡。
        if (game.conf.tiandihu) {
            if (game.chupaiCnt == 0 && game.button == seatData.seatIndex && game.chuPai == -1) {
                seatData.tingInfo.isTianHu = true;
            }
            else if (game.chupaiCnt == 1 && game.turn == game.button && game.button != seatData.seatIndex && game.chuPai != -1) {
                seatData.tingInfo.isDiHu = true;
            }
        }

        //是否为清一色
        seatData.tingInfo.isQingYiSe = isQingYiSe(seatData);
        //是否为门清
        if (game.conf.menqing) {
            seatData.tingInfo.isMenQing = isMenQing(seatData);
        }

        //金钩胡
        if (seatData.holds.length == 2) {
            seatData.tingInfo.isJinGouHu = true;
        }

        seatData.tingInfo.numGen = getNumOfGen(seatData);
        //判断是不是龙七对
        if (pattern == '7pairs' && seatData.tingInfo.numGen > 0) {
            pattern = 'l7pairs';
            seatData.tingInfo.numGen -= 1;
        }

        //判断是不是将对
        var isjiangdui = false;
        if (game.conf.jiangdui) {
            var isjiangdui = isJiangDui(seatData);
            if (isjiangdui) {
                //将七对
                if (pattern == "l7pairs") {
                    pattern = "j7pairs";
                }
                //将对
                else if (pattern == "4melds") {
                    pattern = "j4melds";
                }
            }
        }

        if (game.conf.menqing) {
            //不是将对，才检查中张
            if (!isjiangdui) {
                seatData.tingInfo.isZhongZhang = isZhongZhang(seatData);
            }

            seatData.tingInfo.isMenQing = isMenQing(seatData);
        }

        seatData.tingInfo.isZiMo = targetPai == null;

        //杠花
        if (seatData.lastFangGangSeat != -1) {
            if (seatData.lastFangGangSeat == seatData.seatIndex) {
                //杠花
                seatData.tingInfo.isGangHua = true;
            } else {
                //点杠花
                seatData.tingInfo.isDianGangHua = true;
                var diangganghua_zimo = game.conf.dianganghua == 1;
                seatData.tingInfo.isZiMo = diangganghua_zimo;
                //如果点杠花算放炮，则放杠的人出钱。
                if (!diangganghua_zimo) {
                    seatData.tingInfo.target = seatData.lastFangGangSeat;
                }
            }
        }

        //杠炮
        if (targetPai != null && game.gameSeats[game.turn].lastFangGangSeat != -1) {
            seatData.tingInfo.isGangPaoHu = true;
        }

        //
        if (game.isQiangGangHuing) {
            seatData.tingInfo.isQiangGangHu = true;
        }

        //不是将对，不是中张，则检查全幺九
        if (!seatData.tingInfo.isJiangDui && !seatData.tingInfo.isZhongZhang) {
            seatData.tingInfo.isQuanYaoJiu = checkQuanYaoJiu(seatData);
        }

        //如果是自摸，则需要记录对应的玩家
        if (seatData.tingInfo.isZiMo) {
            seatData.tingInfo.pai = seatData.holds[seatData.holds.length - 1];//修8.14
            seatData.tingInfo.targets = [];
            for (var k in game.gameSeats) {
                var ddd = game.gameSeats[k];
                if (ddd != seatData && !ddd.hued) {
                    seatData.tingInfo.targets.push(ddd.seatIndex);
                }
            }
        }

        //统计自己的番子
        //基础番(平胡0番，对对胡1番、七对2番) + 清一色2番 + 杠+1番

        var fan = 0;
        //七对
        if (pattern == '7pairs') {
            fan += 2;
        }
        //龙七对
        else if (pattern == 'l7pairs') {
            fan += 3;
        }
        //将七对
        else if (pattern == 'j7pairs') {
            fan += 4;
        }
        //对对胡
        else if (pattern == "4melds") {
            fan += 1;
        }
        //将对
        else if (pattern == 'j4melds') {
            fan += 2;
        }

        //根（凑齐4个算一根， 杠，碰+1，手上4个）
        fan += seatData.tingInfo.numGen;

        //杠上花+1番，杠上炮+1番 抢杠胡+1番
        if (seatData.tingInfo.isGangHua || seatData.tingInfo.isGangPaoHu || seatData.tingInfo.isQiangGangHu) {
            fan += 1;
        }

        //金钩胡+1番
        if (seatData.tingInfo.isJinGouHu) {
            fan += 1;
        }

        //海底胡+1番
        if (seatData.tingInfo.isHaiDiHu) {
            fan += 1;
        }

        //天胡地胡 3番
        if (seatData.tingInfo.isTianHu) {
            fan += 3;
        }
        //地胡 2番
        else if (seatData.tingInfo.isDiHu) {
            fan += 2;
        }

        //清一色 2番
        if (seatData.tingInfo.isQingYiSe) {
            fan += 2;
        }

        //门清
        if (seatData.tingInfo.isMenQing) {
            fan += 1;
        }

        //中张
        if (seatData.tingInfo.isZhongZhang) {
            fan += 1;
        }

        //自摸加番
        if (game.conf.zimo == 1 && targetPai == null) {
            fan += 1;
        }

        if (fan > game.conf.maxFan) {
            fan = game.conf.maxFan;
        }
        seatData.tingInfo.fan = fan;
        seatData.tingInfo.pattern = pattern;
    }

    if (targetPai != null) {
        seatData.holds.pop();
        seatData.countMap[targetPai]--;
    }
}

function getPoint(pai) {
    return pai % 9 + 1;
}

//
function isYaoJiu(pai) {
    var p = getPoint(pai)
    return p == 1 || p == 9;
}

function checkQuanYaoJiu(seatData) {
    //检查碰杠是不是有非幺九的牌
    for (var i = 0; i < seatData.pengs.length; ++i) {
        if (!isYaoJiu(seatData.pengs[i])) {
            return false;
        }
    }
    for (var i = 0; i < seatData.diangangs.length; ++i) {
        if (!isYaoJiu(seatData.diangangs[i])) {
            return false;
        }
    }
    for (var i = 0; i < seatData.angangs.length; ++i) {
        if (!isYaoJiu(seatData.angangs[i])) {
            return false;
        }
    }
    for (var i = 0; i < seatData.wangangs.length; ++i) {
        if (!isYaoJiu(seatData.wangangs[i])) {
            return false;
        }
    }

    //找出可以做将的牌
    var jiangPaiArr = [];

    for (var k in seatData.countMap) {
        var cnt = seatData.countMap[k];
        if (!cnt) {
            continue;
        }

        //是幺或者九 则有机会做将
        if (isYaoJiu(k)) {
            if (cnt >= 2) {
                var pai = parseInt(k);
                jiangPaiArr.push(pai);
            }
        }
    }

    //如果没有可以作将的幺九牌，则直接返回。
    if (jiangPaiArr.length == 0) {
        return false;
    }

    //选将牌，并进行处理
    for (var i = 0; i < jiangPaiArr.length; ++i) {
        //拷贝一份拿出来用。
        var cm = {};
        for (var k in seatData.countMap) {
            var cnt = seatData.countMap[k];
            if (cnt) {
                cm[k] = cnt;
            }
        }

        var pai = jiangPaiArr[i];
        cm[pai] -= 2;

        //继续对手牌进行判定
        var handled = 2;
        for (var j = 0; j < seatData.holds.length; ++j) {
            var h = seatData.holds[j];
            //如果是1，9并且有值，则需要进行
            var pt = getPoint(h);
            if (pt == 1 || pt == 9) {
                var cnt = cm[h];
                if (cnt) {
                    //如果是1点，则要寻找 111，123组合
                    if (pt == 1) {
                        if (cm[h] && cm[h + 1] && cm[h + 2]) {
                            cm[h] -= 1;
                            cm[h + 1] -= 1;
                            cm[h + 2] -= 1;
                        }
                        else if (cm[h] >= 3) {
                            cm[h] -= 3;
                        }
                        else {
                            break;
                        }
                    }
                    //如果是9点，则要寻找 999，789组合
                    else if (pt == 9) {
                        if (cm[h] && cm[h - 1] && cm[h - 2]) {
                            cm[h] -= 1;
                            cm[h - 1] -= 1;
                            cm[h - 2] -= 1;
                        }
                        else if (cm[h] >= 3) {
                            cm[h] -= 3;
                        }
                        else {
                            break;
                        }
                    }

                    handled += 3;
                }
            }
        }
        if (handled == seatData.holds.length) {
            return true;
        }
    }
    return false;
}

function clearAllOptions(game, seatData, keepExtraFlag) {
    var fnClear = function (sd) {
        sd.canPeng = false;
        sd.canGang = false;
        sd.gangPai = [];
        sd.canHu = false;
        if (!keepExtraFlag) {
            sd.lastFangGangSeat = -1;
        }

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
            gangpai: seatData.gangPai,
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

function hasHuAction(game) {
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var sd = game.gameSeats[i];
        var ai = game.actionMap[i];
        if (sd.canHu || (ai && ai.action == 'hu')) {
            return true;
        }
    }
    return false;
}

function hasPengGangAction(game) {
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var sd = game.gameSeats[i];
        var ai = game.actionMap[i];
        if (sd.canPeng || (ai && ai.action == 'peng')) {
            return true;
        }
        if (sd.canPeng || (ai && ai.action == 'gang')) {
            return true;
        }
    }
    return false;
}

function doAction(game, seatData, action, data) {
    if (!game.actionMap) {
        game.actionMap = {};
    }

    if (game.actionMap[seatData.seatIndex]) {
        return;
    }

    game.actionMap[seatData.seatIndex] = {
        action: action,
        data: data
    };

    seatData.guoHuFan = -1;

    //如果有胡，但是玩家选择了过，则认为是过胡。
    if (seatData.canHu && action == 'guo') {
        //如果不是自己出牌，则要过胡
        if (game.turn != seatData.seatIndex) {
            seatData.guoHuFan = seatData.tingInfo.fan;
        }
    }
    //清除玩家的标志
    // clearAllOptions(game,seatData);
    clearAllOptions(game, seatData, true);

    //通知客户端，隐藏界面。
    sendOperations(game, seatData);

    //如果是过牌，则选择优先级最高的操作。
    if (action == 'guo') {
        var t = null;
        for (var k in game.actionMap) {
            var ai = game.actionMap[k];
            if (t == null) {
                t = ai.action;
            }
            else if (ai.action == 'hu') {
                t = ai.action;
            }
            else if ((t != 'hu') && (ai.action == 'peng' || ai.action == 'gang')) {
                t = ai.action;
            }
        }

        if (t) {
            action = t;
        }
    }

    if (action == 'hu') {
        //如果还有人可以选择胡，则等待
        for (var i = 0; i < game.gameSeats.length; i++) {
            var sd = game.gameSeats[i];
            if (sd.canHu) {
                return true;
            }
        }
    }
    else if (action == 'peng' || action == 'gang') {
        //如果选了碰，且有可胡操作，则需要等待
        if (hasHuAction(game)) {
            return true;
        }
    }
    else {
        for (var i = 0; i < game.gameSeats.length; i++) {
            var sd = game.gameSeats[i];
            if (hasOperations(sd)) {
                return true;
            }
        }
    }

    //判断是否有人胡
    var hn = 0;
    var lastHuPaiSeat = -1;
    var totalHn = 0;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        if (game.gameSeats[i].hued) {
            totalHn++;
        }
    }

    var i = game.turn;
    while (true) {
        var ddd = game.gameSeats[i];
        var ai = game.actionMap[i];
        if (ai && ai.action == 'hu') {
            doHu(game, ddd, ai.data);
            ddd.tingInfo.huOrder = totalHn;
            totalHn++;
            hn++;
            lastHuPaiSeat = i;
        }

        i = (i + 1) % game.gameSeats.length;
        if (i == game.turn) {
            break;
        }
    }

    //记录是否是一炮多响
    if (hn >= 2) {
        game.yiPaoDuoXiangSeat = game.turn;
    }

    if (hn > 0) {
        clearAllOptions(game);
        for (var i = 0; i < game.gameSeats.length; ++i) {
            sendOperations(game, game.gameSeats[i]);
        }
        if (totalHn == 3) {
            doGameOver(game.roomInfo);
        }
        else {
            game.turn = lastHuPaiSeat;
            moveToNextUser(game);
            doUserMoPai(game);
        }
        game.actionMap = null;
        return true;
    }

    //首先检查是否有人可以杠或者碰。
    var i = game.turn;
    while (true) {
        var ddd = game.gameSeats[i];
        var ai = game.actionMap[i];
        if (ai && ai.action == 'gang') {
            doGang0(game, ddd, ai.data);
            game.actionMap = null;
            return true;
        }
        if (ai && ai.action == 'peng') {
            doPeng(game, ddd, ai.data);
            game.actionMap = null;
            return true;
        }

        i = (i + 1) % game.gameSeats.length;
        if (i == game.turn) {
            break;
        }
    }

    /*
     //首先检查是否有人可以吃。
     var i = game.turn;
     while(true){
     var ddd = game.gameSeats[i];
     var ai = game.actionMap[i];
     if(ai && ai.action == 'chi'){
     doChi(game,ddd,ai.data);
     game.actionMap = null;
     return true;
     }
     i = (i + 1)%game.gameSeats.length;
     if(i == game.turn){
     break;
     }
     }
     */

    game.actionMap = null;
    return false;
}

function doUserMoPai(game, lastFangGangSeat) {
    if (lastFangGangSeat == null) {
        lastFangGangSeat = -1;
    }
    game.chuPai = -1;
    var turnSeat = game.gameSeats[game.turn];
    turnSeat.lastFangGangSeat = lastFangGangSeat;
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

    recordGameAction(game, game.turn, ACTION_MOPAI, pai);

    //通知前端新摸的牌
    userMgr.sendMsg(turnSeat.userId, 'game_mopai_push', pai);
    //检查是否可以暗杠或者胡
    //检查胡，直杠，弯杠
    if (!turnSeat.hued) {
        checkCanAnGang(game, turnSeat);
    }

    //如果未胡牌，或者摸起来的牌可以杠，才检查弯杠
    if (!turnSeat.hued || turnSeat.holds[turnSeat.holds.length - 1] == pai) {
        checkCanWanGang(game, turnSeat, pai);
    }

    //检查看是否可以和
    checkCanHu(game, turnSeat);

    //广播通知玩家出牌方
    turnSeat.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);

    //通知玩家做对应操作
    sendOperations(game, turnSeat, game.chuPai);
}

function isSameType(type, arr) {
    for (var i = 0; i < arr.length; ++i) {
        var t = getMJType(arr[i]);
        if (type != -1 && type != t) {
            return false;
        }
        type = t;
    }
    return true;
}

function isQingYiSe(gameSeatData) {
    var type = getMJType(gameSeatData.holds[0]);

    //检查手上的牌
    if (isSameType(type, gameSeatData.holds) == false) {
        return false;
    }

    //检查杠下的牌
    if (isSameType(type, gameSeatData.angangs) == false) {
        return false;
    }
    if (isSameType(type, gameSeatData.wangangs) == false) {
        return false;
    }
    if (isSameType(type, gameSeatData.diangangs) == false) {
        return false;
    }

    //检查碰牌
    if (isSameType(type, gameSeatData.pengs) == false) {
        return false;
    }
    return true;
}

function isMenQing(gameSeatData) {
    return (gameSeatData.pengs.length + gameSeatData.wangangs.length + gameSeatData.diangangs.length) == 0;
}

function isZhongZhang(gameSeatData) {
    var fn = function (arr) {
        for (var i = 0; i < arr.length; ++i) {
            var pai = arr[i];
            if (pai == 0 || pai == 8 || pai == 9 || pai == 17 || pai == 18 || pai == 26) {
                return false;
            }
        }
        return true;
    }

    if (fn(gameSeatData.pengs) == false) {
        return false;
    }
    if (fn(gameSeatData.angangs) == false) {
        return false;
    }
    if (fn(gameSeatData.diangangs) == false) {
        return false;
    }
    if (fn(gameSeatData.wangangs) == false) {
        return false;
    }
    if (fn(gameSeatData.holds) == false) {
        return false;
    }
    return true;
}

function isJiangDui(gameSeatData) {
    var fn = function (arr) {
        for (var i = 0; i < arr.length; ++i) {
            var pai = arr[i];
            if (pai != 1 && pai != 4 && pai != 7
                && pai != 9 && pai != 13 && pai != 16
                && pai != 18 && pai != 21 && pai != 25
            ) {
                return false;
            }
        }
        return true;
    }

    if (fn(gameSeatData.pengs) == false) {
        return false;
    }
    if (fn(gameSeatData.angangs) == false) {
        return false;
    }
    if (fn(gameSeatData.diangangs) == false) {
        return false;
    }
    if (fn(gameSeatData.wangangs) == false) {
        return false;
    }
    if (fn(gameSeatData.holds) == false) {
        return false;
    }
    return true;
}

function isTinged(game, seatData) {
    if (seatData.hued) {
        return true;
    }

    for (var i = 0; i < 27; ++i) {
        checkCanHu(game, seatData, i);
        if (seatData.tingInfo) {
            return true;
        }
    }
    return false;
}

function computeFanScore(game, fan) {
    if (fan > game.conf.maxFan) {
        fan = game.conf.maxFan;
    }
    return (1 << fan) * game.conf.baseScore;
}

function findMaxFanTingPai(game, seatData) {
    //找出最大番
    var cur = null;
    for (var i = 0; i < 27; ++i) {
        checkCanHu(game, seatData, i);
        if (cur == null) {
            cur = seatData.tingInfo;
        }
        if (cur && seatData.tingInfo) {
            //如果发现更大的番，则替代
            if (cur.fan < seatData.tingInfo.fan) {
                cur = seatData.tingInfo;
            }

            //最大番直接就返回
            if (cur.fan >= game.conf.maxFan) {
                return cur;
            }
        }
    }
    return cur;
}

function findUnTingedPlayers(game) {
    var arr = [];
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ts = game.gameSeats[i];
        //如果没有胡，且没有听牌
        if (!isTinged(game, ts)) {
            arr.push(i);
        }
    }
    return arr;
}

function getNumOfGen(seatData) {
    var numOfGangs = seatData.diangangs.length + seatData.wangangs.length + seatData.angangs.length;
    for (var k = 0; k < seatData.pengs.length; ++k) {
        var pai = seatData.pengs[k];
        if (seatData.countMap[pai] == 1) {
            numOfGangs++;
        }
    }
    for (var k in seatData.countMap) {
        if (seatData.countMap[k] == 4) {
            numOfGangs++;
        }
    }
    return numOfGangs;
}

function chaJiao(game) {
    var numOfHued = 0;
    //如果胡了3家，则不需要查叫
    for (var i = 0; i < game.gameSeats.length; ++i) {
        if (game.gameSeats[i].hued) {
            numOfHued++
        }
    }
    if (numOfHued == 3) {
        return [];
    }

    var arr = findUnTingedPlayers(game);
    //如果都听牌了，则不需要查叫
    if (arr.length == 0) {
        return [];
    }

    //如果都没听牌，则也不需要查叫
    if (arr.length + numOfHued == 4) {
        return [];
    }

    //找出最大番
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var ts = game.gameSeats[i];
        //如果听牌了，没有胡，则未听牌的人要给钱
        if (!ts.hued && arr.indexOf(i) == -1) {
            var cur = findMaxFanTingPai(game, ts);
            if (cur) {
                cur.isChaDaJiao = true;
                ts.huInfo.push(cur);
                for (var j = 0; j < arr.length; ++j) {
                    game.gameSeats[arr[j]].huInfo.push({
                        action: "beichadajiao",
                        target: i,
                        index: ts.huInfo.length - 1,
                    });
                }
            }
        }
    }
    return arr;
}

function calculateResult(game, roomInfo) {

    var chajiaoSeats = chaJiao(game);
    var baseScore = game.conf.baseScore;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var sd = game.gameSeats[i];
        //对所有胡牌的玩家进行统计
        var bBeiChaJiao = chajiaoSeats.indexOf(i) != -1;
        //如果没有被查叫，则进行杠钱和胡牌结算
        if (!bBeiChaJiao) {
            //收杠钱
            var additonalscore = 0;
            for (var a = 0; a < sd.actions.length; ++a) {
                var ac = sd.actions[a];
                if (ac.type == "fanggang") {
                    //检查放杠的情况，如果目标被查叫，则不算 用于优化前端显示
                    if (chajiaoSeats.indexOf(ac.targets[0]) != -1) {
                        ac.state = "nop";
                    }
                }
                else if (ac.type == "angang" || ac.type == "wangang" || ac.type == "diangang") {
                    if (ac.state != "nop") {
                        var acscore = ac.score;
                        additonalscore += ac.targets.length * acscore * baseScore;
                        //扣掉目标方的分
                        for (var t = 0; t < ac.targets.length; ++t) {
                            var six = ac.targets[t];
                            game.gameSeats[six].score -= acscore * baseScore;
                        }
                    }
                }
                else if (ac.type == "maozhuanyu") {
                    //对于呼叫转移，如果对方没有叫牌，表示不得行
                    if (chajiaoSeats.indexOf(ac.owner) == -1) {
                        //如果
                        var ref = ac.ref;
                        var acscore = ref.score;
                        var total = ref.targets.length * acscore * baseScore;
                        additonalscore += total;
                        //扣掉目标方的分
                        if (ref.payTimes == 0) {
                            for (var t = 0; t < ref.targets.length; ++t) {
                                var six = ref.targets[t];
                                game.gameSeats[six].score -= acscore * baseScore;
                            }
                        }
                        else {
                            //如果已经被扣过一次了，则由杠牌这家赔
                            ac.owner.score -= total;
                        }
                        ref.payTimes++;
                        ac.owner = null;
                        ac.ref = null;
                    }
                }
            }

            //进行胡牌结算
            for (var j = 0; j < sd.huInfo.length; ++j) {
                var info = sd.huInfo[j];
                if (!info.pattern) {
                    continue;
                }

                var score = computeFanScore(game, info.fan);
                //如果是自摸加底，则需要额外加底
                if (info.isZiMo && game.conf.zimo == 0) {
                    score += baseScore;
                }

                if (info.isChaDaJiao) {
                    //收所有没有叫牌的人的钱
                    for (var t = 0; t < game.gameSeats.length; ++t) {
                        if (chajiaoSeats.indexOf(t) != -1) {
                            var td = game.gameSeats[t];
                            td.score -= score;
                            sd.score += score;
                            //被查叫次数
                            if (td != sd) {
                                td.numChaJiao++;
                            }
                        }
                    }
                }
                else if (info.isZiMo) {
                    for (var t in info.targets) {
                        var si = info.targets[t];
                        var ddd = game.gameSeats[si];
                        sd.score += score;
                        ddd.score -= score;
                    }
                    sd.numZiMo++;
                }
                else {
                    //收放炮者的钱
                    sd.score += score;
                    game.gameSeats[info.target].score -= score;
                    sd.numJiePao++;
                }
            }
            //一定要用 += 。 因为此时的sd.score可能是负的
            sd.score += additonalscore;
        }
        else {
            //被查叫咯。移除掉杠牌
            for (var a = sd.actions.length - 1; a >= 0; --a) {
                var ac = sd.actions[a];
                if (ac.type == "angang" || ac.type == "wangang" || ac.type == "diangang") {
                    sd.actions.splice(a, 1);
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
        var userId = game.gameSeats[0].userId;
        if (!forceEnd) {
            calculateResult(game, roomInfo);
        }

        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var rs = roomInfo.seats[i];
            var sd = game.gameSeats[i];

            rs.ready = false;
            rs.score += sd.score
            rs.numZiMo += sd.numZiMo;
            rs.numJiePao += sd.numJiePao;
            rs.numDianPao += sd.numDianPao;
            rs.numAnGang += sd.numAnGang;
            rs.numMingGang += sd.numMingGang;
            rs.numChaJiao += sd.numChaJiao;

            var userRT = {
                userId: sd.userId,
                actions: [],
                pengs: sd.pengs,
                wangangs: sd.wangangs,
                diangangs: sd.diangangs,
                angangs: sd.angangs,
                holds: sd.holds,
                score: sd.score,
                totalscore: rs.score,
                qingyise: sd.qingyise,
                menqing: sd.isMenQing,
                jingouhu: sd.isJinGouHu,
                huinfo: sd.huInfo,
            }

            for (var k in sd.actions) {
                userRT.actions[k] = {
                    type: sd.actions[k].type,
                    targets: sd.actions[k].targets,
                };
            }
            results.push(userRT);

            dbresult[i] = sd.score;
            delete gameSeatsOfUsers[sd.userId];
        }
        delete games[roomId];

        var old = roomInfo.nextButton;
        if (game.yipaoduoxiang >= 0) {
            roomInfo.nextButton = game.yipaoduoxiang;
        }
        else if (game.firstHupai >= 0) {
            roomInfo.nextButton = game.firstHupai;
        }
        else {
            roomInfo.nextButton = (game.turn + 1) % 4;
        }

        if (old != roomInfo.nextButton) {
            db.update_next_button(roomId, roomInfo.nextButton);
        }
    }

    var isEnd = forceEnd;

    if (!forceEnd && game) {
        //保存游戏
        var ret = store_game(game);

        roomMgr.updateScores(roomInfo.id);

        db.update_game_result(roomInfo.uuid, game.gameIndex, dbresult);

        //记录玩家操作
        var str = JSON.stringify(game.actionList);
        db.update_game_action_records(roomInfo.uuid, game.gameIndex, str);

        //保存游戏局数
        db.update_num_of_turns(roomId, roomInfo.numOfGames);
        isEnd = (roomInfo.numOfGames >= roomInfo.conf.maxGames);
        roomInfo.gameOverCounts = roomInfo.numOfGames;
    }
    if (roomInfo.conf.isTimeRoom) {
        isEnd = (isEnd || tms.gameOverInt(roomInfo, forceEnd));
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

    userMgr.broacastInRoom('game_over_push', {results: results, endinfo: endinfo}, userId, true);
    //如果局数已够，则进行整体结算，并关闭房间
    if (isEnd) {
        roomMgr.onRoomEnd(roomInfo, forceEnd);
    }
}

function recordUserAction(game, seatData, type, target) {
    var d = {type: type, targets: []};
    if (target != null) {
        if (typeof(target) == 'number') {
            d.targets.push(target);
        }
        else {
            d.targets = target;
        }
    }
    else {
        for (var i = 0; i < game.gameSeats.length; ++i) {
            var s = game.gameSeats[i];
            if (s.hued) {
                continue;
            }
            //血流成河，所有自摸，暗杠，弯杠，都算三家
            if (i != seatData.seatIndex/* && s.hued == false*/) {
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
        lastChuPaiTurn: game.lastChuPaiTurn,

    };

    data.seats = [];
    var seatData = null;
    for (var i = 0; i < 4; ++i) {
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
            huinfo: sd.huInfo,
            iszimo: sd.iszimo,
        }
        if (sd.userId == userId) {
            s.holds = sd.holds;
            s.huanpais = sd.huanpais;
            seatData = sd;
        }
        else {
            s.huanpais = sd.huanpais ? [] : null;
        }
        data.seats.push(s);
    }

    //同步整个信息给客户端
    userMgr.sendMsg(userId, 'game_sync_push', data);
    sendOperations(game, seatData, game.chuPai);
}

function construct_game_base_info(game) {
    var baseInfo = {
        type: game.conf.type,
        button: game.button,
        index: game.gameIndex,
        mahjongs: game.mahjongs,
        game_seats: new Array(4)
    }
    for (var i = 0; i < 4; ++i) {
        baseInfo.game_seats[i] = game.gameSeats[i].holds;
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
        mahjongs: new Array(108),
        currentIndex: 0,
        gameSeats: new Array(4),

        numOfQue: 0,
        turn: 0,
        chuPai: -1,
        state: "idle",
        firstHupai: -1,
        yipaoduoxiang: -1,
        fangpaoshumu: -1,
        actionList: [],
        chupaiCnt: 0,
        numOfHued: 0,
        lastChuPaiTurn: -1
    };

    roomInfo.numOfGames++;
    roomInfo.game = game;

    if (roomInfo.conf.isTimeRoom) {
        tms.add_start_timeInt(roomInfo);
    }
    for (var i = 0; i < 4; ++i) {
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
        data.numChaJiao = 0;

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

        if (huansanzhang == true) {
            game.state = "huanpai";
            //通知准备换牌
            userMgr.sendMsg(s.userId, 'game_huanpai_push');
        }
        else {
            game.state = "dingque";
            //通知准备定缺
            userMgr.sendMsg(s.userId, 'game_dingque_push');
        }
    }
};

exports.huanSanZhang = function (userId, p1, p2, p3) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;
    if (game.state != "huanpai") {
        console.log("can't recv huansanzhang when game.state == " + game.state);
        return;
    }

    if (seatData.huanpais != null) {
        console.log("player has done this action.");
        return;
    }

    if (seatData.countMap[p1] == null || seatData.countMap[p1] == 0) {
        return;
    }
    seatData.countMap[p1]--;

    if (seatData.countMap[p2] == null || seatData.countMap[p2] == 0) {
        seatData.countMap[p1]++;
        return;
    }
    seatData.countMap[p2]--;

    if (seatData.countMap[p3] == null || seatData.countMap[p3] == 0) {
        seatData.countMap[p1]++;
        seatData.countMap[p2]++;
        return;
    }

    seatData.countMap[p1]++;
    seatData.countMap[p2]++;

    seatData.huanpais = [p1, p2, p3];

    for (var i = 0; i < seatData.huanpais.length; ++i) {
        var p = seatData.huanpais[i];
        var idx = seatData.holds.indexOf(p);
        seatData.holds.splice(idx, 1);
        seatData.countMap[p]--;
    }
    userMgr.sendMsg(seatData.userId, 'game_holds_push', seatData.holds);

    for (var i = 0; i < game.gameSeats.length; ++i) {
        var sd = game.gameSeats[i];
        if (sd == seatData) {
            var rd = {
                si: seatData.userId,
                huanpais: seatData.huanpais
            };
            userMgr.sendMsg(sd.userId, 'huanpai_notify', rd);
        }
        else {
            var rd = {
                si: seatData.userId,
                huanpais: []
            };
            userMgr.sendMsg(sd.userId, 'huanpai_notify', rd);
        }
    }

    //如果还有未换牌的玩家，则继承等待
    for (var i = 0; i < game.gameSeats.length; ++i) {
        if (game.gameSeats[i].huanpais == null) {
            return;
        }
    }

    //换牌函数
    var fn = function (s1, huanjin) {
        for (var i = 0; i < huanjin.length; ++i) {
            var p = huanjin[i];
            s1.holds.push(p);
            if (s1.countMap[p] == null) {
                s1.countMap[p] = 0;
            }
            s1.countMap[p]++;
        }
    }

    //开始换牌
    var f = Math.random();
    var s = game.gameSeats;
    var huanpaiMethod = 0;
    //对家换牌
    if (f < 0.33) {
        fn(s[0], s[2].huanpais);
        fn(s[1], s[3].huanpais);
        fn(s[2], s[0].huanpais);
        fn(s[3], s[1].huanpais);
        huanpaiMethod = 0;
    }
    //换下家的牌
    else if (f < 0.66) {
        fn(s[0], s[1].huanpais);
        fn(s[1], s[2].huanpais);
        fn(s[2], s[3].huanpais);
        fn(s[3], s[0].huanpais);
        huanpaiMethod = 1;
    }
    //换上家的牌
    else {
        fn(s[0], s[3].huanpais);
        fn(s[1], s[0].huanpais);
        fn(s[2], s[1].huanpais);
        fn(s[3], s[2].huanpais);
        huanpaiMethod = 2;
    }

    var rd = {
        method: huanpaiMethod,
    }
    game.huanpaiMethod = huanpaiMethod;

    game.state = "dingque";
    for (var i = 0; i < s.length; ++i) {
        var userId = s[i].userId;
        userMgr.sendMsg(userId, 'game_huanpai_over_push', rd);

        userMgr.sendMsg(userId, 'game_holds_push', s[i].holds);
        //通知准备定缺
        userMgr.sendMsg(userId, 'game_dingque_push');
    }
};

exports.dingQue = function (userId, type) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var game = seatData.game;
    if (game.state != "dingque") {
        console.log("can't recv dingQue when game.state == " + game.state);
        return;
    }

    if (seatData.que < 0) {
        game.numOfQue++;
    }

    seatData.que = type;

    //检查玩家可以做的动作
    //如果4个人都定缺了，通知庄家出牌
    if (game.numOfQue == 4) {
        construct_game_base_info(game);

        var arr = [1, 1, 1, 1];
        for (var i = 0; i < game.gameSeats.length; ++i) {
            arr[i] = game.gameSeats[i].que;
        }
        userMgr.broacastInRoom('game_dingque_finish_push', arr, seatData.userId, true);
        userMgr.broacastInRoom('game_playing_push', null, seatData.userId, true);

        var turnSeat = game.gameSeats[game.turn];
        game.state = "playing";
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
    else {
        userMgr.broacastInRoom('game_dingque_notify_push', seatData.userId, seatData.userId, true);
    }
};

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

    if (seatData.canChuPai == false) {
        console.log('no need chupai.');
        return;
    }

    if (hasOperations(seatData)) {
        console.log('plz guo before you chupai.');
        return;
    }

    //如果是胡了的人，则只能打最后一张牌
    if (seatData.hued) {
        if (seatData.holds[seatData.holds.length - 1] != pai) {
            console.log('only deal last one when hued.');
            return;
        }
    }

    //从此人牌中扣除
    var index = seatData.holds.indexOf(pai);
    if (index == -1) {
        console.log("can't find mj." + pai);
        return;
    }

    seatData.canChuPai = false;
    game.chupaiCnt++;

    seatData.holds.splice(index, 1);
    seatData.countMap[pai]--;
    game.chuPai = pai;
    game.lastChuPaiTurn = seatData.seatIndex;//标记最后一个打出

    recordGameAction(game, seatData.seatIndex, ACTION_CHUPAI, pai);
    //sleep(10000);
    //userMgr.broacastInRoom('game_chupai_notify_push',{userId:seatData.userId,pai:10},seatData.userId,true); //测试出牌修复
    userMgr.broacastInRoom('game_chupai_notify_push', {userId: seatData.userId, pai: pai}, seatData.userId, true);

    //检查是否有人要胡，要碰 要杠
    var hasActions = false;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        //胡了牌的，不管
        if (ddd.hued) {
            continue;
        }

        checkCanPeng(game, ddd, pai);
        checkCanDianGang(game, ddd, pai);

        checkCanHu(game, ddd, pai);
        if (seatData.lastFangGangSeat == -1) {
            if (ddd.canHu && ddd.guoHuFan >= 0 && ddd.tingInfo.fan <= ddd.guoHuFan) {
                console.log("ddd.guoHuFan:" + ddd.guoHuFan);
                ddd.canHu = false;
                userMgr.sendMsg(ddd.userId, 'guohu_push');
            }
        }

        if (hasOperations(ddd)) {
            sendOperations(game, ddd, game.chuPai);
            hasActions = true;
        }
    }
    //如果没有人有操作，则向下一家发牌，并通知他出牌
    if (!hasActions) {
        //sleep(10000);
        userMgr.broacastInRoom('guo_notify_push', {userId: seatData.userId, pai: game.chuPai}, seatData.userId, true);
        seatData.folds.push(game.chuPai);
        game.chuPai = -1;
        moveToNextUser(game);
        doUserMoPai(game);
    }
};

function doPeng(game, seatData, data) {
    var pai = data;

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
    game.lastChuPaiTurn = -1;

    recordGameAction(game, seatData.seatIndex, ACTION_PENG, pai);

    //广播通知其它玩家
    userMgr.broacastInRoom('peng_notify_push', {userid: seatData.userId, pai: pai}, seatData.userId, true);

    //碰的玩家打牌
    moveToNextUser(game, seatData.seatIndex);

    //广播通知玩家出牌方
    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', seatData.userId, seatData.userId, true);
}

exports.peng = function (userId) {
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

    //验证手上的牌的数目
    var pai = game.chuPai;
    var c = seatData.countMap[pai];
    if (c == null || c < 2) {
        console.log("pai:" + pai + ",count:" + c);
        console.log("lack of mj.");
        return;
    }

    doAction(game, seatData, 'peng', pai);
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
        game.isQiangGangHuing = true;
        checkCanHu(game, ddd, pai);
        game.isQiangGangHuing = false;
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
    game.lastChuPaiTurn = -1;
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
        if (seatData.holds[seatData.holds.length - 1] != pai) {
            isZhuanShouGang = true;
        }
    }
    //进行碰牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    for (var i = 0; i < numOfCnt; ++i) {
        var index = seatData.holds.indexOf(pai);
        if (index == -1) {
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
        ac.score = game.conf.baseScore * 2;
    }
    else if (gangtype == "diangang") {
        seatData.diangangs.push(pai);
        var ac = recordUserAction(game, seatData, "diangang", gameTurn);
        ac.score = game.conf.baseScore * 2;
        var fs = turnSeat;
        recordUserAction(game, fs, "fanggang", seatIndex);
    }
    else if (gangtype == "wangang") {
        seatData.wangangs.push(pai);
        if (isZhuanShouGang == false) {
            var ac = recordUserAction(game, seatData, "wangang");
            ac.score = game.conf.baseScore;
        }
        else {
            recordUserAction(game, seatData, "zhuanshougang");
        }

    }

    //通知其他玩家，有人杠了牌
    userMgr.broacastInRoom('gang_notify_push', {
        userid: seatData.userId,
        pai: pai,
        gangtype: gangtype
    }, seatData.userId, true);

    //变成自己的轮子
    moveToNextUser(game, seatIndex);
    //再次摸牌
    doUserMoPai(game, gameTurn);
}

function doGang0(game, seatData, data) {
    var pai = data;
    var seatIndex = seatData.seatIndex;

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

    //如果是弯杠（及碰杠），则需要检查是否可以抢杠
    var turnSeat = game.gameSeats[game.turn];
    if (numOfCnt == 1) {
        var canQiangGang = checkCanQiangGang(game, turnSeat, seatData, pai);
        if (canQiangGang) {
            return;
        }
    }

    doGang(game, turnSeat, seatData, gangtype, numOfCnt, pai);
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

    var numOfCnt = seatData.countMap[pai];

    //胡了的，只能直杠
    if (numOfCnt != 1 && seatData.hued) {
        console.log('you have already hued. no kidding plz.');
        return;
    }

    if (seatData.gangPai.indexOf(pai) == -1) {
        console.log("the given pai can't be ganged.");
        return;
    }

    doAction(game, seatData, 'gang', pai);
};

function doHu(game, seatData, pai, data) {
    game.lastChuPaiTurn = -1;
    //标记为和牌
    var seatIndex = seatData.seatIndex;
    seatData.hued = true;
    var hupai = game.chuPai;
    var isZimo = false;

    var turnSeat = game.gameSeats[game.turn];
    var notify = -1;

    seatData.huInfo.push(seatData.tingInfo);

    if (game.qiangGangContext != null) {
        hupai = game.qiangGangContext.pai;
        var gangSeat = game.qiangGangContext.seatData;
        notify = hupai;

        recordGameAction(game, seatIndex, ACTION_HU, hupai);
        game.qiangGangContext.isValid = false;

        var idx = gangSeat.holds.indexOf(hupai);
        if (idx != -1) {
            gangSeat.holds.splice(idx, 1);
            gangSeat.countMap[hupai]--;
            userMgr.sendMsg(gangSeat.userId, 'game_holds_push', gangSeat.holds);
        }

        gangSeat.huInfo.push({
            action: "beiqianggang",
            target: seatData.seatIndex,
            index: seatData.huInfo.length - 1,
        });
    }
    // else if(game.turn == seatData.seatIndex){//修改：自摸错误
    //     isZimo = true;
    // }
    else if (game.chuPai == -1) {
        hupai = seatData.holds.pop();
        seatData.countMap[hupai]--;
        notify = hupai;

        isZimo = true;
        recordGameAction(game, seatIndex, ACTION_ZIMO, hupai);
        for (var i = 0; i < seatData.tingInfo.targets.length; ++i) {
            var si = seatData.tingInfo.targets[i];
            var ts = game.gameSeats[si];
            ts.huInfo.push({
                action: "beizimo",
                target: seatData.seatIndex,
                index: seatData.huInfo.length - 1,
            });
        }
    }
    else {
        notify = game.chuPai;
        var at = "hu";
        //炮胡
        if (turnSeat.lastFangGangSeat >= 0) {
            at = "gangpaohu";
        }

        //毛转雨
        if (turnSeat.lastFangGangSeat >= 0) {
            for (var i = turnSeat.actions.length - 1; i >= 0; --i) {
                var t = turnSeat.actions[i];
                if (t.type == "diangang" || t.type == "wangang" || t.type == "angang") {
                    t.state = "nop";
                    t.payTimes = 0;

                    var nac = {
                        type: "maozhuanyu",
                        owner: turnSeat,
                        ref: t
                    }
                    seatData.actions.push(nac);
                    break;
                }
            }
        }

        //记录玩家放炮信息
        var fs = game.gameSeats[game.turn];
        if (at == "gangpaohu") {
            at = "gangpao";
        }
        else {
            at = "fangpao";
        }
        fs.huInfo.push({
            action: at,
            target: seatData.seatIndex,
            index: seatData.huInfo.length - 1,
        });

        recordGameAction(game, seatIndex, ACTION_HU, hupai);
    }

    //通知前端，有人和牌了
    userMgr.broacastInRoom('hu_push', {seatindex: seatIndex, iszimo: isZimo, hupai: notify}, seatData.userId, true);

    if (game.firstHupai < 0) {
        game.firstHupai = seatIndex;
    }
}

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

    if (seatData.hued) {
        return;
    }

    doAction(game, seatData, 'hu', null);
};

exports.guo = function (userId) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("can't find user game data.");
        return;
    }

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果玩家没有对应的操作，则也认为是非法消息
    if ((seatData.canGang || seatData.canPeng || seatData.canHu) == false) {
        console.log("no need guo.");
        return;
    }

    //如果是玩家自己的轮子，不是接牌，则不需要额外操作
    var doNothing = game.chuPai == -1 && game.turn == seatIndex;

    userMgr.sendMsg(seatData.userId, "guo_result");

    //如果还有人可以操作，则等待
    var ret = doAction(game, seatData, 'guo', null);
    if (ret) {
        return;
    }

    if (doNothing) {
        return;
    }

    //如果是已打出的牌，则需要通知。
    if (game.chuPai >= 0) {
        var turnSeat = game.gameSeats[game.turn];
        var uid = turnSeat.userId;
        userMgr.broacastInRoom('guo_notify_push', {userId: uid, pai: game.chuPai}, seatData.userId, true);
        turnSeat.folds.push(game.chuPai);
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

exports.doGameOver = doGameOver;

var DI_FEN = [1, 2, 5];
var MAX_FAN = [2, 3, 4];
var JU_SHU = [4, 8, 16];
var JU_SHU_COST = [2, 3];

exports.checkConf = function (roomConf, gems) {
    if (
        roomConf.type == null
        || roomConf.difen == null
        || roomConf.zimo == null
        || roomConf.jiangdui == null
        || roomConf.huansanzhang == null
        || roomConf.zuidafanshu == null
        || roomConf.jushuxuanze == null
        || roomConf.dianganghua == null
        || roomConf.menqing == null
        || roomConf.tiandihu == null) {
        return 1;
    }

    if (roomConf.difen < 0 || roomConf.difen > DI_FEN.length) {
        return 1;
    }

    if (roomConf.zimo < 0 || roomConf.zimo > 2) {
        return 1;
    }

    if (roomConf.zuidafanshu < 0 || roomConf.zuidafanshu > MAX_FAN.length) {
        return 1;
    }

    if (roomConf.jushuxuanze < 0 || roomConf.jushuxuanze > JU_SHU.length) {
        return 1;
    }

    var cost = JU_SHU_COST[roomConf.jushuxuanze];
    if (roomConf.aa) {
        cost = Math.ceil(cost / 4);
    }
    if (cost > gems) {
        return 2222;
    }
    roomConf.cost = cost;
    return 0;
}

exports.getConf = function (roomConf, creator) {
    var ret = {
        type: roomConf.type,
        baseScore: DI_FEN[roomConf.difen],
        cost: roomConf.cost,
        zimo: roomConf.zimo,
        jiangdui: roomConf.jiangdui,
        hsz: roomConf.huansanzhang,
        dianganghua: parseInt(roomConf.dianganghua),
        menqing: roomConf.menqing,
        tiandihu: roomConf.tiandihu,
        maxFan: MAX_FAN[roomConf.zuidafanshu],
        maxGames: JU_SHU[roomConf.jushuxuanze],
        creator: creator,
        isTimeRoom: false,
        time_card_number: ""
    };
    if (roomConf.isTimeRoom) {
        ret.isTimeRoom = true;
        ret.maxGames = 20;
    }
    if (roomConf.time_card_number) {
        ret.time_card_number = roomConf.time_card_number;
    }
    return ret;
}

/*
 var mokgame = {
 gameSeats:[{folds:[]}],
 mahjongs:[],
 currentIndex:-1,
 jings:[],
 jingMap:{},
 conf:{}
 }
 var mokseat = {
 holds:[0,0,0,1,2,6,7,8,18,19,20,24,25,26],
 isBaoTing:false,
 countMap:{},
 pengs:[],
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

 checkCanHu(mokgame,mokseat);
 */