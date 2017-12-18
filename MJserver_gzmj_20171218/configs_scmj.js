var HALL_IP = "101.37.253.107";
var HALL_CLIENT_PORT = 9001;
var HALL_ROOM_PORT = 9002;

var ACCOUNT_PRI_KEY = "^&*#$%()@997";
var ROOM_PRI_KEY = "~!@#$(*&^%$&112";

var LOCAL_IP = 'localhost';

exports.mysql = function(){
	return {
		HOST:'localhost',
		USER:'root',
		PSWD:'',
		DB:'db_zshyscmj',
		PORT:3306
	}
};

//账号服配置
exports.account_server = function(){
	return {
		CLIENT_PORT:9000,
		HALL_IP:HALL_IP,
		HALL_CLIENT_PORT:HALL_CLIENT_PORT,
		ACCOUNT_PRI_KEY:ACCOUNT_PRI_KEY,
		
		//
		DEALDER_API_IP:LOCAL_IP,
		DEALDER_API_PORT:12581,
		VERSION:'20170607',
		APP_WEB:'http://fir.im/zshyscmj',
	};
};

//大厅服配置
exports.hall_server = function(){
	return {
		HALL_IP:HALL_IP,
		CLEINT_PORT:HALL_CLIENT_PORT,
		FOR_ROOM_IP:LOCAL_IP,
		ROOM_PORT:HALL_ROOM_PORT,
		ACCOUNT_PRI_KEY:ACCOUNT_PRI_KEY,
		ROOM_PRI_KEY:ROOM_PRI_KEY
	};	
};

//游戏服配置
exports.game_server = function(){
	return {
		SERVER_ID:"001",
		
		//暴露给大厅服的HTTP端口号
		HTTP_PORT:9003,
		//HTTP TICK的间隔时间，用于向大厅服汇报情况
		HTTP_TICK_TIME:5000,
		//大厅服IP
		HALL_IP:LOCAL_IP,
		FOR_HALL_IP:LOCAL_IP,
		//大厅服端口
		HALL_PORT:HALL_ROOM_PORT,
		//与大厅服协商好的通信加密KEY
		ROOM_PRI_KEY:ROOM_PRI_KEY,
		
		//暴露给客户端的接口
		CLIENT_IP:HALL_IP,
		CLIENT_PORT:10000,
	};
};

exports.manage_service_conf = function () {
	return {
		MANAGE_PORT: 12581,
		MANAGE_IP: LOCAL_IP,
		//大厅服务器开放给游戏服务器的地址
		GAME_IP: LOCAL_IP,
		//大厅服务器开放给游戏服务器的端口
		GAME_PORT: 9003,
		HALL_FOR_GAME_IP: LOCAL_IP,
		HALL_FOR_GAME_PORT: 9002,
	};
};