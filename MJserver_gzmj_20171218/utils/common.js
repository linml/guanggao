/**
 * 为String增加format函数
 */
String.prototype.format = function (args) {
    var result = this;
    if (arguments.length > 0) {
        if (arguments.length == 1 && typeof (args) == "object") {
            for (var key in args) {
                if (args[key] != undefined) {
                    var reg = new RegExp("({" + key + "})", "g");
                    result = result.replace(reg, args[key]);
                }
            }
        }
        else {
            for (var i = 0; i < arguments.length; i++) {
                if (arguments[i] != undefined) {
                    //var reg = new RegExp("({[" + i + "]})", "g");//这个在索引大于9时会有问题，谢谢何以笙箫的指出
                    var reg = new RegExp("({)" + i + "(})", "g");
                    result = result.replace(reg, arguments[i]);
                }
            }
        }
    }
    return result;
};

//玩家现金变更原因枚举
exports.CASH_CHANGE_RESONS = {
    //新用户赠送
    ADD_NEW_USER: '新玩家奖励',
    //玩家充值
    ADD_USER_RECHARGING: '玩家充值',
    //运营商后台添加
    ADD_DEALER: '代理[{0}]',
    //管理后台添加
    ADD_BY_ADMIN: '后台管理[{0}]',
    //分享游戏赠送
    ADD_SHARE_GAME: '分享游戏',
    //绑定邀请者获得，参数邀请者ID
    ADD_BIND_INVITOR: '绑定邀请者[{0}]',
    //绑定代理获得，代理ID
    ADD_BIND_DEALER: '绑定代理[{0}]',
    //游戏中获取
    ADD_IN_GAME: '游戏中获得',
    //钻石购买
    ADD_EXCHANGE_GEMS: '钻石兑换',
    //每日签到
    ADD_BY_SIGN: '每日签到',
    //幸运转盘
    ADD_BY_LUCKY: '幸运转盘获得',
    //取消房间退回
    RETURN_DISSOLVE_ROOM: '解散房间[{0}]返还',
    //幸运转盘返还
    RETURN_LUCKY: '幸运转盘返还',
    //开房间扣除，参数房间ID
    COST_CREATE_ROOM: '创建房间[{0}]',
    //购买金币扣除，参数购买金币的数量
    COST_BUY_COIN: '购买{0}金币',
    //游戏中扣除
    COST_IN_GAME: '游戏中消耗',
    //幸运转盘
    COST_BY_LUKY: '幸运转盘消耗',
    //互动表情消耗
    COST_BY_INTER_EMOJI: '互动表情',
};

//深度clone一个obj, laoli 171026
var deepCopy = function (source) {
    //console.log(">>deepCopy,",source)
    var result = {};
    var isAarray = source instanceof Array
    if (isAarray) {
        result = []
    }

    for (var key in source) {
        result[key] = typeof(source[key]) == 'object' ? deepCopy(source[key]) : source[key]
    }
    //console.log("<<deepCopy,",source)
    return result;
};

var deepCopyList = function (source) {
    var result = [];
    for (var ii in source) {
        result[ii] = source[ii]
    }
    return result;
};
// 获取本机的地址信息。
var getServerIp = function () {
    var ret = [];
    var interfaces = require('os').networkInterfaces();
    for (var i in interfaces) {
        var iface = interfaces[i];
        for (var j = 0; j < iface.length; j++) {
            var alias = iface[j];
            if (alias.family === 'IPv4') {
                var ip = alias.address;
                var node = {ip: ip};
                if (ip.indexOf('127.') == 0) {
                    node.type = 0;
                } else if (ip.indexOf('10.') == 0 || ip.indexOf('192.') == 0) {
                    node.type = 1;
                } else {
                    node.type = 2;
                }
                ret.push(node);
            }
        }
    }
    return ret;
};

exports.deepCopy = deepCopy;			//laoli
exports.deepCopyList = deepCopyList;
exports.getServerIp = getServerIp;