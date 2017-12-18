var HALL_IP = "mj.dotqoo.com";
var HALL_CLIENT_PORT = 9011;
var HALL_ROOM_PORT = 9012;
var ACCOUNT_PRI_KEY = "$^&$*#$%()$@U$*&";
var ROOM_PRI_KEY = "$~!$@#$(*$&^$%$&1$^2";
var LOCAL_IP = 'localhost';
var TIME_MANAGER_SVR_IP = 'mj.dotqoo.com';
var TIME_MANAGER_SVR_PORT = 9997;
exports.mysql = function(){
	return {
		HOST:'localhost',
		USER:'root',
		PSWD:'',
		DB:'db_zshyscmj',
		PORT:3306,
	}
};

//账号服配置
exports.account_server = function(){
	return {
		CLIENT_PORT:9010,
		HALL_IP:HALL_IP,
		HALL_CLIENT_PORT:HALL_CLIENT_PORT,
		ACCOUNT_PRI_KEY:ACCOUNT_PRI_KEY,
		DEALDER_API_IP:LOCAL_IP,
		DEALDER_API_PORT:12582,
		VERSION:'20170901',
		APP_WEB:'http://appdl.gongyou.co/dl?file=intromj&from=SS01'
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
		HTTP_PORT:9013,
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
		CLIENT_PORT:10010,
		//timemanager server, by guolin 170902， for 时间卡
		TMS_IP:TIME_MANAGER_SVR_IP,
		TMS_PORT:TIME_MANAGER_SVR_PORT,
	};
};

exports.manage_service_conf = function () {
	return {
		MANAGE_PORT: 12582,
		MANAGE_IP: LOCAL_IP,
		//大厅服务器开放给游戏服务器的地址
		GAME_IP: LOCAL_IP,
		//大厅服务器开放给游戏服务器的端口
		GAME_PORT: 9013,
		HALL_FOR_GAME_IP: LOCAL_IP,
		HALL_FOR_GAME_PORT: 9012,
	};
};