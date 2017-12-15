// var crypto = require('../utils/crypto');
// var db = require('../utils/db');
var crypto = require('../utils/crypto');
var hallUserMgr = require('./hall_usermgr');
var http = require('http');
var express = require('express');
var emailMgr = require("./email_manage");
var txh_ports = require("./txhports");
var app = express();
var io = null;
var config = null;
var fibers = require('fibers');


function registerHandler(socket, event, callback) {
    socket.on(event, function (data) {
        //强制检查socket的合法性
        if (event != 'login') {
            if (!socket.userId) {
                return;
            }
        }
        fibers(function () {
            callback(socket, data);
        }).run();
    });
}

exports.start = function ($config, app, svr) {
    //var server = require('http').createServer(app);
    config = $config;
    var io = require('socket.io')(config.SOCKET_PORT);
    // var io = require('socket.io').listen(svr)
    //socket部分
    io.on('connection', function (socket) {
        //接收并处理客户端的hi事件
        console.log("hall socket connection.");
        socket.on('hi', function (data) {
            data = JSON.parse(data);
            if (socket.userId != null) {
                //已经登陆过的就忽略
                return;
            }
            var userId = data.userId;
            var sign = data.sign;
            var account = data.account;
            //检查参数合法性
            if (userId == null || sign == null || account == null) {
                socket.emit('hi_result', {errcode: 1, errmsg: "invalid parameters"});
                return;
            }
            //检查参数是否被篡改
            var md5 = crypto.md5(data.account + config.ACCOUNT_PRI_KEY);
            if (md5 != sign) {
                socket.emit('hi_result', {errcode: 2, errmsg: "login failed. invalid sign!"});
                return;
            }
            hallUserMgr.bind(userId, socket);
            socket.userId = userId;
            //通知前端
            var ret = {
                errcode: 0,
                errmsg: "ok",
            };
            socket.emit('hi_result', ret);
        });
        //断开事件
        socket.on('disconnect', function (data) {
            console.log('hall socket disconnect.');
            socket.emit('c_leave', '离开');
            //socket.broadcast用于向整个网络广播(除自己之外)
            //socket.broadcast.emit('c_leave','某某人离开了')
        });

        socket.on('game_ping', function (data) {
            var userId = socket.userId;
            if (!userId) {
                return;
            }
            socket.emit('game_pong');
        });
        socket.on('sendMsg', function (data) {
            var userId = socket.userId;
            if (!userId) {
                return;
            }
            var msgEvent = data.msgEvent;
            socket.emit(msgEvent);
        });
        var txhHandles = txh_ports.getHandles();
        for (var event in txhHandles) {
            registerHandler(socket, event, txhHandles[event]);
        }
        var emailHandles = emailMgr.getHandles();
        for (var event in emailHandles) {
            registerHandler(socket, event, emailHandles[event]);
        }
    });
    console.log("hall socket listening on " + config.CLEINT_PORT);
};

