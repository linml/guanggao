var kanzi = [];     // for debug only
//var jingMap = {};
//var numOfJings = 0;
var record = false; // for debug only
var hu_info = require("./hu_info");

var Version = "V0.03 171018T3";

var LAI_ZI_VALUE = 100;

// laoli note 171018，对外的接口只有两个
//      1.

//          风顺子 OK
//          去掉jingMap和numOfJings这两个全局变量，移到内部变量data里
//          目前主要用到的jingMap[],numOfJings,countMap[],holds[]

function mylog_debug() {
    //console.log(arguments)
}

function mylog_info() {
    // console.log(arguments)
}

function mylog_error() {
    // console.log(arguments)
}

function debugRecord(pai) {
    if (record) {
        kanzi.push(pai);
    }
}
//深度clone一个obj, laoli 171018
var deepCopy = function (source) {
    var result = {};
    if (source instanceof Array) {
        result = [];
        for (var i = 0; i < source.length; i++) {
            if (typeof(source[i]) == 'object') {
                result.push(deepCopy(source[i]));
            } else {
                result.push(source[i]);
            }
        }
    } else {
        for (var key in source) {
            if (typeof(source[key]) == 'object') {
                result[key] = deepCopy(source[key]);
            } else {
                result[key] = source[key];
            }
        }
    }
    return result;
};
// 增加牌的计数
function addCount(pai, value, countMap) {
    if (pai == LAI_ZI_VALUE) {
        return;
    }
    var cnt = countMap[pai];
    if (cnt != null) {
        cnt += value;
        countMap[pai] = cnt;
    }
}
// 是否是序牌 :桶条万
function isXuPai(selected) {
    return selected >= 0 && selected <= 26;
}
// 是否是东南西北
function isWind(selected) {
    return selected >= 27 && selected <= 30;
}
// 是否是中发白
function isZhongFaBai(selected) {
    return selected >= 31 && selected <= 33;
}
// 匹配序牌ABO模式
function MatchABO(selected, jingMode, data, huInfo) {
    if (!isXuPai(selected)) {
        return false
    }
    var shunZi = [];
    var countMap = data.countMap;
    var matched = true;
    var requireJings = 0;
    var v = selected % 9;
    if (v < 2) {
        matched = false;
    }
    if (matched) {
        for (var i = 0; i < 3; ++i) {
            var t = selected - 2 + i;
            var c = countMap[t];
            if (c == null || c <= 0) {
                if (jingMode && data.numOfJings > requireJings) {
                    recordPaiXu(shunZi, LAI_ZI_VALUE);
                    requireJings++;
                } else {
                    matched = false;
                    break;
                }
            } else {
                recordPaiXu(shunZi, t);
            }
        }
    }
    if (matched) {
        addCount(shunZi[0], -1, countMap);
        addCount(shunZi[1], -1, countMap);
        addCount(shunZi[2], -1, countMap);
        data.numOfJings -= requireJings;
        var ret = checkSingle(jingMode, data, huInfo);
        addCount(shunZi[0], 1, countMap);
        addCount(shunZi[1], 1, countMap);
        addCount(shunZi[2], 1, countMap);
        if (ret == true) {
            recordPaiXu(huInfo, shunZi[0]);
            recordPaiXu(huInfo, shunZi[1]);
            recordPaiXu(huInfo, shunZi[2]);
            recordShun(huInfo, shunZi);
            return true;
        } else {
            data.numOfJings += requireJings;
        }
    }
    return false;
}
// 匹配序牌AOB模式
function MatchAOB(selected, jingMode, data, huInfo) {
    if (!isXuPai(selected)) {
        return false
    }
    var shunZi = [];
    var countMap = data.countMap;
    var matched = true;
    var requireJings = 0;
    var v = selected % 9;
    if (v < 1 || v > 7) {
        matched = false;
    }
    if (matched) {
        for (var i = 0; i < 3; ++i) {
            var t = selected - 1 + i;
            var c = countMap[t];
            if (c == null || c <= 0) {
                if (jingMode && data.numOfJings > requireJings) {
                    recordPaiXu(shunZi, LAI_ZI_VALUE);
                    requireJings++;
                } else {
                    matched = false;
                    break;
                }
            } else {
                recordPaiXu(shunZi, t);
            }
        }
    }
    if (matched) {
        addCount(shunZi[0], -1, countMap);
        addCount(shunZi[1], -1, countMap);
        addCount(shunZi[2], -1, countMap);
        data.numOfJings -= requireJings;
        var ret = checkSingle(jingMode, data, huInfo);
        addCount(shunZi[0], 1, countMap);
        addCount(shunZi[1], 1, countMap);
        addCount(shunZi[2], 1, countMap);
        if (ret == true) {
            recordPaiXu(huInfo, shunZi[0]);
            recordPaiXu(huInfo, shunZi[1]);
            recordPaiXu(huInfo, shunZi[2]);
            recordShun(huInfo, shunZi);
            return true;
        } else {
            data.numOfJings += requireJings;
        }
    }
    return false;
}
// 匹配序牌OAB模式
function MatchOAB(selected, jingMode, data, huInfo) {
    if (!isXuPai(selected)) {
        return false
    }
    var shunZi = [];
    var countMap = data.countMap;
    var matched = true;
    var requireJings = 0;
    var v = selected % 9;
    if (v > 6) {
        matched = false;
    }
    if (matched) {
        for (var i = 0; i < 3; ++i) {
            var t = selected + i;
            var c = countMap[t];
            if (c == null || c <= 0) {
                if (jingMode && data.numOfJings > requireJings) {
                    recordPaiXu(shunZi, LAI_ZI_VALUE);
                    requireJings++;
                } else {
                    matched = false;
                    break;
                }
            } else {
                recordPaiXu(shunZi, t);
            }
        }
    }
    if (matched) {
        addCount(shunZi[0], -1, countMap);
        addCount(shunZi[1], -1, countMap);
        addCount(shunZi[2], -1, countMap);
        data.numOfJings -= requireJings;
        var ret = checkSingle(jingMode, data, huInfo);
        addCount(shunZi[0], 1, countMap);
        addCount(shunZi[1], 1, countMap);
        addCount(shunZi[2], 1, countMap);
        if (ret == true) {
            recordPaiXu(huInfo, shunZi[0]);
            recordPaiXu(huInfo, shunZi[1]);
            recordPaiXu(huInfo, shunZi[2]);
            recordShun(huInfo, shunZi);
            return true;
        } else {
            data.numOfJings += requireJings;
        }
    }
    return false;
}
// 匹配乱风模式，任何不同的三张风牌即为一顺
function MatchFeng012(selected, jingMode, data, huInfo) {
    if (!isWind(selected)) {
        return false
    }
    var shunZi = [];
    var countMap = data.countMap;
    var matched = true;
    var requireJings = 0;
    var plan = [selected, selected + 1, selected + 2];
    for (var i = 0; i < 3; ++i) {
        var t = plan[i];
        t = t % 27;
        t = t % 4;
        t = 27 + t;
        var c = countMap[t];
        if (c == null || c <= 0) {
            if (jingMode && data.numOfJings > requireJings) {
                recordPaiXu(shunZi, LAI_ZI_VALUE);
                requireJings++;
            } else {
                matched = false;
                break;
            }
        } else {
            recordPaiXu(shunZi, t);
        }
    }
    if (matched) {
        addCount(shunZi[0], -1, countMap);
        addCount(shunZi[1], -1, countMap);
        addCount(shunZi[2], -1, countMap);
        data.numOfJings -= requireJings;
        var ret = checkSingle(jingMode, data, huInfo);
        addCount(shunZi[0], 1, countMap);
        addCount(shunZi[1], 1, countMap);
        addCount(shunZi[2], 1, countMap);
        if (ret == true) {
            recordPaiXu(huInfo, shunZi[0]);
            recordPaiXu(huInfo, shunZi[1]);
            recordPaiXu(huInfo, shunZi[2]);
            recordShun(huInfo, shunZi);
            return true;
        } else {
            data.numOfJings += requireJings;
        }
    }
    return false;
}
// 匹配乱风模式，任何不同的三张风牌即为一顺
function MatchFeng023(selected, jingMode, data, huInfo) {
    if (!isWind(selected)) {
        return false
    }
    var shunZi = [];
    var countMap = data.countMap;
    var matched = true;
    var requireJings = 0;
    var plan = [selected, selected + 2, selected + 3];
    for (var i = 0; i < 3; ++i) {
        var t = plan[i];
        t = t % 27;
        t = t % 4;
        t = 27 + t;
        var c = countMap[t];
        if (c == null || c <= 0) {
            if (jingMode && data.numOfJings > requireJings) {
                recordPaiXu(shunZi, LAI_ZI_VALUE);
                requireJings++;
            } else {
                matched = false;
                break;
            }
        } else {
            recordPaiXu(shunZi, t);
        }
    }
    if (matched) {
        addCount(shunZi[0], -1, countMap);
        addCount(shunZi[1], -1, countMap);
        addCount(shunZi[2], -1, countMap);
        data.numOfJings -= requireJings;
        var ret = checkSingle(jingMode, data, huInfo);
        addCount(shunZi[0], 1, countMap);
        addCount(shunZi[1], 1, countMap);
        addCount(shunZi[2], 1, countMap);
        if (ret == true) {
            recordPaiXu(huInfo, shunZi[0]);
            recordPaiXu(huInfo, shunZi[1]);
            recordPaiXu(huInfo, shunZi[2]);
            recordShun(huInfo, shunZi);
            return true;
        } else {
            data.numOfJings += requireJings;
        }
    }
    return false;
}
// 匹配乱风模式，任何不同的三张风牌即为一顺
function MatchFeng013(selected, jingMode, data, huInfo) {
    if (!isWind(selected)) {
        return false
    }
    var shunZi = [];
    var countMap = data.countMap;
    var matched = true;
    var requireJings = 0;
    var plan = [selected, selected + 1, selected + 3];
    for (var i = 0; i < 3; ++i) {
        var t = plan[i];
        t = t % 27;
        t = t % 4;
        t = 27 + t;
        var c = countMap[t];
        if (c == null || c <= 0) {
            if (jingMode && data.numOfJings > requireJings) {
                recordPaiXu(shunZi, LAI_ZI_VALUE);
                requireJings++;
            } else {
                matched = false;
                break;
            }
        } else {
            recordPaiXu(shunZi, t);
        }
    }
    if (matched) {
        addCount(shunZi[0], -1, countMap);
        addCount(shunZi[1], -1, countMap);
        addCount(shunZi[2], -1, countMap);
        data.numOfJings -= requireJings;
        var ret = checkSingle(jingMode, data, huInfo);
        addCount(shunZi[0], 1, countMap);
        addCount(shunZi[1], 1, countMap);
        addCount(shunZi[2], 1, countMap);
        if (ret == true) {
            recordPaiXu(huInfo, shunZi[0]);
            recordPaiXu(huInfo, shunZi[1]);
            recordPaiXu(huInfo, shunZi[2]);
            recordShun(huInfo, shunZi);
            return true;
        } else {
            data.numOfJings += requireJings;
        }
    }
    return false;
}
// 给一顺中发白排序
function sortZFB(arr3) {
    var hasZ = false;
    var hasF = false;
    var hasB = false;
    for (var i = 0; i < arr3.length; i++) {
        switch (arr3[i]) {
            case 31: {
                hasZ = true;
                break;
            }
            case 32: {
                hasF = true;
                break;
            }
            case 33: {
                hasB = true;
                break;
            }
        }
    }
    if (hasZ) {
        arr3[0] = 31
    } else {
        arr3[0] = LAI_ZI_VALUE;
    }
    if (hasF) {
        arr3[1] = 32
    } else {
        arr3[1] = LAI_ZI_VALUE;
    }
    if (hasB) {
        arr3[2] = 33
    } else {
        arr3[2] = LAI_ZI_VALUE;
    }
}
// 匹配中发白
function MatchZFBXXX(selected, jingMode, data, huInfo) {
    if (!isZhongFaBai(selected)) {
        return false
    }
    var shunZi = [];
    var countMap = data.countMap;
    var matched = true;
    var requireJings = 0;
    var plan = [selected, selected + 1, selected + 2];
    for (var i = 0; i < 3; ++i) {
        var t = plan[i];
        t = t % 31;
        t = t % 3;
        t = 31 + t;
        var c = countMap[t];
        if (c == null || c <= 0) {
            if (jingMode && data.numOfJings > requireJings) {
                recordPaiXu(shunZi, LAI_ZI_VALUE);
                requireJings++;
            } else {
                matched = false;
                break;
            }
        } else {
            recordPaiXu(shunZi, t);
        }
    }
    if (matched) {
        addCount(shunZi[0], -1, countMap);
        addCount(shunZi[1], -1, countMap);
        addCount(shunZi[2], -1, countMap);
        data.numOfJings -= requireJings;
        var ret = checkSingle(jingMode, data, huInfo);
        addCount(shunZi[0], 1, countMap);
        addCount(shunZi[1], 1, countMap);
        addCount(shunZi[2], 1, countMap);
        if (ret == true) {
            recordPaiXu(huInfo, shunZi[0]);
            recordPaiXu(huInfo, shunZi[1]);
            recordPaiXu(huInfo, shunZi[2]);
            recordShun(huInfo, shunZi);
            return true;
        } else {
            data.numOfJings += requireJings;
        }
    }
    return false;
}
// 判断是否能匹配成顺子
function matchSingle(selected, jingMode, data, huInfo) {
    //分开匹配 A-2,A-1,A
    var matched = MatchABO(selected, jingMode, data, huInfo);
    if (matched) {
        return true;
    }
    //分开匹配 A-1, A, A+1
    matched = MatchAOB(selected, jingMode, data, huInfo);
    if (matched) {
        return true;
    }
    //分开匹配 A, A+1, A+2
    matched = MatchOAB(selected, jingMode, data, huInfo);
    if (matched) {
        return true;
    }
    // 检查风是否成顺子
    matched = MatchFeng012(selected, jingMode, data, huInfo);
    if (matched) {
        return true;
    }
    matched = MatchFeng013(selected, jingMode, data, huInfo);
    if (matched) {
        return true;
    }
    matched = MatchFeng023(selected, jingMode, data, huInfo);
    if (matched) {
        return true;
    }
    matched = MatchZFBXXX(selected, jingMode, data, huInfo);
    if (matched) {
        return true;
    }
    return false;
}
// 模块内部使用
// 去除两张奖牌后，判断是否不单张: 除了顺子和坎之外,有没有其他牌
// 注意，call checkSingle之前，必须设置对numOfJings，同时从countMap里拿掉所有的精牌
function checkSingle(jingMode, data, huInfo) {
    var countMap = data.countMap;
    var holds = data.holds;
    var selected = -1;
    var c = 0;
    // 选第一张牌
    for (var i = 0; i < holds.length; ++i) {
        var pai = holds[i];
        c = countMap[pai];
        if (c > 0) {
            selected = pai;
            break;
        }
    }
    if (selected == -1) { // 没牌可选，则已经顺了。
        return true;
    }
    if (c == 3) { // 直接作为一坎
        countMap[selected] = 0;
        var r1 = checkSingle(jingMode, data, huInfo);
        countMap[selected] = c;
        if (r1 == true) {
            recordPaiXu(huInfo, selected);
            recordPaiXu(huInfo, selected);
            recordPaiXu(huInfo, selected);
            recordKan(huInfo, [selected, selected, selected]);
            return true;
        }
    } else if (c == 4) { // 直接作为一坎
        countMap[selected] = 1;
        var r2 = checkSingle(jingMode, data, huInfo);
        countMap[selected] = c;
        if (r2 == true) {
            recordPaiXu(huInfo, selected);
            recordPaiXu(huInfo, selected);
            recordPaiXu(huInfo, selected);
            recordKan(huInfo, [selected, selected, selected]);
            return true;
        }
    } else if (c == 2) { // 替用作为一坎
        if (jingMode && data.numOfJings >= 1) {
            countMap[selected] = 0;
            data.numOfJings -= 1;
            var r3 = checkSingle(jingMode, data, huInfo);
            countMap[selected] = c;
            if (r3 == true) {
                recordPaiXu(huInfo, selected);
                recordPaiXu(huInfo, selected);
                recordPaiXu(huInfo, LAI_ZI_VALUE);
                recordKan(huInfo, [selected, selected, LAI_ZI_VALUE]);
                return true;
            } else {
                data.numOfJings += 1;
            }
        }
    } else if (c == 1) { // 替用作为一坎
        if (jingMode && data.numOfJings >= 2) {
            countMap[selected] = 0;
            data.numOfJings -= 2;
            var r4 = checkSingle(jingMode, data, huInfo);
            countMap[selected] = c;
            if (r4 == true) {
                recordPaiXu(huInfo, selected);
                recordPaiXu(huInfo, LAI_ZI_VALUE);
                recordPaiXu(huInfo, LAI_ZI_VALUE);
                recordKan(huInfo, [selected, LAI_ZI_VALUE, LAI_ZI_VALUE]);
                return true;
            } else {
                data.numOfJings += 2;
            }
        }
    }
    return matchSingle(selected, jingMode, data, huInfo);
}
// 保存赖子牌对应的牌计数
function storeJingMap(chuPai, data) {
    var countMap = data.countMap;
    var oldJingMap = {};
    for (var k in data.jingMap) {
        oldJingMap[k] = countMap[k];
        if (chuPai == k) {
            countMap[k] = 1;
        } else {
            countMap[k] = 0;
        }
    }
    return oldJingMap;
}
// 还原癞子牌对应的牌计数
function restoreJingMap(oldJingMap, data) {
    var countMap = data.countMap;
    if (oldJingMap) {
        for (var k in data.jingMap) {
            var c = oldJingMap[k];
            if (c) {
                countMap[k] = c;
            }
        }
    }
}
// 判断牌的类型
var getMJType = function (id) {
    if (id >= 0 && id < 9) { // 筒
        return 0;
    } else if (id >= 9 && id < 18) { // 条
        return 1;
    } else if (id >= 18 && id < 27) { // 万
        return 2;
    } else if (id >= 27 && id < 34) { // 字
        return 3;
    }
};
// 检查是不是平胡
var isPingHuNew = function (seatData, checkJings, chupai) {
    var data = {};
    data.jingMap = null;
    data.countMap = null;
    data.holds = null;
    data.numOfJings = 0;
    data.jingMap = deepCopy(seatData.game.jingMap);
    data.countMap = deepCopy(seatData.countMap);
    data.holds = deepCopy(seatData.holds);
    data.numOfJings = 0;
    var jingMap = data.jingMap;
    for (var k in data.countMap) {
        if (jingMap[k] == true) {
            data.numOfJings += data.countMap[k];
        }
    }
    if (jingMap[chupai] == true) {
        data.numOfJings -= 1;
    }
    var oldJings = data.numOfJings;
    var fn = function (jingMode) {
        var fnRet = false;
        var hasPai = false;
        var oldJingMap = null;
        if (jingMode) {
            oldJingMap = storeJingMap(chupai, data); //把精牌清零
        }
        // 定将牌
        for (var k in data.countMap) {
            var c = data.countMap[k];
            if (c <= 0) {
                continue;
            } else if (c == 1) {
                hasPai = true;
                if (jingMode == false || data.numOfJings < 1) {
                    continue;
                } else {
                    data.countMap[k] -= 1;
                    data.numOfJings -= 1;
                }
            } else {
                hasPai = true;
                data.countMap[k] -= 2;
            }
            fnRet = checkSingle(jingMode, data, null);
            data.countMap[k] = c;
            data.numOfJings = oldJings;
            if (fnRet) {
                break;
            }
        }
        if (jingMode) {
            restoreJingMap(oldJingMap, data);
        }
        if (hasPai == false) {
            fnRet = true;
        }
        return fnRet;
    };
    var ret = fn(checkJings);
    if (ret) {
        return 1;
    }
    return 0;
};
//  重置一下jingMap and numOfJings
var checkSingle_Test = function (seatData, jingMode, jm, chupai) {
    var data = {};
    data.jingMap = null;
    data.countMap = null;
    data.holds = null;
    data.numOfJings = 0;
    //复制一份有用的数据
    data.jingMap = deepCopy(jm);
    data.countMap = deepCopy(seatData.countMap);
    data.holds = deepCopy(seatData.holds);
    // 在调用checkSingle之前,必须设置好numOfJings,并将精pai数量设置为0(chupai精时该数量应该是1)
    data.numOfJings = 0;  //有几张精牌
    for (var k in seatData.countMap) {
        if (data.jingMap[k] == true) {
            var c = data.countMap[k];
            data.numOfJings += c;
        }
    }
    if (chupai >= 0 && data.jingMap[chupai] == true) { //别人打出的牌也是癞子,则不能算癞子
        data.numOfJings -= 1;
    }
    var oldJingMap = null;
    //把精牌全取走
    if (jingMode) {
        oldJingMap = storeJingMap(chupai, data);
    }
    var ret = checkSingle(jingMode, data);
    if (jingMode) {
        restoreJingMap(oldJingMap, data);
    }
    return ret;
};
// 扫描玩家可胡平胡的所有牌型
var scanPingHuPattern = function (seatData, checkJings, chuPai, patterns) {
    var data = {};
    data.jingMap = null;
    data.countMap = null;
    data.holds = null;
    data.numOfJings = 0;
    data.jingMap = deepCopy(seatData.game.jingMap);
    data.countMap = deepCopy(seatData.countMap);
    data.holds = deepCopy(seatData.holds);
    data.numOfJings = 0;
    if (checkJings) {
        for (var ck in data.countMap) {
            if (data.jingMap[ck] == true) {
                data.numOfJings += data.countMap[ck];
            }
        }
        if (data.jingMap[chuPai] == true) {
            data.numOfJings -= 1;
        }
    }
    var oldJings = data.numOfJings;
    var ret = false;
    var oldJingMap = null;
    if (checkJings) {
        oldJingMap = storeJingMap(chuPai, data); //把精牌清零
    }
    // 在去掉精牌后的剩余牌中，取将。
    for (var k in data.countMap) {
        var c = data.countMap[k];
        var huInfo = new hu_info("normal", checkJings);
        if (c <= 0) {
            continue;
        } else if (c == 1) {
            if (checkJings == false || data.numOfJings < 1) {
                continue;
            } else {
                recordPaiXu(huInfo, parseInt(k));
                recordJiang(huInfo, parseInt(k));
                data.countMap[k] -= 1;
                recordPaiXu(huInfo, LAI_ZI_VALUE);
                recordJiang(huInfo, LAI_ZI_VALUE);
                data.numOfJings -= 1;
            }
        } else {
            if (checkJings == true && data.numOfJings >= 1) {
                var huInfo2 = new hu_info("normal", checkJings);
                recordPaiXu(huInfo2, parseInt(k));
                recordJiang(huInfo2, parseInt(k));
                data.countMap[k] -= 1;
                recordPaiXu(huInfo2, LAI_ZI_VALUE);
                recordJiang(huInfo2, LAI_ZI_VALUE);
                data.numOfJings -= 1;
                ret = checkSingle(checkJings, data, huInfo2);
                if (ret && data.numOfJings % 3 != 0) {
                    ret = false;
                }
                if (ret) {
                    for (var l = 0; l < data.numOfJings; l++) {
                        recordPaiXu(huInfo2, LAI_ZI_VALUE);
                    }
                    patterns.push(huInfo2);
                }
                data.countMap[k] = c;
                data.numOfJings = oldJings;
            }
            recordPaiXu(huInfo, parseInt(k));
            recordJiang(huInfo, parseInt(k));
            recordPaiXu(huInfo, parseInt(k));
            recordJiang(huInfo, parseInt(k));
            data.countMap[k] -= 2;
        }
        ret = checkSingle(checkJings, data, huInfo);
        if (ret && data.numOfJings % 3 != 0) {
            ret = false;
        }
        if (ret) {
            for (var i = 0; i < data.numOfJings; i++) {
                recordPaiXu(huInfo, LAI_ZI_VALUE);
            }
            patterns.push(huInfo);
        }
        data.countMap[k] = c;
        data.numOfJings = oldJings;
    }
    // 在精牌中，取将牌。
    if (checkJings && data.numOfJings >= 2) {
        var huInfo3 = new hu_info("normal", checkJings);
        data.numOfJings -= 2;
        recordPaiXu(huInfo3, LAI_ZI_VALUE);
        recordJiang(huInfo3, LAI_ZI_VALUE);
        recordPaiXu(huInfo3, LAI_ZI_VALUE);
        recordJiang(huInfo3, LAI_ZI_VALUE);
        ret = checkSingle(checkJings, data, huInfo3);
        if (ret && data.numOfJings % 3 != 0) {
            ret = false;
        }
        if (ret) {
            for (var j = 0; j < data.numOfJings; j++) {
                recordPaiXu(huInfo3, LAI_ZI_VALUE);
            }
            patterns.push(huInfo3);
        }
        data.numOfJings = oldJings;
    }
    if (checkJings) {
        restoreJingMap(oldJingMap, data);
    }
};
// 扫描玩家可胡十三烂的所有牌型
var scan13LanPattern = function (seatData, checkJings, chuPai, patterns) {
    var data = {};
    data.jingMap = null;
    data.countMap = null;
    data.holds = null;
    data.numOfJings = 0;
    data.jingMap = deepCopy(seatData.game.jingMap);
    data.countMap = deepCopy(seatData.countMap);
    data.holds = deepCopy(seatData.holds);
    if (data.holds.length != 14) {
        return null;
    }
    var pai13Lan = new Array(5);
    for (var o = 0; o < pai13Lan.length; o++) {
        pai13Lan[o] = [];
    }
    for (var k in data.countMap) {
        var c = data.countMap[k];
        if (c <= 0) {
            continue;
        }
        var pai = parseInt(k);
        var type = getMJType(pai);
        if (checkJings && data.jingMap[k] == true) {
            if (pai == chuPai) {
                c--;
                if (pai13Lan[type] != null) {
                    if (type <= 2) {
                        for (var n in pai13Lan[type]) {
                            var p = pai13Lan[type][n];
                            if (Math.abs(p - pai) < 3) {  //序牌必须间隔>=3
                                delete pai13Lan;
                                return null;
                            }
                        }
                    }
                    pai13Lan[type].push(pai);
                } else {
                    pai13Lan[type] = [];
                    pai13Lan[type].push(pai);
                }
            }
            for (var i = 0; i < c; i++) {
                if (pai13Lan[4] == null) {
                    pai13Lan[4] = [];
                }
                pai13Lan[4].push(pai);
            }
        } else {
            if (c > 1) {
                delete pai13Lan;
                return null;
            }
            if (pai13Lan[type] != null) {
                if (type <= 2) {
                    for (var l in pai13Lan[type]) {
                        var v = pai13Lan[type][l];
                        if (Math.abs(v - pai) < 3) {  //序牌必须间隔>=3
                            delete pai13Lan;
                            return null;
                        }
                    }
                }
                pai13Lan[type].push(pai);
            } else {
                pai13Lan[type] = [];
                pai13Lan[type].push(pai);
            }
        }
    }
    var huInfo = new hu_info("13lan", checkJings);
    huInfo.add13LanPai(pai13Lan);
    patterns.push(huInfo);
};
// 判断是不是全对子。
function isPairs(jingMode, data, huInfo) {
    var countMap = data.countMap;
    var holds = data.holds;
    var selected = -1;
    var c = 0;
    for (var i = 0; i < holds.length; ++i) {
        var pai = holds[i];
        c = countMap[pai];
        if (c > 0) {
            selected = pai;
            break;
        }
    }
    if (selected == -1) {
        return true;
    }
    if (c == 3) {
        countMap[selected] = 1;
        var r1 = isPairs(jingMode, data, huInfo);
        countMap[selected] = c;
        if (r1 == true) {
            recordPaiXu(huInfo, selected);
            recordPaiXu(huInfo, selected);
            recordPair(huInfo, [selected, selected]);
            return true;
        }
    } else if (c == 4) {
        countMap[selected] = 0;
        var r2 = isPairs(jingMode, data, huInfo);
        countMap[selected] = c;
        if (r2 == true) {
            recordPaiXu(huInfo, selected);
            recordPaiXu(huInfo, selected);
            recordPair(huInfo, [selected, selected]);
            recordPaiXu(huInfo, selected);
            recordPaiXu(huInfo, selected);
            recordPair(huInfo, [selected, selected]);
            return true;
        }
    } else if (c == 2) {
        countMap[selected] = 0;
        var r3 = isPairs(jingMode, data, huInfo);
        countMap[selected] = c;
        if (r3 == true) {
            recordPaiXu(huInfo, selected);
            recordPaiXu(huInfo, selected);
            recordPair(huInfo, [selected, selected]);
            return true;
        }
    } else if (c == 1) {
        if (jingMode && data.numOfJings >= 1) {
            countMap[selected] = 0;
            data.numOfJings -= 1;
            var r4 = isPairs(jingMode, data, huInfo);
            countMap[selected] = c;
            if (r4 == true) {
                recordPaiXu(huInfo, selected);
                recordPaiXu(huInfo, LAI_ZI_VALUE);
                recordPair(huInfo, [selected, LAI_ZI_VALUE]);
                return true;
            } else {
                data.numOfJings += 1;
            }
        }
    }
    return false;
}
// 扫描玩家可胡小7对的所有牌型
var scan7pairsPattern = function (seatData, checkJings, chuPai, patterns) {
    var data = {};
    data.jingMap = null;
    data.countMap = null;
    data.holds = null;
    data.numOfJings = 0;
    data.jingMap = deepCopy(seatData.game.jingMap);
    data.countMap = deepCopy(seatData.countMap);
    data.holds = deepCopy(seatData.holds);
    data.numOfJings = 0;
    if (data.holds.length != 14) {
        return null;
    }
    if (checkJings) {
        for (var ck in data.countMap) {
            if (data.jingMap[ck] == true) {
                data.numOfJings += data.countMap[ck];
            }
        }
        if (data.jingMap[chuPai] == true) {
            data.numOfJings -= 1;
        }
    }
    var oldJings = data.numOfJings;
    var ret = false;
    var oldJingMap = null;
    if (checkJings) {
        oldJingMap = storeJingMap(chuPai, data); //把精牌清零
    }
    // 在去掉精牌后的剩余牌中，取将。
    for (var k in data.countMap) {
        var c = data.countMap[k];
        var huInfo = new hu_info("7pairs", checkJings);
        if (c <= 0) {
            continue;
        } else if (c == 1) {
            if (checkJings == false || data.numOfJings < 1) {
                continue;
            } else {
                recordPaiXu(huInfo, parseInt(k));
                recordJiang(huInfo, parseInt(k));
                data.countMap[k] -= 1;
                recordPaiXu(huInfo, LAI_ZI_VALUE);
                recordJiang(huInfo, LAI_ZI_VALUE);
                data.numOfJings -= 1;
            }
        } else {
            if (checkJings == true && data.numOfJings >= 1) {
                var huInfo2 = new hu_info("7pairs", checkJings);
                recordPaiXu(huInfo2, parseInt(k));
                recordJiang(huInfo2, parseInt(k));
                data.countMap[k] -= 1;
                recordPaiXu(huInfo2, LAI_ZI_VALUE);
                recordJiang(huInfo2, LAI_ZI_VALUE);
                data.numOfJings -= 1;
                ret = isPairs(checkJings, data, huInfo2);
                if (ret && data.numOfJings % 3 != 0) {
                    ret = false;
                }
                if (ret) {
                    for (var l = 0; l < data.numOfJings; l++) {
                        recordPaiXu(huInfo2, LAI_ZI_VALUE);
                    }
                    patterns.push(huInfo2);
                }
                data.countMap[k] = c;
                data.numOfJings = oldJings;
            }
            recordPaiXu(huInfo, parseInt(k));
            recordJiang(huInfo, parseInt(k));
            recordPaiXu(huInfo, parseInt(k));
            recordJiang(huInfo, parseInt(k));
            data.countMap[k] -= 2;
        }
        ret = isPairs(checkJings, data, huInfo);
        if (ret && data.numOfJings % 3 != 0) {
            ret = false;
        }
        if (ret) {
            for (var i = 0; i < data.numOfJings; i++) {
                recordPaiXu(huInfo, LAI_ZI_VALUE);
            }
            patterns.push(huInfo);
        }
        data.countMap[k] = c;
        data.numOfJings = oldJings;
    }
    // 在精牌中，取将牌。
    if (checkJings && data.numOfJings >= 2) {
        var huInfo3 = new hu_info("7pairs", checkJings);
        data.numOfJings -= 2;
        recordPaiXu(huInfo3, LAI_ZI_VALUE);
        recordJiang(huInfo3, LAI_ZI_VALUE);
        recordPaiXu(huInfo3, LAI_ZI_VALUE);
        recordJiang(huInfo3, LAI_ZI_VALUE);
        ret = isPairs(checkJings, data, huInfo3);
        if (ret && data.numOfJings % 3 != 0) {
            ret = false;
        }
        if (ret) {
            for (var j = 0; j < data.numOfJings; j++) {
                recordPaiXu(huInfo3, LAI_ZI_VALUE);
            }
            patterns.push(huInfo3);
        }
        data.numOfJings = oldJings;
    }
    if (checkJings) {
        restoreJingMap(oldJingMap, data);
    }
};
// 记录胡牌次序
function recordPaiXu(dest, pai) {
    if (dest != null) {
        dest.push(pai);
    }
}
// 记录将牌
function recordJiang(dest, jiang) {
    if (dest != null) {
        dest.addJiang(jiang);
    }
}
// 记录坎牌
function recordKan(dest, kan) {
    if (dest != null) {
        dest.addKan(kan);
    }
}
// 记录顺子
function recordShun(dest, shun) {
    if (dest != null) {
        dest.addShun(shun);
    }
}
// 记录对子
function recordPair(dest, shun) {
    if (dest != null) {
        dest.addPair(shun);
    }
}
//============== 对外的接口定义 laoli ================
exports.isPingHuNew = isPingHuNew;
exports.scanPingHuPattern = scanPingHuPattern;
exports.scan13LanPattern = scan13LanPattern;
exports.scan7pairsPattern = scan7pairsPattern;
exports.checkSingle_Test = checkSingle_Test;
