var mysql = require("mysql");
var crypto = require('../utils/crypto');
var hall_socket = require("./hall_socket_service");
//var http = require('../utils/http');
var EventEmitter = require('events').EventEmitter;
var ee = new EventEmitter();
var hallUsermgr = require("./hall_usermgr");

var pool = require("../utils/dbpool");
var g_Event = null;
var db = require('../utils/dbsync');
function nop(a, b, c, d, e, f, g) {

}
function query(sql, callback) {
    var ret = pool.query(sql);
    // console.log("luo", ret);
    callback(ret.err, ret.vals, ret.fields);
}

exports.init = function (config, $gevent) {
    pool.init(config);
    // pool = mysql.createPool({
    //     host: config.HOST,
    //     user: config.USER,
    //     password: config.PSWD,
    //     database: config.DB,
    //     port: config.PORT,
    // });
    //接受event 事件；
    g_Event = $gevent;
    //console.log("[em]gevent:", g_Event);
};

//所有通用 消息发送接口 need chuli；
var email_send_port = function (send_user_id, accept_user_id, email_title, send_msg, active_time, info_qudao, info_type, additional_message, look_status, deal_status, callback) {
    callback = callback == null ? nop : callback;
    //var additionals_message = additional_message;
    var ad_msg = JSON.stringify(additional_message);
    var adt_msg = ad_msg.replace(/\"/g, "\"");
    console.log("guolin 10 22 19 27 >>", adt_msg);
    var sql = 'INSERT INTO email_info_table (send_user_id,accept_user_id,email_title,send_msg,active_time,info_qudao,info_type,additional_message,look_status,deal_status) VALUES ("' + send_user_id + '","' + accept_user_id + '","' + email_title + '","' + send_msg + '","' + active_time + '","' + info_qudao + '","' + info_type + '",' + adt_msg + ',' + look_status + ',' + deal_status + ')';
    //console.log('guol>>>>', sql)
    query(sql, function (err, rows) {
        if (!err) {
            var data = {'code': 100}
            callback(data);
        } else {
            var data = {'code': 101};
            callback(data);
        }
    });
}
//通用 消息查询接口；
var email_find_port = function (accept_user_id, callback) {
    //console.log("email_find_port start", accept_user_id);
    callback = callback == null ? nop : callback;
    var sql = 'select * from email_info_table where accept_user_id = "' + accept_user_id + '" order by send_time desc limit 0,15';
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var data = {'code': 100, 'rows': rows};

                callback(data);
            } else {
                var data2 = {'code': 102}
                callback(data2);
            }
        } else {
            var data3 = {'code': 101};
            callback(data3);
        }
    });
};
//email 流水信息如表：
var email_liushui_info = function (todo_user_account, about_user_account, todo_status, callback) {
    callback = callback == null ? nop : callback;
    if (todo_user_account == null || todo_status == null) {
        var data = {'code': 103};
        callback(data);
    }
    var sql = 'INSERT INTO email_liushui_table (todo_user_account,about_user_account,todo_status) VALUES ("' + todo_user_account + '","' + about_user_account + '","' + todo_status + '")';
    query(sql, function (err, rows) {
        if (!err) {
            var data = {'code': 100}
            callback(data);
        } else {
            var data = {'code': 101};
            callback(data);
        }
    });
};

//邮件处理状态改变；
var change_email_status = function (info_num, callback) {
    callback = callback == null ? nop : callback;
    if (info_num == null) {
        var data = {'code': 103};
        callback(data);
    }
    var sql = 'select * from email_info_table where info_num = ' + info_num;
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var sql1 = 'update email_info_table set deal_status = 1 where info_num = ' + info_num;
                query(sql1, function (err, row) {
                    if (!err) {
                        var data = {code: 100};
                        callback(data);
                    } else {
                        var data1 = {code1: 101};
                        callback(data1);
                    }
                });
            } else {
                var data = {code: 102};
                callback(data);
            }
        }
    });
}
//使用email info_num 查询email详情；
var infonum_chack_email = function (info_num, callback) {
    callback = callback == null ? nop : callback;
    if (info_num == null) {
        var data = {'code': 103};
        callback(data);
    }
    var sql = 'select * from email_info_table where info_num = ' + info_num;
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var data = {code: 100, rows: rows};
                var sql = 'update email_info_table set look_status=1 where info_num = ' + info_num;
                pool.query(sql);
                callback(data);
            } else {
                var data = {code: 102};
                callback(data);
            }
        } else {
            var data = {code: 101};
            callback(data);
        }
    });
}

/////======================================================================
//用户地址存储

var get_sites = function (user_id, lontitude, latitude, city, addrStr, addrDescribe, callback) {
    callback = callback == null ? nop : callback;
    if (user_id == null || lontitude == null || latitude == null || city == null || addrStr == null || addrDescribe == null) {
        var data = {code: 103, msg: '入参错误'};
        callback(data);
    }
    var sql1 = 'insert into user_address_table(user_id,lontitude,latitude,city,addrStr,addrDescribe) values("' + user_id + '","' + lontitude + '","' + latitude + '","' + city + '","' + addrStr + '","' + addrDescribe + '")';
    query(sql1, function (err, rows) {
        if (!err) {
            var data1 = {code: 100, msg: '添加地址成功'};
            callback(data1);
        } else {
            var data2 = {code: 103, msg: '添加地址失败'};
            callback(data2);
        }
    });
}

//用戶地址查詢；
var user_address_find = function (user_id, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'select * from user_address_table where user_id = "' + user_id + '" order by add_time desc limit 1 ';
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var data = {code: 100, rows: rows};
                callback(data);
            } else {
                var data1 = {code: 102};
                callback(data1);
            }
        } else {
            var data2 = {code: 101};
            callback(data2);
        }
    });
};
exports.search_user_addr = function (user_id) {
    //var sql = 'select * from user_address_table where user_id = "' + user_id + '"order by add_time desc limit 1 ';
    //var sql = 'select * from user_address_table where user_id = "' + user_id + '"and time_to_sec(timediff(now(),add_time)<1000 order by add_time desc limit 1;';
    var sql = 'select * from user_address_table where user_id = "' + user_id + '" and time_to_sec(timediff(now(),add_time))<1000 order by add_time desc limit 1;';
    // laoli 1128
    var ret = pool.query(sql);
    if (ret.err) {
        return false;
    }
    if (ret.row==null || ret.row.length==0 ){     
        var data = {code:10001,msg:'不能获取【'+user_id+'】当前位置信息！'};  //laoli 1130
        return data;
    }

    return ret.rows[0];
}
exports.add_user_dis = function (userid1, name1, userid2, name2, distance) {
    if (userid1 == null || name1 == null || userid2 == null || name2 == null) {
        return false;
    }
    var sql = 'insert into t_user_distance(userid1,name1,userid2,name2,distance) values("' + userid1 + '","' + name1 + '","' + userid2 + '","' + name2 + '",' + distance + ')';
    var ret = pool.query(sql);
    if (ret.err) {
        return false;
    }
    return true;
}

////=====================对外api=========================
//txh信发送接口；
var t_email_send_port = function (req, res, http) {
    var data = req.query;
    var send_user_id = data.send_user_id
    var accept_user_id = data.accept_user_id;
    var send_msg = data.send_msg;
    var email_title = data.email_title;
    var active_time = data.active_time;
    var info_qudao = data.info_qudao;
    var info_type = data.info_type;
    var additional_message = data.additional_message;
    //var rsp_event= txh_email_confirm_rsp;

    if (send_user_id == null || accept_user_id == null || send_msg == null) {
        console.log('发送信息入参错误!');
        http.send(res, 103);
        return;
    }
    if (send_user_id == accept_user_id) {
        http.send(res, 113, "自己不能给自己发送消息！");
        return;
    }
    if (active_time == null) {
        active_time = 7;
    }
    if (info_type == null) {
        info_type = 2;
    }
    if (info_qudao == null) {
        info_qudao = 1;
    }
    var deal_status = 0;
    var look_status = 0;
    email_send_port(send_user_id, accept_user_id, email_title, send_msg, active_time, info_qudao, info_type, additional_message, look_status, deal_status, function (data) {
        if (data && data.code && data.code == 100) {
            var todo_status = 0;
            email_liushui_info(send_user_id, accept_user_id, todo_status, function (data) {
                if (data && data.code && data.code == 100) {
                    console.log('用户发送消息成功!');
                    hallUsermgr.sendMsg(accept_user_id, "hallws_out_deal_info", {code: 100, msg: send_msg});
                    http.send(res, 100, "用户发送信息成功");
                    return;
                } else if (data && data.code && data.code == 101) {
                    console.log('用户发送消息同步流水信息失败!');
                    http.send(res, 101, "用户发送消息同步流水信息失败!");
                    return;
                } else {
                    http.send(res, 10000, "未知错误一万年");
                    return;
                }
            });
        } else if (data && data.code && data.code == 101) {
            console.log('消息发送失败!');
            http.send(res, 101, "消息发送失败！");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    });
};

//all 查询消息接口；
var all_email_find_port = function (req, res, http) {
    var data = req.query;
    var accept_user_id = data.accept_user_id;
    if (accept_user_id == null) {
        console.log('查询消息入参错误!');
        http.send(res, 103);
        return;
    }
    email_find_port(accept_user_id, function (data) {
        if (data && data.code && data.code == 100) {
            var rows = data.rows;
            //console.log('用户查询信息数据 》》',rows);
            var todo_status = 1;
            var about_user_account = "";
            email_liushui_info(accept_user_id, about_user_account, todo_status, function (data) {
                if (data && data.code && data.code == 100) {
                    http.send(res, 100, rows);
                    return;
                } else if (data && data.code && data.code == 115) {
                    console.log('用户发送消息同步流水信息失败!');
                    http.send(res, 115, "查询消息同步流水信息失败!");
                    return;
                }
            });
        } else if (data && data.code && data.code == 101) {
            console.log('用户查询消息失败!');

            http.send(res, 101, "查询消息失败");
            return;
        } else if (data && data.code && data.code == 102) {
            http.send(res, 102, "查询数据为空");
            return;
        } else {
            http.send(res, 10000, "未知错误");
            return;
        }
    });
};

//info num 查询email 信息；
var all_infonum_chack_email = function (req, res, http) {
    var data = req.query;
    var info_num = data.info_num;
    if (info_num == null) {
        console.log('查询消息入参错误!');
        http.send(res, 103);
        return;
    }
    infonum_chack_email(info_num, function (data) {
        if (data && data.code == 100) {
            http.send(res, 100, data.rows);
            return;
        } else if (data && data.code == 102) {
            console.log('用户查询消息数据为空!');
            http.send(res, 102);
            return;
        } else if (data && data.code == 101) {
            http.send(res, 101);
        } else {
            console.log('email chack error!');
            http.send(res, 10000, '未知错误!');
            return;
        }
    })
}

//查詢用戶地址：
var t_user_address_find = function (req, res, http) {
    var data = req.query;
    var user_id = data.user_id;
    if (user_id == null) {
        console.log('查询地址入参错误!');
        http.send(res, 103);
        return;
    }
    user_address_find(user_id, function (data) {
        console.log('查詢地址data', data);
        if (data && data.code && data.code == 100) {
            console.log('查詢地址data成功!');
            http.send(res, 100, data.rows);
            return;
        } else if (data && data.code && data.code == 102) {
            console.log('查詢地址data数据为空!');
            http.send(res, 102, "查詢地址data数据为空");
            return;
        } else if (data && data.code && data.code == 101) {
            console.log('查詢地址data数据error!');
            http.send(res, 101, "查詢地址data数据error");
            return;
        } else {
            console.log('查詢地址data未知错误!');
            http.send(res, 10000, "未知错误！");
            return;
        }
    })
};
//内部调用发送email 方法；
exports.in_to_send_email = function(send_user_id,accept_user_id,send_msg,email_title,additional_message){
    if (send_user_id == null || accept_user_id == null || send_msg == null) {
        log.error('发送信息入参错误!');
        http.send(res, 103);
        return;
    }
    if (send_user_id == accept_user_id) {
        http.send(res, 113, "自己不能给自己发送消息！");
        return;
    }
    if (active_time == null) {
        active_time = 7;
    }
    if (info_type == null) {
        info_type = 2;
    }
    if (info_qudao == null) {
        info_qudao = 1;
    }
    var deal_status = 0;
    var look_status = 0;
    email_send_port(send_user_id, accept_user_id, email_title, send_msg, active_time, info_qudao, info_type, additional_message, look_status, deal_status, function (data) {
        if (data && data.code && data.code == 100) {
            var todo_status = 0;
            email_liushui_info(send_user_id, accept_user_id, todo_status, function (data) {
                if (data && data.code && data.code == 100) {
                    log.error('用户发送消息成功!');
                    hallUsermgr.sendMsg(accept_user_id, "hallws_out_deal_info", {code: 100, msg: send_msg});
                    http.send(res, 100, "用户发送信息成功");
                    return;
                } else if (data && data.code && data.code == 101) {
                    log.error('用户发送消息同步流水信息失败!');
                    http.send(res, 101, "用户发送消息同步流水信息失败!");
                    return;
                } else {
                    http.send(res, 10000, "未知错误一万年");
                    return;
                }
            });
        } else if (data && data.code && data.code == 101) {
            log.error('消息发送失败!');
            http.send(res, 101, "消息发送失败！");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    });
}

//===============================client_service.js 接口=============
exports.t_email_send_port = t_email_send_port;
exports.all_email_find_port = all_email_find_port;
exports.email_send_port = email_send_port;
exports.change_email_status = change_email_status;
exports.all_infonum_chack_email = all_infonum_chack_email;

//==============================
exports.t_user_address_find = t_user_address_find;
////////////////////========socket服务===============================

//监听socket service 客户端传过来的数据；
var handles = {};

handles.reply_email = function (socket, data) {
    console.log('reply_email rsp>>>', typeof(data));
    //socket.emit(data.msgEvent,data);
    var data1 = JSON.parse(data).data;
    // console.log("guo  data >>>>", data1);
    if (data1 && data1.add_msg && data1.r_user_id && data1.r_user_name && data1.email_info_num) {
        var new_data = JSON.parse(data1.add_msg);
        console.log(new_data);
        var rq_msg = new_data.msg;
        //console.log('replace data >>>>>> ', rq_msg);
        var rq_event = new_data.rsp_event;
        var n_data = {
            agr_code: data1.agr_code,
            email_info_num: data1.email_info_num,
            r_user_id: data1.r_user_id,
            r_user_name: data1.r_user_name,
            req_msg: rq_msg
        }
        g_Event.emit(rq_event, n_data);
        //console.log("event:",ret);
    }
};

handles.get_sites = function (socket, datas) {
    console.log('get sites >> ', datas);
    var data1 = JSON.parse(datas).data;
    console.log('data1>>>>', data1);
    if (data1) {
        if (data1.user_id == null || data1.lontitude == null || data1.latitude == null) {
            console.log('插入user地址入参错误！');
            return
        }
        var user_id = data1.user_id;
        var lontitude = data1.lontitude;
        var latitude = data1.latitude;
        var city = data1.city;
        var addrStr = data1.addrStr;
        var addrDescribe = data1.addrDescribe;
        get_sites(user_id, lontitude, latitude, city, addrStr, addrDescribe, function (data) {
            console.log('callback data >>', data);
        })
    }
};

exports.getHandles = function () {
    return handles;
};