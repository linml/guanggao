var version = '1.0.1';

//加载错误码
require('../utils/errcode');
var configs = require(process.argv[2]);
var config = configs.manage_service_conf();

var db = require('../utils/dbsync');
db.init(configs.mysql());

var client = require("./manage_service");
client.start(config);

console.log("manage server version:", version);