// 赣州冲关麻将
var mjutils = require('./laizimjutils');
var roomMgr = require("../roommgr");
var userMgr = require("../usermgr");
var db = require("../../utils/dbsync");
var crypto = require("../../utils/crypto");
var comdef = require('../../utils/common');
var util = require('util');      // laoli add 171016
//var moment = require('moment')   // laoli add 171016
var http = require('../../utils/http');

var myVersion = "gzcgmj V0.03 171018";
//by mc

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

var BAOLIU_PAICNT = 34;       //最后保留的牌数量(不发牌），laoli 1023

// 一些重要的配置，老李
// 注意!!!!
var enablePeiPai_debugonly = true;      //正式发布时必须关闭
var dbg_maxGames = 0;        //正式发布时必须写0
var dbg_lai = false;        // 正式发布时必须写false

// log print 相关 , laoli 1017
function mylog_debug() {
    var t = parseInt(arguments.length / 3);
    for (var i = 0; i < t; i++) {
        console.log("gamemgr_gzmj", arguments[3 * i], arguments[3 * i + 1], arguments[3 * i + 2]);
    }
    var y = arguments.length % 3;
    if (y != 0) {
        switch (y) {
            case 1: {
                console.log("gamemgr_gzmj", arguments[3 * t]);
                break
            }
            case 2: {
                console.log("gamemgr_gzmj", arguments[3 * t], arguments[3 * t + 1]);
                break;
            }
        }
    }
}
function mylog_info() {
    // console.log(arguments)
}
function mylog_error() {
    // console.log(arguments)
}

//===============================  整合一些标准化的函数到这里,方便后来人===========
// 获取牌总数, mc171014 add
var paiCount = 136;
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

// 判断该玩家精总数量
function getMyJingCnt(chupai, countmap, jm) {

    var jingcnt = 0;

    for (var k in countmap) {
        if (jm[k] == true) {
            var c = countmap[k];
            jingcnt += c;
        }
    }

    if (jm[chupai] == true) { //别人打出的牌也是癞子,则不能算癞子
        jingcnt -= 1;
    }

    return jingcnt;
}

// 判断指定牌的精数量  //TODO,有问题
function getCardJingCnt(chupai, card, seatdata) {
    if (seatdata.game.jingMap[card] != true) { //手里不是精牌返回0
        return 0;
    }
    var c = seatdata.countMap[card]; //统计精牌数量
    if (chupai == card && c >= 1) {    //别人打出那张也是精牌,精牌数减一
        c--;
    }
    return c;
}
// 判断指定牌的非精(普通牌)数量
function getCardNoneJingCnt(chuPai, card, seatdata, checkjings) {
    var c = seatdata.countMap[card];
    if (checkjings == false) {
        return c;
    }
    if (seatdata.game.jingMap[card] != true) {
        return c;
    }
    if (chuPai == card && c >= 1) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}
// 洗牌
function shuffle(game) {
    var mahjongs = game.mahjongs;
    //装牌
    //筒 0 ~ 8:筒
    //条 9 ~ 17:条
    //万 18 ~ 26:万
    //字 27 ~ 33:东南西北中发白
    for (var i = 0; i < 34; ++i) {
        if (game.currentUsercnt == 2 && getMJType(i) == 2) {   //laoli 1023, 二人麻将，缺一门万
            continue;
        }
        for (var c = 0; c < 4; ++c) {
            mahjongs.push(i);   // laoli 1023
        }
    }
    //洗牌
    for (var j = 0; j < mahjongs.length; ++j) {
        var lastIndex = mahjongs.length - 1 - j;
        var index = Math.floor(Math.random() * lastIndex);
        var t = mahjongs[index];
        mahjongs[index] = mahjongs[lastIndex];
        mahjongs[lastIndex] = t;
    }
    if (enablePeiPai_debugonly) {
        var roomId = game.roomInfo.id;
        var mjArray = http.getSync('http://60.205.203.40:1017/get_set_number', {'roomId': roomId});
        if (mjArray && mjArray.data && mjArray.data.msg.length > 1 && mjArray.data.code == 101) {
            game.mahjongs = mjArray.data.msg;
        } else {
            console.log(roomId, "配牌系统没有用上");
        }
    }
    generateJing(game);
}
// 计算牌的下一张
function nextPai(pai) {
    if (pai == 8) {
        return 0;
    } else if (pai == 17) {
        return 9;
    } else if (pai == 26) {
        return 18;
    } else if (pai == 30) {
        return 27;
    } else if (pai == 33) {
        return 31;
    } else {
        return pai + 1;
    }
}
// 生成精牌
function generateJing(game) {
    //储存开局所有精的数组
    game.allJings = [];
    var jingIndex = game.mahjongs.length;
    if (dbg_lai) {
        jingIndex = 6 + Math.floor(Math.random() * 30); //TODO, 必须移除， laoli 1021
        console.log("!!!测试模式，癞子")
    }
    for (var jj = 0; jj < game.conf.wanfaxuanze * 2; jj++) {
        var oneJing = [];
        jingIndex--;
        var jingPai = game.mahjongs[jingIndex];
        oneJing.push(jingPai);
        oneJing.push(nextPai(jingPai));
        game.allJings.push(oneJing);
    }
    game.jings = game.allJings[0];
    game.jingMap[game.jings[0]] = true;
    game.jingMap[game.jings[1]] = true;
}
// 摸牌
function mopai(game, seatIndex, isGang) {
    if (isGang != true && game.currentIndex >= game.mahjongs.length - BAOLIU_PAICNT) {
        console.log("mopai no pai. room id:", game.roomInfo.id, "current index:", game.currentIndex);
        return -1;
    }
    var data = game.gameSeats[seatIndex];
    var mahjongs = data.holds;
    //麻将里指定下标对应的牌
    var pai = game.mahjongs[game.currentIndex];
    if (game.jingMap[pai] == true) {
        game.appearJing = true;
    }
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
    if (game.currentIndex >= game.mahjongs.length) {
        console.log("checkCanDianGang no pai. liuju");
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
    if (game.currentIndex >= game.mahjongs.length) {
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
    if (game.currentIndex >= game.mahjongs.length) {
        console.log("checkCanWanGang no pai.");
        return false;
    }
    for (var i = 0; i < seatData.pengs.length; ++i) {
        var pai = seatData.pengs[i];
        if (seatData.countMap[pai] == 1) {
            seatData.canGang = true;
            seatData.gangPai.push(pai);
            return true;
        }
    }
    return false;
}
// 在所有玩家的所有牌中，是否有上精牌。
// function hasShangJing(game) {
//     for (var i = 0; i < game.currentUsercnt; i++) {
//         var seat = game.gameSeats[i];
//         var j = 0;
//         var pai = -1;
//         for (j = 0; j < seat.holds.length; j++) {
//             pai = seat.holds[j];
//             if (game.jingMap[pai] == true) {
//                 return true;
//             }
//         }
//         for (j = 0; j < seat.folds.length; j++) {
//             pai = seat.folds[j];
//             if (game.jingMap[pai] == true) {
//                 return true;
//             }
//         }
//         for (j = 0; j < seat.angangs.length; j++) {
//             pai = seat.angangs[j];
//             if (game.jingMap[pai] == true) {
//                 return true;
//             }
//         }
//         for (j = 0; j < seat.diangangs.length; j++) {
//             pai = seat.diangangs[j];
//             if (game.jingMap[pai] == true) {
//                 return true;
//             }
//         }
//         for (j = 0; j < seat.wangangs.length; j++) {
//             pai = seat.wangangs[j];
//             if (game.jingMap[pai] == true) {
//                 return true;
//             }
//         }
//         for (j = 0; j < seat.pengs.length; j++) {
//             pai = seat.pengs[j];
//             if (game.jingMap[pai] == true) {
//                 return true;
//             }
//         }
//         for (j = 0; j < seat.chis.length; j++) {
//             var chi = seat.chis[j];
//             for (var k = 0; k < chi.length; k++) {
//                 pai = chi[k];
//                 if (game.jingMap[pai] == true) {
//                     return true;
//                 }
//             }
//         }
//     }
//     return false;
// }
// 检查是否可胡
// chonguan 可胡牌型
//  1. 确定胡的牌型
//    1.1. 小七对 :
//    1.2. 十三烂 :
//    1.3. 平胡  :
//  2. 附件附件判断
//      2.1 if 有精点炮不能平胡: 在有精在手时,假如平胡&不是碰碰胡,则必须自摸
//      2.2 if 精必钓:
//          1> 小七对时,可胡
//          2> 十三烂
//              无精或者有精还原模式下,可胡;
//          3> 平胡
//              2.2.3.1 无精或者有精还原模式下,可胡;
//              2.2.3.2 有精时必须将牌是精,另外一张是最后一张牌.
function checkCanHu(game, seatData, targetPai) {
    game.lastHuPaiSeat = -1;
    seatData.canHu = false;
    seatData.tingInfo = null;
    var huInfo = checkCanHuExt(game, seatData, targetPai, true);
    console.log(game.roomInfo.id, seatData.userId, "checkCanHu", huInfo);
    if (huInfo) {
        var tingInfo = {
            pattern: huInfo.pattern,
            huScore: huInfo.score,
            pai: huInfo.isZiMo ? huInfo.moPai : huInfo.chuPai,
            target: game.turn,
            isZiMo: huInfo.isZiMo,
            isTianHu: huInfo.isTianHu,
            isDiHu: huInfo.isDiHu,
            isDeGuo: huInfo.isDeGuo,
            isDeZhongDe: huInfo.isDeZhongDe,
            is7ShiSanLan: huInfo.is713Lan,
            isJingDiaoPai: huInfo.isJingDiaoMode,
            isJingDiao: huInfo.isJingDiao,
            isGangHua: huInfo.isGangHua,
            isDianGangHua: huInfo.isDianGangHua,
            isQiangGangHu: huInfo.isQiangGangHu,
            showInfo: huInfo.genShowInfo(),
            huInfoExt: huInfo
        };
        // if (tingInfo.isDeGuo) {
        //     tingInfo.isDeZhongDe = !(hasShangJing(game));
        // }
        if (huInfo.isDianGangHua) {
            tingInfo.target = huInfo.dianGangHuaFrom;
        }
        if (tingInfo.isQiangGangHu) {
            tingInfo.isZiMo = true;
        }
        if (tingInfo.isZiMo == true || tingInfo.isDiHu == true) {
            tingInfo.targets = [];
            for (var i = 0; i < game.currentUsercnt; i++) {
                var seat = game.gameSeats[i];
                if (seat != seatData) {
                    tingInfo.targets.push(seat.seatIndex);
                }
            }
        }
        if (huInfo.isPingHuReally()) {
            var jingCount = 0;
            for (var j in seatData.countMap) {
                if (game.jingMap[j] == true && seatData.countMap[j] > 0) {
                    jingCount += seatData.countMap[j];
                }
            }
            switch (game.conf.hufaxuanze) { //0:可平胡  1:有精点炮不能平胡 2:有精必钓
                case 0: {
                    break;
                }
                case 1: {
                    if (jingCount > 0 && tingInfo.isZiMo != true) {
                        console.log(game.roomInfo.id, "有精点炮不能平胡.");
                        tingInfo.pattern = null;
                    }
                    break;
                }
                case 2: {
                    if (jingCount > 0 && !tingInfo.isJingDiao) {
                        console.log(game.roomInfo.id, "精必钓.");
                        tingInfo.pattern = null;
                    }
                    break;
                }
            }
        }
        if (tingInfo.pattern != null) {
            seatData.canHu = true;
            seatData.tingInfo = tingInfo;
        }
    }
}
// 判断是否能胡。
var checkCanHuExt = function (game, seatData, chuPai, jingmode) {
    if (chuPai != -1) {
        seatData.holds.push(chuPai);
        if (seatData.countMap[chuPai]) {
            seatData.countMap[chuPai]++;
        } else {
            seatData.countMap[chuPai] = 1;
        }
    }
    var causePattern = null;
    var huInfo = null;
    if (mjutils.isPingHuNew(seatData, jingmode, chuPai)) {
        causePattern = "normal";
    } else if (is7Pairs(seatData, jingmode, chuPai) > 0) {
        causePattern = "7pairs";
    } else if (isShiSanLan(seatData, jingmode, chuPai) > 0) {
        causePattern = "13lan";
    }
    if (causePattern != null) {
        huInfo = scanPattern(game, seatData, chuPai);
    }
    if (chuPai != -1) {
        seatData.holds.pop();
        seatData.countMap[chuPai]--;
    }
    return huInfo;
};
// 扫描玩家牌型。
function scanPattern(game, seatData, chuPai) {
    var patterns = [];
    var node = null;
    var huInfo = null;
    var hasJingDiao = false;
    mjutils.scanPingHuPattern(seatData, true, chuPai, patterns);
    mjutils.scanPingHuPattern(seatData, false, chuPai, patterns);
    mjutils.scan13LanPattern(seatData, true, chuPai, patterns);
    mjutils.scan13LanPattern(seatData, false, chuPai, patterns);
    mjutils.scan7pairsPattern(seatData, true, chuPai, patterns);
    mjutils.scan7pairsPattern(seatData, false, chuPai, patterns);
    var isGangHua = false;
    var isDianGangHua = false;
    var dianGangHuaFrom = -1;
    if (seatData.lastFangGangSeat != -1) {
        if (seatData.lastFangGangSeat == seatData.seatIndex) {
            isGangHua = true;
        } else {
            isDianGangHua = true;
            dianGangHuaFrom = seatData.lastFangGangSeat;
        }
    }
    var isQiangGangHu = false;
    if (game.isQiangGangHuing) {
        isQiangGangHu = true;
    }
    var isTianHu = false;
    var isDiHu = false;
    if (game.chupaiCnt == 0 && game.button == seatData.seatIndex && game.chuPai == -1) {
        isTianHu = true;
    } else if (game.chupaiCnt == 1 && game.turn == game.button && game.button != seatData.seatIndex && game.chuPai != -1) {
        isDiHu = true;
    }
    for (var i = 0; i < patterns.length; i++) {
        node = patterns[i];
        node.setBaseInfo(game.conf.baseScore, game.conf.shifoutongzhuang, seatData.holds, seatData.chis, chuPai, game.jingMap, game.appearJing);
        node.setSeatInfo(game.currentUsercnt, seatData.seatIndex, game.turn, game.button);
        node.setTianDiHuInfo(isTianHu, isDiHu);
        node.setGangInfo(isGangHua, isDianGangHua, dianGangHuaFrom, isQiangGangHu);
        var isJingDiao = node.parsePattern();
        hasJingDiao = hasJingDiao || isJingDiao;
    }
    for (var j = 0; j < patterns.length; j++) {
        node = patterns[j];
        node.calculate(hasJingDiao);
        // node.displayInfo();
        if (huInfo == null) {
            huInfo = node;
        } else {
            if (node.eScore > huInfo.eScore) {
                huInfo = node;
            } else if (node.eScore == huInfo.eScore) {
                if (node.isCanHu()) {
                    huInfo = node;
                }
            }
        }
    }
    if (huInfo && huInfo.isCanHu()) {
        return huInfo;
    }
    return null;
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
            chiPai: seatData.chiPai,        // laoli 1015
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
    seatData.guoHuScore = -1;
    //如果有胡，但是玩家选择了过，则认为是过胡。
    if (seatData.canHu && action == 'guo') {
        //如果不是自己出牌，则要过胡
        if (game.turn != seatData.seatIndex) {
            seatData.guoHuScore = seatData.tingInfo.huScore;
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
            console.log("不允许一炮多响", game.roomInfo.roomId);
            break;                  // laoli 1024, 不允许一炮多响
        }

        i = (i + 1) % game.currentUsercnt;
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

    //最后检查是否有人可以吃。
    var i = game.turn;
    while (true) {
        var ddd = game.gameSeats[i];
        var ai = game.actionMap[i];
        if (ai && ai.action == 'chi') {
            doChi(game, ddd, ai.data);
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
function doUserMoPai(game, lastFangGangSeat, isGang) {
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
    turnSeat.guoHuScore = -1;
    var pai = mopai(game, game.turn, isGang);
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
        checkCanWanGang(game, turnSeat);
    }
    //检查看是否可以和
    checkCanHu(game, turnSeat, -1);
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
//德国
// 检查是否德国牌型,不管能不能胡,注意
// function isDeGuo(game, seatData, targetPai) {  //传过来轮到的那个人
//     var rets = false;
//     var havejing = false;
//     for (var k in seatData.countMap) {
//         if (seatData.game.jingMap[k] && seatData.countMap[k] > 0) {
//             havejing = true;
//             break;
//         }
//     }
//     if (havejing) {
//         var pattern = checkCanHuEx(game, seatData, targetPai, false);
//         mylog_debug('isDeGuo:', pattern);
//         if (pattern) {
//             rets = true;
//         }
//     } else {
//         rets = true;
//     }
//     mylog_debug('isDeGuo:', rets);
//     return rets;
// }
// 统计玩家各种牌的精情况
function tongJiJingsInfoFrom(game, seatData, paiArray, inc) {
    for (var i = 0; i < paiArray.length; i++) {
        var pai = paiArray[i];
        for (var j = 0; j < game.allJings.length; j++) {
            for (var k = 0; k < game.allJings[j].length; k++) {
                if (game.allJings[j][k] == pai) {
                    seatData.jingsInfo[j].jiShu[k] += inc;
                }
            }
        }
    }
}
// 统计精各个玩家的情况
function tongJiJingsInfo(game) {
    for (var jj = 0; jj < game.currentUsercnt; jj++) {  //laoli 1021 for 23mj
        var sd = game.gameSeats[jj];
        for (var i = 0; i < sd.jingsInfo.length; i++) {
            sd.jingsInfo[i].jiShu[0] = 0;
            sd.jingsInfo[i].jiShu[1] = 0;
        }
        // 手中的牌
        tongJiJingsInfoFrom(game, sd, sd.holds, 1);
        // 打出的牌
        tongJiJingsInfoFrom(game, sd, sd.folds, 1);
        // 暗杠的牌
        tongJiJingsInfoFrom(game, sd, sd.angangs, 4);
        // 点杠的牌
        tongJiJingsInfoFrom(game, sd, sd.diangangs, 4);
        // 补杠的牌
        tongJiJingsInfoFrom(game, sd, sd.wangangs, 4);
        // 碰的牌
        tongJiJingsInfoFrom(game, sd, sd.pengs, 3);
        // 吃的牌
        for (var j = 0; j < sd.chis.length; j++) {
            tongJiJingsInfoFrom(game, sd, sd.chis[j], 1);
        }
        // 胡的牌
        var huDePai = [];
        if (sd.huInfo != null) {
            for (var h = 0; h < sd.huInfo.length; ++h) {
                var info = sd.huInfo[h];
                if (!info.pattern) {
                    continue;
                }
                huDePai.push(info.pai); // 171021 luo 这里不能加自摸条件，因为DoHu的时候，holds牌中pop出最后一张。
            }
        }
        tongJiJingsInfoFrom(game, sd, huDePai, 1);
    }
}
// 查询最后一个出精的玩家。
function indexLastChuJing(game, seatData, jing) {
    for (var i = game.chuJingList.length - 1; i >= 0; i--) {
        var chuJing = game.chuJingList[i];
        if (chuJing.to == seatData.seatIndex && chuJing.pai == jing) {
            return i;
        }
    }
    return -1;
}
//判断玩家是否出精
function indexChuJingInfo(game, seatIndex) {
    var ret = [0, 0];
    var jings = game.jings;
    for (var i = 0; i < game.chuJingList.length; i++) {
        var info = game.chuJingList[i];
        if (info.from == seatIndex && info.to == -1) {
            if (info.pai == jings[0]) {
                ret[0]++;
            } else if (info.pai == jings[1]) {
                ret[1]++;
            }
        }
    }
    return ret;
}
// 计算精分
function jiSuanJingFen(game, seatData) {
    // mylog_debug("jiSuanJingFen +", seatData.jingsInfo);
    for (var i = 0; i < seatData.jingsInfo.length; i++) {
        var jingInfo = seatData.jingsInfo[i];
        jingInfo.fen[0] += (jingInfo.jiShu[0] * 2);
        jingInfo.fen[1] += (jingInfo.jiShu[1] * 1);
        var oneJingFen = jingInfo.fen[0] + jingInfo.fen[1];
        if (oneJingFen >= 5) { // 是否冲关
            mylog_debug("jiSuanJingFen 冲关成功.");
            jingInfo.chongGuanBeiShu = oneJingFen - 3;
            oneJingFen = (oneJingFen - 3) * oneJingFen;
        }
        var otherNotHave = true;
        if (jingInfo.jiShu[0] > 0 || jingInfo.jiShu[1] > 0) { // 是否霸王
            for (var j = 0; j < game.currentUsercnt; j++) {  //laoli 1021 for 23mj
                if (seatData.seatIndex != j) {
                    var sd = game.gameSeats[j];
                    if (sd.jingsInfo[i].jiShu[0] > 0 || sd.jingsInfo[i].jiShu[1] > 0) {
                        otherNotHave = false;
                        break;
                    }
                }
            }
        } else {
            otherNotHave = false;
        }
        if (otherNotHave) {
            jingInfo.baWangBeiShu = 2;
            oneJingFen *= 2;
        } else {
            jingInfo.baWangBeiShu = 0;
        }
        var lastChuJing = -1;
        if (i == 0 && (jingInfo.chongGuanBeiShu > 0 || jingInfo.baWangBeiShu > 0)) { // 查询是否有玩家出精导致
            var zIndex = indexLastChuJing(game, seatData, game.allJings[i][0]);
            var fIndex = indexLastChuJing(game, seatData, game.allJings[i][1]);
            var last = zIndex > fIndex ? zIndex : fIndex;
            if (last != -1) {
                lastChuJing = game.chuJingList[last].from;
            }
        }
        for (var k = 0; k < game.currentUsercnt; k++) {   //laoli 1021 for 23mj
            if (k != seatData.seatIndex) {
                var ggs = game.gameSeats[k];
                if (lastChuJing != -1) {
                    ggs = game.gameSeats[lastChuJing];
                }
                jingInfo.zFen += oneJingFen;
                ggs.jingsInfo[i].zFen -= oneJingFen;
            }
        }
    }
    // mylog_debug("jiSuanJingFen -", seatData.jingsInfo);
}
// 计算跟庄分
function jiSuanGenZhuangFen(game) {
    mylog_debug("jiSuanGenZhuangFen gen zhuang count:", game.genzhuangCnt);
    if (game.genzhuangCnt > 0) {
        var zjsd = game.gameSeats[game.button];
        for (var i = 1; i <= game.genzhuangCnt; i++) {
            for (var j = 0; j < game.currentUsercnt; ++j) {
                var sd = game.gameSeats[j];
                if (sd.seatIndex != game.button) {
                    sd.chaoZhuangFen += (5 * i);
                    zjsd.chaoZhuangFen -= (5 * i);
                }
            }
        }
    }
}
// 计算结果
function calculateResult(game, roomInfo) {
    var baseScore = [0, 0, 0, 0];
    var gameSeatLength = game.currentUsercnt; //laoli 1021 for 23mj, replaced game.gameSeats.length
    for (var s = 0; s < gameSeatLength; ++s) {  //laoli 1021
        baseScore[s] = game.conf.baseScore;
        if (game.conf.shifoutongzhuang == 0) { // 通庄
            baseScore[s] *= 2;
        } else if (game.conf.shifoutongzhuang == 1 && game.button == s) { // 分闲庄
            baseScore[s] *= 2;
        }
    }
    tongJiJingsInfo(game);
    for (var i = 0; i < gameSeatLength; ++i) {  //laoli 1021
        var sd = game.gameSeats[i]; //每个座位信息
        // 杠分
        if (sd.actions != null) {  //数组存的动作类型的字符串
            for (var a = 0; a < sd.actions.length; ++a) {
                var ac = sd.actions[a];
                if (!ac.type) {
                    continue;
                }
                var gangBaseScore = 0;
                if (ac.type == "angang") {
                    gangBaseScore = 2;
                } else if (ac.type == "diangang" || ac.type == "wangang") {
                    gangBaseScore = 1;
                }
                if (gangBaseScore > 0) {
                    var isGangJing = false;
                    for (var g = 0; g < game.allJings.length; g++) {
                        var oneJing = game.allJings[g];
                        for (var gc = 0; gc < oneJing.length; gc++) {
                            if (ac.pai == oneJing[gc]) {
                                var chuJingUser = -1;
                                isGangJing = true;
                                gangBaseScore = 10;
                                if (g == 0) {
                                    var chuJingJiLuIndex = indexLastChuJing(game, sd, oneJing[gc]);
                                    if (chuJingJiLuIndex != -1) {
                                        chuJingUser = game.chuJingList[chuJingJiLuIndex].from;
                                    }
                                }
                                for (var ui = 0; ui < ac.targets.length; ++ui) {
                                    var usi = ac.targets[ui];
                                    if (chuJingUser != -1) {
                                        usi = chuJingUser;
                                    }
                                    sd.gangJingFen += gangBaseScore;
                                    game.gameSeats[usi].gangJingFen -= gangBaseScore;
                                }
                            }
                        }
                    }
                    if (isGangJing != true) {
                        if (ac.type == "angang") {
                            for (var tl = 0; tl < ac.targets.length; ++tl) {
                                var act = ac.targets[tl];
                                sd.angangFen += gangBaseScore;
                                game.gameSeats[act].angangFen -= gangBaseScore;
                            }
                        } else if (ac.type == "diangang" || ac.type == "wangang") {
                            for (var ti = 0; ti < ac.targets.length; ++ti) {
                                var att = ac.targets[ti];
                                sd.mingGangFen += gangBaseScore;
                                game.gameSeats[att].mingGangFen -= gangBaseScore;
                            }
                        }
                    }
                }
            }
        }
        // 胡牌分
        var isHu = false;
        if (sd.huInfo != null) {
            for (var h = 0; h < sd.huInfo.length; ++h) {
                var info = sd.huInfo[h];
                if (!info.pattern) {
                    continue;
                }
                isHu = true;
                if (info.isTianHu) {
                    for (var iti1 in info.targets) {
                        var it1 = info.targets[iti1];
                        var ggs1 = game.gameSeats[it1];
                        sd.huPaiFen += (16 * baseScore[i]);
                        ggs1.huPaiFen -= (16 * baseScore[i]);
                    }
                } else if (info.isDiHu) {
                    for (var iti2 in info.targets) {
                        var it2 = info.targets[iti2];
                        var ggs2 = game.gameSeats[it2];
                        sd.huPaiFen += (16 * baseScore[it2]);
                        ggs2.huPaiFen -= (16 * baseScore[it2]);
                    }
                } else {
                    var fanBei = 1;
                    var deGuoJiaFen = 0;
                    if (info.pattern == "7pairs") {
                        fanBei *= 2;
                    } else if (info.pattern == "big7pairs") {
                        fanBei *= 4;
                    } else if (info.pattern == "13lan") {
                        fanBei *= 2;
                        if (info.is7ShiSanLan) {
                            fanBei *= 2;
                        }
                    }
                    if (info.isDeGuo) {
                        fanBei *= 2;
                        deGuoJiaFen = 5;
                        if (info.isDeZhongDe) {
                            fanBei *= 2;
                        }
                    }
                    if (info.isJingDiao) {
                        fanBei *= 2;
                    }
                    if (info.isGangHua || info.isDianGangHua) {
                        fanBei *= 2;
                    }
                    if (info.isQiangGangHu) {
                        fanBei *= 2;
                    }
                    // 如果是自摸，则底分翻倍。
                    if (info.isZiMo) {
                        fanBei *= 2;
                        sd.numZiMo++;
                        if (i == game.button) { // 庄家
                            for (var t1 in info.targets) {
                                var ti1 = info.targets[t1];
                                if (info.isQiangGangHu) {
                                    ti1 = info.target;
                                }
                                var gs1 = game.gameSeats[ti1];
                                sd.huPaiFen += (baseScore[i] * fanBei + deGuoJiaFen);
                                gs1.huPaiFen -= (baseScore[i] * fanBei + deGuoJiaFen);
                            }
                        } else { // 闲家
                            for (var t2 in info.targets) {
                                var ti2 = info.targets[t2];
                                if (info.isQiangGangHu) {
                                    ti2 = info.target;
                                }
                                var gs2 = game.gameSeats[ti2];
                                sd.huPaiFen += (baseScore[ti2] * fanBei + deGuoJiaFen);
                                gs2.huPaiFen -= (baseScore[ti2] * fanBei + deGuoJiaFen);
                            }
                        }
                    } else {
                        sd.numJiePao++;
                        if (i == game.button) {
                            for (var gi1 = 0; gi1 < gameSeatLength; ++gi1) {   //laoli 1021
                                var ggs1 = game.gameSeats[gi1];
                                if (gi1 == i) {
                                    continue;
                                } else if (gi1 == info.target) { // 点炮玩家
                                    sd.huPaiFen += (baseScore[i] * 2 * fanBei + deGuoJiaFen);
                                    ggs1.huPaiFen -= (baseScore[i] * 2 * fanBei + deGuoJiaFen);
                                } else {
                                    sd.huPaiFen += (baseScore[i] * fanBei);
                                    ggs1.huPaiFen -= (baseScore[i] * fanBei);
                                }
                            }
                        } else {
                            for (var gi2 = 0; gi2 < gameSeatLength; ++gi2) {  //laoli 1021
                                var ggs2 = game.gameSeats[gi2];
                                if (gi2 == i) {
                                    continue;
                                } else if (gi2 == info.target) { // 点炮玩家
                                    sd.huPaiFen += (baseScore[gi2] * 2 * fanBei + deGuoJiaFen);
                                    ggs2.huPaiFen -= (baseScore[gi2] * 2 * fanBei + deGuoJiaFen);
                                } else {
                                    sd.huPaiFen += (baseScore[gi2] * fanBei);
                                    ggs2.huPaiFen -= (baseScore[gi2] * fanBei);
                                }
                            }
                        }
                    }
                }
            }
        }
        // 出精胡牌奖励。
        if (isHu == true && game.conf.jiangli == true) {
            var r = indexChuJingInfo(game, i);
            for (var gsi = 0; gsi < gameSeatLength; ++gsi) {  //mc1109fixed
                var gsd = game.gameSeats[gsi];
                if (gsd.seatIndex != i) {//除了出精的人
                    if (r[0] > 0) {
                        sd.chuJingFen += (10 * r[0]);
                        gsd.chuJingFen -= (10 * r[0]);
                    }
                    if (r[1] > 0) {
                        sd.chuJingFen += (5 * r[1]);
                        gsd.chuJingFen -= (5 * r[1]);
                    }
                }
            }
        }
        // 精分
        jiSuanJingFen(game, sd);
    }
// 跟庄分
    jiSuanGenZhuangFen(game);
    for (var li = 0; li < gameSeatLength; ++li) { //laoli 1021
        var lggs = game.gameSeats[li];
        // 统计精牌总分。
        for (var jii = 0; jii < lggs.jingsInfo.length; jii++) {
            lggs.jingPaiFen += lggs.jingsInfo[jii].zFen;
        }
        lggs.jiangLiFen = lggs.mingGangFen + lggs.angangFen + lggs.gangJingFen + lggs.chaoZhuangFen + lggs.chuJingFen;
        lggs.score = lggs.jingPaiFen + lggs.huPaiFen + lggs.jiangLiFen;

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
            rs.eachScores[roomInfo.numOfGames] = sd.score;
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
                chis: sd.chis,        // laoli 1017
                wangangs: sd.wangangs,
                diangangs: sd.diangangs,
                angangs: sd.angangs,
                holds: sd.holds,
                jingPaiFen: sd.jingPaiFen, // 精牌分
                huPaiFen: sd.huPaiFen, // 胡牌分
                jiangLiFen: sd.jiangLiFen, // 奖励分
                mingGangFen: sd.mingGangFen, // 明杠分
                angangFen: sd.angangFen, // 暗杠分
                gangJingFen: sd.gangJingFen, // 杠精分
                chaoZhuangFen: sd.chaoZhuangFen, // 抄庄分
                chuJingFen: sd.chuJingFen, // 出精分
                score: sd.score,
                totalscore: rs.score,
                jingouhu: sd.isJinGouHu,
                huinfo: sd.huInfo,
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
                    } else if (info.action == "beidihu") {
                        actionArr.push("被地胡");
                    } else if (info.action == "gangpao") {
                        actionArr.push("杠炮");
                    } else if (info.action == "fangpao") {
                        actionArr.push("放炮");
                    }
                } else {
                    if (info.isQiangGangHu) {
                        actionArr.push("抢杠胡");
                    } else if (info.isZiMo) {
                        actionArr.push("自摸");
                    } else if (info.isDiHu) {
                        actionArr.push("地胡");
                    } else {
                        actionArr.push("接炮");
                    }
                    if (info.isTianHu) {
                        actionArr.push("天胡");
                    }
                    if (info.isDeGuo) {
                        actionArr.push("德国");
                    }
                    if (info.isDeZhongDe) {
                        actionArr.push("德中德");
                    }
                    if (info.pattern == "13lan") {
                        actionArr.push("十三烂");
                    }
                    if (info.is7ShiSanLan) {
                        actionArr.push("七星十三烂")
                    }
                    if (info.isJingDiao) {
                        actionArr.push("精钓");
                    }
                    if (info.pattern == "big7pairs") {
                        actionArr.push("大七对")
                    }
                    if (info.pattern == "7pairs") {
                        actionArr.push("小七对")
                    }
                    // if (info.isQiangGangHu) {
                    //     actionArr.push("抢杠胡")
                    // }
                    if (info.isDianGangHua || info.isGangHua) {
                        actionArr.push("杠开")
                    }
                }
            }
            userRT.reason = actionArr.join("、");
            for (var k in sd.actions) {
                userRT.actions[k] = {
                    type: sd.actions[k].type
                };
            }
            results[i] = userRT;          //laoli 1020

            dbresult[i] = sd.score;
            // delete gameSeatsOfUsers[sd.userId];
        }
        // delete games[roomId];
        var old = roomInfo.nextButton;
        if (game.yipaoduoxiang >= 0) {
            roomInfo.nextButton = game.yipaoduoxiang;
        } else if (game.firstHupai >= 0) {
            roomInfo.nextButton = game.firstHupai;
        } else {
            roomInfo.nextButton = (game.turn + 1) % game.currentUsercnt;
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
        showGameOverResult(game, results);
        for (var d = 0; d < game.currentUsercnt; ++d) {
            var tsd = game.gameSeats[d];
            delete gameSeatsOfUsers[tsd.userId];
        }
        delete games[roomId];
    }
}

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
    console.log("gamemgr_gzmj sync.");
    var roomId = roomMgr.getUserRoom(userId);
    if (roomId == null) {
        return;
    }
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
        return;
    }
    var turnId = 0;
    var game = roomInfo.game;
    var numOfMJ = game.mahjongs.length - game.currentIndex;
    var remainingGames = roomInfo.conf.maxGames - roomInfo.numOfGames;
    console.log("gamemgr_gzmj", game.jings);
    var data = {
        state: game.state,
        numofmj: numOfMJ,
        button: game.button,
        turn: game.turn,
        chuPai: game.chuPai,
        jings: game.jings
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
        if (game.turn == i) {
            turnId = sd.userId;
        }
        data.seats.push(s);
    }
    //同步整个信息给客户端
    userMgr.sendMsg(userId, 'game_sync_push', data);
    if (game.chuPai != -1) {
        userMgr.sendMsg(userId, 'game_chupai_notify_push', {userId: turnId, pai: game.chuPai});
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
    //game.baseInfoJson = JSON.stringify(baseInfo);
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

    //用于记录精杠的牌
    //data.gangJing = [];

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
    data.guoHuScore = -1;
    //是否胡了
    data.hued = false;
    data.actions = [];
    data.iszimo = false; //是否是自摸
    data.score = 0;  //分数
    data.huInfo = [];  //胡牌信息
    data.lastFangGangSeat = -1;
    //统计信息
    data.numZiMo = 0;
    data.numJiePao = 0;
    data.numDianPao = 0;
    data.numAnGang = 0;
    data.numMingGang = 0;
    // 放杠的牌
    data.fanggangs = [];
    data.watcher = false;     //true，是迟到的玩家，等待下一局
    data.jingPaiFen = 0; // 精牌分
    data.huPaiFen = 0; // 胡牌分
    data.jiangLiFen = 0; // 奖励分
    data.mingGangFen = 0; // 明杠分
    data.angangFen = 0; // 暗杠分
    data.gangJingFen = 0; // 杠精分
    data.chaoZhuangFen = 0; // 抄庄分
    data.chuJingFen = 0;  // 出精奖励分

    data.jingsInfo = [];
    for (var jfi = 0; jfi < conf.wanfaxuanze * 2; jfi++) {
        var oneJing = {};
        oneJing.jiShu = [0, 0];
        oneJing.fen = [0, 0];
        oneJing.zFen = 0;
        oneJing.chongGuanBeiShu = 0;
        oneJing.baWangBeiShu = 0;
        data.jingsInfo.push(oneJing);
    }

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
//开始新的一局
exports.begin = function (roomId) {
    console.log(">> begin", roomId);
    var roomInfo = roomMgr.getRoom(roomId);
    if (roomInfo == null) {
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
        appearJing: false
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
            console.log("insert seats:", i, game.currentUsercnt, game.gameSeats.length, seats[i].userId)
            game.currentUsercnt++;      // laoli add 1020
            game.gameSeats.push(data)
        }
    }
    games[roomId] = game;
    //洗牌
    shuffle(game);
    //发牌
    deal(game);

    //剩余麻将数
    var numOfMJ = game.mahjongs.length - game.currentIndex;
    // var huansanzhang = roomInfo.conf.hsz;

    for (var i = 0; i < game.currentUsercnt; ++i) {     //laoli 1020
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
    checkCanHu(game, turnSeat, -1);

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
    jiLuChuJing(game, -1, pai);
    userMgr.broacastInRoom('game_chupai_notify_push', {userId: seatData.userId, pai: pai}, seatData.userId, true);
    //检查是否有人要胡，要碰 要杠
    var hasActions = false;
    for (var i = 0; i < game.currentUsercnt; ++i) {        //laoli 1020
        //玩家自己不检查
        if (game.turn == i) {
            continue;
        }
        var otherSeat = game.gameSeats[i];
        checkCanPeng(game, otherSeat, pai);
        checkCanDianGang(game, otherSeat, pai);
        checkCanHu(game, otherSeat, pai);
        if (seatData.lastFangGangSeat == -1) {
            if (otherSeat.canHu && otherSeat.guoHuScore >= 0 && otherSeat.tingInfo.huScore <= otherSeat.guoHuScore) {
                console.log(otherSeat.userId, "otherSeat.guoHuScore:" + otherSeat.guoHuScore);
                otherSeat.canHu = false;
                userMgr.sendMsg(otherSeat.userId, 'guohu_push');
            }
        }
        //只检查下家chi, laoli 1017
        var nextTurn = (seatIndex + 1) % game.currentUsercnt;
        if (nextTurn == i) {
            checkCanChi(game, otherSeat, pai);
        }
        if (hasOperations(otherSeat)) {
            sendOperations(game, otherSeat, game.chuPai);
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
};
// 记录玩家出精情况。
function jiLuChuJing(game, toSeatIndex, pai) {
    if (game.jingMap[pai] == true) {
        var chuJingInfo = {};
        chuJingInfo.from = game.turn;
        chuJingInfo.pai = pai;
        chuJingInfo.to = toSeatIndex;
        game.chuJingList.push(chuJingInfo);
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
    jiLuChuJing(game, seatData.seatIndex, pai);

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
    mylog_debug(">> exports.peng,", userId)

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
    if (!game.conf.keqiangganghu) {
        return false;
    }
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
    seatData.guoHuScore = -1;
    if (gangtype == "wangang") {
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
        var ac = recordUserAction(game, seatData, "diangang", null, pai);
        jiLuChuJing(game, seatData.seatIndex, pai);
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
    doUserMoPai(game, gameTurn, true);
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
    jiLuChuJing(game, seatData.seatIndex, pai[0]);
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
        jiLuChuJing(game, seatIndex, hupai);
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
    } else if (seatData.tingInfo.isDiHu == true) {
        notify = game.chuPai;
        recordGameAction(game, seatIndex, ACTION_HU, hupai);
        jiLuChuJing(game, seatIndex, hupai);
        for (var j = 0; j < seatData.tingInfo.targets.length; ++j) {
            var sti = seatData.tingInfo.targets[j];
            var ggs = game.gameSeats[sti];
            ggs.huInfo.push({
                action: "beidihu",
                target: seatData.seatIndex,
                index: seatData.huInfo.length - 1
            });
        }
        game.gameSeats[game.turn].numDianPao++;
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
        jiLuChuJing(game, seatIndex, hupai);
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
};

exports.doGameOver = doGameOver;
var JU_SHU = [4, 8, 16];
var JU_SHU_COST = [8, 10, 18];
// 检查配置数据
exports.checkConf = function (roomConf, gems) {
    if (roomConf.jushuxuanze == null) {
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
}
// 创建房间时，获取相应的配置。
exports.getConf = function (roomConf, creator) {
    mylog_debug("getConf roomCnf:", roomConf);
    mylog_debug("getConf creator:", creator);
    var ret = {
        type: roomConf.type,
        baseScore: roomConf.difenxuanze,
        cost: roomConf.cost,
        zimo: roomConf.zimo,
        jiangdui: roomConf.jiangdui,
        dianganghua: 0,
        menqing: roomConf.menqing,
        tiandihu: roomConf.tiandihu,
        maxGames: JU_SHU[roomConf.jushuxuanze],
        creator: creator,
        keqiangganghu: true,
        qianggangquanbao: roomConf.qianggangquanbao,
        genzhuang: roomConf.genzhuang,
        discription: "",
        wanfaxuanze: roomConf.wanfaxuanze,
        shifoutongzhuang: roomConf.shifoutongzhuang,
        hufaxuanze: roomConf.hufaxuanze,
        jiangli: roomConf.jiangli
    };
    if (dbg_maxGames > 0) {
        ret.maxGames = dbg_maxGames
    }
    var arrStr = [];
    if (roomConf.wanfaxuanze == 1) {
        arrStr.push("上下翻埋地雷");
    } else if (roomConf.wanfaxuanze == 2) {
        arrStr.push("上下左右翻精");
    } else if (roomConf.wanfaxuanze == 3) {
        arrStr.push("上下左左右右翻精");
    }
    if (roomConf.hufaxuanze == 0) {
        arrStr.push("可平胡");
    } else if (roomConf.hufaxuanze == 1) {
        arrStr.push("有精点炮不能平胡");
    } else if (roomConf.hufaxuanze == 2) {
        arrStr.push("精必钓");
    }
    if (roomConf.difenxuanze == 1) {
        arrStr.push("底分1分");
    } else if (roomConf.difenxuanze == 2) {
        arrStr.push("底分2分");
    }
    if (roomConf.shifoutongzhuang == 0) {
        arrStr.push("通庄");
    } else if (roomConf.shifoutongzhuang == 1) {
        arrStr.push("分闲庄(庄家翻倍)");
    }
    if (roomConf.jiangli) {
        arrStr.push("出精奖励");
    }
    ret.discription = arrStr.join(" ");
    return ret;
};

//--------------------------------------------------
//--------------------------------------------------
//------------基本胡牌类型---------
// 判断是不是小7对   // test pass
// 0: fail, 1. 是
//检查是否是七对。前提是没有吃，碰，杠，即手上拥有14张牌
is7Pairs = function (seatData, checkJings, chupai) {
    var fn = function (seatData, jingMode, chupai) {
        if (seatData.holds.length != 14) {
            return -500;
        }
        var jingcnt = getMyJingCnt(chupai, seatData.countMap, seatData.game.jingMap);
        var oldJingMap = null;
        if (jingMode) {
            oldJingMap = storeJingMap(seatData, chupai);
        }
        var pairCount = 0;
        for (var k in seatData.countMap) {
            var c = seatData.countMap[k];
            if (c == 2) {
                pairCount++;
            } else if (c == 3) {
                pairCount++;
            } else if (c == 4) {
                pairCount += 2;
            }
        }
        if (jingMode) {
            restoreJingMap(seatData, oldJingMap);
        }
        //检查是否有7对
        var j = jingMode ? jingcnt : 0;
        return ((pairCount + j) >= 7) ? 0 : -501
    };
    var resultp = function (seatData, jingMode, chupai) {
        var ret = fn(seatData, jingMode, chupai);
        if (ret >= 0) {
            console.log("是七小队.");
            return 1;
        }
        else {
            //console.log(ret)
        }
        return 0
    };
    return resultp(seatData, checkJings, chupai)
};
// <0: fail, 1. 是 // test pass
//判断是不是十三烂
isShiSanLan = function (seatData, jingMode, chupai) {
    // 规则要求:
    //        1.门清(手牌全 >=13)
    //         去掉精牌,继续检查
    //        2.无对
    //        2.序牌必须间隔>=3
    //        4.必须有字牌
    //        5. 是否必须自摸  ????(XX)
    var fn = function (seatData, jingMode) {
        var oldCountMap = {};
        for (var i in seatData.countMap) {
            oldCountMap[i] = seatData.countMap[i]; //把Map存到old中
        }
        // //首先必须门清
        if (seatData.holds.length < 13) {
            return -100;
        }
        var typeCards = new Array(4);
        for (var k in oldCountMap) {
            var c = getCardNoneJingCnt(chupai, k, seatData, jingMode);
            if (c == 0) {
                continue;
            }
            if (c >= 2) {  // 必须无对
                delete typeCards;
                return -101;
            }
            //单牌
            var type = getMJType(k);
            if (type <= 2) { // check only xupai
                if (typeCards[type] != null) {
                    for (var j in typeCards[type]) {
                        var item = typeCards[type][j];
                        if (Math.abs(item - k) < 3) {  //序牌必须间隔>=3
                            delete typeCards;
                            return -102;
                        }
                    }
                    typeCards[type].push(k);
                } else {
                    typeCards[type] = [];
                    typeCards[type].push(k);
                }
            }
        }
        delete typeCards;
        return 0
    };
    var resultp = function (seatData, jingMode) {
        var ret = fn(seatData, jingMode);
        if (ret >= 0) {
            return 1;
        }
        return 0;
    };
    return resultp(seatData, jingMode)
};
//------------加分胡牌类型---------
//判断是不是七星十三烂 // 0: fail , test pass!!
is7ShiSanLan = function (seatData, checkJings, chupai) {
    mylog_debug("is7ShiSanLan.");
    var fn = function (seatData, jingMode, chupai) {
        var jingMap = seatData.game.jingMap;
        // 1. 前提必须是十三烂,这里可能会重复检查
        // if (isShiSanLan(seatData, checkJings, chupai) <= 0) {
        //     return -110;
        // }
        var oldCountMap = {};
        for (var i in seatData.countMap) {
            oldCountMap[i] = seatData.countMap[i]; //把Map存到old中
        }
        if (chupai != null) {
            if (oldCountMap[chupai]) {
                oldCountMap[chupai]++;
            } else {
                oldCountMap[chupai] = 1;
            }
        }
        // 2. 七个字牌(精还原情况下)
        // 3. 字牌无对(精还原情况下)
        var zicount = 0;
        for (var k in oldCountMap) {
            var c = oldCountMap[k];
            if (c == 0) {
                continue;
            }
            if (isMJZiType(k)) { // check only zipai
                if (c >= 2 && jingMap[k] == false) { // 如有对&非精牌,则false
                    return -111;
                }
                zicount++;
            }
        }
        if (zicount != 7) {
            return -112;
        }
        return 0;
    };
    var resultp = function (seatData, jingMode, chupai) {
        var ret = fn(seatData, jingMode, chupai);
        mylog_debug("is7ShiSanLan", ret);
        return ret >= 0;
    };
    return resultp(seatData, checkJings, chupai)
};

// 判断是不是大7对  , --检查手牌+吃碰胡牌---
// 0: fail , //TODO
// N个刻字+将牌, 允许碰杠(不允许吃牌,不允许有顺子)
isBig7Pairs = function (seatData, checkJings, chupai) {
    // 必须是平胡,请提前判断好
    // TODO,等我们在平胡判断时返回具体的胡牌数据才继续
    // 1.检查是否碰碰胡,必须是碰碰胡

    // 2.检查是否有吃牌,必须无吃牌
    if (seatData.chis && seatData.chis.length > 0) {
        return -601;
    }
    var jingcnt = getMyJingCnt(chupai, seatData.countMap, seatData.game.jingMap)
    var fn = function (seatData, jingMode) {
        var oldJingMap = null;
        if (jingMode) {
            oldJingMap = storeJingMap(seatData, chupai);
        }
        var meldCount = 0;
        var pairCount = 0;
        var singleCount = 0;
        for (var k in seatData.countMap) {
            var c = seatData.countMap[k];
            if (c == 1) {
                singleCount++;
            } else if (c == 2) {
                pairCount++;
            } else if (c == 3) {
                meldCount++;
            } else if (c == 4) {
                meldCount++;
                singleCount++;
            }
        }
        if (jingMode) {
            restoreJingMap(seatData, oldJingMap);
            //扣除一对将后，其余的要组成一坎
            var needJing = 0;
            if (pairCount > 0) {
                needJing = (pairCount - 1) + singleCount * 2;
            } else {
                needJing = (singleCount - 1) * 2 + 1;
            }
            return (needJing <= jingcnt) ? 0 : -602;
        } else {
            // 只有一对将，且无单牌
            return (pairCount == 1 && singleCount <= 0) ? 0 : -602;
        }
    };
    var resultp = function (seatData, jingMode) {
        var ret = fn(seatData, jingMode);
        mylog_debug("resultp", ret);
        if (ret >= 0) {
            return 1;
        }
        return 0
    };
    return resultp(seatData, checkJings, chupai)
};
// 判断是不是6对。
is6PairsEx = function (seatData) {
    var paiCount = 0;
    var jingCount = 0;
    var pairCount = 0;
    for (var i in seatData.countMap) {
        if (seatData.countMap[i] > 0) {
            var c = seatData.countMap[i];
            paiCount += c;
            if (seatData.game.jingMap[i] == true) {
                jingCount += c;
            }
            if (c == 2) {
                pairCount++;
            } else if (c == 3) {
                pairCount++;
            } else if (c == 4) {
                pairCount += 2;
            }
        }
    }
    mylog_debug("is6PairsEx paiCount:", paiCount, "jingCount:", jingCount, "pairCount:", pairCount);
    return (paiCount == 12 && pairCount + jingCount >= 6);
};
// 判断是不是精钓牌型
// TODO: 在一个胡牌型，判断不是精钓，但是在下面的函数被判断为精钓。
isJingDiaoPai = function (seatData, checkJings, chupai) {
    mylog_debug("isJingDiaoPai", checkJings, chupai);
    var fn = function (seatData, jingMode, chupai) {
        var ret = 0;
        var oldCountMap = {};
        for (var sci in seatData.countMap) {
            oldCountMap[sci] = seatData.countMap[sci]; //把Map存到old中
        }
        if (chupai == null || chupai == -1) {
            var lastPai = seatData.holds[seatData.holds.length - 1];
            seatData.countMap[lastPai]--;
        }
        var removeSuccess = false;
        // 取出一张精牌和chupai做将牌,剩余的牌做checksingle
        for (var scp in seatData.countMap) {
            //去掉第一个精牌
            if (getCardJingCnt(-1, scp, seatData) > 0) {
                seatData.countMap[scp]--;
                removeSuccess = true;
                break;
            }
        }
        if (removeSuccess != true) {
            mylog_debug("isJingDiaoPai removeSuccess:", removeSuccess);
            ret = -701;
        } else {
            if (is6PairsEx(seatData, -1)) {
                ret = 0;
            } else {
                //逐个判定剩下的牌是否满足　３Ｎ规则,一个牌会有以下几种情况
                //1、0张，则不做任何处理
                //2、2张，则只可能是与其它牌形成匹配关系
                //3、3张，则可能是单张形成 A-2,A-1,A  A-1,A,A+1  A,A+1,A+2，也可能是直接成为一坎
                //4、4张，则只可能是一坎+单张
                var fnRet = mjutils.checkSingle_Test(seatData, jingMode, seatData.game.jingMap, -1);
                mylog_debug("isJingDiaoPai", fnRet);
                ret = fnRet ? 0 : -702;
            }
        }
        // 恢复countMap
        for (var osci in oldCountMap) {
            seatData.countMap[osci] = oldCountMap[osci];
        }
        return ret;
    };
    var resultp = function (seatData, jingMode, chupai) {
        var ret = fn(seatData, jingMode, chupai);
        mylog_debug("resultp", ret);
        if (ret >= 0) {
            return 1;
        }
        return 0
    };
    return resultp(seatData, checkJings, chupai)
};
// 打印gameover结果
showGameOverResult = function (game, results) {
    console.log("**** 算分结果 ****", game.roomInfo.id);
    console.log(new Date());
    console.log("*** 精牌 ***");
    console.log(game.allJings);
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
        var jingstr = "  精分：";
        for (var jii = 0; jii < s.jingsInfo.length; jii++) {
            jingstr = jingstr + s.jingsInfo[jii].zFen + ",";
        }
        jingstr += " =";
        jingstr += s.jingPaiFen;
        console.log(jingstr);
        var str = util.format('  总分%d(胡牌分%d, 精分%d, 奖励分%d, 暗杠分%d，明杠分%d，杠精分%d, 跟庄分%d, 出精奖励分%d)',
            s.score, s.huPaiFen, s.jingPaiFen, s.jiangLiFen, s.angangFen, s.mingGangFen, s.gangJingFen, s.chaoZhuangFen, s.chuJingFen);
        console.log(str);
        console.log("");
    }
    console.log("*** 精分清单 ***");
    var jingcount = game.gameSeats[0].jingsInfo.length;
    console.log("精数：", jingcount);
    for (var jc = 0; jc < jingcount; jc++) {
        var jcstr = util.format(' 精%d  ', jc + 1);
        var zjlist = [];
        var fjlist = [];
        for (var jd = 0; jd < game.currentUsercnt; jd++) {  //laoli 1021 for 23mj
            var sjs = game.gameSeats[jd].jingsInfo[jc];
            jcstr += util.format('玩家%d:正精%d副精%d,得分%d; ', jd + 1, sjs.jiShu[0], sjs.jiShu[1], sjs.zFen);
        }
        console.log(jcstr);
    }
    console.log("");
    console.log("*** 精原始Info ***");
    for (var j = 0; j < game.currentUsercnt; ++j) {
        console.log(j, game.gameSeats[j].jingsInfo);
    }
    console.log("");
    console.log("*** 下发信息 ***");
    console.log(results);
};

//------ copy from laizimjutils ---- , laoli , temp
// 保存赖子牌对应的牌计数
function storeJingMap(seatData, chupai) {
    var oldJingMap = {};
    for (var k in seatData.game.jingMap) {
        oldJingMap[k] = seatData.countMap[k]; //把jingMap存到oldJingMap中
        if (chupai == k) { //最后抓那张是精牌,
            seatData.countMap[k] = 1;//精牌数就是1
        } else {
            seatData.countMap[k] = 0;//把精牌全取走
        }
    }
    return oldJingMap;
}

// 还原癞子牌对应的牌计数
function restoreJingMap(seatData, oldJingMap) {
    if (oldJingMap) {
        for (var k in seatData.game.jingMap) {
            var c = oldJingMap[k];
            if (c) {
                seatData.countMap[k] = c;
            }
        }
    }
}
// laoli 临时增加，判断下countmap跟holds是否一致
test_checkCountMap = function (sd) {
    t_cm = comdef.deepCopy(sd.countMap);

    //console.log(t_cm)
    for (var k in sd.holds) {
        var pai = sd.holds[k];
        t_cm[pai]--;
    }
    //console.log(t_cm)
    for (var kk in t_cm) {
        if (t_cm[kk] != 0) {
            console.log("[Error countmap error]:", kk, t_cm[kk])
            console.log(sd.countMap)
            console.log(sd.holds)
            console.log("强制退出,laoli")
            require('process').exit()
            return false;
        }
    }

    return true

}
exports.is6PairsEx = is6PairsEx
// 获取全局变量, laoli 1026
getALLGVar = function () {
    var data = {}

    data.games = games;
    data.gameSeatsOfUsers = gameSeatsOfUsers;
    //console.log(">> getALLGVar:",gameSeatsOfUsers)
    return data;
};

exports.getALLGVar = getALLGVar;       //laoli
