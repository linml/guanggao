var roomMgr = require('./roommgr');
var userMgr = require('./usermgr');
var db = require('../utils/dbsync');

var handlers = {}
handlers.chat = function(socket,data){
	if(socket.userId == null){
		return;
	}
	var chatContent = data;
	userMgr.broacastInRoom('chat_push',{sender:socket.userId,content:chatContent},socket.userId,true);	
};

handlers.quick_chat = function(socket,data){
	if(socket.userId == null){
		return;
	}
	var chatId = data;
	userMgr.broacastInRoom('quick_chat_push',{sender:socket.userId,content:chatId},socket.userId,true);
};

handlers.voice_msg = function(socket,data){
	if(socket.userId == null){
		return;
	}
	console.log(data.length);
	userMgr.broacastInRoom('voice_msg_push',{sender:socket.userId,content:data},socket.userId,true);
};

handlers.emoji = function(socket,data){
	if(socket.userId == null){
		return;
	}
	var phizId = data;
	userMgr.broacastInRoom('emoji_push',{sender:socket.userId,content:phizId},socket.userId,true);
}

handlers.interactive_emoji = function(socket, data) {
	var userId = socket.userId;
	if (userId == null) {
		return;
	}

	//Default value
	var cashType = 1; //1-coin, 2-gem
	var costNum = 500;

	//获取配置的互动表情消费货币类型和数量
	var confData = db.get_configs();
	if (confData != null) {
		cashType = confData.interactive_emoji_cost_type;
		costNum = confData.interactive_emoji_cost_num;
	} else {
		console.log('[Error] - can\'t get config data');
	}

	//取得货币数量以及扣取接口
	var ownNum = 0;
	var costFunc = null;
	if (cashType == 1) {//coins
		ownNum = db.get_user_coins(userId);
		costFunc = db.cost_coins;
	} else if (cashType == 2) {//gems
		ownNum = db.get_user_gems(userId);
		costFunc = db.cost_gems;
	}

	//错误1 - 无法获取货币数量或者扣除接口
	if (ownNum == null || costFunc == null) {
		userMgr.sendMsg(userId, 'interactive_emoji_push', { errcode: 1, cash_type: cashType });
		return;
	}

	//错误2 - 货币不足
	if(ownNum < costNum) {
		userMgr.sendMsg(userId, 'interactive_emoji_push', { errcode: 2, cash_type: cashType });
		return;
	}
	
	//错误3 - 扣除货币失败
	var ret = costFunc(userId, costNum, '- send interactive emoji');
	if (!ret) {
		userMgr.sendMsg(userId, 'interactive_emoji_push', { errcode: 3, cash_type: cashType });
		return;
	}

	//广播互动表情消息
	userMgr.broacastInRoom('interactive_emoji_push', { errcode: 0, sender: userId, content: data }, userId, true);
};

exports.handlers = handlers;

//
exports.update = function(){

};