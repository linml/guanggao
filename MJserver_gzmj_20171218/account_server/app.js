var version = '1.2.6';
var param2 = process.argv[2];
switch (param2) {
    case '-v':
    case '-V': {
        console.log("account server version:", version);
        break;
    }
    default: {
        var date = new Date();
        console.log("account server version:", version, "start at", date.toLocaleString());
        var configs = require(process.argv[2]);
        var email = require('../utils/email');
        var email_config = configs.email_config();
        email.init(email_config.host, email_config.port, email_config.userlist);
        var db = require('../utils/dbsync');
        db.init(configs.mysql());
        var config = configs.account_server();
        var as = require('./account_server');
        as.start(config, configs.is_test_env());
    }
}
