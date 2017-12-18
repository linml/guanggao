var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/dbsync');
var http = require('../utils/http');
var fibers = require('fibers');
var email_manage = require('./email_manage');
var txh = require('./txhports');
var app = express();

var hallIp = null;
var config = null;
var rooms = {};
var serverMap = {};
var roomIdOfUsers = {};

//设置跨域访问
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

app.get('/register_gs', function (req, res) {
    var ip = req.get('X-Real-IP');
    if (ip == null || ip == '') {
        ip = req.ip;
    }
    if (ip.indexOf("::ffff:") != -1) {
        ip = ip.substr(7);
    }
    var clientip = req.query.clientip;
    var clientport = req.query.clientport;
    var httpPort = req.query.httpPort;
    var load = req.query.load;
    var id = clientip + ":" + clientport;

    if (serverMap[id]) {
        var info = serverMap[id];
        if (info.clientport != clientport
            || info.httpPort != httpPort
            || info.ip != ip
        ) {
            console.log("duplicate gsid:" + id + ",addr:" + ip + "(" + httpPort + ")");
            http.send(res, 1, "duplicate gsid:" + id);
            return;
        }
        info.load = load;
        http.send(res, 0, "ok", {ip: ip});
        return;
    }
    var url = 'http://' + ip + ':' + httpPort;
    serverMap[id] = {
        ip: ip,
        id: id,
        clientip: clientip,
        clientport: clientport,
        httpPort: httpPort,
        url: url,
        load: load
    };
    http.send(res, 0, "ok", {ip: ip});
    console.log("game server registered.\n\tid:" + id + "\n\taddr:" + ip + "\n\thttp port:" + httpPort + "\n\tsocket clientport:" + clientport);

    var reqdata = {
        serverid: id,
        sign: crypto.md5(id + config.ROOM_PRI_KEY)
    };
    //获取服务器信息
    var ret = http.getSync(url + "/get_server_info", reqdata);
    if (ret && ret.data.errcode == 0) {
        for (var i = 0; i < data.userroominfo.length; i += 2) {
            var userId = data.userroominfo[i];
            var roomId = data.userroominfo[i + 1];
        }
    }
});

function chooseServer() {
    var serverinfo = null;
    for (var s in serverMap) {
        var info = serverMap[s];
        if (serverinfo == null) {
            serverinfo = info;
        } else {
            if (serverinfo.load > info.load) {
                serverinfo = info;
            }
        }
    }
    return serverinfo;
}

exports.createRoom = function (account, userId, roomConf) {
    var serverinfo = chooseServer();
    if (serverinfo == null) {
        return [101, null];
    }

    var data = db.get_gems(account);
    if (data == null) {
        return [103, null];
    }

    //2、请求创建房间
    var reqdata = {
        userid: userId,
        gems: data.gems,
        conf: roomConf
    };
    reqdata.sign = crypto.md5(userId + roomConf + data.gems + config.ROOM_PRI_KEY);
    var ret = http.getSync(serverinfo.url + "/create_room", reqdata);
    if (ret == null || ret.err || ret.data == null) {
        return [102, null];
    }
    if (ret.data.errcode == 0) {
        return [0, ret.data.roomid];
    } else {
        return [ret.data.errcode, null];
    }
};

exports.enterRoom = function (userId, name, roomId, userip) {
    var reqdata = {
        userid: userId,
        name: name,
        roomid: roomId,
        userip: userip,
    };
    reqdata.sign = crypto.md5(userId + name + roomId + config.ROOM_PRI_KEY);

    var checkRoomIsRuning = function (serverinfo, roomId) {
        var sign = crypto.md5(roomId + config.ROOM_PRI_KEY);
        var ret = http.getSync(serverinfo.url + "/is_room_runing", {roomid: roomId, sign: sign});
        if (ret == null || ret.err || ret.data == null) {
            return false;
        }
        return ret.data.errcode == 0 && ret.data.runing == true;
    }

    var enterRoomReq = function (serverinfo) {
        var ret = http.getSync(serverinfo.url + "/enter_room", reqdata);
        if (ret == null || ret.err || ret.data == null) {
            return [-1, null];
        }
        if (ret.data.errcode == 0) {
            db.set_room_id_of_user(userId, roomId);
            var rd = {
                ip: serverinfo.clientip,
                port: serverinfo.clientport,
                token: ret.data.token
            }
            return [0, rd];
        } else {
            if (ret.data.errcode == 3) {	// laoli add 1026 ,房间不存在了
                console.log(">>[hall] enterRoom, warn, 房间不存在了, then clear roomid of user,", userId, roomId)
                db.set_room_id_of_user(userId, roomId);
            }
            console.log(ret.data.errmsg);
            return [ret.data.errcode, null];
        }
    };

    var addr = db.get_room_addr(roomId);
    if (!addr) {
        return [-2, null];
    }

    var id = addr.ip + ":" + addr.port;
    var serverinfo = serverMap[id];
    //进入房间
    if (serverinfo) {
        return enterRoomReq(serverinfo);
    }
    //没有适合的游戏服务器，则等待
    return [-1, null];
};

exports.isServerOnline = function (ip, port) {
    var id = ip + ":" + port;
    var serverInfo = serverMap[id];
    if (!serverInfo) {
        return false;
    }
    var sign = crypto.md5(config.ROOM_PRI_KEY);
    var ret = http.getSync(serverInfo.url + "/ping", {sign: sign});
    if (ret == null || ret.err || ret.data == null) {
        return false;
    }
    return true;
};

function getNumOfPlayingRooms() {
    var sum = 0;
    for (var idx in serverMap) {
        var serverInfo = serverMap[idx];
        if (serverInfo) {
            sum += parseInt(serverInfo.load);
        }
    }

    return sum;
};

/*
 app.get('/get_num_of_playing_rooms', function (req, res) {
 var num = getNumOfPlayingRooms();
 http.send(res,
 0,
 'ok',
 { num: num });
 });
 */
////////////////==================================////////////////////////////////
//gps定位；数据计算 guolin  11/9
//计算两人之间的距离：
function toRad(d) {
    return d * Math.PI / 180;
}
function getDistance(lat1, lng1, lat2, lng2) { //lat为纬度, lng为经度, 一定不要弄错
    var dis = 0;
    var radLat1 = toRad(lat1);
    var radLat2 = toRad(lat2);
    var deltaLat = radLat1 - radLat2;
    var deltaLng = toRad(lng1) - toRad(lng2);
    var dis = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(deltaLat / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(deltaLng / 2), 2)));
    return dis * 6378137;
}
//计算房间中两个人之间的距离；
app.get('/get_distance_two', function (req, res) {
    var roomId = req.query.roomId;
    if (roomId == null) {
        var data = {code: 103};
        http.send(res, 103, '入参错误');
        return;
    }
    var s_ret = db.get_room_data(roomId);
    if (!s_ret) {
        return false;
    }
    var alldata = {desData1: {userid1: null, userid2: null, des: null}}
    var userIds = [];
    if (s_ret && s_ret.user_id0) {
        userIds.push(s_ret.user_id0)
    }
    if (s_ret.user_id1) {
        userIds.push(s_ret.user_id1)
    }
    if (s_ret.user_id2) {
        userIds.push(s_ret.user_id2)
    }
    if (s_ret.user_id3) {
        userIds.push(s_ret.user_id3)
    }
    console.log('user_id>>>', userIds);
    var user_datas = [];
    var t_users = {}
    var info_datas = '';
    var not_num = 0;
    for (var i = 0; i < userIds.length; i++) {
        var user_data = db.get_user_data_by_userid(userIds[i]);
        // console.log('user_data>>',user_data);
        if (!user_data) {
            return false;
        }
        var user_adds = email_manage.search_user_addr(userIds[i]);
        // console.log('user_adds>>',user_adds);
        if (!user_adds) {
            return false;
        }
        //var index = i;
        var string = 'user';
        var Sum = string + i
        var adds = 'adds';
        if (user_data && user_data.userid && user_data.name) {
            t_users[Sum] = {userid: user_data.userid, name: user_data.name}
        }
        if (user_adds && user_adds.latitude && user_adds.lontitude) {
            t_users[Sum][adds] = {lat: user_adds.latitude, lng: user_adds.lontitude};
        } else if (user_adds && (user_adds.code == 10001 || !user_adds.latitude || !user_adds.lontitude)) {
            console.log('不能获取玩家' + user_data.name + "地址信息！");
            if (user_data.name) {
                info_datas += "\n无法获取【" + user_data.name + "】的当前位置信息！";   //laoli 1130
            }
            not_num++;
        }
    }
    if ((userIds.length == 2 && not_num == 2) || (userIds.length == 3 && not_num >= 2) || (userIds.length == 4 && not_num >= 3)) {
        http.send(res, 10003, {msg: info_datas});
        return;
    }
    var end_data = [];
    console.log('t_users', t_users);
    for (var i = 0; i < userIds.length; i++) {
        if (t_users[string + i].adds && t_users[string + i].adds.lat && t_users[string + i].adds.lng) {
            var lat1 = t_users[string + i].adds.lat;
            var lng1 = t_users[string + i].adds.lng;
            var userid1 = t_users[string + i].userid;
            var name1 = t_users[string + i].name;
            for (var j = i + 1; j < userIds.length; j++) {
                if (t_users[string + j].adds && t_users[string + j].adds.lat && t_users[string + j].adds.lng) {
                    var userid2 = t_users[string + j].userid;
                    var name2 = t_users[string + j].name;
                    var lat2 = t_users[string + j].adds.lat;
                    var lng2 = t_users[string + j].adds.lng;
                    //console.log('fff',lat1,lng1,lat2,lng2);
                    var dis = getDistance(lat1, lng1, lat2, lng2);
                    end_data.push({userid1: userid1, name1: name1, userid2: userid2, name2: name2, dis: dis});
                    //console.log('dis>>>>>>>>>',dis);
                } else {
                    console.log(t_users[string + j].name + '地址信息不存在!');
                }
            }
        } else {
            console.log(t_users[string + i].name + '地址信息不存在!');
        }
    }
    console.log('end_data>>>', end_data);
    var send_data = [];
    for (var i = 0; i < end_data.length; i++) {
        console.log('parseInt(end_data[i].dis)>>', parseInt(end_data[i].dis));
        if (parseInt(end_data[i].dis) < 50) {
            send_data.push(end_data[i]);
            var t_res = email_manage.add_user_dis(end_data[i].userid1, end_data[i].name1, end_data[i].userid2, end_data[i].name2, end_data[i].dis);
            if (t_res) {
                console.log('添加两玩家的距离成功！');
            } else {
                console.log('添加两玩家的距离失败！');
            }
        }
    }
    if (send_data.length == 1) {
        var s_data = {msg: send_data[0].name1 + "与" + send_data[0].name2 + "距离很近了哦！\n" + info_datas};
        http.send(res, 10000, s_data);
        return;
    }
    else if (send_data.length == 2) {
        var s_data1 = {msg: send_data[0].name1 + "与" + send_data[0].name2 + "距离很近了哦！\n" + send_data[1].name1 + "与" + send_data[1].name2 + "距离也很近了哦！\n" + info_datas};
        http.send(res, 10002, s_data1);
        return;
    }
    else if (send_data.length >= 3) {
        var s_data = {msg: "您们几个玩家距离都很近哦！\n" + info_datas};
        http.send(res, 10003, s_data);
        return;
    }
    else {
        // var s_data = {msg:"数据正常！"};
        http.send(res, 101);
        return;
    }
})
//测试用
// app.get('/test_adds',function(req,res){
//     var user_id = req.query.user_id;
//     var userdata = email_manage.search_user_addr(user_id);
//     console.log('userdata>>',userdata);
//     http.send(res , 100, userdata);
//     return;
// })
//===========供分享系統使用获取用户信息=====================
app.get('/in_get_user_besInfo', function (req, res) {
    var unionid = req.query.unionid;
    var account = 'wx_' + unionid;
    var data = db.get_user_data(account);
    if (!data || data == null) {
        http.send(res, 102, "can't find user by given unionid.");
        return;
    }
    http.send(res, 100, 'ok', {
        user_id: data.userid,
        coins: data.coins,
        gems: data.gems,
        create_time: data.create_time
    });
});

app.get('/in_get_room_user_info', function (req, res) {
    var roomid = req.query.roomid;
    //var datas = db.get_room_data(roomid);
    var roomuuid = db.get_room_uuid(roomid);
    db.search_room_history(roomid, function (data) { //change gl 11/21
        if (data && data.code && data.code == 100) {
            var all_datas = [];
            var datas = data.history_data[0];
            all_datas.push(datas);
            var userid = [];
            if (datas && datas.user_id0) {
                userid.push(datas.user_id0)
            }
            if (datas && datas.user_id1) {
                userid.push(datas.user_id1)
            }
            if (datas && datas.user_id2) {
                userid.push(datas.user_id2)
            }
            if (datas && datas.user_id3) {
                userid.push(datas.user_id3)
            }
            var user_datas = [];
            for (var i = 0; i < userid.length; i++) {
                var user_data = db.get_user_data_by_userid(userid[i]);
                var account = user_data.account;
                var new_user_data = txh.get_user_info_by_account(account);
                if (new_user_data) {
                    user_data.add_user_info = new_user_data;
                }
                user_datas.push(user_data);
            }
            if (datas && datas.creator) {//add gl 11/15
                var creator_id = datas.creator;
                var creat_data = db.get_user_data_by_userid(creator_id);
                var ct_account = creat_data.account;//11、14 add gl 添加房主的登录信息
                var ct_data = txh.get_user_info_by_account(ct_account);//11、14 add gl
                if (ct_data) {
                    creat_data.add_user_info = ct_data;
                }
                var str1 = 'creator_data';
                var str2 = 'user_datas';
                all_datas[0][str1] = creat_data;
                all_datas[0][str2] = user_datas;
                http.send(res, 100, all_datas);
                return;
            } else {
                http.send(res, 101, 'data err');
                return
            }
        }
    })

});

exports.start = function ($config) {
    config = $config;
    app.listen(config.ROOM_PORT, config.FOR_ROOM_IP);
    console.log("room service is listening on " + config.FOR_ROOM_IP + ":" + config.ROOM_PORT);
};

//========================给牌友会积分排名发邮件使用=add gl 12/16======================================
app.get('/to_send_email_three',function(req,res,http){
    txh.to_send_email_three(function(data){
        console.log('查询牌友会积分排名前三的成员data>>',data);
        if(data && data.code == 100){
            if(data.msg){
                var additional_message = null;
                var user_datas = data.msg;
                var send_user_id = 100100;
                var email_title = '牌友会积分奖励';
                for(var i = 0;i< user_datas.length; i++){
                    if(i == 0){
                        var accept_user_id = user_datas[0].user_id;
                        var send_msg = '您在牌友会的活跃积分排名中获取了第一名，你可以联系微信客服领取奖励哦！';
                        email_manage.in_to_send_email(send_user_id,accept_user_id,send_msg,email_title,additional_message)
                    }else if(i == 1){
                        var accept_user_id = user_datas[1].user_id;
                        var send_msg = '您在牌友会的活跃积分排名中获取了第二名，你可以联系微信客服领取奖励哦！';
                        email_manage.in_to_send_email(send_user_id,accept_user_id,send_msg,email_title,additional_message)
                    }else if(i == 2){
                        var accept_user_id = user_datas[2].user_id;
                        var send_msg = '您在牌友会的活跃积分排名中获取了第三名，你可以联系微信客服领取奖励哦！';
                        email_manage.in_to_send_email(send_user_id,accept_user_id,send_msg,email_title,additional_message)
                    }
                }
                http.send(res , 100, '发送email成功');
                return;
            }else{
                http.send(res , 101, '发送email失败');
                return;
            }
        }else if(data) {
            console.log(data.msg);
            http.send(res , 101, data.msg);
            return;
        }
    });
})
//==========================================
// 获取全局变量, laoli 1026
getALLGVar = function () {
    var data = {};

    data.gameMap = gameMap;
    data.rooms = rooms;
    data.creatingRooms = creatingRooms;
    data.userLocation = userLocation;
    data.totalRooms = totalRooms;
    return data;
};

exports.getALLGVar = getALLGVar;       //laoli