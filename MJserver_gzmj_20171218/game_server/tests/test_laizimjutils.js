var laizimjutils = require('../games/laizimjutils');
var gzcgutils = require('../games/gamemgr_gzmj');
// var laizimjutils = require('../games/laizimjutils_nkbh');
// var gzcgutils = require('../games/gamemgr_nkbh');
var test_data = require("./test_data");

function test_checkCanHu(type, laiZis, hodls, daChuDePai) {
    console.log("test_checkCanHu start.");
    var sTime = Date.now();
    console.log("   time:", new Date());
    console.log("   sTime:", sTime);
    console.log("   type:", type);
    console.log("   laiZis:", laiZis);
    console.log("   holds:", hodls);
    console.log("   daChuDePai:", daChuDePai);
    var data = {};
    data.holds = hodls;
    data.que = -1;
    data.countMap = {};
    for (var i = 0; i < data.holds.length; i++) {
        var pai = data.holds[i];
        var c = data.countMap[pai];
        if (c == null) {
            c = 0;
        }
        data.countMap[pai] = c + 1;
    }
    data.chis = [];
    data.pengs = [];
    data.angangs = [];
    data.wangangs = [];
    data.diangangs = [];
    data.seatIndex = 0;
    data.lastFangGangSeat = -1;
    data.game = {};
    data.game.appearJing = true;
    data.game.currentUsercnt = 4;
    data.game.turn = 0;
    data.game.button = 0;
    data.game.jingMap = laiZis;
    data.game.conf = {baseScore: 1, shifoutongzhuang: 0};
    data.game.conf.type = type;
    //\var paiXu = laizimjutils.checkCanHu(laiZis, data, daChuDePai,true);
    //var paiXu = gzcgutils.is7Pairs( data, true,daChuDePai);
    // var paiXu = gzcgutils.is6PairsEx( data, -1);
    //var paiXu = gzcgutils.Opt_isIfJingBiDiaoOnCanHu( data, true,daChuDePai);
    var sTime1 = Date.now();
    // var paiXu = laizimjutils.isPingHuNew( data, true, daChuDePai);      //game, seatData, targetPai,jingmode
//    var paiXu = laizimjutils.scanPingHuPattern( data, true, daChuDePai);      //game, seatData, targetPai,jingmode
//     var pattern = laizimjutils.scan13LanPattern(data, true, daChuDePai);      //game, seatData, targetPai,jingmode
//     var pattern = laizimjutils.scan7pairsPattern(data, true, daChuDePai);      //game, seatData, targetPai,jingmode
        var pattern = gzcgutils.checkCanHuExt(data.game, data, daChuDePai, true);
    var sTime2 = Date.now();
    console.log("   consume:", sTime2 - sTime1, "ms");
    console.log("   hi pattern:", pattern);
    console.log("   ShowInfo:", pattern != null ? pattern.genShowInfo() : null);
    // if (pattern) {
    //     for (var j = 0; j < pattern.length; j++) {
    //         pattern[j].displayInfo();
    //     }
    // }
//     var sTime1 = Date.now();
//     // var paiXu = laizimjutils.isPingHuNew( data, true, daChuDePai);      //game, seatData, targetPai,jingmode
// //    var paiXu = laizimjutils.scanPingHuPattern( data, true, daChuDePai);      //game, seatData, targetPai,jingmode
//     var pattern2 = laizimjutils.scan13LanPattern(data, false, daChuDePai);      //game, seatData, targetPai,jingmode
// //     var pattern = gzcgutils.checkCanHuEx(data.game, data, daChuDePai, true);
//     var sTime2 = Date.now();
//     console.log("   consume:", sTime2 - sTime1, "ms");
//     console.log("   pattern2:", pattern2);
//     if (pattern2) {
//         for (var j = 0; j < pattern2.length; j++) {
//             pattern2[j].displayInfo();
//         }
//     }
//    var sTime3 = Date.now();
//    var paiXu = laizimjutils.scanPingHuPattern( data, false, daChuDePai);      //game, seatData, targetPai,jingmode
//    var sTime4 = Date.now();
//    console.log("   consume:", sTime4 - sTime3, "ms");
    //var paiXu = laizimjutils.MatchFengOXX( data, daChuDePai,true);      //game, seatData, targetPai,jingmode
    // var paiXu = laizimjutils.checkSingle_Test( data, true, data.game.jingMap, daChuDePai);      //game, seatData, targetPai,jingmode

    //var paiXu = gzcgutils.testcheckCanDoChi(data.game,data,daChuDePai)

//    console.log("   paiXu:", paiXu);
    var eTime = Date.now();
    console.log("   eTime:", eTime);
    console.log("   consumeTime:", eTime - sTime, "ms");
    console.log("test_checkCanHu end.");
}
function test_main() {
    console.log("test main start.");
    var laizimjutils_test_data = test_data.get_laizimjutils_test_data();
    for (var index = 0; index < laizimjutils_test_data.length; index++) {
        var test_data_node = laizimjutils_test_data[index];
        console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
        console.log("test index:", index);
        var daChuDePai = test_data_node.daChuDePai;
        test_checkCanHu(test_data_node.type, test_data_node.laiZis, test_data_node.holds, daChuDePai == null ? -1 : daChuDePai);
        console.log("------------------------------------------------------------------");
    }
    console.log("test main end.");
}

test_main();
