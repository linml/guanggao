var version = '1.2.6';
var param2 = process.argv[2];
switch (param2) {
    case '-v':
    case '-V': {
        console.log("hall server version:", version);
        break;
    }
    default: {
        var date =new Date();
        console.log("hall server version:", version, "start at", date.toLocaleString());
        var configs = require(process.argv[2]);
        var email = require('../utils/email');
        var email_config = configs.email_config();
        email.init(email_config.host, email_config.port, email_config.userlist);
        var client_service = require("./client_service");
        var room_service = require("./room_service");
        var socket_service = require("./hall_socket_service");
        var config = configs.hall_server();
        var EventEmitter = require('events').EventEmitter;
        var g_event = new EventEmitter();
        var db = require('../utils/dbsync');
        db.init(configs.mysql());
        var txhports = require('./txhports');
        txhports.init(configs.mysql(), g_event, configs);
        var email_manage = require('./email_manage');
        email_manage.init(configs.mysql(), g_event);
        var app = client_service.start(config, g_event);
        var svr = client_service.getSvr();
        room_service.start(config);
        socket_service.start(config, app, svr);
    }
}