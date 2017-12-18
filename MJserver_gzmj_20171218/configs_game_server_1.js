var GAME_SERVER_IP = "game.17970.kk10888.com"; 	//游戏服务域名 SOCKET
var GAMESOCKET_PORT = 17975;  //游戏服务Socket端口
var ROOM_IN_PORT = 27972;		  //房间服务
var HALL_SOCKET_PORT = 17979;		  	//大厅socket服务
var GAME_IN_PORT = 27975;		  //游戏服务
var ROOM_PRI_KEY = "$~!$@#$(*$&^$%$&1$^2";

exports.mysql = function () {
    return {
        HOST: '172.16.0.17',
        USER: 'root',
        PSWD: 'JiangMa818#+@-!',
        DB: 'db_game_kkmj_17970',
        PORT: 3306,
    }
};

//游戏服配置
exports.game_server = function () {
    return {
        SERVER_ID: "001",
        //暴露给大厅服的HTTP端口号
        HTTP_PORT: GAME_IN_PORT,
        //HTTP TICK的间隔时间，用于向大厅服汇报情况
        HTTP_TICK_TIME: 5000,
        //大厅服IP
        HALL_IP: 'localhost',
        FOR_HALL_IP: 'localhost',
        //大厅服端口
        HALL_PORT: ROOM_IN_PORT,
        //与大厅服协商好的通信加密KEY
        ROOM_PRI_KEY: ROOM_PRI_KEY,
        //暴露给客户端的接口
        CLIENT_IP: GAME_SERVER_IP,
        CLIENT_PORT: GAMESOCKET_PORT,
        //gps定位使用
        GPS_USE_IP: 'localhost',
        GPS_USE_PORT: ROOM_IN_PORT
    };
};
//牌友会configs
exports.txh_configs = function () {
    return {
        DEALDER_API_IP: 'http://localhost',
        DEALDER_API_PORT: 27979,
        ADD_GEMS: 100 //当代理的游戏账号没有gems 时 ，使用代理账号为代理充值金币数；
    };
};

exports.email_config = function () {
    return {
        host: '121.41.34.27',   //发送报错信息的ip
        port: 40000,     //发送报错信息的port
        userlist: 'lijian@dotqoo.com,wangpeng@dotqoo.com,shidongdong@dotqoo.com,luojunbo@dotqoo.com'  //调用接口出错时发送邮件的邮箱；
    };
};
// 是否是苹果审核。
exports.isAppleCheck = function () {
    if (HALL_SERVER_DNS == "mj.dotqoo.com:9031") {
        return true;
    }
    return false;
};
// 返回测试服务器的ip地址。
exports.get_test_server_ips = function () {
    return ['101.37.253.107', '118.31.237.225'];
};
// 判断是否是测试服务器。
exports.is_test_env = function () {
    var ips = exports.get_test_server_ips();
    console.log('ips', ips);
    var common = require('./utils/common');
    var serverIps = common.getServerIp();
    console.log('serverIps', serverIps);
    for (var i = 0; i < serverIps.length; i++) {
        if (ips.indexOf(serverIps[i].ip) != -1) {
            return true;
        }
    }
    return false;
};