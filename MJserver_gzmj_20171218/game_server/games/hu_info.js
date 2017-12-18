'use strict';

const LAI_ZI = 100; // 癞子牌。

class hu_info {
    constructor(pattern, jingMode) {
        this.pattern = pattern;
        this.jingMode = jingMode;
        this.baseScore = 0;
        this.isTongZhuang = 0;
        this.holds = [];
        this.chis = [];
        this.jingMap = [];
        this.appearJing = false;
        this.userCount = 4;
        this.index = 0;
        this.turn = 0;
        this.button = 0;
        this.paiXu = [];
        this.jiangs = [];
        this.kans = [];
        this.shuns = [];
        this.score = 0;
        this.eScore = 0;
        this.moPai = -1;
        this.chuPai = -1;
        this.isZiMo = false;
        this.isDeGuo = false;
        this.isDeZhongDe = false;
        this.isJingDiaoMode = false;
        this.isJingDiao = false;
        this.pai13Lan = [];
        this.pai6Pairs = [];
        this.is713Lan = false;
        this.isGangHua = false;
        this.isDianGangHua = false;
        this.dianGangHuaFrom = -1;
        this.isQiangGangHu = false;
        this.isTianHu = false;
        this.isDiHu = false;
    }

    push(pai) {
        this.paiXu.push(pai);
    }

    addJiang(jiang) {
        this.jiangs.push(jiang);
    }

    addKan(kan) {
        this.kans.push(kan);
    }

    addShun(shun) {
        this.shuns.push(shun);
    }

    addPair(pair) {
        this.pai6Pairs.push(pair);
    }

    add13LanPai(pai13Lan) {
        this.pai13Lan = pai13Lan;
    }

    setBaseInfo(baseScore, isTongZhuang, holds, chis, chuPai, jingMap, appearJing) {
        this.baseScore = baseScore;
        this.isTongZhuang = isTongZhuang;
        this.holds = this.clone(holds);
        this.chis = this.clone(chis);
        this.chuPai = chuPai;
        this.jingMap = this.clone(jingMap);
        this.appearJing = appearJing;
    }

    setSeatInfo(userCount, index, turn, button) {
        this.userCount = userCount;
        this.index = index;
        this.turn = turn;
        this.button = button;
    }

    setTianDiHuInfo(isTianHu, isDiHu) {
        this.isTianHu = isTianHu;
        this.isDiHu = isDiHu;
    }

    setGangInfo(isGangHua, isDianGangHua, dianGangHuaFrom, isQiangGangHu) {
        this.isGangHua = isGangHua;
        this.isDianGangHua = isDianGangHua;
        this.dianGangHuaFrom = dianGangHuaFrom;
        this.isQiangGangHu = isQiangGangHu;
    }

    has7XingPai() {
        for (var p = 27; p <= 33; p++) {
            if (this.holds.indexOf(p) == -1) {
                return false;
            }
        }
        return true;
    }

    parsePattern() {
        this.score = 0;
        this.eScore = 0;
        this.moPai = -1;
        this.isZiMo = false;
        this.isDeGuo = false;
        this.isDeZhongDe = false;
        this.isJingDiaoMode = false;
        this.isJingDiao = false;
        if (this.chuPai == -1) {
            this.isZiMo = true;
            this.moPai = this.holds[this.holds.length - 1];
        }
        if (!this.jingMode) {
            this.isDeGuo = true;
            if (this.appearJing != true) {
                this.isDeZhongDe = true;
            }
        }
        if (this.pattern != "13lan") {
            if (this.moPai != -1) {
                if (this.jingMode) {
                    if (this.jingMap[this.moPai]) {
                        if (this.jiangs[0] == LAI_ZI && this.jiangs[1] == LAI_ZI) {
                            this.isJingDiaoMode = true;
                        }
                    } else {
                        if ((this.jiangs[0] == LAI_ZI && this.jiangs[1] == this.moPai)
                            || (this.jiangs[1] == LAI_ZI && this.jiangs[0] == this.moPai)) {
                            this.isJingDiaoMode = true;
                        }
                    }
                } else {
                    if (this.jiangs[0] == this.moPai && this.jingMap[this.moPai]) {
                        this.isJingDiaoMode = true;
                    }
                }
            } else if (this.chuPai != -1) {
                if (this.jingMode) {
                    if ((this.jiangs[0] == LAI_ZI && this.jiangs[1] == this.chuPai)
                        || (this.jiangs[1] == LAI_ZI && this.jiangs[0] == this.chuPai)) {
                        this.isJingDiaoMode = true;
                    }
                } else {
                    if (this.jiangs[0] == this.chuPai && this.jingMap[this.chuPai]) {
                        this.isJingDiaoMode = true;
                    }
                }
            }
        } else {
            if ((this.pai13Lan && this.pai13Lan[3] && this.pai13Lan[3].length == 7)
                || this.has7XingPai() == true) {
                this.is713Lan = true;
            }
        }
        if (this.pattern == "normal") { // 升级为大7对。
            if ((this.chis == null || this.chis.length <= 0) && (this.shuns == null || this.shuns.length <= 0)) {
                this.pattern = "big7pairs";
            }
        }
        if (this.isZiMo && this.isJingDiaoMode) {
            this.isJingDiao = true;
        }
        return this.isJingDiao;
    }

    calculate(hasJingDiao) {
        if (this.pattern != "normal" || this.isDeGuo == true) {
            this.isJingDiao = hasJingDiao;
        }
        var baseScore = [0, 0, 0, 0];
        for (var s = 0; s < this.userCount; ++s) {
            baseScore[s] = this.baseScore;
            if (this.isTongZhuang == 0) {
                baseScore[s] *= 2;
            } else if (this.isTongZhuang == 1 && this.button == s) {
                baseScore[s] *= 2;
            }
        }
        var c = 0;
        if (this.isTianHu) {
            for (c = 0; c < this.userCount; c++) {
                if (c == this.index) {
                    continue;
                }
                this.score += (16 * baseScore[this.index]);
            }
            this.eScore = this.score;
        } else if (this.isDiHu) {
            for (c = 0; c < this.userCount; c++) {
                if (c == this.index) {
                    continue;
                }
                this.score += (16 * baseScore[c]);
            }
            this.eScore = this.score;
        } else {
            var fanBei = 1;
            var eFanBei = 1;
            var deGuoJiaFen = 0;
            if (this.pattern == "7pairs") {
                fanBei *= 2;
            } else if (this.pattern == "big7pairs") {
                fanBei *= 4;
            } else if (this.pattern == "13lan") {
                fanBei *= 2;
                if (this.is713Lan) {
                    fanBei *= 2;
                }
            }
            if (this.isDeGuo) {
                fanBei *= 2;
                deGuoJiaFen = 5;
                if (this.isDeZhongDe) {
                    fanBei *= 2;
                }
            }
            if (this.isJingDiao) {
                fanBei *= 2;
            } else {
                if (this.isJingDiaoMode) {
                    eFanBei = 4; // 自摸 x 2，精钓 x 2。
                }
            }
            if (this.isGangHua || this.isDianGangHua) {
                fanBei *= 2;
            }
            if (this.isQiangGangHu) {
                fanBei *= 2;
            }
            if (this.isZiMo) {
                fanBei *= 2;
                if (this.index == this.button) {
                    for (c = 0; c < this.userCount; c++) {
                        if (c == this.index) {
                            continue;
                        }
                        this.score += (baseScore[this.index] * fanBei + deGuoJiaFen);
                    }
                } else {
                    for (c = 0; c < this.userCount; c++) {
                        if (c == this.index) {
                            continue;
                        }
                        this.score += (baseScore[c] * fanBei + deGuoJiaFen);
                    }
                }
                this.eScore = this.score;
            } else {
                if (this.index == this.button) {
                    for (c = 0; c < this.userCount; c++) {
                        if (c == this.index) {
                            continue;
                        } else if (c == this.turn) {
                            this.score += (baseScore[this.index] * 2 * fanBei + deGuoJiaFen);
                            this.eScore += (baseScore[this.index] * fanBei * eFanBei + deGuoJiaFen);
                        } else {
                            this.score += (baseScore[this.index] * fanBei);
                            this.eScore += (baseScore[this.index] * fanBei * eFanBei + deGuoJiaFen);
                        }
                    }
                } else {
                    for (c = 0; c < this.userCount; c++) {
                        if (c == this.index) {
                            continue;
                        } else if (c == this.turn) {
                            this.score += (baseScore[c] * 2 * fanBei + deGuoJiaFen);
                            this.eScore += (baseScore[c] * fanBei * eFanBei + deGuoJiaFen);
                        } else {
                            this.score += (baseScore[c] * fanBei);
                            this.eScore += (baseScore[c] * fanBei * eFanBei + deGuoJiaFen);
                        }
                    }
                }
            }
        }
    }

    isPingHuReally() {
        if (this.isTianHu || this.isDiHu) {
            return false;
        }
        if (this.pattern == "13lan") {
            return false;
        }
        if (this.pattern == "7pairs") {
            return false;
        }
        if (this.pattern == "big7pairs") {
            return false;
        }
        if (this.isGangHua || this.isDianGangHua) {
            return false;
        }
        if (this.isQiangGangHu) {
            return false;
        }
        if (this.isDeGuo) {
            return false;
        }
        return true;
    }

    isCanHu() {
        if (this.isDiHu) { // 如果是地胡，则让胡。
            return true;
        }
        return !(this.isJingDiaoMode && !this.isZiMo);
    }

    displayInfo() {
        console.log("-----------------------------------------");
        console.log("pattern:", this.pattern);
        console.log("jingMode:", this.jingMode);
        console.log("paiXu:", this.paiXu);
        console.log("jiangs:", this.jiangs);
        for (var k = 0; k < this.kans.length; k++) {
            console.log("kans:", k, this.kans[k]);
        }
        for (var s = 0; s < this.shuns.length; s++) {
            console.log("shuns:", s, this.shuns[s]);
        }
        for (var t = 0; t < this.pai13Lan.length; t++) {
            console.log("pai13Lan:", t, this.pai13Lan[t]);
        }
        for (var p = 0; p < this.pai6Pairs.length; p++) {
            console.log("pairs:", p, this.pai6Pairs[p]);
        }
        console.log("baseScore:", this.baseScore);
        console.log("holds:", this.holds);
        console.log("chuPai:", this.chuPai);
        console.log("isZiMo:", this.isZiMo);
        console.log("isDeGuo:", this.isDeGuo);
        console.log("isJingDiaoMode:", this.isJingDiaoMode);
        console.log("isJingDiao:", this.isJingDiao);
        console.log("eScore:", this.eScore);
        console.log("score:", this.score);
    }

    clone(source) {
        let result = {};
        if (source instanceof Array) {
            result = [];
            for (let i = 0; i < source.length; i++) {
                if (typeof(source[i]) == 'object') {
                    result.push(this.clone(source[i]));
                } else {
                    result.push(source[i]);
                }
            }
        } else {
            for (let key in source) {
                if (typeof(source[key]) == 'object') {
                    result[key] = this.clone(source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }

    // 得到各个牌的字面值
    getPoint(pai) {
        return (pai % 9) + 1;
    }

    // 判断牌的类型
    getMJType(id) {
        if (id >= 0 && id < 9) { // 筒
            return 0;
        } else if (id >= 9 && id < 18) { // 条
            return 1;
        } else if (id >= 18 && id < 27) { // 万
            return 2;
        } else if (id >= 27 && id < 34) { // 字
            return 3;
        }
    }

    // 十三烂胡型牌的显示
    gen13lanDisplay() {
        var displayArr = [];
        var jingPosition = [];
        var huPaiPosition = -1;
        var jings = [];
        var jingIndex = 0;
        var isFiltered = false;
        var self = this;
        jings = this.pai13Lan[4];
        var pushJing = function () {
            if (jingIndex < jings.length) {
                jingPosition.push(displayArr.length);
                displayArr.push(jings[jingIndex]);
                jingIndex++;
            }
        };
        var pushPai = function (pai) {
            displayArr.push(pai);
        };
        for (var t = 0; t < this.pai13Lan.length - 1; t++) {
            var typePai = this.pai13Lan[t];
            if (typePai && typePai.length > 0) {
                typePai.sort(function (a, b) {
                    return a >= b ? 1 : -1;
                });
                if (t == 3) {
                    for (var f = 0; f < 7; f++) {
                        if (f < typePai.length) {
                            pushPai(typePai[f]);
                        } else {
                            pushJing();
                        }
                    }
                } else {
                    switch (typePai.length) {
                        case 1: {
                            var pai1 = typePai[0];
                            var pai1V = this.getPoint(pai1);
                            if (1 <= pai1V && pai1V <= 3) {
                                pushPai(pai1);
                                pushJing();
                                pushJing();
                            } else if (4 <= pai1V && pai1V <= 6) {
                                pushJing();
                                pushPai(pai1);
                                pushJing();
                            } else if (7 <= pai1V && pai1V <= 9) {
                                pushJing();
                                pushJing();
                                pushPai(pai1);
                            }
                            break
                        }
                        case 2: {
                            var pai2 = typePai[0];
                            var pai2V = this.getPoint(pai2);
                            var dis2V = Math.abs(typePai[0] - typePai[1]);
                            if (dis2V >= 6) {
                                pushPai(typePai[0]);
                                pushJing();
                                pushPai(typePai[1]);
                            } else {
                                if (1 <= pai2V && pai2V <= 3) {
                                    pushPai(typePai[0]);
                                    pushPai(typePai[1]);
                                    pushJing();
                                } else if (4 <= pai2V && pai2V <= 6) {
                                    pushJing();
                                    pushPai(typePai[0]);
                                    pushPai(typePai[1]);
                                } else if (7 <= pai2V && pai2V <= 9) {
                                    console.log("ERROR...");
                                }
                            }
                            break
                        }
                        case 3: {
                            pushPai(typePai[0]);
                            pushPai(typePai[1]);
                            pushPai(typePai[2]);
                            break
                        }
                    }
                }
            } else {
                pushJing();
                pushJing();
                pushJing();
            }
        }
        if (this.isZiMo) {
            huPaiPosition = displayArr.indexOf(this.moPai);
        } else {
            if (this.jingMap[this.chuPai]) {
                for (var c = 0; c < displayArr.length; c++) {
                    if (this.chuPai == displayArr[c]) {
                        if (jingPosition.indexOf(c) == -1) {
                            huPaiPosition = c;
                            break;
                        }
                    }
                }
            } else {
                huPaiPosition = displayArr.indexOf(this.chuPai);
            }
        }
        return {
            displayArr: displayArr,
            jingPosition: jingPosition,
            huPaiPosition: huPaiPosition
        };
    }

    // 生成胡牌的显示信息
    genCommonDisplay() {
        var displayArr = this.clone(this.paiXu);
        var jingPosition = [];
        var huPaiPosition = -1;
        var jings = [];
        var jingIndex = 0;
        var isFiltered = false;
        for (var i = 0; i < this.holds.length; i++) {
            var pai = this.holds[i];
            if (this.jingMap[pai] == true) {
                if (this.chuPai == pai && isFiltered != true) {
                    isFiltered = true;
                } else {
                    jings.push(pai);
                }
            }
        }
        var huPai = -1;
        if (this.isZiMo) {
            huPai = this.moPai;
        } else {
            huPai = this.chuPai;
        }
        // if (this.isJingDiao) {
        //     if (this.jingMap[huPai]) {
        //         var d = jings.indexOf(huPai);
        //         jings.splice(d, 1);
        //         displayArr[0] = huPai;
        //         huPaiPosition = 0;
        //         jingPosition.push(0);
        //         if (this.isDeGuo) {
        //             jingPosition.push(1);
        //         }
        //     } else {
        //         if (displayArr[1] == huPai) {
        //             huPaiPosition = 1;
        //         } else if (displayArr[0] == huPai) {
        //             huPaiPosition = 0;
        //         }
        //     }
        // }
        for (var j = 0; j < displayArr.length; j++) {
            if (displayArr[j] == LAI_ZI) {
                displayArr[j] = jings[jingIndex++];
                // jingPosition.push(j);
            }
        }
        huPaiPosition = displayArr.indexOf(huPai);
        for (var k = 0; k < displayArr.length; k++) {
            var pai = displayArr[k];
            if (jings.indexOf(pai) != -1) {
                if (this.isZiMo != true && k == huPaiPosition) {
                    continue;
                }
                jingPosition.push(k);
            }
        }
        return {
            displayArr: displayArr,
            jingPosition: jingPosition,
            huPaiPosition: huPaiPosition
        };
    }

    genShowInfo() {
        if (this.pattern == '13lan') {
            return this.gen13lanDisplay();
        } else {
            return this.genCommonDisplay();
        }
    }

}

module.exports = hu_info;