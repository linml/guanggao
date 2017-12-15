var crypto = require('../utils/crypto');
var express = require('express');
var db = require('../utils/dbsync');
var http = require('../utils/http');
var fibers = require('fibers');
var common = require('../utils/common');
var CASH_CHANGE_RESONS = common.CASH_CHANGE_RESONS;

var app = express();
var config = null;

/**
 * 解析number数据
 */
function parse2Int(val, defaultVal) {
    var tmp = parseInt(val);
    tmp = isNaN(tmp) ? defaultVal : tmp;
    return tmp;
}

/**
 * 获取今日0点时间戳
 */
function getZeroTimeOfToday() {
    //当前日期的00:00:00的时间戳
    var today = new Date();
    var dateStr = '{0}-{1}-{2} {3}:{4}:{5}';
    dateStr = dateStr.format(today.getFullYear(), today.getMonth() + 1, today.getDate(), 0, 0, 0);
    return Math.floor(Date.parse(dateStr) * 0.001);
}

/**
 * 获取URL
 * @param {String} host - 主机地址
 * @param {Number} port - 主机端口
 * @param {String} path - 路径
 */
function getUrl(host, port, path) {
    if (host == null || port == null) {
        console.log('[ERR] - host or port is null at getUrl');
        return '';
    }

    path = path ? path : '';
    return 'http://' + host + ':' + port + path;
}

// 排序枚举，1升序，2降序
var ASC = 1;
var DESC = 2;
/**
 * 生成排序函数，默认降序
 * @param {Number} sortType - 排序方式
 * @param {String} attr - 指定排序属性，不指定则是元素本身
 */
function getSortFunc(sortType, attr) {
    sortType = sortType ? sortType : DESC;
    attr = (attr === '') ? null : attr;

    return function (a, b) {
        var item1 = attr ? a[attr] : a;
        var item2 = attr ? b[attr] : b;
        if (item1 > item2) {
            return 1 * (sortType == ASC ? 1 : -1);
        } else if (item1 < item2) {
            return -1 * (sortType == ASC ? 1 : -1);
        }

        return 0;
    };
}

/**
 * 设置跨域访问
 */
app.all('*', function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
	res.header("X-Powered-By", '3.2.1');
	res.header("Content-Type", "application/json;charset=utf-8");

	fibers(function () {
		next();
	}).run();
});

////////////////////////////////////////////////////Dealer API BEGIN
/**
 * 获取玩家数据
 */
app.get('/get_user_info', function(req, res) {
    var userId = parse2Int(req.query.user_id, null);
    var start = parse2Int(req.query.start, null);
    var rows = parse2Int(req.query.rows, null);
    var filterHistory = parse2Int(req.query.filter_history, null);

    var ret =  {};
    if (userId != null) {
        ret = db.get_user_base_info(userId);
        if (ret == null) {
            var err = ACC_ERRS.GET_ACC_INFO_FAILED;
            http.send(res, err.code, err.msg);
            return;
        }
    }

    //获取所有游戏记录
    var histories = [];
    if (filterHistory == 1) {
	    ret.histories = { cnt: 0, list: histories };
	    http.send(res, 0, 'ok', ret);
	    return;
	}

    var datas = db.get_user_history(userId);
    if (datas != null) {
        for (var dataIdx in datas) {
            var data = datas[dataIdx];
            var baseInfo = JSON.parse(data.base_info);
            var creatorInfo = db.get_user_base_info(baseInfo.creator);
            var item = {
                time: data.create_time,
                room_id: data.id,
                base_info: data.base_info,
                creator_name: creatorInfo ? creatorInfo.name : '',
            };

            for (var idx = 0; idx < 4; idx++) {
                var seatUserId = data['user_id' + idx];
                var seatUserScore = data['user_score' + idx];
                item['user_id' + idx] = seatUserId;
                item['user_score' + idx] = seatUserScore;

                var info = db.get_user_base_info(seatUserId);
                item['user_name' + idx] = info ? info.name : '';
            }

            histories.push(item);
        }
    }

    histories.sort(getSortFunc(DESC, 'create_time'));
    //function (a, b) {
    //     return a.create_time > b.create_time;
    // })

    var cnt = histories.length;
    
    if (start != null && rows != null) {
        start = start < 0 ? 0 : start;
        rows = rows < 0 ? 0 : rows;
        histories = histories.slice(start, start + rows);
    }

    ret.histories = { cnt: cnt, list: histories };
    var err = RET_OK;
    http.send(res, err.code, err.msg, ret);
});

/**
 * 查询代理直属玩家列表
 */
app.get('/get_userlist_by_bind_agents', function(req, res) {
    var agents = req.query.agents;

    var start = parse2Int(req.query.start, null);
    var rows = parse2Int(req.query.rows, null);
    var startTime = parse2Int(req.query.start_time, null);
    var endTime = parse2Int(req.query.end_time, null);

    if (agents == null) {
        var err = SYS_ERRS.INVALID_PARAMETER;
        http.send(res, err.code, err.msg);
        return;
    }

    agents = JSON.parse(agents);

    var ret = {};
    var users = db.get_users_by_agent(agents, start, rows);
    if (users != null) {
        for (var userIdx in users) {
            var user = users[userIdx];
            if (ret[user.agent_id] == null) {
                ret[user.agent_id] = {};
            }
            var list = ret[user.agent_id];
            list[user.userid] = { total_pay: 0 };
        }
    }

    var pays = db.get_user_pays_by_agents(agents, startTime, endTime);
    if (pays != null) {
        for (var payIdx in pays) {
            var pay = pays[payIdx];
            if (pay.user_id == null || pay.total_pay == null) {
                continue;
            }
            
            var data = ret[pay.agent_id];
            if (data) {
                data[pay.user_id] = { total_pay: pay.total_pay };
            } else {
                var list = {};
                list[pay.user_id] = { total_pay: pay.total_pay };
                ret[pay.agent_id] = list;
            }
        }
    }

    for (var userIdx in agents) {
        var agentId = agents[userIdx];
        var num = db.get_users_num_by_agent(agentId);
        var item = ret[agentId];
        if (item) {
            item.all = num;
        }
    }

    http.send(res, 0, 'ok', ret);
});

/**
 * 给玩家充值
 */
app.get('/add_user_gems', function (req, res) {
    var userId = parse2Int(req.query.user_id, null);
    var gems = parse2Int(req.query.gems, null);
    if (userId == null || gems == null) {
        var err = SYS_ERRS.INVALID_PARAMETER;
        http.send(res, err.code, err.msg);
    }

    var operatsrc = req.query.operatsrc;
    var operator = req.query.operator;
    var suc = db.add_user_gems(userId, gems, operatsrc + ':' + operator + '修改房卡');
    if (suc) {
        var err = RET_OK;
        http.send(res, err.code, err.msg);
    } else {
        var err = GAME_ERRS.ADD_GEMS_FAILED
        http.send(res, err.code, err.msg);
    }
});
//////////////////////////////////////////////////////////////Dealer API END

//////////////////////////////////////////////////////////////Manage API BEGIN
/**
 * 获取游戏统计数据：总注册人数，当日注册人数，在玩房间数量，充值钻石总数，在线人数
 */
app.get('/get_game_statistics', function (req, res) {
    // 获取玩家列表
    var userList = db.get_user_list();

    // 总注册人数
    var totalRegPlayers = 0;

    // 今日注册人数
    var todayRegPlayers = 0;

    if (userList) {
        // 获取总注册人数
        totalRegPlayers = userList.length;

        // 获取今日注册人数
        var startTime = getZeroTimeOfToday();
        var endTime = Math.floor(Date.now() * 0.001);

        // 过滤注册时间
        for (var idx in userList) {
            var userData = userList[idx];
            if (userData == null ||
                userData.create_time < startTime || 
                userData.create_time > endTime) {
                continue;
            }

            todayRegPlayers += 1;
        }
    }

    // 获取充钻总数
    // TODO:接口暂时未实现，用0填充
    var totalGems = 0;

    // 获取活跃房间数与在线人数
    var url = getUrl(config.GAME_IP, config.GAME_PORT, '/get_online_rooms_and_players');
    var ret = http.getSync(url, { playing: 1 });

    var totalPlayingRooms = 0;
    var totalOnlinePlayers = 0;
    if (ret && ret.data) {
        totalPlayingRooms = ret.data.rooms ? ret.data.rooms.length : 0;
        totalOnlinePlayers = ret.data.players ? ret.data.players.length : 0;
    }

    http.send(res,
        0,
        'ok',
        {
            statistics:
            {
                num_total_reg_players: totalRegPlayers,
                num_today_reg_players: todayRegPlayers,
                num_online_players: totalOnlinePlayers,
                num_playing_rooms: totalPlayingRooms,
                num_total_charge: totalGems,
            },
        });
});

/**
 * 获取玩家充钻总数
 */
app.get('/player_buy_gems_all', function (req, res) {
    //充值钻石总数 2 - gems
    var totalGems = db.get_total_pay(2);
    http.send(res, 0, 'ok', { buy_gems_all: totalGems });
});

/**
 * 获取玩家列表
 */
app.get('/get_user_list', function (req, res) {
    // 获取参数
    var userId = parse2Int(req.query.user_id, null);
    var start = parse2Int(req.query.start, null);
    var rows = parse2Int(req.query.rows, null);
    // 排序数据，1-金币，2-钻石
    var sortParam = parse2Int(req.query.sort_param, null);
    // 排序方式，2-降序，1-升序
    var sortType = parse2Int(req.query.sort_type, null);

    // 获取玩家列表
    var userList = db.get_user_list(userId);

    var cnt = userList.length;

    // 排序
    var sortFunc = null;
    if (sortType != null && sortParam != null) {
        var attr = 'coins';
        if (sortParam == 2) {
            attr = 'gems';
        }
        sortFunc = getSortFunc(sortType, attr);
    }

    if (sortFunc) {
        userList.sort(sortFunc);
    }
    
    // 分页
    if (start != null && rows != null) {
        start = start < 0 ? 0 : start;
        rows = rows < 0 ? 0 : rows;
        userList = userList.slice(start, start + rows);
    }

    for (var idx in userList) {
        var user = userList[idx];
        user.name = crypto.fromBase64(user.name);
    }

    http.send(res, 0, 'ok', { users: { cnt: cnt, list: userList } });
});

/**
 * 获取已结束房间数据
 */
app.get('/get_finished_rooms', function (req, res) {
    // 解析参数
    var roomId = parse2Int(req.query.room_id, null);
    var start = parse2Int(req.query.start, null);
    var rows = parse2Int(req.query.rows, null);
    var startTime = parse2Int(req.query.start_time, null);
    var endTime = parse2Int(req.query.end_time, null);

    // 取得已结束房间数据列表
    var finishedRooms = db.get_finished_rooms(roomId, startTime, endTime);

    // 分页处理
    var cnt = finishedRooms.length;
    if (start != null && rows != null) {
        start = start < 0 ? 0 : start;
        rows = rows < 0 ? 0 : rows;
        finishedRooms = finishedRooms.slice(start, start + rows);
    }

    // 返回结果
    http.send(res, 0, 'ok', { finished_rooms: { cnt: cnt, list: finishedRooms } });
});

/*
app.get('/get_online_rooms', function (req, res) {
    var start = parse2Int(req.query.start, null);
    var rows = parse2Int(req.query.rows, null);

    var url = 'http://' + config.GAME_IP + ':' + config.GAME_PORT + '/get_online_rooms';
    var retData = http.getSync(url);
    var rooms = retData.data ? retData.data.rooms : [];

    rooms = rooms ? rooms : [];
	rooms.sort(function (a, b) {
        return a.createTime > b.createTime;
    });
    
    var cnt = rooms.length;
    if (start != null && rows != null) {
        start = start < 0 ? 0 : start;
        rows = rows < 0 ? 0 : rows;
        rooms = rooms.slice(start, start + rows);
    }

    http.send(res, 0, 'ok', { rooms: {cnt: cnt, list: rooms } });
});

app.get('/dissolve_online_room', function (req, res) {
    var roomId = parse2Int(req.query.room_id, null);
    
    if (roomId == null) {
        var err = SYS_ERRS.INVALID_PARAMETER;
        http.send(res, err.code, err.msg);
        return;
    }

    var reqData = {
        room_id: roomId,
    };

    var url = 'http://' + config.GAME_IP + ':' + config.GAME_PORT + '/dissolve_online_room';
    var retData = http.getSync(url, reqData);

    http.send(res, retData.data.errcode, retData.data.errmsg);
});
*/

/**
 * 封禁/解封玩家账号
 */
app.get('/lock_user', function (req, res) {
    //玩家ID
    var userId = req.query.user_id;
    //封禁/解封 0 - 封禁，1 - 解封
    var enable = parse2Int(req.query.enable, null);

    if (userId == null || enable == null) {
        var err = SYS_ERRS.INVALID_PARAMETER;
        http.send(res, err.code, err.msg);
        return;
    }

    enable = enable < 0 ? 0 : enable;
    enable = enable > 1 ? 1 : enable;

    if (db.enableUser(userId, enable) == false) {
        http.send(res, -3, 'enable user failed');
        return;
    }

    http.send(res, 0, 'ok');
});

/**
 * 取得玩家消费记录
 */
app.get('/get_gem_consume_records', function (req, res) {
    var userId = parse2Int(req.query.user_id, null);
    var start = parse2Int(req.query.start, null);
    var rows = parse2Int(req.query.rows, null);

    var gemsList = db.get_gem_consume_records(userId);
    gemsList = gemsList ? gemsList : [];
    var cnt = gemsList.length;
    if (start != null && rows != null) {
        start = start < 0 ? 0 : start;
        rows = rows < 0 ? 0 : rows;
        gemsList = gemsList.slice(start, start + rows);
    }
    http.send(res, 0, 'ok', { gem_records: { cnt: cnt, list: gemsList } });
});

/**
 * 获取玩家充值记录
 */
app.get('/get_user_buy_records', function (req, res) {
    var userId = parse2Int(req.query.user_id, null);
    var start = parse2Int(req.query.start, null);
    var rows = parse2Int(req.query.rows, null);

    var gemsList = db.get_user_buy_records(userId);
    gemsList = gemsList ? gemsList : [];
    var cnt = gemsList.length;
    if (start != null && rows != null) {
        start = start < 0 ? 0 : start;
        rows = rows < 0 ? 0 : rows;
        gemsList = gemsList.slice(start, start + rows);
    }
    http.send(res, 0, 'ok', { buy_records: { cnt: cnt, list: gemsList } });
});

/**
 * 获取所有公告信息
 */
app.get('/get_all_messages', function (req, res) {
    var start = parse2Int(req.query.start, null);
    var rows = parse2Int(req.query.rows, null);

    var list = db.get_message();
    list = list ? list : [];
    var cnt = list.length;
    if (start != null && rows != null) {
        start = start < 0 ? 0 : start;
        rows = rows < 0 ? 0 : rows;
        list = list.slice(start, start + rows);
    }
    
    http.send(res, 0, 'ok', { messages: {cnt: cnt, list: list } });
});

/**
 * 更新公告信息
 */
app.get('/update_message', function (req, res) {
    var type = req.query.type;
    var message = req.query.message;
    var version = req.query.version;

    if (type == null || message == null) {
        var err = SYS_ERRS.INVALID_PARAMETER;
        http.send(res, err.code, err.msg);
        return;
    }

    var ret = db.update_message(type, message, version);
    if(ret) {
        http.send(res, 0, 'ok');
    } else {
        http.send(res, -3, 'failed');
    }
});

/**
 * 添加公告
 */
app.get('/add_message', function (req, res) {
    var type = req.query.type;
    var message = req.query.message;
    var version = req.query.version;

    if (type == null || message == null) {
        var err = SYS_ERRS.INVALID_PARAMETER;
        http.send(res, err.code, err.msg);
        return;
    }

    var ret = db.create_message(type, message, version) 
    if(ret) {
        http.send(res, 0, 'ok');
    } else {
        http.send(res, -3, 'failed');
    }
});

/**
 * 删除公告
 */
app.get('/del_message', function (req, res) {
    var type = req.query.type;
    var message = req.query.message;
    var version = req.query.version;

    if (type == null) {
        var err = SYS_ERRS.INVALID_PARAMETER;
        http.send(res, err.code, err.msg);
        return;
    }

    var ret = db.delete_message(type, message, version);
    if(ret) {
        http.send(res, 0, 'ok');
    } else {
        http.send(res, -3, 'failed');
    }
});

/**
 * 获取商品配置数据
 */
app.get('/get_shop_datas', function (req, res) {
    var itemId = parse2Int(req.query.item_id, null);
    var start = parse2Int(req.query.start, null);
    var rows = parse2Int(req.query.rows, null);

    var list = db.get_shop_data();
    list = list ? list : [];
    var cnt = list.length;
    if (start != null && rows != null) {
        list = list.slice(start, start + rows);
    }
    
    http.send(res, 0, 'ok', { shop_datas: {cnt: cnt, list: list } });
});

/**
 * 更新商品数据
 */
app.get('/update_shop_data', function (req, res) {
    var itemId = parse2Int(req.query.item_id, null);
    var shopId = parse2Int(req.query.shop_id, null);
    var icon = req.query.icon;
    var name = req.query.name;
    var priceType = parse2Int(req.query.price_type, null);
    var price = parse2Int(req.query.price, null);
    var gainType = parse2Int(req.query.gain_type, null);
    var gain = parse2Int(req.query.gain, null);
    var desc = req.query.desc;

    if (shopId == null || itemId == null || name == null || priceType == null ||
        price == null || gainType == null || gain == null) {
        var err = SYS_ERRS.INVALID_PARAMETER;
        http.send(res, err.code, err.msg);
        return;
    }

    var attrs = {};
    attrs['shop_id'] = shopId;
    attrs['icon'] = icon;
    attrs['name'] = name;
    attrs['price_type'] = priceType;
    attrs['price'] = price;
    attrs['gain_type'] = gainType;
    attrs['gain'] = gain;
    attrs['desc'] = desc;
    
    var ret = db.update_shop_data(itemId, attrs);
    if(ret) {
        http.send(res, 0, 'ok');
    } else {
        http.send(res, -3, 'failed');
    }
});

/**
 * 添加新的商品数据
 */
app.get('/add_shop_data', function (req, res) {
    var itemId = parse2Int(req.query.item_id, null);
    var shopId = parse2Int(req.query.shop_id, null);
    var icon = req.query.icon;
    var name = req.query.name;
    var priceType = parse2Int(req.query.price_type, null);
    var price = parse2Int(req.query.price, null);
    var gainType = parse2Int(req.query.gain_type, null);
    var gain = parse2Int(req.query.gain, null);
    var desc = req.query.desc;

    if (shopId == null || itemId == null || name == null || priceType == null || 
        price == null || gainType == null || gain == null) {
        var err = SYS_ERRS.INVALID_PARAMETER;
        http.send(res, err.code, err.msg);
        return;
    }

    var ret = db.create_shop_data(shopId, itemId, icon, name, priceType, price, gainType, gain, desc);
    if(ret) {
        http.send(res, 0, 'ok');
    } else {
        http.send(res, -3, 'failed');
    }
});

/**
 * 删除商品数据
 */
app.get('/del_shop_data', function (req, res) {
    var itemId = parse2Int(req.query.item_id, null);

    if (itemId == null) {
        var err = SYS_ERRS.INVALID_PARAMETER;
        http.send(res, err.code, err.msg);
        return;
    }

    var ret = db.delete_shop_data(itemId);
    if(ret) {
        http.send(res, 0, 'ok');
    } else {
        http.send(res, -3, 'failed');
    }
});

/**
 * 获取互动表情的数据
 */
app.get('/get_interactive_emoji_datas', function (req, res) {
    var userId = parse2Int(req.query.user_id, null);
    var startTime = parse2Int(req.query.start_time, null);
    var endTime = parse2Int(req.query.end_time, null);

    var configs = db.get_configs();
    var rets = db.getInteractiveEmojiRecords(userId, configs.interactive_emoji_cost_type, startTime, endTime);
    var totalGems = 0;
    for (var i in rets) {
        var item = rets[i];
        totalGems += Math.abs(item.change_num);
    }

    http.send(res, 0, 'ok', {data: {num_of_gems: totalGems} });
});

exports.start = function(conf) {
    config = conf;
    app.listen(config.MANAGE_PORT);//, config.MANAGE_IP);
    console.log('game manage service is listening on ' + config.MANAGE_PORT);
};
