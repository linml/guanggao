var http = require('./http');
var common = require('./common');

var host = '121.41.34.27';
var port = 40000;
var userlist = 'guolin@dotqoo.com';
var serverIp = '';

function init($host, $port, $userlist) {
    host = $host;
    port = $port;
    userlist = $userlist;
    console.log("email host:", host, "port:", port);
    console.log("email userlist:", userlist);
    var serverIps = common.getServerIp();
    for (var i = 0; i < serverIps.length; i++) {
        var one = serverIps[i];
        if (one.type != 0) {
            if (serverIp == '') {
                serverIp = one.ip;
            } else {
                serverIp = serverIp + ',' + one.ip;
            }
        }
    }
    if (serverIp == '') {
        serverIp = '[未知来源]';
    } else {
        serverIp = '[' + serverIp + ']';
    }
    console.log("email serverIp:", serverIp);
}

function send_email(title, path) {
    var data = {
        userlist: userlist,
        title: serverIp + ':' + title,
        path: path
    };
    http.posts(host, port, "/sendemail", data);
}
exports.init = init;
exports.send_email = send_email;