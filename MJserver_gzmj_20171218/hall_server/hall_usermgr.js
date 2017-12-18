var userList = {};
var userOnline = 0;
exports.bind = function (userId, socket) {
    userList[userId] = socket;
    userOnline++;
};

exports.del = function (userId, socket) {
    delete userList[userId];
    userOnline--;
};

exports.get = function (userId) {
    return userList[userId];
};

exports.isOnline = function (userId) {
    var data = userList[userId];
    if (data != null) {
        return true;
    }
    return false;
};

exports.getOnlineCount = function () {
    return userOnline;
}

exports.getOnlinePlayers = function () {
    var players = [];
    for (var id in userList) {
        players.push(id);
    }

    return players;
};

exports.sendMsg = function (userId, event, msgdata) {
    console.log(event);
    var userInfo = userList[userId];
    if (userInfo == null) {
        return;
    }
    var socket = userInfo;
    if (socket == null) {
        return;
    }

    socket.emit(event, msgdata);
};

exports.addEvent = function (event, callback) {
    for (var i in userList) {
        var s = userList[i];
        s.on(event, callback);
    }
};
