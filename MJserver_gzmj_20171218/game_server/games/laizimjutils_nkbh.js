var kanzi = [];     // for debug only
//var jingMap = {};
//var numOfJings = 0;
var record = false; // for debug only

Version = "V0.03 171018T3"

// laoli note 171018，对外的接口只有两个
//      1.

//          风顺子 OK
//          去掉jingMap和numOfJings这两个全局变量，移到内部变量data里
//          目前主要用到的jingMap[],numOfJings,countMap[],holds[]

function mylog_debug(){
    //console.log(arguments)
}

function mylog_info( ){
    // console.log(arguments)
}

function mylog_error( ){
    // console.log(arguments)
}


function debugRecord(pai) {
    if (record) {
        kanzi.push(pai);
    }
}

//深度clone一个obj, laoli 171018
var deepCopy= function(source) {
    var result={};
    for (var key in source) {
        result[key] = typeof(source[key])=='object'?deepCoyp(source[key]): source[key]
    }
    return result;
}

var deepCopyList= function(source) {
    var result=[];
    for (var ii in source) {
        result[ii] = source[ii]
    }
    return result;
}

// 增加牌的计数
function addCount(pai, value,countMap) {
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


function getZFBs(selected) {
    return [31,32,33]
}

function getWinds(selected) {
    return [27,28,29,30]
}


// 匹配ABO模式
function MatchABO( selected, jingMode,data) {
    //分开匹配 A-2,A-1,A

    //console.log(">> MatchABO:",selected)
    if (!isXuPai(selected)) return false   //laoli
    var countMap=data.countMap;

    var matched = true;
    var requireJings = 0;
    var v = selected % 9;
    if (v < 2) {
        matched = false;
    }
    if (matched) {
        for (var i = 0; i < 3; ++i) {
            var t = selected - 2 + i;
            var cc = countMap[t];
            if (cc == null || cc <= 0) {
                if (jingMode && data.numOfJings > requireJings) {
                    requireJings++;
                } else {
                    matched = false;
                    break;
                }
            }
        }
    }
    //匹配成功，扣除相应数值
    if (matched) {
        addCount( selected - 2, -1,countMap);
        addCount( selected - 1, -1,countMap);
        addCount( selected - 0, -1,countMap);
        data.numOfJings -= requireJings;
        //console.log("cs 11030 减少精数量:",numOfJings,requireJings,selected)
        var ret = checkSingle( jingMode,data);
        addCount( selected - 2, 1,countMap);
        addCount( selected - 1, 1,countMap);
        addCount( selected - 0, 1,countMap);
        data.numOfJings += requireJings;
        //console.log("cs 11030 恢复精数量:",numOfJings,requireJings,selected,ret)
        if (ret == true) {
            debugRecord(selected - 2);
            debugRecord(selected - 1);
            debugRecord(selected);
            mylog_debug("cs 11030")
            return true;
        }
    }
    mylog_debug("cs 11031,MatchABO fail")
    return false;
}
// 匹配AOB模式
function MatchAOB( selected, jingMode,data) {
    mylog_debug(">> MatchAOB:",selected)
    if (!isXuPai(selected)) return false   //laoli
    var countMap=data.countMap;
    //分开匹配 A-1,A,A + 1
    var matched = true;
    var requireJings = 0;
    var v = selected % 9;
    if (v < 1 || v > 7) {
        matched = false;
    }
    if (matched) {
        for (var i = 0; i < 3; ++i) {
            var t = selected - 1 + i;
            var cc = countMap[t];
            if (cc == null || cc <= 0) {
                if (jingMode && data.numOfJings > requireJings) {
                    requireJings++;
                } else {
                    matched = false;
                    break;
                }
            }
        }
    }
    //匹配成功，扣除相应数值
    if (matched) {
        addCount( selected - 1, -1,countMap);
        addCount( selected - 0, -1,countMap);
        addCount( selected + 1, -1,countMap);
        data.numOfJings -= requireJings;
        //console.log("cs 11032 -精数量:",numOfJings,requireJings,selected)
        var ret = checkSingle( jingMode,data);
        addCount( selected - 1, 1,countMap);
        addCount( selected - 0, 1,countMap);
        addCount( selected + 1, 1,countMap);
        data.numOfJings += requireJings;
        //console.log("cs 11032 +精数量:",numOfJings,requireJings,selected,ret)
        if (ret == true) {
            debugRecord(selected - 1);
            debugRecord(selected - 0);
            debugRecord(selected + 1);
            mylog_debug("cs 11032")
            return true;
        }
    }
    //mylog_debug("cs 11033,MatchAOB fail")
    return false;
}
// 匹配OAB模式
function MatchOAB( selected, jingMode,data) {
    mylog_debug(">> MatchOAB:",selected)
    if (!isXuPai(selected)) return false   //laoli
    var countMap=data.countMap;
    //分开匹配 A,A+1,A + 2
    var matched = true;
    var requireJings = 0;
    var v = selected % 9;
    if (v > 6) {
        matched = false;
    }
    if (matched) {
        for (var i = 0; i < 3; ++i) {
            var t = selected + i;
            var cc = countMap[t];
            if (cc == null || cc <= 0) {
                if (jingMode && data.numOfJings > requireJings) {
                    requireJings++;
                } else {
                    matched = false;
                    break;
                }
            }
        }
    }

    //匹配成功，扣除相应数值
    if (matched) {
        //console.log(">> MatchOAB 匹配OK:",selected)
        addCount( selected - 0, -1,countMap);
        addCount( selected + 1, -1,countMap);
        addCount( selected + 2, -1,countMap);
        //console.log("cs 11020 -精数量:",numOfJings,requireJings,selected)
        data.numOfJings -= requireJings;
        var ret = checkSingle( jingMode,data);
        addCount( selected - 0, 1,countMap);
        addCount( selected + 1, 1,countMap);
        addCount( selected + 2, 1,countMap);
        data.numOfJings += requireJings;
        //console.log("cs 11020 +精数量:",numOfJings,requireJings,selected,ret)
        if (ret == true) {
            debugRecord(selected - 0);
            debugRecord(selected + 1);
            debugRecord(selected + 2);
            mylog_debug("cs 11020")
            return true;
        }
    }
    //console.log("cs 11021,MatchOAB fail")
    return false;
}

// 匹配XX乱序模式，用于乱风
function MatchFengXXX( selected, jingMode,data) {
    mylog_debug(">> MatchFengXXX:",selected,data.jingMap)

    if (!isWind(selected)) return false   //laoli
    var countMap=data.countMap;
    //jingMap=seatData.game.jingMap

    //分开匹配 A,A+1,A + 2
    var matched = false;
    var requireJings = 0;

    //numOfJings=2

    var fcnt=0;
    var fenglist=[]

    // reset
    var winds=getWinds()
    for (var ii in winds ){
        if (winds[ii]==selected) continue;
        fenglist.push({'pai':winds[ii],'cc':0});
    }
    //console.log(fenglist)

    for (var kk in countMap ) {
        if (!isWind(kk)) continue;
        if (kk==selected) continue; //不统计自己
        var cc=countMap[kk]
        fenglist.push({'pai':kk,'cc':cc});
        if (cc>0) fcnt++
    }

    //console.log(fenglist)
    //从多到少排序
    fenglist.sort(function(a,b){return a['cc']>=b['cc']?-1:1})
    //console.log(fenglist)

    if (fcnt>=2) matched=true
    else if (jingMode) {
        requireJings = 2 - fcnt;
        if (data.numOfJings >= requireJings)
            matched = true;
    }

    //console.log("MatchFengOXX1:",fcnt,requireJings,numOfJings,jingMode,matched)

    var oid0=fenglist[0]['pai'];
    var oid1=fenglist[1]['pai'];
    //console.log(oid0,oid1)

    //匹配成功，扣除相应数值
    if (matched) {
        //console.log(">> MatchOAB 匹配OK:",selected)
        addCount( selected - 0, -1,countMap);
        addCount( oid0, -1,countMap);
        addCount( oid1, -1,countMap);
        //console.log("去掉：",oid0,oid1)
        //console.log("cs 11040 -精数量:",numOfJings,requireJings,selected)
        data.numOfJings -= requireJings;
        var ret = checkSingle( jingMode,data);
        addCount( selected - 0, 1,countMap);
        addCount( oid0, 1,countMap);
        addCount( oid1, 1,countMap);
        data.numOfJings += requireJings;
        //console.log("cs 11041 +精数量:",numOfJings,requireJings,selected,ret)
        if (ret == true) {
            debugRecord(selected - 0);
            debugRecord(oid0);
            debugRecord(oid1);
            mylog_debug("cs 11041, OK ")
            return true;
        }
    }
    mylog_debug("cs 11042,MatchFengXXX fail")
    return false;
}

// 匹配XXX模式，用于乱zfb
function MatchZFBXXX( selected, jingMode,data) {
    mylog_debug(">> MatchZFBXXX:",selected,data.jingMap)

    if (!isZhongFaBai(selected)) return false   //laoli
    var countMap=data.countMap;
    //jingMap=seatData.game.jingMap

    var matched = false;
    var requireJings = 0;
    var fcnt=0;
    var fenglist=[]

    // reset
    var winds=getZFBs()
    for (var ii in winds ){
        if (winds[ii]==selected) continue;
        fenglist.push({'pai':winds[ii],'cc':0});
    }
    //console.log(fenglist)

    for (var kk in countMap ) {
        if (!isZhongFaBai(kk)) continue;
        if (kk==selected) continue; //不统计自己
        var cc=countMap[kk]
        fenglist.push({'pai':kk,'cc':cc});
        if (cc>0) fcnt++
    }

    //console.log(fenglist)
    //从多到少排序
    fenglist.sort(function(a,b){return a['cc']>=b['cc']?-1:1})
    //console.log(fenglist)

    if (fcnt>=2) matched=true
    else if (jingMode) {
        requireJings = 2 - fcnt;
        if (data.numOfJings >= requireJings)
            matched = true;
    }

    //console.log("MatchZFBXXX1:",fcnt,requireJings,numOfJings,jingMode,matched)

    var oid0=fenglist[0]['pai'];
    var oid1=fenglist[1]['pai'];
    //console.log(oid0,oid1)

    //匹配成功，扣除相应数值
    if (matched) {
        //console.log(">> MatchOAB 匹配OK:",selected)
        addCount( selected - 0, -1,countMap);
        addCount( oid0, -1,countMap);
        addCount( oid1, -1,countMap);
        //console.log("去掉：",oid0,oid1)
        //console.log("cs 11050 -精数量:",numOfJings,requireJings,selected)
        data.numOfJings -= requireJings;
        var ret = checkSingle( jingMode,data);
        addCount( selected - 0, 1,countMap);
        addCount( oid0, 1,countMap);
        addCount( oid1, 1,countMap);
        data.numOfJings += requireJings;
        //console.log("cs 11051 +精数量:",numOfJings,requireJings,selected,ret)
        if (ret == true) {
            debugRecord(selected - 0);
            debugRecord(oid0);
            debugRecord(oid1);
            mylog_debug("cs 11051, OK ")
            return true;
        }
    }
    mylog_debug("cs 11052,MatchZFBXXX fail")
    return false;
}

// 判断是否能匹配成顺子
function matchSingle( selected, jingMode,data) {
    mylog_debug(">> matchSingle检查是否成顺子:",selected,data.numOfJings)
    var countMap=data.countMap;
    //分开匹配 A-2,A-1,A
    var matched = MatchABO( selected, jingMode,data);
    if (matched) {
        mylog_debug("cs 11008 顺子ABO匹配OK:",selected,data.numOfJings)
        return true;
    }
    //分开匹配 A-1, A, A+1
    matched = MatchAOB( selected, jingMode,data);
    if (matched) {
        mylog_debug("cs 11009 顺子AOB匹配OK:",selected,data.numOfJings)
        return true;
    }
    //分开匹配 A, A+1, A+2
    matched = MatchOAB( selected, jingMode,data);
    if (matched) {
        mylog_debug("cs 11010 顺子OAB匹配OK:",selected,data.numOfJings)
        return true;
    }
    //console.log("cs 11011")

    // 检查风是否成顺子
    //matched = MatchFengXXX( selected, jingMode,data);
    if (matched) {
        mylog_debug("cs 11011 风顺子匹配OK:",selected,data.numOfJings)
        return true;
    }

    //matched = MatchZFBXXX( selected, jingMode,data);
    if (matched) {
        mylog_debug("cs 11012 ZFB顺子匹配OK:",selected,data.numOfJings)
        return true;
    }

    return false;
}

// 判断是否不单张: 除了顺子和坎之外,有没有其他牌
//   注意，call checkSingle之前，必须设置对numOfJings，同时从countMap里拿掉所有的精牌
function checkSingle( jingMode,data) {
    mylog_debug(">>checksingle.. ..",jingMode,data.numOfJings)
    var countMap=data.countMap;
    //return false; //TODO
    var holds = data.holds;
    var selected = -1;
    var c = 0;

    //console.log(">>checkSingle")
    //console.log("jingmap:",jingMap)
    //console.log("numOfJings:",numOfJings)
    //console.log("holds:",holds.length,holds)
    //console.log(countMap)

    // 选第一张牌
    for (var i = 0; i < holds.length; ++i) {
        var pai = holds[i];
        //console.log("----",pai,countMap[pai])
        c = countMap[pai];
        if (c > 0) {
            selected = pai;
            break;
        }
    }

    //console.log("checkSingle selected:",selected)

    if (selected == -1) {  //说明牌已经顺好了
        mylog_info("cs 11001,牌好了!!")
        return true;
    }

    //否则，进行匹配
    if (c == 3) {
        //直接作为一坎
        mylog_debug("cs 11002 直接作为一坎:",selected)
        countMap[selected] = 0;
        debugRecord(selected);
        debugRecord(selected);
        debugRecord(selected);
        var ret = checkSingle( jingMode,data);
        //立即恢复对数据的修改
        //console.log("cs 11002 恢复数据")
        countMap[selected] = c;
        if (ret == true) {
            mylog_debug("cs 11002 OK:",selected)
            return true;
        }
        else
            mylog_debug("cs 11002 匹配失败:",selected)
    }
    else if (c == 4) {
        //直接作为一坎
        mylog_debug("cs 11003 直接作为一坎:",selected)
        countMap[selected] = 1;
        debugRecord(selected);
        debugRecord(selected);
        debugRecord(selected);
        var ret = checkSingle( jingMode,data);
        //立即恢复对数据的修改
        //console.log("cs 11003 恢复数据")
        countMap[selected] = c;
        //如果作为一坎能够把牌匹配完，直接返回TRUE。
        if (ret == true) {
            mylog_debug("cs 11003 OK:",selected)
            return true;
        }
        else
            mylog_debug("cs 11003 匹配失败:",selected);

    }
    else if (c == 2) {
        //替用作为一坎
        if (jingMode && data.numOfJings >= 1) {
            mylog_debug("cs 11004 作为坎:",selected)
            countMap[selected] = 0;
            data.numOfJings -= 1;
            var ret = checkSingle( jingMode,data);
            mylog_debug("cs 11004 恢复数据")
            countMap[selected] = c;
            data.numOfJings += 1;
            if (ret == true) {
                mylog_debug("cs 11004 OK:",selected)
                return true;
            }
            else
                mylog_debug("cs 11004 匹配失败:",selected);

        }
    }
    else if (c == 1) {
        //替用作为一坎
        if (jingMode && data.numOfJings >= 2) {
            mylog_debug("cs 11004 癞子替用作为一坎:",selected)
            countMap[selected] = 0;
            data.numOfJings -= 2;
            var ret = checkSingle( jingMode,data);
            mylog_debug("cs 11005 恢复数据")
            countMap[selected] = c;
            data.numOfJings += 2;
            if (ret == true) {
                mylog_debug("cs 11005 OK:",selected)
                return true;
            }
            else
                mylog_debug("cs 11004 匹配失败:",selected);

        }
    }
    /* laoli note 1018 , 允许东南西北风中发白单牌凑顺子
     //东南西北风中发白不能是单牌
     if (isWind(selected) || isZhongFaBai(selected)) {
     mylog_debug("cs 11006失败:东南西北风中发白不能是单牌 ",selected)
     return false;
     }*/
    //按单牌处理
    mylog_debug("cs 11007按单牌处理:",selected)
    var ret=matchSingle( selected, jingMode,data);
    if (ret)
        mylog_debug("cs 11008, 成功 按单牌处理:",selected)
    return ret;
}


// 保存赖子牌对应的牌计数
function storeJingMap( chupai,data) {
    var countMap=data.countMap;
    var oldJingMap = {}
    for (var k in data.jingMap) {
        oldJingMap[k] = countMap[k]; //把jingMap存到oldJingMap中
        if (chupai == k) { //最后抓那张是精牌,
            countMap[k] = 1;//精牌数就是1
        }
        else {
            countMap[k] = 0;//把精牌全取走
        }
    }
    return oldJingMap;
}
// 还原癞子牌对应的牌计数
function restoreJingMap(oldJingMap,data) {
    var countMap=data.countMap;
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
getMJType = function (id) {
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
    else if (id >= 27 && id < 34) {
        //字
        return 3;
    }
};

// 检查是不是平胡
var isPingHuNew = function (seatData, checkJings, chupai) {
    // console.log("isPingHu start. ",checkJings,chupai,seatData.userId);

    var data={}
    data.jingMap=null
    data.countMap=null
    data.holds=null
    data.numOfJings=0

    //复制一份有用的数据
    data.jingMap=deepCopy(seatData.game.jingMap)
    data.countMap=deepCopy(seatData.countMap)
    data.holds=deepCopyList(seatData.holds)

    //console.log(typeof(data.holds),data.holds,data.holds.length)
    //console.log(typeof(seatData.holds),seatData.holds,seatData.holds.length)

    //console.log(typeof(data.countMap),data.countMap,data.countMap.length)
    //console.log(typeof(seatData.countMap),seatData.countMap,seatData.countMap.length)

    //console.log(typeof(data.holds),data.holds,data.holds.length)
    //console.log(typeof(seatData.holds),seatData.holds,seatData.holds.length)

    data.numOfJings = 0;  //有几张精牌

    //checkJings=false ; //TODO . 临时
    //console.log(data)
    //return 0

    var jingMap=data.jingMap        // laoli,必须设置jingMap才能继续
    for (var k in data.countMap) {
        if (jingMap[k] == true) {
            var c = data.countMap[k];
            data.numOfJings += c;
        }
    }
    if (jingMap[chupai] == true) { //别人打出的牌也是癞子,则不能算癞子
        data.numOfJings -= 1;
    }

    var hasJing = data.numOfJings > 0;
    var oldJings = data.numOfJings; //存下
    var fn = function (jingMode) {
        var oldJingMap = null;
        if (jingMode) {
            if (hasJing == false) {
            //    return false;
            }
            //如果全把精，则返回可以胡(不能算七对和十三烂，只能是精吊平胡)
            if (seatData.holds.length == data.numOfJings) {
                //return true;
            }
            oldJingMap = storeJingMap(chupai,data); //把精牌清零
        }

        //console.log(">> fn:",jingMode,seatData.countMap)

        var fnRet;

        // 定将牌
        var t_numOfLaizi =0;  //可用癞子数
        for (var k in data.countMap) { //此时的countMap里精牌数量为0
            t_numOfLaizi = oldJings; //再重新存下(oldJings包含所有的手精)
            k = parseInt(k);
            var c = data.countMap[k];
            if (c <= 0) {
                continue;
            }
            else if (c == 1) {
                if (jingMode == false || t_numOfLaizi < 1) {
                    continue;
                }
                else {  // 确定用癞子当将,可用癞子数少一
                    t_numOfLaizi -= 1;
                    data.numOfJings -=1;     //mc add 171015, !!!!
                }
            }
            //如果当前牌大于等于２，则将它选为将牌(就是k的值)
            data.countMap[k] -= 2;

            //console.log("--------------------");
            //console.log("---- isPingHu 选中将牌:",k);
            //逐个判定剩下的牌是否满足　３Ｎ规则,一个牌会有以下几种情况
            //1、0张，则不做任何处理
            //2、2张，则只可能是与其它牌形成匹配关系
            //3、3张，则可能是单张形成 A-2,A-1,A  A-1,A,A+1  A,A+1,A+2，也可能是直接成为一坎
            //4、4张，则只可能是一坎+单张
            fnRet = checkSingle(jingMode,data);
            data.countMap[k] += 2;
            data.numOfJings = oldJings;   //mc add 171015, !!!!
            if (fnRet) {
                console.log("---- isPingHu 选中将牌:",k,data.holds);
                break;
            }
        }
        if (jingMode) {
            restoreJingMap(oldJingMap,data);
        }
        return fnRet;
    };
    var ret = fn(checkJings);
    if (ret) {
        return 1;
    }

    //console.log("===canhu jing模式:")
    //console.log(seatData.countMap)

    // if (checkJings) {
    //     if (fn(true)) {
    //         return 2;
    //     }
    // }
    return 0;
};

/*
// 检查能不能胡牌
//      Note: jm为null时,则变成无癞子模式
checkCanHuTest = function (jm, seatData, pai, kehu7dui) {
    var game = seatData.game;
    jingMap = jm;//精牌那个对象

    //如果打缺的时候，有缺无法胡牌
    // if (pai >= 0) {
    //     if (pai != null) {
    //         seatData.holds.push(pai);
    //         if (seatData.countMap[pai]) {
    //             seatData.countMap[pai]++;
    //         }
    //         else {
    //             seatData.countMap[pai] = 1;
    //         }
    //     }
    // }

    var queInt = parseInt(seatData.que);
    console.log("checkCanHu queInt:" + queInt);

    if (queInt != -1) {
        for (var i = 0; i < seatData.holds.length; i++) {
            var num = seatData.holds[i];
            switch (queInt) {
                case 0: {// 筒
                    if (num >= 0 && num <= 8) {
                        return null;
                    }
                    break;
                }
                case 1: {// 条
                    if (num >= 9 && num <= 17) {
                        return null;
                    }
                    break;
                }
                case 2: {// 万
                    if (num >= 18 && num <= 26) {
                        return null;
                    }
                    break;
                }
            }
        }
    }

    var type = seatData.game.conf.type;
    console.log("checkCanHu type:" + type);

    // 广东鸡胡
    if (type == "gdjh") {
        var ret = isShiSanYao(seatData, true, pai);
        if (ret) {
            return "13yao";
        }
    }
    // 赣州chongguan麻将
    if (type == "gzmj") {
        // moved to xxx_gzmj.js, by mc 171014
    }

    // 判断是不是7对
    if (kehu7dui) {
        var ret = is7Pairs(seatData, true, pai);
        if (ret) {
            return "7pairs";
        }
    }
    // 判断是不是碰碰胡
    var ret = is4Melds(seatData, true, pai);
    if (ret) {
        return "4melds";
    }
    //判断是不是平胡
    var ret = isPingHuNew(seatData, true, pai);
    if (ret) {
        return "normal";
    }
    return null;
};
*/

//------ test only ,仅仅用于测试----------
//  重置一下jingMap and numOfJings
var checkSingle_Test = function (seatData, jingMode, jm, chupai){
    // console.log(">>checkSingle_Test  : ",jm,seatData,jingMode);
    if(chupai != -1){
        return 0;
    }
    var data={}
    data.jingMap=null
    data.countMap=null
    data.holds=null
    data.numOfJings=0

    //复制一份有用的数据
    data.jingMap=deepCopy(jm)
    data.countMap=deepCopy(seatData.countMap)
    data.holds=deepCopyList(seatData.holds)

    // 在调用checkSingle之前,必须设置好numOfJings,并将精pai数量设置为0(chupai精时该数量应该是1)
    //      参考canHu
    data.numOfJings = 0;  //有几张精牌

    for (var k in seatData.countMap) {
        if (data.jingMap[k] == true) {
            var c = data.countMap[k];
            data.numOfJings += c;
            //console.log("---",k,c)
        }
    }
    // console.log("numOfjings: ",data.numOfJings);
    if (chupai>=0 && data.jingMap[chupai] == true) { //别人打出的牌也是癞子,则不能算癞子
        data.numOfJings -= 1;
    }

    // console.log("numOfjings: ",data.numOfJings,data.countMap);

    //把精牌全取走
    if (jingMode)
        oldJingMap = storeJingMap(chupai,data); //把精牌清零

    // console.log(">>checkSingle_Test1: ",data.numOfJings,data.countMap);

    var rets= checkSingle(jingMode,data);
    // console.log("<<checkSingle_Test: ",rets);

    if (jingMode) {
        restoreJingMap(oldJingMap,data);
    }

    return rets
}


isPingHu_test = function (seatData, checkJings, chupai) {

}
exports.is7Pairs = function (seatData, checkJings, chupai) {
    if (seatData.holds.length != 14) {
        return 0;
    }
    //检查是否是七对。前提是没有吃，碰，杠，即手上拥有14张牌
    var fn = function (seatData, jingMode) {
        var pairCount = 0;
        for (var k in seatData.countMap) {
            var c = seatData.countMap[k];
            if (c == 2) {
                pairCount++;
            }
            else if (c == 3) {
                pairCount++;
            }
            else if (c == 4) {
                pairCount += 2;
            }
        }
        //检查是否有7对
        var j = jingMode ? numOfJings : 0;
        // 若还有单M张
        // M >= j:+j;
        // M < j:单张全部已经成双，剩余的都是赖子，即也成双。则+j。
        return (pairCount + j) >= 7;
    };
    var ret = fn(seatData, false);
    if (ret) {
        return 1;
    }
    return 0;
};
// 判断是不是碰碰胡
exports.is4Melds = function (seatData, checkJings, chupai) {
    if(chupai != -1){
        return 0;
    }
    var fn = function (seatData, jingMode) {
        var meldCount = 0;
        var pairCount = 0;
        var singleCount = 0;
        for (var k in seatData.countMap) {
            var c = seatData.countMap[k];
            if (c == 1) {
                singleCount++;
            }
            else if (c == 2) {
                pairCount++;
            }
            else if (c == 3) {
                meldCount++;
            }
            else if (c == 4) {
                meldCount++;
                singleCount++;
            }
        }
        //console.log("is4Melds:",singleCount,pairCount,meldCount)
        return pairCount == 1 && singleCount <= 0;
    };
    var ret = fn(seatData, false);
    if (ret) {
        return 1;
    }
    return 0;
};

//============== 对外的接口定义 laoli ================
//exports.checkSingle = checkSingle;
exports.isPingHuNew = isPingHuNew;
exports.checkSingle_Test = checkSingle_Test
exports.deepCopy =deepCopy
exports.deepCopyList =deepCopyList()
