// 广东鸡胡
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
// 获取牌的类型
function getMJType(id) {
    if (id >= 0 && id < 9) {
        // 筒
        return 0;
    }
    else if (id >= 9 && id < 18) {
        // 条
        return 1;
    }
    else if (id >= 18 && id < 27) {
        // 万
        return 2;
    } else if (id >= 27 && id < 34) {
        // 字
        return 3;
    }
}
// 洗牌
function shuffle(game) {
    var mahjongs = game.mahjongs;
    //装牌
    //筒 0 ~ 8:筒
    //条 9 ~ 17:条
    //万 18 ~ 26:万
    //字 27 ~ 33:东南西北中发白
    var index = 0;
    for (var i = 0; i < 27; ++i) {
        for (var c = 0; c < 4; ++c) {
            mahjongs[index] = i;
            index++;
        }
    }
    // 如果带风
    if (!game.conf.budaifeng) {
        for (var i = 27; i < 34; ++i) {
            for (var c = 0; c < 4; ++c) {
                mahjongs[index] = i;
                index++;
            }
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
    //在筒条万牌里翻出一张作为搬子
    if (game.conf.guipaixuanze > 0) {
        generateLaiZi(game, mahjongs);
    }
}
// 生成癞子
function generateLaiZi(game, mahjongs) {
    if (game.conf.guipaixuanze > 0) {
        game.jings = [];
        var banzi = Math.floor(Math.random() * 27);
        var index = mahjongs.indexOf(banzi);
        mahjongs.splice(index, 1);
        for (var i = 0; i < game.conf.guipaixuanze; i++) {
            //搬子牌加一作为百搭牌
            var jing = banzi + 1 + i;
            if (banzi >= 0 && banzi < 9) {
                jing = (jing % 9);
            } else if (banzi >= 9 && banzi < 18) {
                jing = (jing % 9) + 9;
            } else if (banzi >= 18 && banzi < 27) {
                jing = (jing % 9) + 18;
            }
            game.jings[i] = jing;
            game.jingMap[jing] = true;
        }
    }
}
// 摸牌
function mopai(game, seatIndex) {
    if (game.currentIndex >= game.mahjongs.length) {
        // 没有牌了
        console.log("mopai no pai.");
        return -1;
    }
    var data = game.gameSeats[seatIndex];
    var mahjongs = data.holds;
    var pai = game.mahjongs[game.currentIndex];
    mahjongs.push(pai);
    //统计牌的数目
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
    game.currentIndex = 0;
    // 13*4 ＝ 52张，庄家多一张53张
    console.log("deal start fapai. zhuangjia:" + game.button);
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
    //庄家多摸最后一张
    mopai(game, game.button);
    //当前轮设置为庄家
    game.turn = game.button;
    console.log("deal fapai end.");
}
//检查是否可以碰
function checkCanPeng(game, seatData, targetPai) {
    var count = seatData.countMap[targetPai];
    if (count != null && count >= 2) {
        seatData.canPeng = true;
    }
}
//检查是否可以点杠
function checkCanDianGang(game, seatData, targetPai) {
    if (game.mahjongs.length <= game.currentIndex) {
        console.log("checkCanDianGang no pai.");
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
    if (game.mahjongs.length <= game.currentIndex) {
        console.log("checkCanAnGang no pai.");
        return;
    }
    for (var key in seatData.countMap) {
        var pai = parseInt(key);
        if (game.jingMap[pai]) {
            continue;
        }
        var c = seatData.countMap[key];
        if (c != null && c == 4) {
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }
    }
}
//检查是否可以弯杠(自己摸来最后一张，补杠)
function checkCanWanGang(game, seatData) {
    if (game.mahjongs.length <= game.currentIndex) {
        console.log("checkCanWanGang no pai.");
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
// 检查是否可胡
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
    var pattern = mjutils.checkCanHu(game.jingMap, seatData, -1, true);
    if (pattern != null) {
        seatData.canHu = true;
        seatData.tingInfo = {
            pattern: pattern,
            fan: 0,
            pai: targetPai,
            target: game.turn
        };
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
        // 抢杠胡
        if (game.isQiangGangHuing) {
            seatData.tingInfo.isQiangGangHu = true;
            seatData.tingInfo.isZiMo = true;
        }
        //如果是自摸，则需要记录对应的玩家
        if (seatData.tingInfo.isZiMo) {
            if (seatData.tingInfo.pai == null) {
                seatData.tingInfo.pai = seatData.holds[seatData.holds.length - 1];
            }
            seatData.tingInfo.targets = [];
            for (var k in game.gameSeats) {
                var ddd = game.gameSeats[k];
                if (ddd != seatData) {
                    seatData.tingInfo.targets.push(ddd.seatIndex);
                }
            }
        }
        seatData.tingInfo.pattern = pattern;
    }
    if (targetPai != null) {
        seatData.holds.pop();
        seatData.countMap[targetPai]--;
    }
}
// 得到牌的数值（一筒--九筒，一条--九条，一万--九万，东南西北中发白）
function getPoint(pai) {
    return (pai % 9) + 1;
}
// 数值是一或者九
function isYaoJiu(pai) {
    var p = getPoint(pai);
    return p == 1 || p == 9;
}
// 检查是否全幺九
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
    } else {
        userMgr.sendMsg(seatData.userId, 'game_action_push');
    }
}
// 轮到下一个玩家
function moveToNextUser(game, nextSeat) {
    if (nextSeat == null) {
        game.turn++;
        game.turn %= game.gameSeats.length;
    } else {
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
    clearAllOptions(game, seatData);

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
        if (totalHn >= 1) {
            doGameOver(game.roomInfo);
        } else {
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
// 摸牌
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
    } else {
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
    };

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

function computeFanScore(game, fan) {
    if (fan > game.conf.maxFan) {
        fan = game.conf.maxFan;
    }
    return (1 << fan) * game.conf.baseScore;
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
// 计算结果
function calculateResult(game, roomInfo) {
    var baseScore = game.conf.baseScore;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var sd = game.gameSeats[i];
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
                    additonalscore += ac.targets.length * 3;
                    for (var t = 0; t < ac.targets.length; ++t) {
                        var six = ac.targets[t];
                        game.gameSeats[six].score -= 3;
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
        // 自摸算分
        for (var j = 0; j < sd.huInfo.length; ++j) {
            var info = sd.huInfo[j];
            if (!info.pattern) {
                continue;
            }
            for (var t in info.targets) {
                var si = info.targets[t];
                var ddd = game.gameSeats[si];
                sd.score += 2;
                ddd.score -= 2;
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
                // 马分扣分转移
                var maF = 0;
                for (var f = 0; f < sd.zhongMa.length; f++) {
                    if (sd.zhongMa[f]) {
                        maF += 2;
                    }
                }
                for (var o = 0; o < game.gameSeats.length; o++) {
                    if (o != i && o != info.target) {
                        game.gameSeats[o].maFen += maF;
                        game.gameSeats[info.target].maFen -= maF;
                    }
                }
            }
            sd.numZiMo++;
        }
        // 无癞子额外分

        //一定要用 += 。 因为此时的sd.score可能是负的
        sd.score += additonalscore;
    }
    // 加上马分
    for (var i = 0; i < game.gameSeats.length; ++i) {
        var sd = game.gameSeats[i];
        sd.score += sd.maFen;
    }
}
// 生成马，且判断是否中马
function generateMa(roomInfo, game) {
    var ma = [];
    var noPai = true;
    if (game.currentIndex < game.mahjongs.length) {
        noPai = false;
        for (var i = 0; i < roomInfo.conf.mapaixuanze; i++) {
            if (game.currentIndex < game.mahjongs.length) {
                ma.push(game.mahjongs[game.currentIndex]);
                game.currentIndex++;
            } else {
                ma.push(game.mahjongs[game.mahjongs.length - 1]);
            }
        }
    } else {
        for (var h = 0; h < game.gameSeats.length; ++h) {
            var ssd = game.gameSeats[h];
            if (ssd.hued && ssd.huInfo.length > 0) {
                var huMaPai = ssd.huInfo[0].pai;
                for (var m = 0; m < roomInfo.conf.mapaixuanze; m++) {
                    ma.push(huMaPai);
                }
                break;
            }
        }
    }
    for (var j = 0; j < game.gameSeats.length; ++j) {
        var sd = game.gameSeats[j];
        if (ma.length > 0) {
            sd.ma = ma;
        }
        if (sd.hued) {
            if (noPai) {
                for (var k = 0; k < roomInfo.conf.mapaixuanze; k++) {
                    sd.zhongMa.push(true);
                }
            } else {
                for (var t = 0; t < roomInfo.conf.mapaixuanze; t++) {
                    var maPai = sd.ma[t];
                    var v = getPoint(maPai);
                    var maV = j - game.button;
                    if (j < game.button) {
                        maV = maV + 4;
                    }
                    sd.zhongMa.push(((v - 1) % 4) == maV);
                }
            }
            for (var f in sd.zhongMa) {
                if (sd.zhongMa[f]) {
                    sd.maFen += (2 * (game.gameSeats.length - 1));
                    for (var ii = 0; ii < game.gameSeats.length; ii++) {
                        if (ii != j) {
                            game.gameSeats[ii].maFen -= 2;
                        }
                    }
                }
            }
        }
    }
}
// 游戏结束
function doGameOver(roomInfo, forceEnd) {
    console.log("doGameOver start.");
    if (!roomInfo) {
        return;
    }
    var roomId = roomInfo.id;
    var game = roomInfo.game;
    roomInfo.game = null;
    var results = [];
    var dbresult = [0, 0, 0, 0];
    if (game) {
        var userId = game.gameSeats[0].userId;
        generateMa(roomInfo, game);
        if (!forceEnd) {
            calculateResult(game, roomInfo);
        }
        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var rs = roomInfo.seats[i];
            var sd = game.gameSeats[i];
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
                ma: sd.ma,
                zhongMa: sd.zhongMa,
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
                    }
                } else {
                    if (info.isQiangGangHu) {
                        str = "抢杠胡";
                    } else if (info.isZiMo) {
                        str = "自摸";
                    }
                }
                actionArr.push(str);
            }
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
            if (sd.zhongMa && sd.zhongMa.length > 0) {
                var c = 0;
                for (var f in sd.zhongMa) {
                    if (sd.zhongMa[f]) {
                        c++;
                    }
                }
                actionArr.push("中马 x " + c);
            }
            userRT.reason = actionArr.join("、");
            for (var k in sd.actions) {
                userRT.actions[k] = {
                    type: sd.actions[k].type
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
        } else if (game.firstHupai >= 0) {
            roomInfo.nextButton = game.firstHupai;
        } else {
            roomInfo.nextButton = (game.turn + 1) % 4;
        }
        if (old != roomInfo.nextButton) {
            db.update_next_button(roomId, roomInfo.nextButton);
        }
        console.log("doGameOver end.");
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
                numchadajiao: rs.numChaJiao
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
    } else {
        for (var i = 0; i < game.gameSeats.length; ++i) {
            var s = game.gameSeats[i];
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
        jings: game.jings,
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
        game_seats: new Array(4),
        jings: game.jings,
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
    // 牌的张数
    var size = 108;
    var seats = roomInfo.seats;
    console.log("begin start.");
    console.log(roomInfo.conf);
    if (!roomInfo.conf.budaifeng) {
        size = 136;
    }
    var game = {
        conf: roomInfo.conf,
        roomInfo: roomInfo,
        gameIndex: roomInfo.numOfGames,
        // 庄家索引
        button: roomInfo.nextButton,
        mahjongs: new Array(size),
        currentIndex: 0,
        gameSeats: new Array(4),

        numOfQue: 0,
        //TODO: 轮到谁摸牌打牌
        turn: 0,
        chuPai: -1,
        state: "idle",
        firstHupai: -1,
        yipaoduoxiang: -1,
        fangpaoshumu: -1,
        actionList: [],
        chupaiCnt: 0,
        numOfHued: 0,
        jingMap: {}
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
        // TODO:Luo
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

        data.ma = [];
        data.zhongMa = [];
        data.maFen = 0;
        // 放杠的牌
        data.fanggangs = [];


        gameSeatsOfUsers[data.userId] = data;
    }
    games[roomId] = game;
    //洗牌
    shuffle(game);
    //发牌
    deal(game);


    var numOfMJ = game.mahjongs.length - game.currentIndex;
    // var huansanzhang = roomInfo.conf.hsz;

    for (var i = 0; i < seats.length; ++i) {
        //开局时，通知前端必要的数据
        var s = seats[i];
        //通知玩家手牌
        userMgr.sendMsg(s.userId, 'game_holds_push', game.gameSeats[i].holds);
        //通知还剩多少张牌
        userMgr.sendMsg(s.userId, 'mj_count_push', numOfMJ);
        //通知还剩多少局
        userMgr.sendMsg(s.userId, 'game_num_push', roomInfo.numOfGames);
        userMgr.sendMsg(s.userId, 'game_jings_push', game.jings);
        //通知游戏开始
        userMgr.sendMsg(s.userId, 'game_begin_push', game.button);
        // 没有还三张规则，也没有定缺规则。
        // if(huansanzhang == true){
        //     game.state = "huanpai";
        //     //通知准备换牌
        //     userMgr.sendMsg(s.userId,'game_huanpai_push');
        // }
        // else{
        //     game.state = "dingque";
        //     //通知准备定缺
        //     userMgr.sendMsg(s.userId,'game_dingque_push');
        // }
        // 直接通知庄家出牌。
    }
    notifyChuPai(game);
};

function notifyChuPai(game) {
    construct_game_base_info(game);
    var turnSeat = game.gameSeats[game.turn];
    game.state = "playing";
    userMgr.broacastInRoom('game_playing_push', null, turnSeat.userId, true);
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
// 出牌
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
    //不准出精牌。
    if (game.jingMap[pai]) {
        for (var p in seatData.holds) {
            if (!game.jingMap[seatData.holds[p]]) {
                return;
            }
        }
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
    userMgr.broacastInRoom('game_chupai_notify_push', {userId: seatData.userId, pai: pai}, seatData.userId, true);
    //检查是否有人要碰，杠
    var hasActions = false;
    for (var i = 0; i < game.gameSeats.length; ++i) {
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        checkCanPeng(game, ddd, pai);
        checkCanDianGang(game, ddd, pai);
        if (hasOperations(ddd)) {
            sendOperations(game, ddd, game.chuPai);
            hasActions = true;
        }
    }
    //如果没有人有操作，则向下一家发牌，并通知他出牌
    if (!hasActions) {
        sleep(500);
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
// 检查是否抢杠胡
function checkCanQiangGang(game, turnSeat, seatData, pai) {
    if (!game.conf.keqiangganghu) {
        return false;
    }
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
        };
    } else {
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
        turnSeat.fanggangs.push(pai);
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

function doHu(game, seatData, pai) {
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
    } else {
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
        } else {
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
        console.log("guo qiangGangContext.");
        doGang(game, qiangGangContext.turnSeat, qiangGangContext.seatData, "wangang", 1, qiangGangContext.pai);
    } else {
        //下家摸牌
        moveToNextUser(game);
        doUserMoPai(game);
    }
};

exports.doGameOver = doGameOver;
var JU_SHU = [4, 8, 16];
var JU_SHU_COST = [2, 3, 4];
// 检查配置数据
exports.checkConf = function (roomConf, gems) {
    if (roomConf.jushuxuanze == null
        || roomConf.guipaixuanze == null
        || roomConf.guipaixuanze > 2
        || roomConf.mapaixuanze == null
        || roomConf.mapaixuanze > 20
        || roomConf.type == null) {
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
        return 2;
    }
    roomConf.cost = cost;
    return 0;
}
// 获取配置文件
exports.getConf = function (roomConf, creator) {
    console.log("getConf start.");
    console.log(roomConf);
    var ret = {
        type: roomConf.type,
        baseScore: 1,
        cost: roomConf.cost,
        zimo: roomConf.zimo,
        jiangdui: roomConf.jiangdui,
        hsz: roomConf.huansanzhang,
        dianganghua: parseInt(roomConf.dianganghua),
        menqing: roomConf.menqing,
        tiandihu: roomConf.tiandihu,
        maxFan: 8,
        maxGames: JU_SHU[roomConf.jushuxuanze],
        creator: creator,
        keqiangganghu: roomConf.keqiangganghu,
        qianggangquanbao: roomConf.qianggangquanbao,
        budaifeng: roomConf.budaifeng,
        genzhuang: roomConf.genzhuang,
        jiejiegao: roomConf.jiejiegao,
        guipaixuanze: roomConf.guipaixuanze,
        mapaixuanze: roomConf.mapaixuanze,
        discription: "",
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
    var arrStr = [];
    if (roomConf.keqiangganghu) {
        arrStr.push("可抢杠胡");
    }
    if (roomConf.qianggangquanbao) {
        arrStr.push("抢杠全包");
    }
    if (roomConf.budaifeng) {
        arrStr.push("不带风");
    } else {
        arrStr.push("带风");
    }
    if (roomConf.genzhuang) {
        arrStr.push("跟庄");
    }
    if (roomConf.jiejiegao) {
        arrStr.push("节节高");
    }
    if (roomConf.guipaixuanze == 0) {
        arrStr.push("无鬼");
    } else if (roomConf.guipaixuanze == 1) {
        arrStr.push("单鬼");
    } else if (roomConf.guipaixuanze == 2) {
        arrStr.push("双鬼");
    }
    if (roomConf.mapaixuanze == 0) {
        arrStr.push("无马");
    } else {
        arrStr.push("买" + roomConf.mapaixuanze + "马");
    }
    ret.discription = arrStr.join(" ");
    return ret;
}