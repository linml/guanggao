var crypto = require('../utils/crypto');
var express = require('express');
var http = require('../utils/http');
var roomMgr = require("./roommgr");
var userMgr = require("./usermgr");
var tokenMgr = require("./tokenmgr");
var fibers = require('fibers');

var app = express();
var config = null;

var serverIp = "";

//测试
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1');
    res.header("Content-Type", "application/json;charset=utf-8");
    fibers(function () {
        next();
    }).run();
});

app.get('/get_server_info', function (req, res) {
    var serverId = req.query.serverid;
    var sign = req.query.sign;
    // console.log(serverId);
    // console.log(sign);
    if (serverId != config.SERVER_ID || sign == null) {
        http.send(res, 1, "invalid parameters");
        return;
    }

    var md5 = crypto.md5(serverId + config.ROOM_PRI_KEY);
    if (md5 != sign) {
        http.send(res, 1, "sign check failed.");
        return;
    }

    var locations = roomMgr.getUserLocations();
    var arr = [];
    for (var userId in locations) {
        var roomId = locations[userId].roomId;
        arr.push(userId);
        arr.push(roomId);
    }
    http.send(res, 0, "ok", {userroominfo: arr});
});

app.get('/create_room', function (req, res) {
    var userId = parseInt(req.query.userid);
    var sign = req.query.sign;
    // 创建人的钻石个数
    var gems = req.query.gems;
    var conf = req.query.conf;
    if (userId == null || sign == null || conf == null) {
        http.send(res, 1, "invalid parameters");
        return;
    }

    var md5 = crypto.md5(userId + conf + gems + config.ROOM_PRI_KEY);
    if (md5 != req.query.sign) {
        console.log("invalid reuqest.");
        http.send(res, 1, "sign check failed.");
        return;
    }

    conf = JSON.parse(conf);
    var ret = roomMgr.createRoom(userId, conf, gems, serverIp, config.CLIENT_PORT);
    if (ret.errcode != 0 || ret.roomId == null) {
        http.send(res, ret.errcode, "create failed.");
        return;
    } else {
        http.send(res, 0, "ok", {roomid: ret.roomId});
    }
});

app.get('/enter_room', function (req, res) {
    var userId = parseInt(req.query.userid);
    var name = req.query.name;
    var roomId = req.query.roomid;
    var sign = req.query.sign;
    var userip = req.query.userip;
    if (userId == null || roomId == null || sign == null) {
        http.send(res, 1, "invalid parameters");
        return;
    }
    console.log("http_service enter_room", req.query);
    var md5 = crypto.md5(userId + name + roomId + config.ROOM_PRI_KEY);
    if (md5 != sign) {
        http.send(res, 2, "sign check failed.");
        return;
    }

    //安排玩家坐下
    var ret = roomMgr.enterRoom(roomId, userId, name, userip);
    if (ret != 0) {
        if (ret == 1) {
            http.send(res, 4, "room is full.");
        }
        else if (ret == 2) {
            http.send(res, 3, "can't find room.");
        }
        else if (ret == 3) {
            http.send(res, 5, "lacking gems");
        }
        else if (ret == 4) {
            http.send(res, 6, "ip conflict");
        }
        return;
    }

    var token = tokenMgr.createToken(userId, 5000);
    http.send(res, 0, "ok", {token: token});
});

app.get('/ping', function (req, res) {
    var sign = req.query.sign;
    var md5 = crypto.md5(config.ROOM_PRI_KEY);
    if (md5 != sign) {
        return;
    }
    http.send(res, 0, "pong");
});

app.get('/is_room_runing', function (req, res) {
    var roomId = req.query.roomid;
    var sign = req.query.sign;
    if (roomId == null || sign == null) {
        http.send(res, 1, "invalid parameters");
        return;
    }

    var md5 = crypto.md5(roomId + config.ROOM_PRI_KEY);
    if (md5 != sign) {
        http.send(res, 2, "sign check failed.");
        return;
    }

    //var roomInfo = roomMgr.getRoom(roomId);
    http.send(res, 0, "ok", {runing: true});
});

// app.get('/get_online_rooms', function (req, res) {
// 	var rooms = roomMgr.getOnlineRooms();
// 	http.send(res, 0, 'ok', { rooms: rooms });
// });

// app.get('/dissolve_online_room', function (req, res) {
// 	var roomId = req.query.room_id;
// 	var ret = roomMgr.doDissolve(roomId);
// 	http.send(res, 0, 'ok');
// });

/**
 * 获取在线房间和玩家
 */
app.get('/get_online_rooms_and_players', function (req, res) {
    var playing = parseInt(req.query.playing);
    playing = isNaN(playing) ? null : playing;

    var olRooms = roomMgr.getOnlineRooms(playing == 1);
    var olPlayers = userMgr.getOnlinePlayers();
    http.send(res, 0, 'ok', {rooms: olRooms, players: olPlayers});
});

/**
 * 获取getGlobalVar
 */

app.get('/save_gvar', function (req, res) {
    console.log(">>save_gvar==============")
    var datas = roomMgr.saveALLGVar();
    console.log(datas)
    http.send(res, 0, 'ok', {data: datas});
});

app.get('/restore_gvar', function (req, res) {
    console.log(">>restore_gvar==============")
    var datas = roomMgr.restoreALLGVar();
    console.log(datas)
    http.send(res, 0, 'ok', {data: datas});
});

var gameServerInfo = null;
var lastTickTime = 0;

//向大厅服定时心跳
function update() {
    if (lastTickTime + config.HTTP_TICK_TIME < Date.now()) {
        lastTickTime = Date.now();
        gameServerInfo.load = roomMgr.getTotalRooms();
        http.get(config.HALL_IP, config.HALL_PORT, "/register_gs", gameServerInfo, function (ret, data) {
            if (ret == true) {
                if (data.errcode != 0) {
                    console.log(data.errmsg);
                }
            }
            else {
                //
                lastTickTime = 0;
            }
        });

        var mem = process.memoryUsage();
        var format = function (bytes) {
            return (bytes / 1024 / 1024).toFixed(2) + 'MB';
        };
        //console.log('Process: heapTotal '+format(mem.heapTotal) + ' heapUsed ' + format(mem.heapUsed) + ' rss ' + format(mem.rss));
    }
}

exports.start = function ($config) {
    config = $config;

    //
    gameServerInfo = {
        id: config.SERVER_ID,
        clientip: config.CLIENT_IP,
        clientport: config.CLIENT_PORT,
        httpPort: config.HTTP_PORT,
        load: roomMgr.getTotalRooms(),
    };

    serverIp = config.CLIENT_IP;

    setInterval(update, 1000);
    app.listen(config.HTTP_PORT, config.FOR_HALL_IP);
    console.log("http service is listening on " + config.FOR_HALL_IP + ":" + config.HTTP_PORT);
};