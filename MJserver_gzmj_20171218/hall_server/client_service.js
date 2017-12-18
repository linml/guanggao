require('../utils/sys');
var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/dbsync');
var http = require('../utils/http');
var room_service = require("./room_service");
var fibers = require('fibers');
var comdef = require('../utils/common');
var txh = require('./txhports');
var hallUsermgr = require("./hall_usermgr");
var httpsvr = require('http');
var email_manage = require('./email_manage');
var hall_socket = require("./hall_socket_service");

var app = express();
var config = null;
var mSvr = null;
var g_Event = null

function check_account(req, res) {
    var account = req.query.account;
    var sign = req.query.sign;
    if (account == null || sign == null) {
        http.send(res, -1, "unknown error");
        return false;
    }

    var serverSign = crypto.md5(account + config.ACCOUNT_PRI_KEY);
    if (serverSign != sign) {
        http.send(res, 10, "verify sign failed.");
        return false;
    }
    return true;
}

//设置跨域访问
app.all('*', function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1');
    res.header("Content-Type", "application/json;charset=utf-8");
    fibers(function () {
        next();
    }).run();
});

app.get('/authh', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var ip = req.get('X-Real-IP');
    if (ip == null || ip == '') {
        ip = req.ip;
    }
    if (ip.indexOf("::ffff:") != -1) {
        ip = ip.substr(7);
    }
    var account = req.query.account;
    var active = "authh"; //add gl 11/22
    var os = 'null';
    db.add_user_action(account, os, active, ip);
    var data = db.get_user_data(account);
    if (data == null) {
        http.send(res, 0, 'ok');
        return;
    }

    if (data.enable != 1) {
        http.send(res, -4, 'user is disabled.');
        return;
    }
    //设置最近登录时间
    db.update_user_login_time(data.userid);

    var maxShareAwards = db.get_max_share_awards();
    var dealer_state = db.get_dealer_state(data.userid);
    var ret = {
        account: data.account,
        userid: data.userid,
        name: data.name,
        lv: data.lv,
        exp: data.exp,
        coins: data.coins,
        gems: data.gems,
        ip: ip,
        sex: data.sex,
        invitor: data.invitor,
        max_share_awards: maxShareAwards,
        dealer_state: dealer_state
    };

    var roomId = db.get_room_id_of_user(data.userid);
    //如果用户处于房间中，则需要对其房间进行检查。 如果房间还在，则通知用户进入
    if (roomId == null) {
        http.send(res, 0, "ok", ret);
        return;
    }

    //检查房间是否存在于数据库中
    var retval = db.is_room_exist(roomId);
    if (!retval) {
        //如果房间不在了，表示信息不同步，清除掉用户记录
        roomId = null;
        db.set_room_id_of_user(data.userid, null);
    }
    ret.roomid = roomId;
    http.send(res, 0, "ok", ret);
});

app.get('/create_user', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var account = req.query.account;
    var name = req.query.name;
    var sex = 0;
    if (req.query.sex) {
        sex = req.query.sex;
    }
    var configs = db.get_configs();
    var coins = configs.first_coins;
    var gems = configs.first_gems;

    var exist = db.is_account_exist(account);
    if (exist) {
        http.send(res, 1, "account have already exist.");
        return;
    }

    var ret = db.create_user(account, name, coins, gems, sex, null);
    if (!ret) {
        http.send(res, 2, "system error.");
    } else {
        http.send(res, 0, "ok");
    }
});

app.get('/create_private_room', function (req, res) {
    //验证参数合法性
    var data = req.query;
    //验证玩家身份
    if (!check_account(req, res)) {
        return;
    }

    var account = data.account;

    data.account = null;
    data.sign = null;
    var conf = data.conf;
    var data = db.get_user_data(account);
    if (data == null) {
        http.send(res, 1, "system error");
        return;
    }
    var userId = data.userid;
    var name = data.name;
    var roomId = null;
    var confObj = JSON.parse(conf);
    if (confObj.for_others != true) {
        //验证玩家状态
        roomId = db.get_room_id_of_user(userId);
        if (!roomId) {
            if (!db.is_room_exist(roomId)) {
                roomId = null;
            }
        }
    }
    if (roomId == null) {
        //创建房间
        var rets = room_service.createRoom(account, userId, conf);
        var err = rets[0];
        roomId = rets[1];
        if (err != 0 || roomId == null) {
            if (err == 2) {
                http.send(res, 2222, "钻石不足");
            } else {
                http.send(res, err, "create failed.");
            }
            return;
        }
    }

    http.send(res, 0, "ok", {roomid: roomId});
    /*
     var rets = room_service.enterRoom(userId,name,roomId);
     var errcode = rets[0];
     var enterInfo = rets[1];
     if(errcode){
     http.send(res,errcode,"room doesn't exist.");
     return;
     }
     var ret = {
     roomid:roomId,
     ip:enterInfo.ip,
     port:enterInfo.port,
     token:enterInfo.token,
     time:Date.now()
     };
     ret.sign = crypto.md5(ret.roomid + ret.token + ret.time + config.ROOM_PRI_KEY);
     http.send(res,0,"ok",ret);
     */
});

app.get('/enter_private_room', function (req, res) {
    var ip = req.get('X-Real-IP');
    if (ip == null || ip == '') {
        ip = req.ip;
    }
    if (ip.indexOf("::ffff:") != -1) {
        ip = ip.substr(7);
    }
    var data = req.query;
    var roomId = data.roomid;
    if (roomId == null) {
        http.send(res, -1, "parameters don't match api requirements.");
        return;
    }
    if (!check_account(req, res)) {
        return;
    }
    var account = data.account;
    var data = db.get_user_data(account);
    if (data == null) {
        http.send(res, -1, "system error");
        return;
    }
    var userId = data.userid;
    var name = data.name;
    //已数据库房间号为准
    var dbRoomId = db.get_room_id_of_user(userId);
    if (dbRoomId != null && db.is_room_exist(dbRoomId)) {
        roomId = dbRoomId;
    }

    //验证玩家状态
    //todo
    //进入房间
    var rets = room_service.enterRoom(userId, name, roomId, ip);
    var errcode = rets[0];
    var enterInfo = rets[1];
    if (errcode == 0) {
        var ret = {
            roomid: roomId,
            ip: enterInfo.ip,
            port: enterInfo.port,
            token: enterInfo.token,
            time: Date.now()
        };
        ret.sign = crypto.md5(roomId + ret.token + ret.time + config.ROOM_PRI_KEY);
        http.send(res, 0, "ok", ret);
    } else {
        http.send(res, errcode, "enter room failed.");
    }
});

app.get('/get_bill_list', function (req, res) {
    var data = req.query;
    if (!check_account(req, res)) {
        return;
    }
    var account = data.account;
    var data = db.get_user_data(account);
    if (data == null) {
        http.send(res, -1, "system error");
        return;
    }
    var userId = data.userid;
    var bills = db.get_bills(userId);
    http.send(res, 0, "ok", {bills: bills});
});

app.get('/get_history_list', function (req, res) {
    var data = req.query;
    console.log("get_history_list data:", data);
    if (!check_account(req, res)) {
        return;
    }
    var account = data.account;
    var userData = db.get_user_data(account);
    if (userData == null) {
        http.send(res, -1, "system error");
        return;
    }
    var userId = userData.userid;
    var history = db.get_user_history(userId);
    var namemap = null;
    if (history) {
        var arr = [];
        for (var k in history) {
            for (var i = 0; i < 4; ++i) {
                var uid = history[k]['user_id' + i];
                if (arr.indexOf(uid) == -1) {
                    arr.push(uid);
                }
            }
        }
        namemap = db.get_multi_names(arr);
    }
    http.send(res, 0, "ok", {history: history, namemap: namemap});
});

app.get('/get_games_of_room', function (req, res) {
    var data = req.query;
    var uuid = data.uuid;
    if (uuid == null) {
        http.send(res, -1, "parameters don't match api requirements.");
        return;
    }
    if (!check_account(req, res)) {
        return;
    }
    var data = db.get_games_of_room(uuid);
    http.send(res, 0, "ok", {data: data});
});

app.get('/get_detail_of_game', function (req, res) {
    var data = req.query;
    var uuid = data.uuid;
    var index = data.index;
    if (uuid == null || index == null) {
        http.send(res, -1, "parameters don't match api requirements.");
        return;
    }
    if (!check_account(req, res)) {
        return;
    }
    var data = db.get_detail_of_game(uuid, index);
    http.send(res, 0, "ok", {data: data});
});

app.get('/get_user_status', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var account = req.query.account;
    var data = db.get_gems(account);
    if (data != null) {
        http.send(res, 0, "ok", {gems: data.gems, coins: data.coins});
    }
    else {
        http.send(res, 1, "get gems failed.");
    }
});

app.get('/get_message', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var type = req.query.type;

    if (type == null) {
        http.send(res, -1, "parameters don't match api requirements.");
        return;
    }

    var version = req.query.version;
    var data = db.get_message(type, version);
    if (data != null) {
        http.send(res, 0, "ok", {msg: data.msg, version: data.version});
    }
    else {
        http.send(res, 1, "get message failed.");
    }
});

app.get('/get_shop_data', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var shopid = req.query.shopid;
    shopid = parseInt(shopid);
    if (!shopid) {
        http.send(res, -1, "parameters don't match api requirements.");
        return;
    }

    var data = db.get_shop_data(shopid);
    if (data != null) {
        http.send(res, 0, "ok", {data: data});
    }
    else {
        http.send(res, 1, "get message failed.");
    }
});

app.get('/get_billboard_data', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }

    var userdata = db.get_user_data(req.query.account);

    var type = req.query.type;
    type = parseInt(type);
    if (type < 0 || type > 2) {
        http.send(res, -1, "parameters don't match api requirements.");
        return;
    }

    var selfdata = null;
    var list = null;

    if (type == 0) {
        list = db.get_top_list_of_rmb_cost();
        selfdata = db.get_total_rmb_cost(userdata.userid);
    }
    else if (type == 1) {
        list = db.get_top_list_of_coins();
        selfdata = {userid: userdata.userid, coins: userdata.coins};
    }
    else {
        list = db.get_top_list_of_wins();
        selfdata = db.get_total_wins(userdata.userid);
    }

    http.send(res, 0, "ok", {data: {list: list, self: selfdata}});
});

app.get('/is_server_online', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var ip = req.query.ip;
    var port = req.query.port;
    var isonline = room_service.isServerOnline(ip, port);
    var ret = {
        isonline: isonline
    };
    http.send(res, 0, "ok", ret);
});

//绑定邀请者得房卡
app.get('/bind_invitor', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }

    var account = req.query.account;
    var invitorId = parseInt(req.query.invitor);
    if (invitorId <= 0 || isNaN(invitorId)) {
        return;
    }

    var userdata = db.get_user_data(account);
    if (!userdata) {
        http.send(res, -1, "invalid userid");
    }

    if (userdata.userid == invitorId) {
        http.send(res, 1, "can't bind yourself");
        return;
    }

    if (!db.is_dealer(invitorId)) {
        http.send(res, 2, "invalid userid");
        return;
    }

    var configs = db.get_configs();
    var bonusGems = 8;
    if (configs && configs.bind_invitor_gems != null) {
        bonusGems = configs.bind_invitor_gems;
    }

    var ret = db.bind_invitor(account, invitorId, bonusGems);
    if (!ret) {
        http.send(res, 3, "has bond");
        return;
    }

    http.send(res, 0, "ok", {deltagems: bonusGems});
});

//提交推广员资料
app.get('/request_dealer', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    var account = req.query.account;

    var userdata = db.get_user_data(account);
    if (!userdata) {
        http.send(res, 1, "system error.");
        return;
    }

    var data = req.query.data;
    try {
        data = JSON.parse(data);
    } catch (error) {
        http.send(res, -1, "invalid data.");
        return;
    }
    var state = db.get_dealer_state(userdata.userid);
    if (state > 0 && data) {
        http.send(res, 2, "has_request_dealer");
        return;
    }
    else if (state != 0 && !data) {
        http.send(res, 3, "unknown error.");
        return;
    }

    if (data) {

        var real_name = data.real_name;
        var id_card = data.id_card;
        var phone_number = data.phone_number;
        var qq = data.qq;
        var weichat = data.weichat;
        var desc = data.desc;

        var ret = db.create_dealer(userdata.userid, real_name, id_card, phone_number, qq, weichat, desc);
        if (!ret) {
            http.send(res, 4, "db error");
            return;
        }
    }
    else {
        var ret = db.update_dealer_state(userdata.userid, 1);
        if (!ret) {
            http.send(res, 5, "db error");
            return;
        }
    }
    http.send(res, 0, "ok");
});

/**
 * 获取所有广告内容
 */
app.get('/get_ads_list', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }

    var data = db.get_ads_contents();
    if (data != null) {
        http.send(res, 0, "ok", {ads_list: data});
    }
    else {
        http.send(res, 1, "get ads texts failed.");
    }
});

app.get('/get_promotion_info', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }

    var data = db.get_configs();
    if (data != null) {
        http.send(res, 0, "ok", {info: data.promotion_page_info});
    }
    else {
        http.send(res, 1, "get message failed.");
    }
});

app.get('/buy_item', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }

    var userdata = db.get_user_data(req.query.account);
    if (!userdata) {
        return;
    }

    var itemId = req.query.itemid;
    itemId = parseInt(itemId);

    var data = db.get_shop_item(itemId);
    if (!data) {
        http.send(res, 1, "invalid item id");
        return;
    }

    //只能是钻石购买
    if (data.price_type != 2) {
        http.send(res, 3, 'not use gem');
        return;
    }

    //只能购买金币
    if (data.gain_type != 1) {
        http.send(res, 4, 'gain not coin');
        return;
    }

    if (userdata.gems <= data.price) {
        http.send(res, 5, 'gems are not enough.');
        return;
    }

    var ret = db.gems_buy_coins(userdata.userid, data.price, data.gain);
    if (ret) {
        var userdata = db.get_user_data(req.query.account);
        http.send(res, 0, "ok", {gems: userdata.gems, coins: userdata.coins});
    }
    else {
        http.send(res, 2, "error.");
    }
});

/**
 * 分享成功
 */
app.get('/share_successfully', function (req, res) {
    //检查账号和签名是否一致
    if (!check_account(req, res)) {
        return;
    }
    //取得账号
    var account = req.query.account;
    var isShiDong = false;
    if (req.query.ereh == crypto.md5("GnodIhsSi!")) {
        isShiDong = true;
    }
    var gemsC = req.query.csmeg;
    console.log("share_successfully isAppleCheck:", config.isAppleCheck);
    if (config.isAppleCheck != true) {
        isShiDong = false;
    }
    //取得配置以及账号数据
    var confData = db.get_configs();
    var accountData = db.get_user_data(account);
    if (null == confData ||
        null == accountData ||
        null == accountData.userid) {
        http.send(res, 1, "can't get config or account data.");
        return;
    }

    //取得用户ID
    var userId = accountData.userid;

    //判定玩家是否可领取分享奖励
    //获取用户分享奖励数据
    var ret = db.get_user_share_data(userId);
    if (isShiDong == false && ret.err) {
        http.send(res, 2, "get share data error.");
        return;
    }

    var lockId = 0;
    //是否可获得奖励
    var canGetAwards = false;
    //是否是新的一天
    var isNewDay = false;

    //有记录，则领取过，则判断是否可以再次领取
    if (ret.data) {
        lockId = ret.data.lockid;

        //获取当前分享次数和上一次分享时间
        var lastShareTime = ret.data.lastsharetime;
        var sharecount = ret.data.sharecount;

        //当前日期的00:00:00的时间戳
        var today = new Date();
        var dateStr = '{0}-{1}-{2} {3}:{4}:{5}';
        dateStr = dateStr.format(today.getFullYear(), today.getMonth() + 1, today.getDate(), 0, 0, 0);
        var curZeroTime = Date.parse(dateStr) * 0.001;

        //今天没有分享过，则不比较次数，否则比较次数
        isNewDay = curZeroTime > lastShareTime;
        canGetAwards = (isNewDay || sharecount < confData.max_share_times);
    } else {
        //没有记录，则是第一次分享，创建一条记录
        db.create_user_share_data(userId);
        canGetAwards = true;
    }
    if (isShiDong == true) {
        db.add_user_gems(userId, gemsC, "苹果商店审核，特批接口：" + userId + "钻" + gemsC);
        http.send(res, 0, "ok", {award_gems: gemsC, gems: db.get_gems(account)});
        return;
    } else {
        //领取奖励
        if (true == canGetAwards) {
            //生成奖励等级概率
            var rankProb = parseInt(Math.random() * 10000);

            //获取三个奖励等级分别对应的概率
            var rank1Prob = confData.award1_probability;
            var rank2Prob = confData.award2_probability;
            var rank3Prob = confData.award3_probability;

            //获取随机奖励等级
            var rank = 1;
            if (rankProb > 0 && rankProb <= rank1Prob) {
                rank = 1;
            }
            else if (rankProb > rank1Prob && rankProb <= (rank1Prob + rank2Prob)) {
                rank = 2;
            }
            else if (rankProb > (rank1Prob + rank2Prob) && rankProb <= (rank1Prob + rank2Prob + rank3Prob)) {
                rank = 3;
            }

            //获取对应等级最低和最高奖励数量
            var minAward = confData['award' + rank + '_min'];
            minAward = minAward ? minAward : 0;
            var maxAward = confData['award' + rank + '_max'];
            maxAward = maxAward ? maxAward : 10;

            //在最低最高之间生成奖励数量
            var award = parseInt(Math.random() * (maxAward - minAward) + minAward);
            //inc share count
            if (db.inc_user_share_count(userId, lockId, isNewDay)) {
                //add gems
                db.add_user_gems(userId, award, comdef.CASH_CHANGE_RESONS.ADD_SHARE_GAME);
            }

            http.send(res, 0, "ok", {award_gems: award, gems: db.get_gems(account)});
            return;
        }

    }
    http.send(res, 3, "no award today.");
});

/////////////////////////===============
app.get('/get_user_base_info', function (req, res) {
    var data = req.query;
    var userId = data.userId;
    var ss = db.get_user_history(userId);
    http.send(res, 100, ss);
    return;
})
/////////////////////////============txh================/////////////////////////
//玩家创建牌友会；
app.get('/txh_creat_txh', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.creat_association(req, res, http);
});
//会长同意成员添加成员接口；//暂时没用
// app.get('/txh_add_member',function(req,res){
//     // if (!check_account(req, res)) {
//     //     return;
//     // }
//     txh.add_member(req,res,http);
// })
//会长删除成员接口：
app.get('/txh_dele_user', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.txh_dele_user(req, res, http);
});
//查询成员表
app.get('/txh_member_search_txh', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.txh_member_search_txh(req, res, http);
})

//查询同乡会表由 同乡会id 查询数据；
app.get('/txh_search_txh_all_data', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.search_txh_all_data(req, res, http);
})
//会长封玩家为副会长；
app.get('/txh_set_vicechairman', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.set_vicechairman(req, res, http);
})

//会长修改牌友会；
app.get('/txh_change_txh_info', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.t_change_txh_info(req, res, http);
})

//会长解除玩家为副会长；
app.get('/txh_fire_user_post', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.fire_user_post(req, res, http);
})
//成员退出同乡会；
app.get('/txh_user_sign_out_txh', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.user_sign_out_txh(req, res, http);
})

//会长删除同乡会；
app.get('/txh_hz_del_txh', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.hz_del_txh(req, res, http);
})

//查询同乡会所有成员；
app.get('/txh_all_member', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.all_member(req, res, http);
})

//会长创建房间标记房间为同乡会房间；
app.get('/txh_txh_create_room', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.t_txh_create_room(req, res, http);
})

//成员查询桐乡会房间；
app.get('/txh_search_txh_room', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.t_search_txh_room(req, res, http)
})

//同乡会email发送接口；
app.get('/all_email_send_port', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    email_manage.t_email_send_port(req, res, http);
})

//email 查询接口；
app.get('/all_email_find_port', function (req, res) {
    if (!check_account(req, res)) {
        // http.send(res, 1000, "error sign");
        return;
    }
    email_manage.all_email_find_port(req, res, http);

})
app.get('/txh_check_permissions', function (req, res) {
    if (!check_account(req, res)) {
        //http.send(res, 1000, "error sign");
        return;
    }
    txh.t_check_permissions(req, res, http);
})

//查询房间详情
app.get('/txh_search_room_detail', function (req, res) {
    if (!check_account(req, res)) {
        //http.send(res, 1000, "error sign");
        return;
    }
    txh.t_search_room_detail(req, res, http);
})
//查询pyh历史房间的接口；
app.get('/txh_txh_room_history', function (req, res) {
    if (!check_account(req, res)) {
        //http.send(res, 1000, "error sign");
        return;
    }
    txh.t_txh_room_history(req, res, http);
})
//查询牌友会缺角房间；
app.get('/txh_que_jiao_room', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.t_que_jiao_room(req, res, http);
})

//查询玩家加入牌友会数目；
app.get('/txh_user_join_pyh_num', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.t_user_join_pyh_num(req, res, http);
})
//使用email 的 infonum 查询email info;

app.get('/all_infonum_chack_email', function (req, res) {
    if (!check_account(req, res)) {

        return;
    }
    email_manage.all_infonum_chack_email(req, res, http);
})

//查询用户地址；
app.get('/t_user_address_find', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    email_manage.t_user_address_find(req, res, http);
})

//判断房间是否为牌友会的房间；
app.get('/t_pd_is_pyh_room', function (req, res) {
    if (!check_account(req, res)) {
        return;
    }
    txh.t_pd_is_pyh_room(req, res, http);
})
// 积分排名.GuoLin 20171216.
app.get('/t_menber_rink_port',function(req,res){
    if (!check_account(req, res)) {
        return;
    }
    txh.menber_rink_port(req,res,http);
})

exports.getSvr = function () {
    return mSvr;
}
exports.start = function ($config, $gevent) {
    config = $config;
    g_Event = $gevent;
    // console.log("[cs]gevent:", g_Event)
    //app.listen(config.CLEINT_PORT);
    mSvr = httpsvr.createServer(app);
    mSvr.listen(config.CLEINT_PORT);
    console.log("client service is listening on port " + config.CLEINT_PORT);
    g_Event.on("testevent", function (foo, bar) {
        //console.log("第1个监听事件,参数foo=" + foo + ",bar="+bar );
    });
    //console.log("[cs]gevent2:", g_Event)
    g_Event.emit("testevent", 'Wilson', "guolin");
    return app;
};
