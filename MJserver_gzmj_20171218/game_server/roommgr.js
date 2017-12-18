var db = require('../utils/dbsync');
var fibers = require('fibers');
var fs = require('fs');
var util = require('util');
//var moment = require('moment')
var userMgr = require('./usermgr');
var comdef = require('../utils/common');
var saverst = require('./save_restore');        //laoli 1027
var email = require("../utils/email");

var files = fs.readdirSync(__dirname + '/games/');
var GPS_USE_IP = '';
var GPS_USE_PORT = '';

// log print 相关 , laoli 1017
function mylog_debug() {
    console.log(arguments)
    //util.debug(args)
}
exports.start = function ($config) { //add gl 11/22
    var config = $config
    GPS_USE_IP = config.GPS_USE_IP;
    GPS_USE_PORT = config.GPS_USE_PORT;
}
function mylog_info() {
    //console.log(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),"[Info]",args) //会带时间打印
    //console.log(args)

}
function mylog_error() {
    //console.log(moment(new Date()).format('YYYY-MM-DD HH:mm:ss'),"[Error] ") //会带时间打印【Err】
    //console.log(args)
}

// 23人麻将设计memo
//      room.seats的长度依然维持 创建房间时传入的 人数。room.seats[?].userId==0，说明该位置是空的
//

var gameMap = {};
for (var k in files) {
    var filepath = files[k];
    var gameMgr = require('./games/' + filepath);
    gameMap[filepath] = gameMgr;
}

var rooms = {};
var creatingRooms = {};

var userLocation = {};
var totalRooms = 0;

//创建房间ID
function generateRoomId() {
    var roomId = "";
    for (var i = 0; i < 6; ++i) {
        roomId += Math.floor(Math.random() * 10);
    }
    return roomId;
}
// 从玩家信息中索引指定玩家信息
function indexOfSeatsByUserId(seats, userId) {
    if (seats == null) {
        return null;
    }
    for (var i = 0; i < seats.length; i++) {
        var one = seats[i];
        if (one != null && one.userId == userId) {
            return one;
        }
    }
    return null;
}
// 从数据库构造房间
function constructRoomFromDb(dbdata) {
    var roomInfo = {
        uuid: dbdata.uuid,
        id: dbdata.id,
        numOfGames: dbdata.num_of_turns,
        gameOverCounts: dbdata.num_of_turns,
        createTime: dbdata.create_time,
        nextButton: dbdata.next_button,
        bonusFactor: 0,
        seats: [],
        onlineCnt: 0,
        creator: dbdata.creator,
        state: dbdata.state,
        for_others: db.for_others,
        finish_time: db.finish_time,
        conf: JSON.parse(dbdata.base_info),
        GPS_USE_IP: GPS_USE_IP,
        GPS_USE_PORT: GPS_USE_PORT,
        refuseForceBegin: false
    };
    if (roomInfo.nextButton == null) {
        roomInfo.nextButton = 0;
    }
    var numPeople = 4;
    if (roomInfo.conf.numPeople) {
        numPeople = roomInfo.conf.numPeople;
    } else {
        roomInfo.conf.numPeople = numPeople;
    }
    var gamepath = 'gamemgr_' + roomInfo.conf.type + '.js';
    roomInfo.gameMgr = gameMap[gamepath];
    if (roomInfo.gameMgr == null) {
        return null;
    }
    var roomId = roomInfo.id;
    var userIdList = [];
    var dbSeats = null;
    try {
        dbSeats = JSON.parse(dbdata.seats);
    } catch (err) {
        console.log(err.stack);
        email.send_email("JSON.parse(dbdata.seats)出错", "err" + err.stack);
    }
    for (var i = 0; i < numPeople; ++i) {
        var s = roomInfo.seats[i] = {};
        s.userId = dbdata["user_id" + i];
        s.score = dbdata["user_score" + i];
        var dbs = indexOfSeatsByUserId(dbSeats, s.userId);
        s.ready = false;
        s.seatIndex = i;
        s.numZiMo = dbs != null ? dbs.numZiMo : 0;
        s.numJiePao = dbs != null ? dbs.numJiePao : 0;
        s.numDianPao = dbs != null ? dbs.numDianPao : 0;
        s.numAnGang = dbs != null ? dbs.numAnGang : 0;
        s.numMingGang = dbs != null ? dbs.numMingGang : 0;
        s.numChaJiao = dbs != null ? dbs.numChaJiao : 0;
        s.eachScores = dbs != null ? dbs.eachScores : {};
        if (s.userId > 0) {
            userLocation[s.userId] = {
                roomId: roomId,
                seatIndex: i
            };
            userIdList.push(s.userId);
        }
    }
    var namemap = db.get_multi_names(userIdList);
    if (namemap) {
        for (var i = 0; i < roomInfo.seats.length; ++i) {
            var s = roomInfo.seats[i];
            s.name = namemap[s.userId];
            if (s.name == null) {
                s.name = '';
            }
        }
    }
    rooms[roomId] = roomInfo;
    totalRooms++;
    return roomInfo;
}
// 创建房间
exports.createRoom = function (creator, roomConf, gems, ip, port) {
    var ret = {
        errcode: 0,
        roomId: null
    };
    /*
     if(roomConf.for_others){
     roomConf.aa = false;
     }
     */
    var gameMgr = gameMap['gamemgr_' + roomConf.type + '.js'];
    if (!gameMgr) {
        ret.errcode = 996;
        return ret;
    }
    ret.errcode = gameMgr.checkConf(roomConf, gems);
    if (ret.errcode) {
        return ret;
    }
    for (var i = 0; i < 5; ++i) {
        var roomId = generateRoomId();
        //如果房间ID已经被占用，则重试
        if (db.is_room_exist(roomId)) {
            continue;
        }
        var createTime = Math.ceil(Date.now() / 1000);
        var roomInfo = {
            uuid: "",
            id: roomId,
            numOfGames: 0,
            gameOverCounts: 0,
            createTime: createTime,
            nextButton: 0,
            bonusFactor: 0,
            onlineCnt: 0,
            seats: [],
            creator: creator,
            state: 0,
            for_others: roomConf.for_others ? 1 : 0,
            finish_time: 0,
            conf: gameMgr.getConf(roomConf, creator),
            GPS_USE_IP: GPS_USE_IP,
            GPS_USE_PORT: GPS_USE_PORT,
            refuseForceBegin: false
        };
        if (!roomInfo.conf.numPeople) {
            roomInfo.conf.numPeople = 4;
        }
        roomInfo.gameMgr = gameMgr;
        for (var j = 0; j < roomInfo.conf.numPeople; ++j) {
            roomInfo.seats.push({
                isAgree: false,
                userId: 0,
                score: 0,
                name: "",
                ready: false,
                seatIndex: j,
                numZiMo: 0,
                numJiePao: 0,
                numDianPao: 0,
                numAnGang: 0,
                numMingGang: 0,
                numChaJiao: 0,
                eachScores: {}
            });
        }
        //写入数据库
        var conf = roomInfo.conf;
        // 替其他人
        conf.for_others = roomConf.for_others;
        // AA制
        conf.aa = roomConf.aa;
        // 防作弊
        conf.ipstrict = roomConf.ipstrict;
        var uuid = db.create_room(roomInfo.id, roomInfo.conf, ip, port, createTime, roomInfo.creator, roomInfo.for_others, roomInfo.state, roomInfo.finish_time);
        if (uuid == null) {
            ret.errcode = 3;
            return ret;
        }
        //如果是房主支付，则扣除开销
        if (!conf.isTimeRoom && !conf.aa) {
            db.cost_gems(creator, conf.cost, comdef.CASH_CHANGE_RESONS.COST_CREATE_ROOM.format(roomId));
        }
        roomInfo.uuid = uuid;
        // console.log(uuid);
        rooms[roomId] = roomInfo;
        totalRooms++;
        ret.roomId = roomId;
        return ret;
    }
};

exports.destroy = function (roomId) {
    var roomInfo = rooms[roomId];
    if (roomInfo == null) {
        return;
    }

    delete rooms[roomId];
    totalRooms--;
    db.delete_room(roomId);

    for (var i = 0; i < roomInfo.seats.length; ++i) {
        var userId = roomInfo.seats[i].userId;
        if (userId > 0) {
            delete userLocation[userId];
            db.set_room_id_of_user(userId, null);
        }
    }
};

exports.getTotalRooms = function () {
    return totalRooms;
}

exports.getRoom = function (roomId) {
    return rooms[roomId];
};

exports.isCreator = function (roomId, userId) {
    var roomInfo = rooms[roomId];
    if (roomInfo == null) {
        return false;
    }
    return roomInfo.conf.creator == userId;
};
// 进入房间
exports.enterRoom = function (roomId, userId, userName, ip) {
    var room = rooms[roomId];
    if (!room) {
        return 2;
    }
    if (exports.getUserRoom(userId) == roomId) {
        //已存在
        return 0;
    }
    var userGems = 0;
    if (room.conf.aa) {
        var data = db.get_user_data_by_userid(userId);
        userGems = data.gems;
    }
    if (room.conf.ipstrict) {
        for (var k in room.seats) {
            var sip = room.seats[k].ip;
            if (sip != null && sip == ip) {
                return 4;
            }
        }
    }

    // 检查是是不是已经开始打 //laoli 171020
    if (room.game) {
        //mylog_debug("房间可以开打，观战等下一局吧",roomId,userId);
    }

    for (var i = 0; i < room.seats.length; ++i) {
        var seat = room.seats[i];
        if (seat.userId <= 0) {
            // 找到空位，坐下来。
            //如果是AA制，则需要扣钱。
            if (room.conf.aa && userGems < room.conf.cost) {
                return 3;
            }
            seat.userId = userId;
            seat.name = userName;
            seat.ip = ip;
            userLocation[userId] = {
                roomId: roomId,
                seatIndex: i
            };
            //console.log(userLocation[userId]);

            if (room.game) {   //laoli 1020
                mylog_debug(">> enterRoom100: 已经开打了，本局旁观吧", roomId, userId)
                //mylog_debug(room.game.gameSeats)
                room.gameMgr.lateJoin(roomId, userId);
            } //else
            {
                db.update_seat_info(roomId, i, seat.userId);
                if (!room.conf.isTimeRoom && room.conf.aa) {
                    //入坐扣钱
                    db.cost_gems(userId, room.conf.cost, comdef.CASH_CHANGE_RESONS.COST_CREATE_ROOM.format(roomId));
                }
            }
            exports.computeOnlineCnt(room);

            //正常
            mylog_debug(">> enterRoom: 0, OK，坐到位置:", i);
            return 0;
        }
    }
    //房间已满
    mylog_debug(">> enterRoom: 1 , full");
    return 1;
};
// laoli add 1021 ,强制开局(for 23mj)
exports.forceBegin = function (userId, value) {
    console.log("forceBegin...", userId);
    var roomId = exports.getUserRoom(userId);
    if (roomId == null) {
        return 0;
    }
    var room = exports.getRoom(roomId);
    if (room == null) {
        return 0;
    }
    var seatIndex = exports.getUserSeat(userId);
    if (seatIndex == null) {
        return 0;
    }
    if (room.game == null) {
        var curSeat = null;
        var readycnt = 0;
        var seatcnt = 0;
        var endSeatIndex = -1;
        for (var i = 0; i < room.seats.length; ++i) {
            var ss = room.seats[i];
            if (ss && ss.userId > 0) {
                seatcnt++;
                endSeatIndex = i;
                if (ss.userId == userId) {
                    curSeat = ss;
                }
                if (ss.ready == false || userMgr.isOnline(ss.userId) == false) {
                    continue;
                }
                readycnt++;
            }
        }
        console.log("forceBegin...", userId, seatcnt, endSeatIndex, readycnt);
        if (seatcnt < 2) {
            var data1 = {};
            data1.msg = "人数不够，再等一下吧。";
            userMgr.sendMsg(userId, 'game_alert_msg', data1);
            return 0;
        }
        if (seatcnt != endSeatIndex + 1) {
            var data2 = {};
            data2.msg = "玩家之间有空位，无法开始。\n试一试退出再进房吧。";
            userMgr.sendMsg(userId, 'game_alert_msg', data2);
            return 0;
        }
        if (seatcnt != readycnt) {
            var data3 = {};
            data3.msg = "有人未准备好，再等一下吧。";
            userMgr.sendMsg(userId, 'game_alert_msg', data3);
            return 0;
        }
        if (curSeat) {
            for (var j = 0; j < room.seats.length; ++j) {
                var st = room.seats[j];
                if (st && st.userId > 0) {
                    st.isAgree = false;
                }
            }
            room.refuseForceBegin = false;
            curSeat.isAgree = true;
            userMgr.broacastInRoom('go_to_ready', {name: curSeat.name}, userId, false);
        }
    }
    return 1;
};
// 强制开始23 人麻将时需要通知玩家去确认开始；
exports.to_readying = function (userId, data) {
    console.log('start userid >>> ', userId);
    var roomId = exports.getUserRoom(userId);
    if (roomId == null) {
        return 0;
    }
    var room = exports.getRoom(roomId);
    if (room == null) {
        return 0;
    }
    if (room.game == null) {
        var seatcnt = 0;
        var agreeCount = 0;
        var endSeatIndex = -1;
        for (var i = 0; i < room.seats.length; ++i) {
            var ss = room.seats[i];
            if (ss && ss.userId > 0) {
                seatcnt++;
                endSeatIndex = i;
                if (ss.userId == userId) {
                    if (data == 0) {
                        room.refuseForceBegin = true;
                        ss.isAgree = false;
                    } else {
                        ss.isAgree = true;
                    }
                }
                if (ss.isAgree) {
                    agreeCount++;
                }
            }
        }
        if (seatcnt < 2) {
            for (var j = 0; j < room.seats.length; ++j) {
                var seat1 = room.seats[j];
                if (seat1 && seat1.userId > 0 && seat1.isAgree) {
                    seat1.isAgree = false;
                    var data1 = {};
                    data1.msg = "有玩家退出房间，人数不够，再等一下吧。";
                    userMgr.sendMsg(seat1.userId, 'game_alert_msg', data1);
                }
            }
            return 0;
        }
        if (seatcnt != endSeatIndex + 1) {
            for (var k = 0; k < room.seats.length; ++k) {
                var seat2 = room.seats[k];
                if (seat2 && seat2.userId > 0 && seat2.isAgree) {
                    seat2.isAgree = false;
                    var data2 = {};
                    data2.msg = "有玩家退出房间，玩家之间有空位，\n试一试退出再进房吧。";
                    userMgr.sendMsg(seat2.userId, 'game_alert_msg', data2);
                }
            }
            return 0;
        }
        if (agreeCount == seatcnt && room.refuseForceBegin == false) {
            room.gameMgr.begin(roomId);
            //如果是第一局，则标记状态
            if (room.state == 0) {
                room.state = 1;
                db.update_room_state(room.uuid, room.state);
            }
        }
    }
};

exports.setReady = function (userId, value) {
    var roomId = exports.getUserRoom(userId);
    if (roomId == null) {
        return;
    }
    var room = exports.getRoom(roomId);
    if (room == null) {
        return;
    }
    var seatIndex = exports.getUserSeat(userId);
    if (seatIndex == null) {
        return;
    }
    var s = room.seats[seatIndex];
    s.ready = value;
    if (value == false) {
        return;
    }
    //如果未开局，则要4家都准备好了才开
    if (room.game == null) {
        var currentUsercnt = 0;
        for (var z = 0; z < room.seats.length; ++z) {
            var ss = room.seats[z];
            if (ss.userId > 0) {
                currentUsercnt++;
            }
        }
        var seatlen = (room.state == 0) ? room.seats.length : currentUsercnt;        //laoli 1024
        for (var i = 0; i < seatlen; ++i) {
            var s = room.seats[i];
            if (s.ready == false || userMgr.isOnline(s.userId) == false) {
                return;
            }
        }
        //人到齐了，并且都准备好了，则开始新的一局
        room.gameMgr.begin(roomId);

        //如果是第一局，则标记状态
        if (room.state == 0) {
            room.state = 1;
            db.update_room_state(room.uuid, room.state);
        }
    } else { //房间存在，本局已经开始，则同步信息。
        room.gameMgr.sync(userId);
    }
};

exports.isReady = function (userId) {
    var roomId = exports.getUserRoom(userId);
    if (roomId == null) {
        return;
    }

    var room = exports.getRoom(roomId);
    if (room == null) {
        return;
    }

    var seatIndex = exports.getUserSeat(userId);
    if (seatIndex == null) {
        return;
    }

    var s = room.seats[seatIndex];
    return s.ready;
};

exports.getUserRoom = function (userId) {
    var location = userLocation[userId];
    if (location != null) {
        return location.roomId;
    }
    return null;
};

exports.getUserSeat = function (userId) {
    var location = userLocation[userId];
    //console.log(userLocation[userId]);
    if (location != null) {
        return location.seatIndex;
    }
    return null;
};

// laoli add 1024
exports.getUserName = function (userId) {
    var roomId = exports.getUserRoom(userId);
    if (roomId == null) {
        return;
    }

    var room = exports.getRoom(roomId);
    if (room == null) {
        return;
    }

    var seatIndex = exports.getUserSeat(userId);
    if (seatIndex == null) {
        return;
    }

    var s = room.seats[seatIndex];
    return s.name;
};

exports.getUserLocations = function () {
    return userLocation;
};

exports.exitRoom = function (userId) {
    var location = userLocation[userId];
    if (location == null) {
        return;
    }

    var roomId = location.roomId;
    var seatIndex = location.seatIndex;
    var room = rooms[roomId];
    delete userLocation[userId];
    if (room == null || seatIndex == null) {
        return;
    }

    var seat = room.seats[seatIndex];
    seat.userId = 0;
    seat.name = "";
    seat.ready = false;
    seat.ip = null;

    var numOfPlayers = 0;
    for (var i = 0; i < room.seats.length; ++i) {
        if (room.seats[i].userId > 0) {
            numOfPlayers++;
        }
    }
    exports.computeOnlineCnt(room);

    //如果是AA，则退还房卡
    if (!room.conf.isTimeRoom && room.conf.aa) {
        db.cost_gems(userId, -room.conf.cost, comdef.CASH_CHANGE_RESONS.RETURN_DISSOLVE_ROOM.format(roomId));
    }
    db.set_room_id_of_user(userId, null);
    db.set_user_id_of_room(roomId, seatIndex, 0);
};

var dissolvingList = [];

exports.hasBegan = function (roomId) {
    var roomInfo = exports.getRoom(roomId);
    if (roomInfo == null) {
        return false;
    }

    if (roomInfo.game != null) {
        return true;
    }

    if (roomInfo.numOfGames > 0) {
        return true;
    }

    return false;
};

exports.doDissolve = function (roomId) {
    var roomInfo = exports.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }
    if (roomInfo.destroy) {
        return true;
    }
    roomInfo.gameMgr.doGameOver(roomInfo, true)
};

exports.dissolveRequest = function (roomId, userId) {
    var roomInfo = exports.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }
    if (roomInfo.dr != null) {
        return null;
    }
    var seatIndex = exports.getUserSeat(userId);
    if (seatIndex == null) {
        return null;
    }
    roomInfo.dr = {
        endTime: Date.now() + 90000,
        states: []
    };
    var currentUsercnt = 0;
    for (var z = 0; z < roomInfo.seats.length; ++z) {
        var ss = roomInfo.seats[z];
        if (ss.userId > 0) {
            currentUsercnt++;
        }
    }
    for (var i = 0; i < currentUsercnt; ++i) {
        roomInfo.dr.states[i] = false;
    }
    roomInfo.dr.states[seatIndex] = true;
    dissolvingList.push(roomId);
    return roomInfo;
};

exports.dissolveAgree = function (roomId, userId, agree) {
    var roomInfo = exports.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }
    if (roomInfo.dr == null) {
        return null;
    }
    var seatIndex = exports.getUserSeat(userId);
    if (seatIndex == null) {
        return null;
    }
    if (agree) {
        roomInfo.dr.states[seatIndex] = true;
    } else {
        roomInfo.dr = null;
        var idx = dissolvingList.indexOf(roomId);
        if (idx != -1) {
            dissolvingList.splice(idx, 1);
        }
    }
    return roomInfo;
};
// 更新各个玩家总得分。
exports.updateScores = function (roomId) {
    var roomInfo = exports.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }
    var scores = [];
    for (var i = 0; i < roomInfo.seats.length; ++i) {
        scores[i] = roomInfo.seats[i].score;
    }
    db.update_room_score(roomInfo.uuid, scores);
};
// 更新玩家信息。
exports.updateSeats = function (roomId) {
    var roomInfo = exports.getRoom(roomId);
    if (roomInfo == null) {
        return null;
    }
    db.update_room_seats(roomInfo.uuid, JSON.stringify(roomInfo.seats));
};

exports.onRoomEnd = function (roomInfo, forceEnd) {
    roomInfo.destroy = true;
    var roomId = roomInfo.id;
    //如果是强制解散，且第一局未打完，则返还房卡
    if (forceEnd && roomInfo.numOfGames <= 1) {
        if (!roomInfo.conf.isTimeRoom && roomInfo.conf.aa) {
            for (var k in roomInfo.seats) {
                var s = roomInfo.seats[k];
                db.cost_gems(s.userId, -roomInfo.conf.cost, comdef.CASH_CHANGE_RESONS.COST_CREATE_ROOM.format(roomInfo.id));
            }
        } else {
            db.cost_gems(roomInfo.conf.creator, -roomInfo.conf.cost, comdef.CASH_CHANGE_RESONS.RETURN_DISSOLVE_ROOM.format(roomInfo.id));
        }
    }
    if (forceEnd) {
        roomInfo.state = 3;
    } else {
        roomInfo.state = 2;
    }
    db.update_room_state(roomInfo.uuid, roomInfo.state, Math.floor(Date.now() / 1000));
    sleep(100);
    if (roomInfo.gameOverCounts > 0) {
        db.archive_room(roomInfo.uuid);
        db.archive_games(roomInfo.uuid);
    }
    userMgr.kickAllInRoom(roomId);
    exports.destroy(roomId);
};

exports.update = function () {
    for (var i = dissolvingList.length - 1; i >= 0; --i) {
        var roomId = dissolvingList[i];
        var roomInfo = exports.getRoom(roomId);
        if (roomInfo != null && roomInfo.dr != null) {
            if (Date.now() > roomInfo.dr.endTime) {
                console.log("delete room and games");
                exports.doDissolve(roomId);
                dissolvingList.splice(i, 1);
            }
        } else {
            dissolvingList.splice(i, 1);
        }
    }
    // 客户要求屏蔽该功能，luojunbo 20171122。
    // var now = Date.now() / 1000;
    // var lifeTime = 3 * 60 * 60;
    // //删除超时的房间
    // for (var k in rooms) {
    //     var info = rooms[k];
    //     if (info.onlineCnt > 0 || (info.createTime + lifeTime) > now) {
    //         continue;
    //     }
    //     console.log('delete room:' + info.id);
    //     exports.doDissolve(info.id);
    // }
};
//取出所有属于自己的房间
exports.init = function (config) {
    var roomList = db.get_room_list(config.CLIENT_IP, config.CLIENT_PORT);
    if (roomList) {
        for (var i = 0; i < roomList.length; ++i) {
            var roomData = roomList[i];
            constructRoomFromDb(roomData);
        }
    }
    // 恢复玩家数据。
    saverst.restoreALLGVar(rooms);           //laoli 1027，重建gamemgr里的games等全局变量

    // var HOUR = 60 * 60 * 1000;
    // //每小时清除一下数据库。
    // setInterval(function () {
    //     fibers(function () {
    //         var timestamp = Math.floor(Date.now() / 1000);
    //         //清除三天前的数据。
    //         timestamp -= 60 * 60 * 24 * 3;
    //         console.log('clear archive data.');
    //         db.clear_rooms_archive(timestamp);
    //         db.clear_games_archive(timestamp);
    //     }).run();
    // }, HOUR);

    //每20s save GVAR to 数据库。 //TODO, 活动的时候可以10分钟存一次，闲的时候可以20分钟存一次
    // setInterval(function () {
    //     fibers(function () {
    //         saveALLGVar();
    //         mylog_info('saveALLGVar every 2min.by laoli');
    //     }).run();
    // }, 20*1000);
};

exports.computeOnlineCnt = function (roomInfo) {
    var cnt = 0;
    for (var i = 0; i < roomInfo.seats.length; ++i) {
        if (roomInfo.seats[i].ip != null) {
            cnt++;
        }
    }
    roomInfo.onlineCnt = cnt;
}

/**
 * 获取在线房间列表
 * @param {Boolean} playing - 只取活跃房间
 */
exports.getOnlineRooms = function (playing) {
    var roomList = [];
    for (var idx in rooms) {
        var room = rooms[idx];
        if (room == null) {
            continue;
        }

        // 取全部在线房间或者只取活跃房间
        if (!playing || room.game != null) {
            var item = {
                id: room.id,
                creator: room.creator,
                createTime: room.createTime,
                onlineCnt: room.onlineCnt,
                seats: room.seats,
            };

            roomList.push(item);
        }
    }

    roomList.sort(function (a, b) {
        if (a.createTime < b.createTime) {
            return 1;
        } else if (a.createTime > b.createTime) {
            return -1;
        }

        return 0;
    });

    return roomList;
};

exports.saveALLGVar = function () {
    return saverst.saveALLGVar(rooms);
};
exports.restoreALLGVar = function () {
    return saverst.restoreALLGVar(rooms);
};
