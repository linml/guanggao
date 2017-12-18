// call the tms service，时间卡服务接口
// 	by guolin 170902

var http = require("../utils/http");
var config = null
var tms_ip = null
var tms_port = null

exports.init = function ($configin) {
    console.log("init tms.");
    config = $configin;
    tms_ip = config.TMS_IP;
    tms_port = config.TMS_PORT;
};

var cnt = 0;
exports.test = function () {
    cnt = cnt + 1;
    return cnt
};

exports.add_start_timeInt = function ($roomInfoIn) {
    var roomInfo = $roomInfoIn;
    var reqdata = {
        roomId: roomInfo.id,
        user_id: roomInfo.creator,
        time_number: roomInfo.conf.time_card_number
    };
    http.get2("http://" + tms_ip + ":" + tms_port + "/add_start_timeInt", reqdata, function (data, json) {
        console.log(data);
        if (data == true) {
            console.log("add start time success");
        } else {
            console.log('add start failed' + data);
        }
    });
};

exports.gameOverInt = function ($roomInfoIn, forceEnd) {
    var roomInfo = $roomInfoIn;
    if (forceEnd == null) {
        forceEnd = false;
    }
    var textdata = {
        roomId: roomInfo.id,
        forceEnd: forceEnd
    };
    var ret = http.getSync("http://" + tms_ip + ":" + tms_port + "/all_end_timeInt", textdata, false);
    console.log(ret);
    if (ret.data != null) {
        if (ret.data.isEnd) {
            return true;
        }
    }
    return false;
};
