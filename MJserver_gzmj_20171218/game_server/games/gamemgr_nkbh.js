// 南康豹胡
var myVersion = "nkbhmj_V0.03_17120702";
var mjutils = require('./laizimjutils_nkbh');
var roomMgr = require("../roommgr");
var userMgr = require("../usermgr");
var db = require("../../utils/dbsync");
var crypto = require("../../utils/crypto");
var comdef = require('../../utils/common');
var util = require('util');      // laoli add 171016
var http = require('../../utils/http');

var games = {};
var gamesIdBase = 0;

var ACTION_CHUPAI = 1;
var ACTION_MOPAI = 2;
var ACTION_PENG = 3;
var ACTION_GANG = 4;
var ACTION_HU = 5;
var ACTION_ZIMO = 6;
var ACTION_CHI = 7;

var gameSeatsOfUsers = {};

var BAOLIU_PAICNT = 0;       //最后保留的牌数量(不发牌），mc 1104

// 一些重要的配置，老李
// 注意!!!!
var enablePeiPai_debugonly = false;      //正式发布时必须关闭，写false
var dbg_maxGames = 0;        //正式发布时必须写0
var dbg_lai = false;        // 正式发布时必须写false

//===============================  整合一些标准化的函数到这里,方便后来人===========
// 获取牌总数, mc171014 add
var paiCount = 100;
function getPaiCount() {
    return paiCount;
}
function setPaiCount(invalue) {
    paiCount = invalue;
}

// 获取最大座位数, mc171014 add
var maxuserCount = 4;
function getMaxuserCount() {
    return maxuserCount;
}
function setMaxuserCount(invalue) {
    maxuserCount = invalue;
}

// 获取当前未空座位数
function getCurrentuserCount(room) {
    return room.currentuserCount;
}
function setCurrentuserCount(room) {
    room.currentuserCount = invalue;
}

// 看看room是不是开始打了
function isRoomBegined(room) {
    return (room.game != null)
}
// 获取牌的类型
function getMJType(id) {
    if (id >= 0 && id < 9) {
        // 筒
        return 0;
    } else if (id >= 9 && id < 18) {
        // 条
        return 1;
    } else if (id >= 18 && id < 27) {
        // 万
        return 2;
    } else if (id >= 27 && id < 34) {
        // 字
        return 3;
    }
}

// 是否序牌
function isMJXuType(id) {
    return getMJType(id) >= 0 && getMJType(id) <= 2;
}

// 是否字牌
function isMJZiType(id) {
    return getMJType(id) == 3;
}

// 是否字牌之风牌
function isMJZiFengType(id) {
    if (id >= 27 && id < 31) {
        return true;
    }
    return false;
}

// 是否字牌之中发白
function isMJZiZFBType(id) {
    if (id >= 31 && id < 34) {
        return true;
    }
    return false;
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
    for (var i = 0; i < 34; ++i) {
        if (getMJType(i) == 2)    //mc 1104, 必须缺一门万
        {
            continue;
        }

        for (var c = 0; c < 4; ++c) {
            //mahjongs[index] = i;
            mahjongs.push(i);   // laoli 1023
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
    if (enablePeiPai_debugonly) {
        var roomId = game.roomInfo.id;
        var mjArry = http.getSync('http://60.205.203.40:1017/get_set_number', {'roomId': roomId});
        if (mjArry && mjArry.data && mjArry.data.msg.length > 1 && mjArry.data.code == 101) {
            game.mahjongs = mjArry.data.msg;
            console.log("配牌系统给牌啦,一共有:", mjArry.data.msg.length);
        }
        else {
            console.log("<< 配牌系统没有用上");
        }
    }
    mahjongs = game.mahjongs
    //console.log(">> 配牌2:",mahjongs);

    //生成马
    generateMa(game); //mc 1103
}
// 生成马
function generateMa(game) { //mc 1103
    game.mas = []; //存放本局马牌的数组
    var maIndex = game.mahjongs.length;
    if (game.conf.mapaixuanze == 0) {
        game.mas = [];
    }
    var oneMa = [];
    for (var jj = 0; jj < game.conf.mapaixuanze; jj++) {
        maIndex--;
        var maPai = game.mahjongs[maIndex];
        oneMa.push(maPai);
    }
    game.mas = oneMa;
    console.log("马牌:", game.mas);
}
// 摸牌
function mopai(game, seatIndex) {
    if (game.currentIndex >= game.mahjongs.length - BAOLIU_PAICNT) {      //laoli 1023
        // 不能再摸牌了
        console.log("!!!mopai no pai.", game.roomInfo.id);
        return -1;
    }
    var data = game.gameSeats[seatIndex];
    var mahjongs = data.holds;
    //麻将里指定下标对应的牌
    var pai = game.mahjongs[game.currentIndex];
    //把摸牌存到手里
    mahjongs.push(pai);
    //统计牌的数目(对象)
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
    var seatIndex = game.button;
    for (var i = 0; i < 13 * game.currentUsercnt; ++i) {
        var mahjongs = game.gameSeats[seatIndex].holds;
        if (mahjongs == null) {
            mahjongs = [];
            game.gameSeats[seatIndex].holds = mahjongs;
        }
        mopai(game, seatIndex);
        seatIndex++;
        seatIndex %= game.currentUsercnt;
    }
    //庄家多摸最后一张
    mopai(game, game.button);
    //当前轮设置为庄家
    game.turn = game.button;
}
//检查是否可以吃
//      laoli add 171016
// 不支持精模式，必须是还原模式
// 返回值 null : fail, others: list ，列出所有可能的吃法
//exports.checkCanChi =
function checkCanChi(game, seatData, targetPai) {
    // seatData.holds有十三张牌
    //console.log(">> checkCanChi:",targetPai,seatData.holds,seatData.userId)
    //console.log(seatData)
    //return null
    var rets = null;
    var chilist = [];

    if (targetPai < 0) {
        console.log("Error: checkCanDoChi -7000");
        return null
    }

    var countmap = {};
    for (var k in seatData.countMap)
        countmap[k] = seatData.countMap[k];
    //countmap[targetPai]--  //去掉target牌
    //console.log(">> checkCanDoChi1:",targetPai,seatData.countMap)

    if (isMJXuType(targetPai)) {
        //console.log("xupai")
        var v = targetPai % 9;
        //console.log("xupai:",v)

        //1. check ABO
        v1 = v - 2;
        v2 = v - 1;
        if ((v1 < 9 && v1 >= 0) && (v2 < 9 && v2 >= 0)) {
            if (countmap[targetPai - 2] > 0 && countmap[targetPai - 1] > 0) {
//                chilist.push(util.format('%d,%d,%d',targetPai-2,targetPai-1,targetPai))
                var templist = [targetPai, targetPai - 2, targetPai - 1]
                chilist.push(templist)
            }
        }
        //2. check AOB
        v1 = v - 1;
        v2 = v + 1;
        if ((v1 < 9 && v1 >= 0) && (v2 < 9 && v2 >= 0)) {
            if (countmap[targetPai - 1] > 0 && countmap[targetPai + 1] > 0) {
//                chilist.push(util.format('%d,%d,%d',targetPai-1,targetPai,targetPai+1))
                var templist = [targetPai, targetPai - 1, targetPai + 1]
                chilist.push(templist)
            }
        }

        //3. check OAB
        v1 = v + 1;
        v2 = v + 2;
        if ((v1 < 9 && v1 >= 0) && (v2 < 9 && v2 >= 0)) {
            if (countmap[targetPai + 1] > 0 && countmap[targetPai + 2] > 0) {
                //chilist.push(util.format('%d,%d,%d',targetPai,targetPai+1,targetPai+2))
                var tempList = [targetPai, targetPai + 1, targetPai + 2];
                chilist.push(tempList);
            }
        }
    } else if (isMJZiFengType(targetPai)) {//东南西北
        var cnt = 0;
        for (var i = 27; i < 31; i++) {
            if (countmap[i] == null || countmap[i] == 0 || i == targetPai) {
                continue;
            }
            for (var k = i + 1; k < 31; k++) {
                if (countmap[k] == null || countmap[k] == 0 || k == targetPai) {
                    continue;
                }
                var templist = [targetPai, i, k]
                chilist.push(templist)
            }
        }
    } else if (isMJZiZFBType(targetPai)) { // 中发白
        //console.log("isMJZiZFBType:")
        var cnt = 0;
        for (var i = 31; i < 34; i++) {
            if (countmap[i] == null || countmap[i] == 0 || i == targetPai) {
                continue;
            }
            for (var k = i + 1; k < 34; k++) {
                if (countmap[k] == null || countmap[k] == 0 || k == targetPai) {
                    continue;
                }
                var templist = [targetPai, i, k]
                chilist.push(templist)
            }
        }
    }
    if (chilist.length == 0) {
        return null
    }
    seatData.canChi = true;
    seatData.chiPai = chilist;
    console.log("<< checkCanDoChi 能吃:", targetPai, chilist)
    return chilist
}

//检查是否可以碰
function checkCanPeng(game, seatData, targetPai) {
    //console.log("checkCanPeng targetPai:",targetPai);
    var count = seatData.countMap[targetPai];
    if (count != null && count >= 2) {
        seatData.canPeng = true;
        console.log("checkCanPeng:", targetPai, seatData.userId);
    }
}
//检查是否可以点杠
function checkCanDianGang(game, seatData, targetPai) {
    if (game.mahjongs.length <= game.currentIndex) {
        //console.log("checkCanDianGang no pai. liuju");
        return;
    }
    var count = seatData.countMap[targetPai];
    if (count != null && count >= 3) {
        seatData.canGang = true;
        seatData.gangPai.push(targetPai);
    }
}
//检查是否可以暗杠
function checkCanAnGang(game, seatData) {
    //如果没有牌了，则不能再杠
    if (game.mahjongs.length <= game.currentIndex) {
        return;
    }
    for (var key in seatData.countMap) { //遍历对象,玩家手上牌是啥
        var pai = parseInt(key);
        // if (game.jingMap[pai]) {
        //     continue;
        // }
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
    for (var i = 0; i < seatData.pengs.length; ++i) {
        var pai = seatData.pengs[i];
        if (seatData.countMap[pai] == 1) {
            seatData.canGang = true;
            seatData.gangPai.push(pai);
        }
    }
}
var getShowInfo = null;
// 检查是否可胡
checkCanHu = function (game, seatData, targetPai) {
    game.lastHuPaiSeat = -1;
    seatData.canHu = false;
    seatData.tingInfo = null;
    var pattern = checkCanHuEx_1(game, seatData, targetPai, false);
    //console.log("checkCanHuEx_nkbh：",pattern);
    if (pattern) {
        var tingInfo = {
            pattern: pattern,
            fan: 0,
            pai: targetPai,
            target: game.turn,
            isZiMo: false,
            isTianHu: false,
            isQingYiSe: false,
            isHao7Pairs: false,
            showInfo: getShowInfo
        };
        //console.log("showInfo是啥:",tingInfo.showInfo)
        tingInfo.isZiMo = targetPai == null;
        //判断是不是天胡。
        if (game.chupaiCnt == 0 && game.button == seatData.seatIndex && game.chuPai == -1) {
            tingInfo.isTianHu = true;
        }
        //判断是不是清一色
        tingInfo.isQingYiSe = isQingYiSe(seatData);
        //判断是不是豪七对
        tingInfo.isHao7Pairs = isHao7Pairs(seatData, targetPai);
        console.log("isQingYiSe , isHao7Pairs : ", tingInfo.isQingYiSe, tingInfo.isHao7Pairs);

        //判断是不是杠花
        if (tingInfo.pattern != null) {
            seatData.canHu = true;
            seatData.tingInfo = tingInfo;
            if (seatData.lastFangGangSeat != -1) {
                if (seatData.lastFangGangSeat == seatData.seatIndex) {
                    //杠花
                    seatData.tingInfo.isGangHua = true; //bugang or angang
                } else { //点杠花
                    seatData.tingInfo.isDianGangHua = true;
                    seatData.tingInfo.target = seatData.lastFangGangSeat;
                }
            }
            // 抢杠胡
            if (game.isQiangGangHuing) {
                seatData.tingInfo.isQiangGangHu = true;
                seatData.tingInfo.isZiMo = true;
            }
            //如果是自摸，则需要记录对应的玩家
            if (seatData.tingInfo.isZiMo == true) {
                if (seatData.tingInfo.pai == null) {
                    seatData.tingInfo.pai = seatData.holds[seatData.holds.length - 1];
                }
                seatData.tingInfo.targets = [];
                for (var ggk = 0; ggk < game.currentUsercnt; ggk++) {       //laoli 1021 for 23mj
                    var ggs = game.gameSeats[ggk];
                    if (ggs != seatData) {
                        seatData.tingInfo.targets.push(ggs.seatIndex);
                    }
                }
            }
        }
        //console.log("tingInfo:",tingInfo)
    }
    return pattern;
}
function checkCanHuEx_1(game, seatData, targetPai, jingmode) {
    //console.log(">> checkCanHuEx_1",targetPai, jingmode)
    var isZimu = false;
    var chupai = -1;
    //存储别人打的牌
    if (targetPai != null && targetPai != -1) {
        seatData.holds.push(targetPai);
        if (seatData.countMap[targetPai]) {
            seatData.countMap[targetPai]++;
        } else {
            seatData.countMap[targetPai] = 1;
        }
        chupai = targetPai;
    } else { //自摸
        chupai = -1;
        isZimu = true;
    }
    //var jingcnt = getMyJingCnt(chupai, seatData.countMap, game.jingMap)
    var pattern = null;
    if (mjutils.is7Pairs(seatData, jingmode, chupai) > 0) {
        console.log("是七对")
        pattern = "7Pairs";
    } else if (mjutils.is4Melds(seatData, jingmode, chupai) > 0) {
        console.log("是豹胡")
        pattern = "4melds";
    } else if (mjutils.isPingHuNew(seatData, jingmode, chupai)) {
        console.log("是自摸平胡")
        pattern = "normal";
    }
    if (pattern != null) {
        getShowInfo = sortPattern(seatData)
        //console.log("确定牌数:",getShowInfo)
    }
    if (targetPai != null) {
        seatData.holds.pop();
        seatData.countMap[targetPai]--;
    }
    return pattern;
}
// 排序
function sortPattern(seatData) {
    console.log("排序中的手牌1:", seatData.holds);
    var paiArray = comdef.deepCopy(seatData.holds);
    var hupaii = paiArray[paiArray.length - 1];
    paiArray.sort(function (a, b) {
        return a - b;
    })
    console.log("排序中的手牌2:", paiArray);
    return {
        huPaiPosition: paiArray.indexOf(hupaii),
        displayArr: paiArray
    }
}

// 清除所有的action。
function clearAllOptions(game, seatData) {
    var fnClear = function (sd) {
        sd.canPeng = false;
        sd.canGang = false;
        sd.gangPai = [];
        sd.canChi = false;
        sd.chiPai = [];
        sd.canHu = false;
        sd.lastFangGangSeat = -1;
    };
    if (seatData) {
        fnClear(seatData);
    } else {
        game.qiangGangContext = null;
        for (var i = 0; i < game.currentUsercnt; ++i) {
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
    if (seatData.canGang || seatData.canPeng || seatData.canHu || seatData.canChi) {
        return true;
    }
    return false;
}

function sendOperations(game, seatData, pai) {
    if (seatData == null) {
        return;
    }
    if (hasOperations(seatData)) {
        if (pai == -1) {
            pai = seatData.holds[seatData.holds.length - 1]; //抢杠胡 这里 玩家重新 连接网络 会有问题
        }
        var data = {
            pai: pai,
            chi: seatData.canChi,
            hu: seatData.canHu,
            peng: seatData.canPeng,
            gang: seatData.canGang,
            gangpai: seatData.gangPai,
            chiPai: seatData.chiPai        // laoli 1015
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
        //game.turn %= game.gameSeats.length;
        game.turn %= game.currentUsercnt;      //laoli 1020
    } else {
        game.turn = nextSeat;
    }
}

function hasHuAction(game) {
    for (var i = 0; i < game.currentUsercnt; ++i) {
        var sd = game.gameSeats[i];
        var ai = game.actionMap[i];
        if (sd.canHu || (ai && ai.action == 'hu')) {
            return true;
        }
    }
    return false;
}

function hasPengGangAction(game) {
    for (var i = 0; i < game.currentUsercnt; ++i) {
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
// laoli note: 这个函数很重要，轻易不要改动！！！！
//      玩家的点击动作的优先判断应该都在这里
function doAction(game, seatData, action, data) {
    if (!game.actionMap) {
        game.actionMap = {};
    }
    console.log(">> doAction:", action, seatData.userId, seatData.seatIndex);
    if (game.actionMap[seatData.seatIndex]) {
        return;
    }
    // 保存该位置的动作到缓存
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
    //清除该玩家的can标志
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
            } else if (ai.action == 'hu') {
                t = ai.action;
            } else if ((t != 'hu') && (ai.action == 'peng' || ai.action == 'gang')) {
                t = ai.action;
            }
        }

        if (t) {
            action = t;
        }
    }

    if (action == 'hu') {
        //如果还有人可以选择胡，则等待
        for (var i = 0; i < game.currentUsercnt; i++) {
            var sd = game.gameSeats[i];
            if (sd.canHu) {
                return true;
            }
        }
    } else if (action == 'peng' || action == 'gang') {
        //如果选了碰，且有可胡操作，则需要等待
        if (hasHuAction(game)) {
            console.log("其他玩家可能有Hu动作，要等待...")
            return true;
        }
    } else {
        for (var i = 0; i < game.currentUsercnt; i++) {
            var sd = game.gameSeats[i];
            if (hasOperations(sd)) {
                console.log("其他玩家可能有动作，要等待...")
                return true;
            }
        }
    }
    console.log(">> doAction3 玩家都点了，准备执行actionmap:", game.actionMap);
    //TODO: 二人，三人麻将不能跟庄。 luo 171025
    if (action != 'guo' && game.isCheckGenZhuangDone != true && game.currentUsercnt == 4) {
        game.isCheckGenZhuangDone = true;
        if (game.gameSeats[0].folds[0] != null
            && game.gameSeats[0].folds[0] == game.gameSeats[1].folds[0]
            && game.gameSeats[1].folds[0] == game.gameSeats[2].folds[0]
            && game.gameSeats[2].folds[0] == game.gameSeats[3].folds[0]) {
            game.genzhuangCnt = 1;
            if (game.gameSeats[0].folds[1] != null
                && game.gameSeats[0].folds[1] == game.gameSeats[1].folds[1]
                && game.gameSeats[1].folds[1] == game.gameSeats[2].folds[1]
                && game.gameSeats[2].folds[1] == game.gameSeats[3].folds[1]) {
                game.genzhuangCnt++;
                if (game.gameSeats[0].folds[2] != null
                    && game.gameSeats[0].folds[2] == game.gameSeats[1].folds[2]
                    && game.gameSeats[1].folds[2] == game.gameSeats[2].folds[2]
                    && game.gameSeats[2].folds[2] == game.gameSeats[3].folds[2]) {
                    game.genzhuangCnt++;
                }
            }
        }
    }
    //判断是否有人胡
    var hn = 0;
    var lastHuPaiSeat = -1;
    var totalHn = 0;
    for (var i = 0; i < game.currentUsercnt; ++i) {
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
            console.log("不允许一炮多响", game.roomInfo.id);
            break;                  // laoli 1024, 不允许一炮多响
        }

        i = (i + 1) % game.currentUsercnt;
        if (i == game.turn) {
            break;
        }
    }

    //记录是否是一炮多响
    // if (hn >= 2) {
    //     game.yiPaoDuoXiangSeat = game.turn;
    // }

    if (hn > 0) {
        clearAllOptions(game);
        for (var i = 0; i < game.currentUsercnt; ++i) {
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

        i = (i + 1) % game.currentUsercnt;
        if (i == game.turn) {
            break;
        }
    }
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
    for (var ti = 0; ti < game.currentUsercnt; ti++) {
        if (ti != game.turn) {
            game.gameSeats[ti].lastFangGangSeat = -1;
        }
    }
    turnSeat.guoHuFan = -1;
    var count = 0;
    var isMo = false;
    if (game.gameSeats.length == 2 && (game.mahjongs.length - game.currentIndex) == 31) {
        for (var i = 0; i < game.gameSeats.length; i++) {
            var s = game.gameSeats[i];
            var data = {msg: "两人麻将，剩余30张流局"}
            userMgr.sendMsg(s.userId, 'game_alert_msg', data);
            isMo = true
        }
    } else if ((game.gameSeats.length == 3 || game.gameSeats.length == 4) && (game.mahjongs.length - game.currentIndex) == 31) {
        for (var jk = 0; jk < game.gameSeats.length; jk++) {
            if (game.gameSeats[jk].holds.length == 0) {
                count++
            }
        }
        if (count == 1 || count == 2) {
            for (var i = 0; i < game.gameSeats.length; i++) {
                var s = game.gameSeats[i];
                var data = {msg: "两人麻将，剩余30张流局"}
                userMgr.sendMsg(s.userId, 'game_alert_msg', data);
                isMo = true;
            }
        }
    }
    var pai = -1
    if (!isMo) {
        pai = mopai(game, game.turn);
    } else {
        pai = -1
    }
    //var count1 = 0
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
//用于判断清一色
function isSameType(type, arr) {
    if (arr == null) {
        return true
    }
    for (var i = 0; i < arr.length; ++i) {
        var t = getMJType(arr[i]);
        if (type != -1 && type != t) {
            return false;
        }
        type = t;
    }
    return true;
}
function isHao7Pairs(seatData, targetPai) {
    if (mjutils.is7Pairs(seatData, false, targetPai) > 0) {
        for (var k in seatData.countMap) {
            var c = seatData.countMap[k];
            if (c == 4) {
                return true;
            }
        }
    }
    return false;
}
function isQingYiSe(seatData) {
    var type = getMJType(seatData.holds[0]);
    //检查手上的牌
    if (isSameType(type, seatData.holds) == false) {
        return false;
    }
    //检查杠下的牌
    if (isSameType(type, seatData.angangs) == false) {
        return false;
    }
    if (isSameType(type, seatData.wangangs) == false) {
        return false;
    }
    if (isSameType(type, seatData.diangangs) == false) {
        return false;
    }
    //检查碰牌
    if (isSameType(type, seatData.pengs) == false) {
        return false;
    }
    return true;
}

// 计算跟庄分
function jiSuanGenZhuangFen(game) {
    //console.log("jiSuanGenZhuangFen gen zhuang count:", game.genzhuangCnt);
    if (game.genzhuangCnt > 0) {
        var zjsd = game.gameSeats[game.button];
        for (var i = 1; i <= game.genzhuangCnt; i++) {
            for (var j = 0; j < game.currentUsercnt; ++j) {
                var sd = game.gameSeats[j];
                if (sd.seatIndex != game.button) {
                    sd.chaoZhuangFen += (2 * i);
                    zjsd.chaoZhuangFen -= (2 * i);
                }
            }
        }
    }
}

// 计算结果
function calculateResult(game, roomInfo) {
    console.log(">> calculateResult");
    var gameseatlength = game.currentUsercnt; //laoli 1021 for 23mj, replaced game.gameSeats.length
    for (var i = 0; i < gameseatlength; ++i) {  //laoli 1021
        var sd = game.gameSeats[i]; //每个座位信息
        // 杠牌分
        if (sd.actions != null) {
            console.log("sd.actions:", i, sd.actions)
            for (var a = 0; a < sd.actions.length; ++a) {
                var ac = sd.actions[a];
                if (!ac.type) {
                    continue;
                }
                if (ac.type == "angang") {
                    sd.angangFen += ac.targets.length * 2;
                    for (var t = 0; t < ac.targets.length; ++t) {
                        var six = ac.targets[t];
                        game.gameSeats[six].angangFen -= 2;
                    }
                } else if (ac.type == "diangang") {
                    console.log("diangangTargets", ac.targets, ac.targets.length)
                    sd.mingGangFen += ac.targets.length * (gameseatlength - 1);  //mc1124fixed
                    for (var t = 0; t < ac.targets.length; ++t) {
                        var six = ac.targets[t];
                        game.gameSeats[six].mingGangFen -= (gameseatlength - 1);
                    }
                } else if (ac.type == "wangang") {
                    sd.mingGangFen += ac.targets.length * 1;
                    for (var t = 0; t < ac.targets.length; ++t) {
                        var six = ac.targets[t];
                        console.log("补杠targets:", six)
                        game.gameSeats[six].mingGangFen -= 1;
                    }
                }
            }
        }
        //胡牌分 + 马分
        var baseScore = game.conf.baseScore;
        for (var j = 0; j < sd.huInfo.length; ++j) {
            var info = sd.huInfo[j];
            if (!info.pattern) {    // why?
                continue;
            }
            if (!sd.hued) {
                continue;
            }
            var fanBei = 1;
            if (info.pattern == "7Pairs") { //mc1116
                fanBei *= 2;
                if (info.isHao7Pairs) {
                    fanBei *= 2;
                }
            } else if (info.pattern == "4melds") {
                fanBei *= 2;
            }
            if (info.isQingYiSe) {
                fanBei *= 2;
            }
            if (info.isGangHua || info.isDianGangHua) { //TODO: 点杠，补杠杠花 x1
                fanBei *= 2;    //mc1116
            }
            if (info.isQiangGangHu) {
                fanBei *= 1;
            }
            if (info.isTianHu) {
                fanBei = 16;
            }    // TODO , 天胡就是32倍

            if (info.isZiMo) {
                if (info.isTianHu) {   //mc1116
                    baseScore = 1;
                    fanBei *= 1;
                } else {
                    fanBei *= 2;      //自摸*2
                }

                sd.huPaiFen += (baseScore * fanBei) * (gameseatlength - 1);

                for (var t1 in info.targets) {
                    var ti1 = info.targets[t1];
                    if (info.isQiangGangHu || info.isDianGangHua) { //mcfixed1124 点杠花胡牌分也要包赔
                        ti1 = info.target;
                    }
                    var gs1 = game.gameSeats[ti1];
                    gs1.huPaiFen -= (baseScore * fanBei);
                }
                var maBaseScore = 0;
                var maBase = 0;
                //马分（计入奖励分)
                for (var jk = 0; jk < gameseatlength; jk++) {
                    var ss = game.gameSeats[jk];
                    if (ss.hued) {
                        continue
                    }
                    if (info.isDianGangHua || info.isQiangGangHu) {   //mc1207fixed抢杠胡点杠花包赔马分修改
                        maBase = -ss.huPaiFen * 1 / (gameseatlength - 1);
                        if (maBase > 0) {
                            maBaseScore = maBase;
                        }
                        //console.log('抢杠马基础分',maBaseScore)
                    } else {
                        maBaseScore = -ss.huPaiFen * 1
                        //console.log('普通马基础分',maBaseScore)
                    }
                }
                // var maBaseScore=sd.huPaiFen*1  ;  // baseScore*2 or sd.huPaiFen*1，需要核查. TODO
                console.log("马基础分:", maBaseScore)

                // 计算中马数量
                var maCnt = 0;
                for (var f = 0; f < sd.zhongMa.length; f++) {
                    if (sd.zhongMa[f]) {
                        maCnt += 1;
                    }
                }
                console.log("中马数量:", maCnt)
                // 给赢家加马分
                sd.jiangLiFen += maBaseScore * maCnt * (gameseatlength - 1);
                console.log("赢家奖励分:", sd.jiangLiFen)

                for (var t11 in info.targets) {
                    var ti1 = info.targets[t11];
                    if (info.isQiangGangHu || info.isDianGangHua) { //mxfixed1124 点杠花马包赔
                        ti1 = info.target;
                    }
                    var gs1 = game.gameSeats[ti1];
                    gs1.jiangLiFen -= (maBaseScore * maCnt);
                    console.log("输家奖励分:", gs1.jiangLiFen)
                }
            }
        }
        // 跟庄分
        jiSuanGenZhuangFen(game);
        // 奖励分(其他) -- 目前没有
    }
    for (var i = 0; i < gameseatlength; i++) {
        var sd1 = game.gameSeats[i];
        //总分
        sd1.score += sd1.jiangLiFen + sd1.chaoZhuangFen + sd1.huPaiFen + sd1.angangFen + sd1.mingGangFen;
        console.log("总分:", sd1.score);
        console.log("明细:", sd1.jiangLiFen, sd1.chaoZhuangFen, sd1.huPaiFen, sd1.angangFen, sd1.mingGangFen)
    }

    console.log("<< calculateResult")
}
// 得到牌的数值（一筒--九筒，一条--九条，一万--九万，东南西北中发白）
function getPoint(pai) {
    if (pai < 27) {
        return (pai % 9) + 1;
    }
    if (pai == 27) {
        return 1
    }
    if (pai == 28 || pai == 31) {
        return 2
    }
    if (pai == 29 || pai == 32) {
        return 3
    }
    if (pai == 30 || pai == 33) {
        return 4
    }
}

//mc mark, copy from jh, need to check , TODO
//  仔细检查23MJ情况下的
zhongMaPai = function (game) {
    var curusers = game.currentUsercnt;
    for (var j = 0; j < curusers; ++j) {
        var sd = game.gameSeats[j];
        if (sd.hued) {
            for (var t = 0; t < game.mas.length; t++) {   //roomInfo.conf.mapaixuanze
                var maPai = game.mas[t];
                var v = getPoint(maPai);
                var maV = j - game.button; //当前胡牌座位-庄家
                if (j < game.button) {
                    maV = maV + curusers;
                }
                sd.zhongMa.push(((v - 1) % 4) == maV);
            }
            console.log("中马：", sd.zhongMa)
        }
    }
}
// 游戏结束
function doGameOver(roomInfo, forceEnd) {
    if (!roomInfo) {
        return;
    }
    var roomId = roomInfo.id;
    console.log("doGameOver", roomId);
    var game = roomInfo.game;
    roomInfo.game = null;
    var results = [];
    var dbresult = [0, 0, 0, 0];
    if (game) {
        var userId = game.gameSeats[0].userId;
        zhongMaPai(game)   //mc 1106 判断中马
        if (!forceEnd) {
            calculateResult(game, roomInfo);
        }
        //laoli add 1020，预制下数据，防止23MJ时客户端报错
        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var userRT = {
                totalscore: 0,
                score: 0,
                huinfo: [],
                pengs: [],
                chis: [],        // laoli 1017
                wangangs: [],
                diangangs: [],
                angangs: [],
                reason: "",
                holds: [],
                isForceEnd: false
            };
            results.push(userRT);
        }
        for (var i = 0; i < game.currentUsercnt; ++i) {       //laoli 1020
            var rs = roomInfo.seats[i];
            var sd = game.gameSeats[i];
            rs.ready = false;
            rs.score += sd.score;
            for (var s = roomInfo.numOfGames - 1; s >= 1; s--) {
                if (rs.eachScores[s] == null) {
                    rs.eachScores[s] = 0;
                }
            }
            rs.eachScores[roomInfo.numOfGames] = sd.score;
            rs.numZiMo += sd.numZiMo;
            rs.numAnGang += sd.numAnGang;
            rs.numMingGang += sd.numMingGang;
            var userRT = {
                roomId: roomId,
                userId: sd.userId,
                actions: [],
                pengs: sd.pengs,
                chis: sd.chis,        // laoli 1017
                wangangs: sd.wangangs,
                diangangs: sd.diangangs,
                angangs: sd.angangs,
                holds: sd.holds,
                huPaiFen: sd.huPaiFen, // 胡牌分
                jiangLiFen: sd.jiangLiFen, // 奖励分
                mingGangFen: sd.mingGangFen, // 明杠分
                angangFen: sd.angangFen, // 暗杠分
                chaoZhuangFen: sd.chaoZhuangFen, // 抄庄分
                score: sd.score,
                totalscore: rs.score,
                qingyise: sd.isQingYiSe,
                menqing: sd.isMenQing,
                // jingouhu: sd.isJinGouHu,
                huinfo: sd.huInfo,
                zhongMa: sd.zhongMa,
                mas: game.mas,
                reason: "",
                allJings: game.allJings,
                jingsInfo: sd.jingsInfo,
                isForceEnd: forceEnd ? true : false
            };
            var actionArr = [];
            for (var j = 0; j < sd.huInfo.length; ++j) {
                var info = sd.huInfo[j];
                if (!info.pattern) {
                    if (info.action == "beiqianggang") {
                        actionArr.push("被抢杠");
                    } else if (info.action == "beizimo") {
                        actionArr.push("被自摸");
                    }
                } else {
                    if (info.isQiangGangHu) {
                        actionArr.push("抢杠胡");
                    } else if (info.isZiMo) {
                        actionArr.push("自摸");
                    }
                    if (info.isTianHu) {
                        actionArr.push("天胡");
                    }
                    if (info.isQingYiSe) {
                        actionArr.push("清一色")
                    }
                    if (info.pattern == "4melds") {
                        actionArr.push("豹胡")
                    }
                    if (info.pattern == "7Pairs") {
                        if (info.isHao7Pairs) {
                            actionArr.push("豪华七对")
                        } else {
                            actionArr.push("小七对")
                        }
                    }
                    if (info.isDianGangHua || info.isGangHua) {
                        actionArr.push("杠开")
                    }

                }
            }

            // if (sd.angangs.length > 0) {
            //     actionArr.push("暗杠 x " + sd.angangs.length);
            // }
            // if (sd.diangangs.length > 0) {
            //     actionArr.push("点杠 x " + sd.diangangs.length);
            // }
            // if (sd.wangangs.length > 0) {
            //     actionArr.push("补杠 x " + sd.wangangs.length);
            // }
            // if (sd.fanggangs.length > 0) {
            //     actionArr.push("放杠 x " + sd.fanggangs.length);
            // }
            if (game.genzhuangCnt > 0) {
                if (i != game.button) {
                    actionArr.push("跟庄 x " + game.genzhuangCnt);
                }
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
            results[i] = userRT;          //laoli 1020
            dbresult[i] = sd.score;
        }

        var old = roomInfo.nextButton;
        if (game.yipaoduoxiang >= 0) {
            roomInfo.nextButton = game.yipaoduoxiang;
        } else if (game.firstHupai >= 0) {
            roomInfo.nextButton = game.firstHupai;
        } else {
            roomInfo.nextButton = (game.turn + 1) % game.currentUsercnt;  //getMaxuserCount();  laoli
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
        roomMgr.updateSeats(roomInfo.id); // LuoJunbo 171209.
        db.update_game_result(roomInfo.uuid, game.gameIndex, dbresult);
        //记录玩家操作
        var actionStr = JSON.stringify(game.actionList);
        db.update_game_action_records(roomInfo.uuid, game.gameIndex, actionStr);
        //保存游戏局数
        db.update_num_of_turns(roomId, roomInfo.numOfGames);
        isEnd = (roomInfo.numOfGames >= roomInfo.conf.maxGames);
        roomInfo.gameOverCounts = roomInfo.numOfGames;
    }
    var endinfo = null;
    if (isEnd) {
        endinfo = [];
        for (var l = 0; l < roomInfo.seats.length; ++l) {
            var ors = roomInfo.seats[l];
            endinfo.push({
                numzimo: ors.numZiMo,
                numjiepao: ors.numJiePao,
                numdianpao: ors.numDianPao,
                numangang: ors.numAnGang,
                numminggang: ors.numMingGang,
                numchadajiao: ors.numChaJiao,
                score: ors.score,
                eachScores: ors.eachScores
            });
        }
    }
    userMgr.broacastInRoom('game_over_push', {results: results, endinfo: endinfo}, userId, true);
    //如果局数已够，则进行整体结算，并关闭房间
    if (isEnd) {
        roomMgr.onRoomEnd(roomInfo, forceEnd);
    }
    // 20171023 luo 打印结算信息。
    if (game) {
        showGameOverResult1(game, results);
        for (var d = 0; d < game.currentUsercnt; ++d) {
            var tsd = game.gameSeats[d];
            delete gameSeatsOfUsers[tsd.userId];
        }
        delete games[roomId];
    }
}

//记录用户动作
function recordUserAction(game, seatData, type, target, pai) {
    var d = {type: type, targets: [], pai: pai};
    if (target != null) {
        if (typeof(target) == 'number') {
            d.targets.push(target);
        }
        else {
            d.targets = target;
        }
    } else {
        for (var i = 0; i < game.currentUsercnt; ++i) {
            var s = game.gameSeats[i];
            //血流成河，所有自摸，暗杠，弯杠，都算三家
            if (i != seatData.seatIndex/* && s.hued == false*/) {
                d.targets.push(i);
            }
        }
    }

    seatData.actions.push(d); //actions存储对象
    return d;
}

function recordGameAction(game, si, action, pai) { //记录玩家，ACTION_PENG动作，和pai
    game.actionList.push(si);
    game.actionList.push(action);
    if (pai != null) {
        game.actionList.push(pai);
    }
}

exports.sync = function (userId) {
    console.log("gamemgr_gzmj sync.");
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
        lastChuPaiTurn: game.lastChuPaiTurn
    };
    data.seats = [];
    var seatData = null;
    for (var i = 0; i < game.gameSeats.length; ++i) {  //laoli 1020
        var sd = game.gameSeats[i];
        var s = {
            userid: sd.userId,
            folds: sd.folds,
            angangs: sd.angangs,
            diangangs: sd.diangangs,
            wangangs: sd.wangangs,
            pengs: sd.pengs,
            chis: sd.chis,      //laoli 1017
            que: sd.que,
            hued: sd.hued,
            huinfo: sd.huInfo,
            iszimo: sd.iszimo,
            watcher: sd.watcher     // laoli 1020
        };
        if (sd.userId == userId) {
            s.holds = sd.holds;
            //s.huanpais = sd.huanpais;
            seatData = sd;
        }
        else {
            //s.huanpais = sd.huanpais ? [] : null;
        }
        data.seats.push(s);
    }
    //同步整个信息给客户端
    userMgr.sendMsg(userId, 'game_sync_push', data);
    if (game.chuPai != -1) {
        userMgr.sendMsg(userId, 'game_chupai_notify_push', {userId: turnId, pai: game.chuPai, isSync: true});
    }
    sendOperations(game, seatData, game.chuPai);
};

function construct_game_base_info(game) {
    var baseInfo = {
        type: game.conf.type,
        button: game.button,
        index: game.gameIndex,
        mahjongs: game.mahjongs,
        //储存每个座位的手牌
        game_seats: new Array(getMaxuserCount()),
        jings: game.jings
    };
    //把每个座位的手牌存在baseInfo中
    for (var i = 0; i < game.currentUsercnt; ++i) {        //laoli 1020
        var gs = baseInfo.game_seats[i] = [];
        for (var j = 0; j < game.gameSeats[i].holds.length; j++) {
            gs.push(game.gameSeats[i].holds[j]);
        }
    }
    game.baseInfo = baseInfo;
}

function store_game(game) {
    var ret = db.create_game(game.roomInfo.uuid, game.gameIndex, JSON.stringify(game.baseInfo));
    return ret;
}
// laoli 初始化一下seatdata数据
function resetSeatData(conf) {
    //var data = game.gameSeats[i] = {};
    var data = {};

//    data.game = game;
//    data.seatIndex = i;  //座位下标
//    data.userId = seats[i].userId;  //用户id

    //持有的牌
    data.holds = [];

    //打出的牌
    data.folds = [];
    //暗杠的牌
    data.angangs = [];
    //点杠的牌
    data.diangangs = [];
    //弯杠的牌(补杠)
    data.wangangs = [];
    //吃了的牌
    data.chis = [];
    //碰了的牌
    data.pengs = [];

    data.chis = [];        //laoli 1017

    data.jinggangs = []; //精杠的牌

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
    //是否可以吃
    data.canChi = false;
    data.chiPai = [];       //laoli add 1015,存放可以吃的顺子,可能存在好几个顺子

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
    data.actions = [];
    data.iszimo = false; //是否是自摸
    data.isGangHu = false; //是否杠上开花
    data.isQingYiSe = false;
    data.isHao7Pairs = false;
    data.zhongMa = []; //是否中马
    data.score = 0;  //分数
    data.huInfo = [];  //胡牌信息
    data.lastFangGangSeat = -1;
    //统计信息
    data.numZiMo = 0;
    data.numAnGang = 0;
    data.numMingGang = 0;
    data.fanggangs = [];
    data.watcher = false;     //true，是迟到的玩家，等待下一局
    data.huPaiFen = 0; // 胡牌分
    data.jiangLiFen = 0; // 奖励分(马分)
    data.mingGangFen = 0; // 明杠分
    data.angangFen = 0; // 暗杠分
    data.chaoZhuangFen = 0; // 抄庄分
    data.jingPaiFen = 0; //精牌分
    data.jingsInfo = [];
    return data;
}
// 迟到的玩家（牌局已经开始了才新到）
// lateJoin , laoli 1020
exports.lateJoin = function (roomId, userId) {
    console.log(">>room: lateJoin.", roomId, userId);
    var roomInfo = roomMgr.getRoom(roomId);
    var data = resetSeatData(roomInfo.game.conf);
    data.watcher = true;  //设置为旁观
    data.userId = userId;
    roomInfo.game.gameSeats.push(data);
    setTimeout(function (userId) {
        var name = roomMgr.getUserName(userId);
        var data = {};
        data.userid = userId;
        data.msg1 = "本局已经开打，围观一会儿吧！\n下一局可参战哦。";
        data.msg2 = "有新玩家(" + name + ")加入，正在围观。\n下一局会参战哦。";
        userMgr.broacastInRoom('game_latejoin_push', data, userId, true);
    }.bind(this), 3000, userId);
};
// 判断此时房间是否准备好。
function roomReady(roomInfo) {
    if (roomInfo == null) {
        return false;
    }
    var seatcnt = 0;
    var endSeatIndex = -1;
    for (var r = 0; r < roomInfo.seats.length; ++r) {
        var ss = roomInfo.seats[r];
        if (ss && ss.userId > 0) {
            seatcnt++;
            endSeatIndex = r;
        }
    }
    if (seatcnt < 2 || seatcnt != endSeatIndex + 1) {
        return false;
    }
    return true;
}
//开始新的一局
exports.begin = function (roomId) {
    console.log(">> begin", roomId);
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }
    if (roomReady(roomInfo) == false) {
        console.log("roomInfo is not ready!");
        return;
    }
    // 牌的张数
    var size = getPaiCount();
    // 座位,数组,玩家信息
    var seats = roomInfo.seats;
    var game = {
        conf: roomInfo.conf,
        roomInfo: roomInfo,
        gameIndex: roomInfo.numOfGames, //游戏局数下标
        button: roomInfo.nextButton, // 庄家索引
        //mahjongs: new Array(size), //136张麻将
        mahjongs: [], //136张麻将,laoli change to 发牌时push，所以牌的数量不确定 if 有缺门
        currentIndex: 0,  //当前牌的下标
        //gameSeats: new Array(getMaxuserCount()), //座位号
        gameSeats: [], //座位号 , laoli 1020 change, for 23MJ
        numOfQue: 0,        // sicuan only, nouse, ???
        turn: 0,  //轮到谁
        chuPai: -1,  //出的牌，筒条万顺序，例如1筒是0,1万是18
        state: "idle",
        firstHupai: -1,
        yipaoduoxiang: -1,
        fangpaoshumu: -1, // sicuan only, nouse, ???
        actionList: [], //记录玩家信息.????
        chupaiCnt: 0,
        numOfHued: 0,  // sicuan only, nouse, ???
        jingMap: {},  //{1: true, 30: true}  chongguan only, mc
        jings: [], //接口,传前端上精牌   chongguan only,mc
        chuJingList: [], // 玩家出精记录
        genzhuangCnt: 0,        //跟庄的次数。laoli 1025
        currentUsercnt: 0,   //laoli 1026, move from roomInfo to game
        allJings: [],
        lastChuPaiTurn: -1
    };
    roomInfo.numOfGames++;  //局数+1
    roomInfo.game = game;
    //每个座位的信息

    for (var i = 0; i < getMaxuserCount(); ++i) {
        var data = {};
        data = resetSeatData(game.conf);    // laoli add 1020
        data.game = game;
        data.seatIndex = i;  //座位下标
        data.userId = seats[i].userId;  //用户id
        gameSeatsOfUsers[data.userId] = data;
        if (seats[i].userId > 0) {
            game.currentUsercnt++;
            game.gameSeats.push(data)
        }
    }
    games[roomId] = game;
    if (game.currentUsercnt == 2) {
        console.log("两个人剩余30张牌")
        BAOLIU_PAICNT = 30;
    } else {
        console.log("正常剩牌")
        BAOLIU_PAICNT = game.conf.mapaixuanze; //剩余牌
    }
    //洗牌
    shuffle(game);
    //发牌
    deal(game);
    //剩余麻将数
    var numOfMJ = game.mahjongs.length - game.currentIndex;

    for (var i = 0; i < game.currentUsercnt; ++i) {     //laoli 1020
        //开局时，通知前端必要的数据
        var s = seats[i];
        //通知玩家手牌
        userMgr.sendMsg(s.userId, 'game_holds_push', game.gameSeats[i].holds);
        //通知还剩多少张牌
        userMgr.sendMsg(s.userId, 'mj_count_push', numOfMJ);
        //通知还剩多少局
        userMgr.sendMsg(s.userId, 'game_num_push', roomInfo.numOfGames);
        // userMgr.sendMsg(s.userId, 'game_jings_push', game.jings);
        //通知游戏开始
        userMgr.sendMsg(s.userId, 'game_begin_push', game.button);
    }
    notifyChuPai(game);

    console.log("<<room begined ", roomId);
};

function notifyChuPai(game) {
    construct_game_base_info(game);  //出牌前准备
    var turnSeat = game.gameSeats[game.turn]; //轮到谁(包含座位信息)
    game.state = "playing";
    userMgr.broacastInRoom('game_playing_push', null, turnSeat.userId, true);
    //通知玩家出牌方
    turnSeat.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', turnSeat.userId, turnSeat.userId, true);
    //检查是否可以暗杠或者胡
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
    game.lastChuPaiTurn = seatData.seatIndex;//标记最后一个打出
    recordGameAction(game, seatData.seatIndex, ACTION_CHUPAI, pai);
    //jiLuChuJing(game, -1, pai);
    userMgr.broacastInRoom('game_chupai_notify_push', {
        userId: seatData.userId,
        pai: pai,
        isSync: false
    }, seatData.userId, true);
    //检查是否有人要胡，要碰 要杠
    var hasActions = false;
    for (var i = 0; i < game.currentUsercnt; ++i) {
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        var ddd = game.gameSeats[i];
        checkCanPeng(game, ddd, pai);
        checkCanDianGang(game, ddd, pai);
        //checkCanHu(game, ddd, pai);   //mc1114
        if (seatData.lastFangGangSeat == -1) {
            if (ddd.canHu && ddd.guoHuFan >= 0 && ddd.tingInfo.fan <= ddd.guoHuFan) {
                console.log("ddd.guoHuFan:" + ddd.guoHuFan);
                ddd.canHu = false;
                userMgr.sendMsg(ddd.userId, 'guohu_push');
            }
        }
        //只检查下家chi, laoli 1017
        nextturn = (seatIndex + 1) % game.currentUsercnt; //game.gameSeats.length;
        if (nextturn == i) {
            //checkCanChi(game, ddd, pai);  // mc 1115 , no chi for nkbh
        }
        if (hasOperations(ddd)) { //判断有没有操作
            sendOperations(game, ddd, game.chuPai);
            hasActions = true;
        }
    }
    //如果没有人有操作，则向下一家发牌，并通知他出牌
    if (!hasActions) {
        sleep(500);
        userMgr.broacastInRoom('guo_notify_push', {
            userId: seatData.userId,
            pai: game.chuPai
        }, seatData.userId, true);
        seatData.folds.push(game.chuPai);
        game.chuPai = -1;
        moveToNextUser(game);
        doUserMoPai(game);
    }
}

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
    clearAllOptions(game); // luo 181019 清楚吃的动作
    recordGameAction(game, seatData.seatIndex, ACTION_PENG, pai);
    //jiLuChuJing(game, seatData.seatIndex, pai);

    //广播通知其它玩家
    userMgr.broacastInRoom('peng_notify_push', {userid: seatData.userId, pai: pai}, seatData.userId, true);
    //碰的玩家打牌
    moveToNextUser(game, seatData.seatIndex);
    checkCanWanGang(game, seatData);
    sendOperations(game, seatData, game.chuPai);
    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', seatData.userId, seatData.userId, true);
}

exports.peng = function (userId) {
    console.log(">> exports.peng,", userId)

    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        console.log("-1000, Error:peng , can't find user game data.");
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
        console.log(seatData.holds);
        console.log("-1000, Error: peng, lack of mj.");
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
};
// 检查是否抢杠胡
function checkCanQiangGang(game, turnSeat, seatData, pai) {
    // if (!game.conf.keqiangganghu) { //mc1116
    //     return false;
    // }
    var hasActions = false;
    for (var i = 0; i < game.currentUsercnt; ++i) {
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
    game.lastChuPaiTurn = -1;
    var seatIndex = seatData.seatIndex;
    var gameTurn = turnSeat.seatIndex;
    seatData.guoHuFan = -1;
    if (gangtype == "wangang") { //mc1110fixed
        var idx = seatData.pengs.indexOf(pai);
        if (idx >= 0) {
            seatData.pengs.splice(idx, 1);
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
        var ac = recordUserAction(game, seatData, "angang", null, pai);
        ac.score = game.conf.baseScore * 2;
    } else if (gangtype == "diangang") {
        seatData.diangangs.push(pai);
        var ac = recordUserAction(game, seatData, "diangang", gameTurn, pai); //mc1124fixed
        //jiLuChuJing(game, seatData.seatIndex, pai);
        ac.score = game.conf.baseScore * 2;
        turnSeat.fanggangs.push(pai);
        var fs = turnSeat;
        recordUserAction(game, fs, "fanggang", seatIndex, pai);
    } else if (gangtype == "wangang") {
        seatData.wangangs.push(pai);
        //if (isZhuanShouGang == false) { //mc1110fixed
        var ac = recordUserAction(game, seatData, "wangang", null, pai);
        ac.score = game.conf.baseScore;
        //} else {
        //recordUserAction(game, seatData, "zhuanshougang", null, pai);
        //}
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
    } else if (numOfCnt == 3) {
        gangtype = "diangang"
    } else if (numOfCnt == 4) {
        gangtype = "angang";
    } else {
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
// laoli add 1017, chi ===============>>
function doChi(game, seatData, data) {
    var pai0 = data[0];
    var pai1 = data[1];
    var pai2 = data[2];
    var pai = data;
    //进行吃牌处理
    //扣掉手上的牌
    //从此人牌中扣除
    var index1 = seatData.holds.indexOf(pai1);
    if (index1 == -1) {
        console.log("-1000, Error:doChi, can't find mj.");
        return;
    }
    seatData.holds.splice(index1, 1);
    seatData.countMap[pai1]--;
    var index2 = seatData.holds.indexOf(pai2);
    if (index2 == -1) {
        console.log("-1000, Error:doChi, can't find mj.");
        return;
    }
    seatData.holds.splice(index2, 1);
    seatData.countMap[pai2]--;
    seatData.chis.push(data);
    game.chuPai = -1;
    game.lastChuPaiTurn = -1;
    clearAllOptions(game);  //20171026 luo 清除action，主要为清空杠的标记。
    recordGameAction(game, seatData.seatIndex, ACTION_CHI, pai);
    //jiLuChuJing(game, seatData.seatIndex, pai[0]);
    //广播通知其它玩家
    userMgr.broacastInRoom('chi_notify_push', {userid: seatData.userId, pai: pai}, seatData.userId, true);
    //吃的玩家打牌
    moveToNextUser(game, seatData.seatIndex);
    checkCanWanGang(game, seatData);   //mc1114fixed
    checkCanAnGang(game, seatData);    //mc1114fixed
    //通知玩家做对应操作
    sendOperations(game, seatData, game.chuPai);  //mc1114fixed
    //广播通知玩家出牌方
    seatData.canChuPai = true;
    userMgr.broacastInRoom('game_chupai_push', seatData.userId, seatData.userId, true);
}

exports.chi = function (userId, data) {
    var seatData = gameSeatsOfUsers[userId];
    if (seatData == null) {
        mylog_error("-2000, [chi fail] can't find user game data.", userId);
        return;
    }
    // 对data进行提取,data必须是个字符串，格式是 [1,2,3]
    var newdata = JSON.parse(data);
    console.log("chi", userId, newdata);
    if (typeof(newdata) != "object") {
        mylog_error("-2001, [chi fail] data format wrong, ", userId, data);
        return;
    }
    inpai = parseInt(newdata[0]);
    mypai1 = parseInt(newdata[1]);
    mypai2 = parseInt(newdata[2]);

    var seatIndex = seatData.seatIndex;
    var game = seatData.game;

    //如果没有chi的机会，则不能再杠
    if (seatData.canChi == false) {
        console.log("seatData.chi == false");
        return;
    }

    // 检查下是否在chipai里面
    var inChiPaiList = false;
    console.log(data, seatData.chiPai);
    for (var item in seatData.chiPai) {
        // console.log(item);
        // console.log(newdata.toString(), seatData.chiPai[item].toString());
        if (newdata.toString() == seatData.chiPai[item].toString()) {
            inChiPaiList = true;
            break;
        }
    }

    if (inChiPaiList == false) {
        mylog_error("-2002, [chi fail] the given chi data not in chipai list.");
        return;
    }

    doAction(game, seatData, 'chi', newdata);
};
// ================== << laoli chi
function doHu(game, seatData, pai) {
    game.lastChuPaiTurn = -1;
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
        //jiLuChuJing(game, seatIndex, hupai);
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
            index: seatData.huInfo.length - 1
        });
        gangSeat.numdianpao++;
    } else if (game.chuPai == -1) {
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
                index: seatData.huInfo.length - 1
            });
        }
    } else {
        notify = game.chuPai;
        var at = "hu";
        //炮胡
        if (turnSeat.lastFangGangSeat >= 0) {
            at = "gangpaohu";
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
            index: seatData.huInfo.length - 1
        });
        fs.numDianPao++;
        recordGameAction(game, seatIndex, ACTION_HU, hupai);
        //jiLuChuJing(game, seatIndex, hupai);
    }
    //通知前端，有人和牌了
    userMgr.broacastInRoom('hu_push', {
        seatindex: seatIndex,
        iszimo: isZimo,
        hupai: notify
    }, seatData.userId, true);
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
    if ((seatData.canGang || seatData.canPeng || seatData.canHu || seatData.canChi) == false) {
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
}
// 打印gameover结果
showGameOverResult1 = function (game, results) {
    console.log("**** 算分结果 ****", game.roomInfo.id);
    var date = new Date();
    console.log(date.toLocaleString());
    console.log("*** 马牌 ***");
    console.log(game.mas);
    for (var i = 0; i < game.currentUsercnt; ++i) {
        var s = game.gameSeats[i];
        var userid = s.userId;
        var huinfo = s.huInfo;
        console.log(util.format("**%d,玩家%d**", i + 1, userid));
        if (huinfo) {
            console.log("  胡牌：", huinfo[0]);
        }
        var holdstr = s.holds.join(",");
        var foldstr = s.folds.join(",");
        var chistr = s.chis.join(",");
        var pengstr = s.pengs.join(",");
        var gangstr = s.angangs.join(",") + "-" + s.wangangs.join(",") + "-" + s.diangangs.join(",");
        var cpgstr = chistr + ';' + pengstr + ';' + gangstr;
        console.log("  手牌：" + holdstr);
        console.log("  桌牌：" + foldstr);
        console.log("  吃碰杠牌：" + cpgstr);
        // var jingstr = "  精分：";
        // for (var jii = 0; jii < s.jingsInfo.length; jii++) {
        //     jingstr = jingstr + s.jingsInfo[jii].zFen + ",";
        // }
        // jingstr += " =";
        // jingstr += s.jingPaiFen;
        // console.log(jingstr);
        var str = util.format('  总分%d(胡牌分%d,  奖励分%d, 暗杠分%d，明杠分%d， 跟庄分%d)',
            s.score, s.huPaiFen, s.jiangLiFen, s.angangFen, s.mingGangFen, s.chaoZhuangFen);
        console.log(str);
        console.log("");
    }
    // console.log("*** 精分清单 ***");
    // var jingcount = game.gameSeats[0].jingsInfo.length;
    // console.log("精数：", jingcount);
    // for (var jc = 0; jc < jingcount; jc++) {
    //     var jcstr = util.format(' 精%d  ', jc + 1);
    //     var zjlist = [];
    //     var fjlist = [];
    //     for (var jd = 0; jd < game.currentUsercnt; jd++) {  //laoli 1021 for 23mj
    //         var sjs = game.gameSeats[jd].jingsInfo[jc];
    //         jcstr += util.format('玩家%d:正精%d副精%d,得分%d; ', jd + 1, sjs.jiShu[0], sjs.jiShu[1], sjs.zFen);
    //     }
    //     console.log(jcstr);
    // }
    // console.log("");
    // console.log("*** 精原始Info ***");
    // for (var j = 0; j < game.currentUsercnt; ++j) {
    //     console.log(j, game.gameSeats[j].jingsInfo);
    // }
    console.log("");
    //console.log("*** 下发信息 ***");
    //console.log(results)
};
exports.doGameOver = doGameOver;
var JU_SHU = [4, 8, 16];
var JU_SHU_COST = [8, 10, 18];
var DI_FEN = [1, 2, 5];
// 检查配置数据
exports.checkConf = function (roomConf, gems) {
    if (roomConf.jushuxuanze == null
        || roomConf.difenxuanze == null
        || roomConf.difenxuanze > 2
        || roomConf.mapaixuanze == null
        || roomConf.mapaixuanze > 6  //6马
        || roomConf.type == null) {
        return 1;
    }
    if (roomConf.jushuxuanze < 0 || roomConf.jushuxuanze > JU_SHU.length) {
        return 1;
    }
    var cost = JU_SHU_COST[roomConf.jushuxuanze];
    if (roomConf.aa) {
        cost = Math.ceil(cost / getMaxuserCount());
    }
    if (cost > gems) {
        return 2;
    }
    roomConf.cost = cost;
    return 0;
};
// 获取配置文件
exports.getConf = function (roomConf, creator) {
    console.log("getConf start.");
    console.log(roomConf);
    var ret = {
        type: roomConf.type,
        creator: creator,
        cost: roomConf.cost,
        zimo: roomConf.zimo,
        // jiangdui: roomConf.jiangdui,
        dianganghua: true,
        // menqing: roomConf.menqing,
        // tiandihu: roomConf.tiandihu,

        keqiangganghu: roomConf.keqiangganghu,
        qianggangquanbao: roomConf.qianggangquanbao,
        genzhuang: roomConf.genzhuang,
        discription: "",
        isTimeRoom: false,
        time_card_number: "",
        baseScore: DI_FEN[roomConf.difenxuanze],  //mc11-03
        maxGames: JU_SHU[roomConf.jushuxuanze], //mc11-03
        wanfaxuanze: roomConf.wanfaxuanze,  //mc11-03
        mapaixuanze: roomConf.mapaixuanze, //mc11-03
    };
    if (roomConf.isTimeRoom) {
        ret.isTimeRoom = true;
        ret.maxGames = 16;  //mc11-03
    }
    if (roomConf.time_card_number) {
        ret.time_card_number = roomConf.time_card_number;
    }
    var arrStr = [];

    if (roomConf.wanfaxuanze == 0) {
        arrStr.push("南康豹胡");
    }

    if (roomConf.difenxuanze == 0) {
        arrStr.push("1分");
    } else if (roomConf.difenxuanze == 1) {
        arrStr.push("2分");
    } else if (roomConf.difenxuanze == 2) {
        arrStr.push("5分")
    }

    if (roomConf.mapaixuanze == 0) {
        arrStr.push("无马");
    } else {
        arrStr.push("买" + roomConf.mapaixuanze + "马");  //0,2,4,6
    }
    ret.discription = arrStr.join(" ");
    //console.log("rettt:",ret)
    return ret;
}
// 获取全局变量, laoli 1026
getALLGVar = function () {
    var data = {}

    data.games = games;
    data.gameSeatsOfUsers = gameSeatsOfUsers;
    //console.log(">> getALLGVar:",gameSeatsOfUsers)
    return data;
}

exports.getALLGVar = getALLGVar;      //laoli

exports.zhongMaPai = zhongMaPai  // TODO , for test only
exports.checkCanHu = checkCanHu  // TODO , for test only
exports.calculateResult = calculateResult   // TODO , for test only