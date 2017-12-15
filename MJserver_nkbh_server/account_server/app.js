var version = '1.0.1';
var db = require('../utils/dbsync');
var configs = require(process.argv[2]);

db.init(configs.mysql());

var config = configs.account_server();
var as = require('./account_server');
as.start(config);

console.log("account server version:", version);
