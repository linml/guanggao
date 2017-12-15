var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/dbsync');
var http = require("../utils/http");
var fibers = require('fibers');
var comdef = require('../utils/common');

var cashChangeReasons = comdef.CASH_CHANGE_RESONS;

var app = express();
var hallAddr = "";
var hallSoAddr = "";
var config = null;

exports.start = function (cfg) {
    config = cfg;
    hallAddr = config.HALL_SERVER_DNS;
    hallSoAddr = config.HALL_SOCKET_IP + ":" + config.HALL_SOCKET_PORT;
    app.listen(config.ACCOUNT_SERVER_PORT);
    console.log("account server is listening on " + config.ACCOUNT_SERVER_PORT);
};

//设置跨域访问
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    fibers(function () {
        next();
    }).run();
});

app.get('/register', function (req, res) {
    var account = req.query.account;
    var password = req.query.password;

    var exist = db.is_account_exist(account);
    if (exist) {
        http.send(res, 1, 'account has been used');
        return;
    }

    var ret = db.create_account(account, password);
    if (!ret) {
        http.send(res, 1, 'account has been used');
        return;
    }

    http.send(res, 0, 'ok');
});

app.get('/get_version', function (req, res) {
    var ret = {
        version: config.VERSION
    }
    http.send(res, 0, 'ok', ret);
});

app.get('/get_serverinfo', function (req, res) {
    var ret = {
        version: config.VERSION,
        hall: hallAddr,
        hallSo: hallSoAddr,
        appweb: config.APP_WEB,
        verify: false //IOS审核
    };
    if (config.isAppleCheck == true) {
        ret.verify = true;
    }
    http.send(res, 0, 'ok', ret);
});

app.get('/guest', function (req, res) {
    var account = "guest_" + req.query.account;
    var sign = crypto.md5(account + config.ACCOUNT_PRI_KEY);
    var ret = {
        account: account,
        halladdr: hallAddr,
        hallSo: hallSoAddr,
        sign: sign
    };
    http.send(res, 0, 'ok', ret);
});

//手机登录认证接口
app.get('/phone_login', function (req, res) {
    var account = "phone_" + req.query.account;
    var sign = crypto.md5(account + config.ACCOUNT_PRI_KEY);
    var ret = {
        account: account,
        halladdr: hallAddr,
        hallSo: hallSoAddr,
        sign: sign
    };
    http.send(res, 0, 'ok', ret);
});

app.get('/auth', function (req, res) {
    var account = req.query.account;
    var password = req.query.password;

    var info = db.get_account_info(account, password);
    if (info == null) {
        http.send(res, 1, "invalid account");
        return;
    }
    var account = "vivi_" + req.query.account;
    var sign = get_md5(account + req.ip + config.ACCOUNT_PRI_KEY);
    var ret = {
        account: account,
        sign: sign
    };

    http.send(res, 0, 'ok');
});
// var appInfo = {
//     Android: {
//         appid: "wx94f79e18781f0a24",
//         secret: "b678d22191c9c2bf4da209f76a6d81a6",
//     },
//     iOS: {
//         appid: "wx94f79e18781f0a24",
//         secret: "b678d22191c9c2bf4da209f76a6d81a6",
//     }
// };
var appInfo = {
    Android: {
        appid: "wx9db80ad310a80692",
        secret: "9b46137ab1d189b6a82f78120365de66"
    },
    iOS: {
        appid: "wx9db80ad310a80692",
        secret: "9b46137ab1d189b6a82f78120365de66"
    },
    H5: {
        appid: "wx440889d5e13b793a",			//laoli 1105, biyang gzh
        secret: "dbf8f8f13e18166a76d427034fa4b2fc"
    }
};
function get_access_token(code, os) {
    var info = appInfo[os];
    if (info == null) {
        return {err: 'haha'};
    }
    var data = {
        appid: info.appid,
        secret: info.secret,
        code: code,
        grant_type: "authorization_code"
    };
    return http.getSync("https://api.weixin.qq.com/sns/oauth2/access_token", data, true);
}

function get_state_info(access_token, openid) {
    var data = {
        access_token: access_token,
        openid: openid
    };

    return http.getSync("https://api.weixin.qq.com/sns/userinfo", data, true);
}
// 创建用户
function create_user(account, name, sex, headimgurl) {
    var configs = db.get_configs();
    var coins = configs.first_coins;
    var gems = configs.first_gems;

    var exist = db.is_account_exist(account);
    if (exist) {
        return db.update_user_info(account, name, headimgurl, sex);
    } else {
        return db.create_user(account, name, coins, gems, sex, headimgurl);
    }
}

wechat_loginrsp2 = function (req, res) {
    console.log(">> wechat_loginrsp2");
    wechat_loginrsp(req, res);
};

wechat_loginrsp = function (req, res) {		//laoli 1023
    console.log("wechat_loginrsp", req.query);
    var code = req.query.code;
    var os = req.query.os;
    if (code == null || code == "" || os == null || os == "") {
        http.send(res, -1, "unkown err 100.");
        return;
    }
    var atRet = get_access_token(code, os);
    if (atRet.err || atRet.data == null) {
        http.send(res, -1, "unkown err.");
        return;
    }
    var access_token = atRet.data.access_token;
    var atOpenId = atRet.data.openid;
    var userInfoRet = get_state_info(access_token, atOpenId);
    if (userInfoRet.err || userInfoRet.data == null) {
        http.send(res, -1, "unkown err.");
        return;
    }
    console.log("wechat_login OK");
    var openid = userInfoRet.data.openid;
    var unionid = "";
    var nickname = userInfoRet.data.nickname;
    var sex = userInfoRet.data.sex;
    var headimgurl = userInfoRet.data.headimgurl;
    var account = "wx_" + openid;
    if (userInfoRet.data.unionid) {
        unionid = userInfoRet.data.unionid;
        var oldaccount = account;
        account = "wx_" + userInfoRet.data.unionid;
        db.replace_account(oldaccount, account);
    }
    create_user(account, nickname, sex, headimgurl);
    db.add_user_info(account, openid, unionid, os);
    var sign = crypto.md5(account + config.ACCOUNT_PRI_KEY);
    var ret = {
        openid: openid,
        unionid: unionid,
        account: account,
        halladdr: hallAddr,
        hallSo: hallSoAddr,
        sign: sign
    };
    http.send(res, 0, 'ok', ret);
};
app.get('/wechat_login', wechat_loginrsp);			// laoli 1023
app.get('/wechat_login2', wechat_loginrsp2);		// laoli 1023

app.get('/base_info', function (req, res) {
    var userid = req.query.userid;
    var data = db.get_user_base_info(userid);
    if (!data) {
        http.send(res, 1, 'failed');
        return;
    }

    var ret = {
        name: data.name,
        sex: data.sex,
        headimgurl: data.headimg,
        lv: data.lv,
    };
    http.send(res, 0, 'ok', ret);
});

//对外接口密钥
var KEY = 'udd98765dhiiwqsxg';

app.get('/api/get_user_id', function (req, res) {
    var unionid = req.query.unionid;
    var sign = req.query.sign;
    if (!unionid || !sign) {
        http.send(res, 1, "invalid parameters.");
        return;
    }

    var serverSign = crypto.md5(unionid + KEY);
    if (serverSign != sign) {
        http.send(res, 2, "invalid sign.");
        return;
    }
    var account = 'wx_' + unionid;

    var data = db.get_user_data(account);
    if (!data) {
        create_user(account, '', 0, '');
        var data = db.get_user_data(account);
        if (!data) {
            http.send(res, 3, "can't find user by given unionid.");
            return;
        }
    }

    http.send(res, 0, 'ok', {user_id: data.userid, coins: data.coins, gems: data.gems});
});

app.get('/api/recharge', function (req, res) {
    var user_id = req.query.user_id;
    var type = parseInt(req.query.type);
    var value = parseInt(req.query.value);
    var sign = req.query.sign;

    if (!user_id || (type != 1 && type != 2) || !value || !sign) {
        http.send(res, 1, "invalid parameters.");
        return;
    }

    var serverSign = crypto.md5(user_id + type + value + KEY);
    if (serverSign != sign) {
        http.send(res, 2, "invalid sign.");
        return;
    }

    var data = db.get_user_data_by_userid(user_id);
    if (data == null) {
        http.send(res, 3, "invalid user_id.");
        return;
    }

    if (type == 1) {
        var ret = db.add_user_coins(user_id, value, cashChangeReasons.ADD_USER_RECHARGING);
        var data = db.get_user_data_by_userid(user_id);
        var result = ret ? 1 : 0;
        http.send(res, 0, 'ok', {result: result, coins: data.coins, gems: data.gems});
    }
    else if (type == 2) {
        var ret = db.add_user_gems(user_id, value, cashChangeReasons.ADD_USER_RECHARGING);
        var data = db.get_user_data_by_userid(user_id);
        var result = ret ? 1 : 0;
        http.send(res, 0, 'ok', {result: result, coins: data.coins, gems: data.gems});
    }
});
