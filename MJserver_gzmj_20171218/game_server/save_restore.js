﻿var db = require('../utils/dbsync');
var fibers = require('fibers');
var fs = require('fs');
var util = require('util');
// var moment = require('moment')
var userMgr = require('./usermgr');
var roomMgr = require("./roommgr");
var comdef = require('../utils/common');

var files = fs.readdirSync(__dirname + '/games/');

// 用来保存和恢复game全局变量数据, by laoli

// log print 相关 , laoli 1017
function mylog_debug() {
    // console.log(arguments);
    //util.debug(args)
}
function mylog_info() {
    // console.log(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'), "[Info]", arguments) //会带时间打印
    //console.log(args)

}
function mylog_error() {
    // console.log(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'), "[Error] ") //会带时间打印【Err】
    // console.log(arguments)
}

// dump gameSeats, from list to json, 注意，务必先去掉save and 去掉.game=null
dumpGameSeats = function (gameSeats) {
    var stringList = [];
    for (var iii in gameSeats) {
        var gameSeat = gameSeats[iii];
        var save = gameSeat.game;
        gameSeat.game = null;
        stringList[iii] = comdef.deepCopy(gameSeat);
        console.log("dumpGameSeats", iii, stringList[iii].folds, stringList[iii].holds);
        // 恢复
        gameSeat.game = save;
    }

    return stringList
};
// 从 json 重构出gameSeats list
var buildGameSeats = function (gameSeatsJson, game) {
    var gameseats = [];
    for (var i in gameSeatsJson) {
        var gameseat = gameSeatsJson[i];
        gameseat.game = game;
        gameseats.push(gameseat);
    }
    return gameseats
};
// 获取全局变量, laoli 1026
saveALLGVar = function (rooms) {
    // var data={}
    //
    // //data.gameMap=gameMap;
    // data.rooms=rooms;
    // //data.creatingRooms = creatingRooms;
    // data.userLocation = userLocation;
    // data.totalRooms = totalRooms;
    for (var kkk in rooms) {
        //data.gmvar = roomInfo.gameMgr.getALLGVar()
        //console.log(rooms[kkk])
        //console.log(rooms[kkk].gameMgr.getALLGVar())
        var roominfo = rooms[kkk];
        var games = rooms[kkk].gameMgr.getALLGVar().games;
        // var gameSeatsOfUsers = rooms[kkk].gameMgr.getALLGVar().gameSeatsOfUsers;
        console.log("开始遍历games，房间号：", kkk, roominfo.conf.type, games.length);
        for (var ii in games) {
            console.log("比较下", kkk, ii);
            if (kkk != ii) {
                continue
            }
            var gameitem = games[ii];
            var uuid = gameitem.roomInfo.uuid;
            var roomInfo_save = gameitem.roomInfo;
            var gameSeats_save = gameitem.gameSeats;
            gameitem.roomInfo = null;
            var gsListStrng = dumpGameSeats(gameitem.gameSeats);
            gameitem.gameSeats = null;
            var itemString = JSON.stringify(gameitem);
            //console.log(ii, gameitem.baseInfoJson)
            //console.log(ii, gsListStrng)

            // 恢复
            gameitem.roomInfo = roomInfo_save;
            gameitem.gameSeats = gameSeats_save;

            db.update_game_tempinfo(uuid, gameitem.gameIndex, itemString, JSON.stringify(gsListStrng));

        }
        //console.log(rooms[kkk].gameMgr.getALLGVar().conf)
        console.log("=========")
    }
    //return data;
    return null, 0, 1, 2;
};
// 获取全局变量, laoli 1026
restoreALLGVar = function (rooms) {
    console.log(">> restoreALLGVar恢复game数据..");
    for (var id in rooms) {
        console.log("开始遍历games，房间号：", id);
        var roominfo = rooms[id];
        var uuid = roominfo.uuid;
        var roomid = roominfo.id;
        var rets = db.get_game_tempinfo(uuid);
        if (rets == null) {
            continue;
        }
        var games = rooms[id].gameMgr.getALLGVar().games;
        var gameSeatsOfUsers = rooms[id].gameMgr.getALLGVar().gameSeatsOfUsers;
        console.log("开始处理：", rets);
        var game = games[roomid];
        if (game == null) {
            console.log("game empty,重构game", roomid);
            var newgame = JSON.parse(rets.gamestring);
            var gameseatsjson = JSON.parse(rets.gameseats);
            var new_gameseats = buildGameSeats(gameseatsjson, newgame);
            newgame.gameSeats = new_gameseats;
            games[roomid] = newgame;
            var room = roomMgr.getRoom(roomid);
            room.game = newgame;
            newgame.roomInfo = room;
            for (var index in new_gameseats) {
                var userid = new_gameseats[index].userId;
                gameSeatsOfUsers[userid] = new_gameseats[index];
            }
            // 特殊处理
            room.numOfGames = newgame.gameIndex + 1;    // TODO,不确定是否OK
        }
        console.log("=========");
    }
    console.log("<< restoreALLGVar");
    return 1
};
exports.saveALLGVar = saveALLGVar;       //laoli
exports.restoreALLGVar = restoreALLGVar;       //laoli