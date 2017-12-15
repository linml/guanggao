var version = '1.0.1';

var client_service = require("./client_service");
var room_service = require("./room_service");
var socket_service = require("./hall_socket_service");

var configs = require(process.argv[2]);
var config = configs.hall_server();

var EventEmitter = require('events').EventEmitter;
var g_event = new EventEmitter();
var db = require('../utils/dbsync');
db.init(configs.mysql());

var txhports = require('./txhports');
txhports.init(configs.mysql(),g_event,configs);
var email_manage = require('./email_manage');
email_manage.init(configs.mysql(),g_event);
// var db = require('../utils/dbsync');
// db.init(configs.mysql());
var app = client_service.start(config,g_event);
var svr = client_service.getSvr();
room_service.start(config);
socket_service.start(config,app,svr);

console.log("hall server version:", version);