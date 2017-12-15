var GAME_SERVER_IP = "118.31.237.225";  //游戏服务域名 SOCKET
var HALL_SERVER_DNS = "118.31.237.225:9001"; 	//大厅域名
var TIME_MANAGER_IP = '118.31.237.225';        //时间卡服务域名

var ACCOUNT_PORT = 9000;   	//账号服务
var HALL_PORT = 9001;		  	//大厅服务
var HALL_SOCKET_PORT = 9004;		  	//大厅socket服务
var ROOM_IN_PORT = 9002;		  //房间服务
var GAME_IN_PORT = 9003;		  //游戏服务
var TIME_MANAGER_PORT = 9997;//时间卡端口
var GAMESOCKET_PORT = 10000; 	//游戏Socket服务端口
var DEALDER_IN_PORT = 12581;	//代理管理与游戏通信端口

var GAME_VERSION = '101'; //游戏BUILD版本
var GAME_DOWNLOAD = 'https://fir.im/kkgz'; //游戏下载地址
var ACCOUNT_PRI_KEY = "$^&$*#$%()$@U$*&";
var ROOM_PRI_KEY = "$~!$@#$(*$&^$%$&1$^2";

exports.mysql = function () {
    return {
        HOST:'101.37.253.107',
        USER:'miaoc',
        PSWD:'miaoc0920',
        DB:'db_mjmc',
        PORT:3306
    }
};

//账号服配置
exports.account_server = function () {
    return {
        ACCOUNT_SERVER_PORT: ACCOUNT_PORT,
        HALL_SERVER_DNS: HALL_SERVER_DNS,
        HALL_CLIENT_PORT: HALL_PORT,
        HALL_SOCKET_IP: GAME_SERVER_IP,
        HALL_SOCKET_PORT: HALL_SOCKET_PORT,
        ACCOUNT_PRI_KEY: ACCOUNT_PRI_KEY,
        DEALDER_API_IP: 'localhost',
        DEALDER_API_PORT: DEALDER_IN_PORT,
        VERSION: GAME_VERSION,
        APP_WEB: GAME_DOWNLOAD,
        isAppleCheck: exports.isAppleCheck()
    };
};

//大厅服配置
exports.hall_server = function () {
    return {
        CLEINT_PORT: HALL_PORT,
        SOCKET_PORT: HALL_SOCKET_PORT,
        FOR_ROOM_IP: 'localhost',
        ROOM_PORT: ROOM_IN_PORT,
        ACCOUNT_PRI_KEY: ACCOUNT_PRI_KEY,
        ROOM_PRI_KEY: ROOM_PRI_KEY,
        isAppleCheck: exports.isAppleCheck()
    };
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
        //时间卡
        TMS_IP: TIME_MANAGER_IP,
        TMS_PORT: TIME_MANAGER_PORT,
    };
};

exports.manage_service_conf = function () {
    return {
        MANAGE_IP: 'localhost',
        MANAGE_PORT: DEALDER_IN_PORT,
        //大厅服务器开放给游戏服务器的地址
        GAME_IP: 'localhost',
        //大厅服务器开放给游戏服务器的端口
        GAME_PORT: GAME_IN_PORT,
        HALL_FOR_GAME_IP: 'localhost',
        HALL_FOR_GAME_PORT: ROOM_IN_PORT,
    };
};

//牌友会configs
exports.txh_configs = function () {
    return {
        DEALDER_API_IP: 'http://localhost',
        DEALDER_API_PORT: 12580
    };
};

// 是否是苹果审核。
exports.isAppleCheck = function () {
    if (HALL_SERVER_DNS == "mj.dotqoo.com:9031") {
        return true;
    }
    return false;
};
