var version = '1.2.6';
var param2 = process.argv[2];
switch (param2) {
    case '-v':
    case '-V': {
        console.log("manage server version:", version);
        break;
    }
    default: {
        var date = new Date();
        console.log("manage server version:", version, "start at", date.toLocaleString());
        var configs = require(process.argv[2]);
        var email = require('../utils/email');
        var email_config = configs.email_config();
        email.init(email_config.host, email_config.port, email_config.userlist);
        //加载错误码
        require('../utils/errcode');
        var config = configs.manage_service_conf();
        var db = require('../utils/dbsync');
        db.init(configs.mysql());
        var client = require("./manage_service");
        client.start(config);
    }
}