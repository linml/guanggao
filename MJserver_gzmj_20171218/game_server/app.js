var version = '1.2.6';
var param2 = process.argv[2];
switch (param2) {
    case '-v':
    case '-V': {
        console.log("game server version:", version);
        break;
    }
    default: {
        var date = new Date();
        console.log("game server version:", version, "start at",date.toLocaleString());
        var configs = require(process.argv[2]);
        var email = require('../utils/email');
        var email_config = configs.email_config();
        email.init(email_config.host, email_config.port, email_config.userlist);
        require('../utils/sys');
        var fibers = require('fibers');
        var http_service = require("./http_service");
        var socket_service = require("./socket_service");
        //从配置文件获取服务器信息
        var config = configs.game_server();
        var db = require('../utils/dbsync');
        db.init(configs.mysql());
        //开启HTTP服务
        http_service.start(config);
        //开启外网SOCKET服务
        socket_service.start(config);
        var roomMgr = require('./roommgr');
        fibers(function () {
            roomMgr.init(config);
            while (true) {
                roomMgr.update();
                sleep(1000);
            }
        }).run();
    }
}