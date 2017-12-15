var mysql = require("mysql");
var crypto = require('../utils/crypto');
var http = require('../utils/http');
var pool = require("../utils/dbpool");
var db = require('../utils/dbsync');
var hallUsermgr = require("./hall_usermgr");
var hall_socket = require("./hall_socket_service");
var email_manage = require('./email_manage');
var DAI_LI_IP = null;
var DAL_LI_PORT = null;
var txh_event_msg = "txh_email_confirm_rsp";
var handles = {};
var num = null;

function nop(a, b, c, d, e, f, g) {

}

function query(sql, callback) {
    var ret = pool.query(sql);
    // console.log("luo", ret);
    callback(ret.err, ret.vals, ret.fields);
    // pool.getConnection(function(err,conn){
    //     if(err){
    //         callback(err,null,null);
    //     }else{
    //         conn.query(sql,function(qerr,vals,fields){
    //             //释放连接
    //             conn.release();
    //             //事件驱动回调
    //             callback(qerr,vals,fields);
    //         });
    //     }
    // });
}

// //登陆 根据id查询账号；
// var find_id = function (id, callback) {
//     callback = callback == null ? nop : callback;
//     if (id == null) {
//         var data = {"code": 103};
//         callback(data);
//         return;
//     }
//     var sql = "SELECT * FROM user_test WHERE id = '" + id + "' limit 1 ";
//     query(sql, function (err, rows) {
//         if (!err) {
//             if (rows && rows.length > 0) {
//                 var data = {"code": 100, 'rows': rows};
//                 callback(data)
//             } else {
//                 var data = {"code": 102};
//                 callback(data)
//             }
//         } else {
//             var data = {"code": 101};
//             callback(data)
//         }
//     })
// }
//
// //用户登录接口
// var checkLogin = function (req, res, http) {
//     var user = req.query;
//     var id = data.id;
//     find_id(id, function (data) {
//         if (data && data.code && data.code == 100) {
//             if(user.password === data.password) {
//                 console.log('登陆成功!');
//                 http.send(res, 100, data.rows);
//                 return;
//             } else {
//                 console.log('账号密码错误!');
//                 http.send(res, 102, "账号密码错误!");
//                 return;
//             }
//         } else if (data && data.code && data.code == 102) {
//             console.log('账号不存在!');
//             http.send(res, 102, "账号不存在!");
//             return;
//         } else if (data && data.code && data.code == 101) {
//             console.log('登陆失败!');
//             http.send(res, 101, "登陆失败");
//             return;
//         } else {
//             http.send(res, 10000, "未知错误一万年");
//             return;
//         }
//     })
// };

exports.init = function (config, $gevent, configs) {
    pool.init(config);
    // pool = mysql.createPool({
    //     host: config.HOST,
    //     user: config.USER,
    //     password: config.PSWD,
    //     database: config.DB,
    //     port: config.PORT,
    // });
    var DAI_LI = configs.txh_configs();
    DAI_LI_IP = DAI_LI.DEALDER_API_IP;
    DAL_LI_PORT = DAI_LI.DEALDER_API_PORT
    //console.log('dailii222p >>',DAI_LI.DEALDER_API_PORT);

    $gevent.on(txh_event_msg, function (data) {
        console.log(">>[txhp]收到了同乡会邮件点击事件", data);
        var txh_id = data.req_msg.txh_id;
        var r_user_id = data.r_user_id;
        var req_name = data.r_user_name;
        var user_id = data.req_msg.user_id;
        var info_num = data.email_info_num;
        var target_account = data.req_msg.target_account;
        var user_name = data.req_msg.user_name;
        var apply_position = data.req_msg.apply_position;
        var user_title = 113;
        var sql = 'select deal_status from email_info_table where info_num = ' + info_num;
        query(sql, function (err, rows) {
            console.log('deal-status>>', rows);
            if (!err) {
                if (rows && rows.length > 0) {
                    if (rows[0].deal_status == 0) {
                        if (data.agr_code == 1) {
                            console.log('进入这里了')
                            txh_addnumbers(txh_id, user_id, target_account, user_name, user_title, apply_position, function (data) {
                                if (data.code && data.code == 100) {
                                    var about_user_account = null;
                                    var todo_status = 0;
                                    add_active_info(txh_id, target_account, about_user_account, todo_status, function (data) {
                                        if (data.code && data.code == 100) {
                                            var active_time = 7;
                                            var info_qudao = 2;
                                            var info_type = 1;
                                            var send_msg = req_name + "同意您的申请！";
                                            var additional_message = null;
                                            var look_status = 0;
                                            var email_title = req_name + "回复的消息！";
                                            var deal_status = 0;
                                            email_manage.email_send_port(r_user_id, user_id, email_title, send_msg, active_time, info_qudao, info_type, additional_message, look_status, deal_status, function (data) {
                                                console.log('回复信息如表成功：>', data);
                                                if (data.code == 100) {
                                                    email_manage.change_email_status(info_num, function (data) {
                                                        if (data.code == 100) {
                                                            console.log('chang info status:>', data);
                                                            hallUsermgr.sendMsg(user_id, "hallws_out_deal_info", {
                                                                code: 0,
                                                                data: req_name + '同意了您的请求'
                                                            });
                                                            console.log('repalce info >>', send_msg);
                                                        } else {
                                                            console.log('change消息数据为空：> ');
                                                        }
                                                    });
                                                } else {
                                                    console.log('消息数据为空：> ');
                                                }
                                            });
                                        }
                                    });
                                } else if (data.code && data.code == 101) {
                                    hallUsermgr.sendMsg(r_user_id, "hallws_out_deal_info", {code: 1, data: '回复消息失败'});
                                } else if (data.code && data.code == 117) {
                                    hallUsermgr.sendMsg(r_user_id, "hallws_out_deal_info", {
                                        code: 2,
                                        data: user_name + '已经在牌友会了'
                                    });
                                }
                            });
                        } else if (data.agr_code == 0) {
                            var active_time = 7;
                            var info_qudao = 2;
                            var info_type = 1;
                            var send_msg = req_name + "拒绝了您的申请！";
                            var additional_message = null;
                            var look_status = 0;
                            var deal_status = 0;
                            var email_title = req_name + "回复的消息！"
                            email_manage.email_send_port(r_user_id, user_id, email_title, send_msg, active_time, info_qudao, info_type, additional_message, look_status, deal_status, function (data) {
                                console.log('回复信息如表成功：>', data);
                                if (data.code == 100) {
                                    email_manage.change_email_status(info_num, function (data) {
                                        console.log('chang info status:>', data);
                                        hallUsermgr.sendMsg(user_id, "hallws_out_deal_info", {
                                            code: 3,
                                            data: req_name + '拒绝了您的请求'
                                        });
                                        console.log('repalce info >>', send_msg);
                                    });
                                }
                            });
                        }
                    } else {
                        hallUsermgr.sendMsg(r_user_id, "hallws_out_deal_info", {code: 0, data: '此消息已经处理过了！'});
                    }

                } else {
                    hallUsermgr.sendMsg(r_user_id, "hallws_out_deal_info", {code: 0, data: '此消息已存在！'});
                }
            } else {
                console.log('deal_status 数据库查询出错！');
            }
        });
    });

    // 尝试发一个邮件出去
};

var isexcittxhid = function (txh_id, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null) {
        var data = {"code": 103};
        callback(data);
    }
    console.log('txh_id = ', txh_id);
    var sql = 'SELECT * FROM txh_info WHERE txh_id = "' + txh_id + '" '
    query(sql, function (err, rows, fields) {
        if (err) {
            var data = {'code': '101'}
            callback(data);
        } else {
            if (rows && rows.length > 0) {
                var data = {"code": 111};
                callback(data);
                return;
            } else {
                var data = {'code': 112};
                callback(data);
                return;
            }
        }
    });
}
//创建同乡会
var creat_association = function (txh_name, txh_id, txh_quyu, txh_disc, target_account, creator_id, creator_name, creator_position, callback) {
    callback = callback == null ? nop : callback;
    if (txh_name == null || txh_id == null || txh_quyu == null || txh_disc == null || creator_id == null || target_account == null || creator_position == null || creator_name == null) {
        callback(false);
        return;
    }
    console.log("need txh_id = ", txh_id);
    //var create_time = new Date().getTime();
    var txh_all_man = 200;
    var sql = 'INSERT INTO txh_info(txh_id, txh_name, txh_quyu, txh_all_man, txh_disc, target_account, creator_id, creator_name, creator_position) VALUES("' + txh_id + '","' + txh_name + '","' + txh_quyu + '","' + txh_all_man + '","' + txh_disc + '","' + target_account + '","' + creator_id + '","' + creator_name + '","' + creator_position + '")';
    query(sql, function (err, rows, fields) {
        if (!err) {
            var data = {'code': '100'};
            callback(data);
        } else {
            var data = {'code': '101'};
            callback(data);
        }
    });
};
//添加流水表数据
var add_active_info = function (txh_id, todo_user_account, about_user_account, todo_status, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null || todo_status == null) {
        var data = {'code': 103};
        callback(data);
        return;
    }
    var sql = 'INSERT INTO txh_action_table(txh_id,todo_user_account,about_user_account,todo_status) VALUES("' + txh_id + '","' + todo_user_account + '","' + about_user_account + '","' + todo_status + '")';
    query(sql, function (err, rows) {
        if (!err) {
            var data = {'code': 100};
            callback(data);
        } else {
            var data2 = {'code': 101};
            callback(data2);
        }
    });
};

//判断玩家是否已经创建过同乡会
var is_creat_txh = function (target_account, creator_id, callback) {
    callback = callback == null ? nop : callback;
    if (target_account == null) {
        var data = {'code': 103};
        callback(data);
        return;
    }
    var user_uuid = target_account.substring(3);
    var need_data = {user_id: creator_id};
    var is_daili = http.getSync(DAI_LI_IP + ":" + DAL_LI_PORT + "/api/v1/dealers/checkdaili", need_data);
    var sql = 'SELECT * FROM txh_info WHERE target_account = "' + target_account + '" ';
    if (is_daili.data && is_daili.data.code == 0) {
        query(sql, function (err, rows, fields) {
            if (err) {
                var data3 = {'code': '101'};
                callback(data3);
                return;
            } else {
                if (rows && rows.length > 2) {
                    var data1 = {"code": "118"};
                    callback(data1);
                    return;
                } else {
                    var data2 = {"code": "100"};
                    callback(data2);
                    return;
                }
            }
        });
    } else if (is_daili.data.code == 2) {
        query(sql, function (err, rows, fields) {
            if (err) {
                var data3 = {'code': '101'};
                callback(data3);
                return;
            } else {
                if (rows && rows.length > 0) {
                    var data1 = {"code": "119"};
                    callback(data1);
                    return;
                } else {
                    var data2 = {"code": "100"};
                    callback(data2);
                    return;
                }
            }
        });
    } else {
        var data = {'code': 1003};
        callback(data);
        return false;
    }
};

//玩家信息加入表格；
var txh_addnumbers = function (txh_id, user_id, target_account, user_name, user_title, apply_position, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null || user_id == null || target_account == null || user_title == null || user_name == null) {
        var data = {'code': 103};
        callback(data);
        return;
    }
    var sql1 = 'SELECT * FROM txh_member_table WHERE txh_id = "' + txh_id + '" and user_id ="' + user_id + '"';
    query(sql1, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var data2 = {'code': '117'};
                callback(data2);
                return;
            } else {
                var sql = 'INSERT INTO txh_member_table(txh_id,user_id,target_account,user_name,user_title,apply_position) VALUES("' + txh_id + '","' + user_id + '","' + target_account + '","' + user_name + '",' + user_title + ',"' + apply_position + '")';
                query(sql, function (err, rows) {
                    if (!err) {
                        change_txh_number(txh_id, 1, callback);
                    } else {
                        var data3 = {'code': '101'};
                        callback(data3);
                        return;
                    }
                });
            }
        } else {
            var data3 = {'code': '101'};
            callback(data3);
            return;
        }
    });
};
//
//会长删除成员接口：
var del_user_info = function (txh_id, target_account, callback) {
    callback = callback == null ? nop : callback;
    if (target_account == null || txh_id == null) {
        var data = {"code": "103"};
        callback(data);
        return;
    }
    var sql = 'SELECT * FROM txh_info WHERE target_account = "' + target_account + '" and txh_id = "' + txh_id + '" ';
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var data = {code: 120}
                callback(data);
                return;
            } else {
                var sql = 'SELECT * FROM txh_member_table WHERE target_account = "' + target_account + '" and txh_id = "' + txh_id + '" ';
                query(sql, function (err, rows) {
                    if (!err) {
                        if (rows && rows[0]) {
                            var sql = 'delete from txh_member_table where txh_id = "' + txh_id + '"and target_account = "' + target_account + '" ';
                            query(sql, function (err, rows) {
                                if (!err) {
                                    // console.log(rows);
                                    var temp = 0;
                                    change_txh_number(txh_id, temp, callback)
                                    // var data = {"code":100};
                                    // callback(data);
                                    return;
                                } else {
                                    var data2 = {"code": 101};
                                    callback(data2);
                                    return;
                                }
                            });
                        } else {
                            var data3 = {"code": 102};
                            callback(data3);
                            return;
                        }
                    } else {
                        var data4 = {"code": 101};
                        callback(data4);
                        return;
                    }
                });
            }
        } else {
            var data = {code: 101};
            callback(data)
            return;
        }
    });
};
//判断是否是会长：
var pdishuizhang = function (txh_id, target_account, callback) {
    callback = callback == null ? nop : callback;
    if (target_account == null || txh_id == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql = 'SELECT user_title FROM txh_member_table WHERE target_account = "' + target_account + '" and txh_id = "' + txh_id + '" ';
    query(sql, function (err, rows) {
        if (!err) {
            console.log('pdishuizhang >>> ', rows);
            if (rows && rows[0]) {
                console.log('huizhang rows', rows);
                var data1 = {"code": 100, "rows": rows[0]}
                callback(data1);
            } else {
                var data = {'code': 102};
                callback(data);
                return;
            }
        } else {
            var data2 = {'code': 101};
            callback(data2);
            return;
        }
    });
};
//由成员account;查询同乡会信息；
var hz_searchtxh_info = function (target_account, callback) {
    callback = callback == null ? nop : callback;
    if (target_account == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql = 'SELECT * FROM txh_member_table WHERE target_account = "' + target_account + '"';
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var data = {"code": 100, "rows": rows};
                callback(data);
            } else {
                var data1 = {"code": 102, "rows": rows};
                callback(data1);
            }

        } else {
            var data2 = {'code': 101};
            callback(data2);
        }
    });
};

//查询同乡会 所有信息；
var searchtxh = function (txh_id, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql = 'SELECT * FROM txh_info WHERE txh_id = "' + txh_id + '"';
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows[0]) {
                var data = {'code': 100, 'rows': rows};
                callback(data);
                return;
            } else {
                var data = {'code': 102};
                callback(data);
                return;
            }
        } else {
            var data1 = {'code': 101};
            callback(data1);
            return;
        }
    });
};

//更新已有人数：temp == 1 总人数加1  == 0 时总人数减1
function change_txh_number(txh_id, temp, callback) {
    var sql1 = 'SELECT txh_now_man FROM txh_info WHERE txh_id = "' + txh_id + '"';
    query(sql1, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var txh_now_man = 0;
                console.log('txh_now_man', rows);
                if (rows || rows[0].txh_now_man > 0) {
                    if (temp == 1) {
                        txh_now_man = (rows[0].txh_now_man + 1);
                    } else if (temp == 0) {
                        txh_now_man = (rows[0].txh_now_man - 1);
                    }
                } else if (rows || rows[0].txh_now_man == 0 || rows[0].txh_now_man == null) {
                    txh_now_man = 1;
                }
                var sql = 'update txh_info set txh_now_man = ' + txh_now_man + ' where txh_id = "' + txh_id + '"';
                query(sql, function (err, rows) {
                    if (!err) {
                        var data = {"code": 100};
                        callback(data);
                    } else {
                        var data1 = {'code': 101};
                        callback(data1);
                    }
                });
            } else {
                var data1 = {'code': 102};
                callback(data1);
            }
        } else {
            var data1 = {'code': 101};
            callback(data1);
        }
    });
}
//会长给成员封为副会长；
var set_vicechairman = function (txh_id, target_account, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null || target_account == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql = 'SELECT user_title FROM txh_member_table WHERE txh_id = "' + txh_id + '"and target_account = "' + target_account + '"';
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows[0].user_title == 112) {//guolin 11/13 修改只有是成员的才设置成副会长
                var data = {'code': 122};
                callback(data);
            } else {
                var sqls = 'SELECT * FROM txh_member_table WHERE txh_id = "' + txh_id + '"and user_title = 112';
                query(sqls, function (err, rows) {
                    if (!err) {
                        console.log("thisrows.length >>", rows.length);
                        if (rows && rows.length < 2) {
                            var sql = 'SELECT * FROM txh_member_table WHERE target_account = "' + target_account + '" and txh_id = "' + txh_id + '" ';
                            query(sql, function (err, rows) {
                                if (!err) {
                                    if (rows && rows[0]) {
                                        var sql1 = 'update txh_member_table set user_title = 112 where txh_id = "' + txh_id + '"and target_account = "' + target_account + '"';
                                        query(sql1, function (err, rows) {
                                            if (!err) {
                                                var data = {'code': 100}
                                                callback(data);
                                            } else {
                                                var data = {'code': 101}
                                                callback(data);
                                            }
                                        })
                                    } else {
                                        var data = {'code': 102}
                                        callback(data);
                                    }
                                } else {
                                    var data = {'code': 101}
                                    callback(data);
                                }
                            })
                        } else {
                            var data = {"code": 104};
                            callback(data);
                        }
                    } else {
                        var data = {'code': 101}
                        callback(data);
                    }
                })
            }
        } else {
            var data = {'code': 101};
            callback(data);
        }
    })
}
//解除职位；
var fire_user_post = function (txh_id, target_account, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null || target_account == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql = 'SELECT user_title FROM txh_member_table WHERE target_account = "' + target_account + '" and txh_id = "' + txh_id + '" ';
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows[0]) {
                if (rows[0].user_title == 112) {//guolin 11/13 会长解除玩家职位时 如果是副会长才能操作
                    var sql1 = 'update txh_member_table set user_title = 113 where txh_id = "' + txh_id + '"and target_account = "' + target_account + '"';
                    query(sql1, function (err, rows) {
                        if (!err) {
                            var data = {'code': 100}
                            callback(data);
                        } else {
                            var data = {'code': 101}
                            callback(data);
                        }
                    })
                } else {
                    var data = {'code': 121}
                    callback(data);
                }
            } else {
                var data = {'code': 102}
                callback(data);
            }
        } else {
            var data = {'code': 101}
            callback(data);
        }
    })
}
//会长回复申请加入同乡会的信息
var txh_add_member = function (txh_id, target_account, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null || target_account == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var user_title = 113;
    var account2 = target_account;
    var sql1 = 'SELECT * FROM txh_member_table WHERE target_account = "' + account2 + '"and user_title = 113';
    query(sql1, function (err, rows) {
        if (!err) {
            if (rows && rows.length < 4) {
                sql = 'SELECT txh_now_man, txh_all_man FROM txh_info WHERE txh_id = "' + txh_id + '"';
                console.log('guolin ...> ', sql);
                query(sql, function (err, rows) {
                    if (!err) {
                        // console.log('ffffffffff', rows);
                        if (rows && rows.length > 0) {
                            var txh_now_man = rows[0].txh_now_man;
                            var txh_all_man = rows[0].txh_all_man;
                            console.log('txh_now_man,txh_all_man', txh_now_man, txh_all_man);
                            if (parseInt(txh_now_man) < parseInt(txh_all_man)) {
                                var data = {'code': 100};
                                callback(data);
                            } else {
                                var data = {'code': 110};
                                callback(data);
                            }
                        } else {
                            var data = {'code': 102};
                            callback(data);
                        }
                    }
                })
            } else {
                var data1 = {'code': 103};
                callback(data1);
            }
        } else {
            var data1 = {'code': 101};
            callback(data1);
        }
    })

};
//查询同乡会所有成员的接口；
var txh_all_member = function (txh_id, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql = "SELECT * FROM txh_member_table WHERE txh_id = '" + txh_id + "'";
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var data = {"code": 100, 'rows': rows};
                callback(data)
            } else {
                var data = {"code": 102};
                callback(data)
            }
        } else {
            var data = {"code": 101};
            callback(data)
        }
    })
}
//会长查询消息接口；
var hz_search_info = function (txh_id, deal_user_account, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null || deal_user_account == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var account = deal_user_account;
    var sql = "SELECT * FROM txh_info_msg WHERE txh_id = '" + txh_id + "'and deal_user_account = '" + account + "'and deal_status = 0";
    query(sql, function (err, rows) {
        if (!err) {
            console.log('hz_search_info = ', rows);
            if (rows && rows.length > 0) {
                var data = {'code': 100, 'rows': rows};
                callback(data);
            } else {
                var data = {'code': 112, 'rows': rows};
                callback(data);
            }
        } else {
            var data = {'code': 101};
            callback(data);
        }
    });
};

//成员退出同乡会：
var user_sign_out_txh = function (user_id, txh_id, callback) {
    callback = callback == null ? nop : callback;
    if (user_id == null || txh_id == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql1 = "SELECT * FROM txh_member_table WHERE txh_id = '" + txh_id + "'and user_id = '" + user_id + "'";
    query(sql1, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var sql = 'delete from txh_member_table where txh_id = "' + txh_id + '"and user_id ="' + user_id + '"';
                query(sql, function (err, rows) {
                    if (!err) {
                        change_txh_number(txh_id, 0, callback);
                    } else {
                        var data = {'code': 101}
                        callback(data)
                    }
                });
            } else {
                var data = {'code': 116}
                callback(data)
            }
        } else {
            var data = {'code': 101}
            callback(data);
        }
    })

};

//解散同乡会；
var hz_del_txh = function (txh_id, creator_id, callback) {
    callback = callback == null ? nop : callback;
    if (creator_id == null || txh_id == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql = 'SELECT * FROM txh_info WHERE txh_id = "' + txh_id + '" and creator_id = "' + creator_id + '"';
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var t_sql = 'SELECT * FROM txh_room_table WHERE txh_id = "' + txh_id + '" and room_is_excit = 0';//add11/13牌友会有房间为解散不让解散
                query(t_sql, function (err, rows) {
                    if (err) {
                        var data = {'code': 101}
                        callback(data);
                    } else {
                        if (rows && rows.length > 0) {
                            var data = {'code': 123}
                            callback(data);
                        } else {
                            var sql = 'delete from txh_info where txh_id = "' + txh_id + '"and creator_id = "' + creator_id + '"'
                            query(sql, function (err, rows) {
                                if (!err) {
                                    var sql = 'delete from txh_member_table where txh_id = "' + txh_id + '"';
                                    query(sql, function (err, rows) {
                                        if (!err) {
                                            var data = {'code': 100};
                                            callback(data);
                                        } else {
                                            var data = {'code': 101}
                                            callback(data)
                                        }
                                    });

                                } else {
                                    var data = {'code': 101}
                                    callback(data)
                                }
                            });
                        }
                    }
                })
            } else {
                var data = {"code": 105}
                callback(data);
            }
        } else {
            var data = {'code': 101}
            callback(data)
        }
    })
};
//修改同乡会 信息；
var change_txh_info = function (txh_id, txh_disc, creator_id, txh_name, callback) {
    callback = callback == null ? nop : callback;
    if (creator_id == null || txh_id == null || txh_disc == null || txh_name == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql = "SELECT * FROM txh_info WHERE txh_id = '" + txh_id + "'and creator_id ='" + creator_id + "'";
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                console.log('hui zhang shu ju >>', rows);
                var sql1 = 'update txh_info set txh_disc = "' + txh_disc + '",txh_name = "' + txh_name + '" where txh_id = "' + txh_id + '"and creator_id = "' + creator_id + '"';
                query(sql1, function (err, rows) {
                    if (!err) {
                        var data = {"code": 100}
                        callback(data)
                    } else {
                        var data = {"code": 101}
                        callback(data)
                    }
                })
            } else {
                var data = {"code": 105}
                callback(data)
            }
        } else {
            var data = {"code": 101}
            callback(data)
        }
    })
}
// //创建房间接口；
var txh_create_room = function (room_id, txh_id, creator_id, callback) {
    callback = callback == null ? nop : callback;
    if (room_id == null || txh_id == null || creator_id == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var room_is_excit = 0;
    var sql = 'INSERT INTO txh_room_table (room_id,txh_id,creator_id,room_is_excit) VALUES ("' + room_id + '","' + txh_id + '","' + creator_id + '",' + room_is_excit + ')';
    query(sql, function (err, rows) {
        if (!err) {
            var data = {"code": 100}
            callback(data)
        } else {
            var data = {"code": 101}
            callback(data)
        }
    })
}
//加入房间接口；

//查询房间接口：
var search_txh_room = function (txh_id, user_id, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null || user_id == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql1 = 'select * from txh_member_table where txh_id = "' + txh_id + '" and user_id = "' + user_id + '"';
    query(sql1, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                var sql = 'select * from txh_room_table where txh_id = "' + txh_id + '" and room_is_excit = 0';
                query(sql, function (err, rows) {
                    if (!err) {
                        if (rows && rows.length > 0) {
                            var n_data = rows;
                            for (var i = 0; i < n_data.length; i++) {
                                var n_room_id = n_data[i].room_id;
                                var del_num = db.get_room_data(n_room_id);
                                console.log("del num >>>", del_num);
                                if (del_num == null) {
                                    //var sql = 'delete from txh_room_table where room_id = "'+n_room_id+'" and txh_id ="'+txh_id+'"';
                                    var sql = 'update txh_room_table set room_is_excit = 1 where  room_id = "' + n_room_id + '" and txh_id ="' + txh_id + '"';
                                    var all_data = pool.query(sql);
                                    console.log('all_data >>>>', all_data);
                                }
                            }
                            var sql1 = 'select * from txh_room_table where txh_id = "' + txh_id + '" and room_is_excit = 0';
                            var room_data = pool.query(sql1);
                            var room_datas = {"code": 100, "rows": room_data.rows};
                            console.log("room_datas >> ", room_datas);
                            callback(room_datas)
                        } else {
                            var data = {"code": 102};
                            callback(data)
                        }
                    } else {
                        var data = {"code": 101}
                        callback(data)
                    }
                })
            } else {
                var data = {"code": 116}
                callback(data)
            }
        } else {
            var data = {"code": 101}
            callback(data)
        }
    })

}

//查询牌友会 房间历史记录：
var txh_room_history = function (txh_id, user_id, callback) {
    if (txh_id == null || user_id == null) {
        var data = {"code": 103};
        callback(data);
        return;
    }
    var sql = 'select room_id from txh_room_table where txh_id = "' + txh_id + '" and room_is_excit = 1 and user_id = "' + user_id + '"';
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length) {
                var data = {code: 100, rows: rows};
                callback(data);
            } else {
                var data1 = {code: 102}
                callback(data1);
            }
        } else {
            var data = {code: 101}
            callback(data);
        }
    })
}
//判断玩家加入了几个pyh；
var user_join_pyh_num = function (user_id, txh_id, callback) {
    if (user_id == null || txh_id == null) {
        var data = {code: 103};
        return;
    }
    var sql1 = 'select * from txh_member_table where user_id = "' + user_id + '" and txh_id = "' + txh_id + '"';
    query(sql1, function (err, rows) {
        if (!err) {
            console.log('>>>>>>rows >>>>', rows);
            if (rows && rows.length > 0) {
                console.log('length>>>', rows.length)
                var data = {code: 117};
                callback(data);
            } else {
                var sql = 'select * from txh_member_table where user_id = "' + user_id + '" and user_title = 113';
                query(sql, function (err, rows) {
                    if (!err) {
                        if (rows && rows.length > 0) {
                            var data = {code: 100, rows: rows.length};
                            callback(data);
                            return;
                        } else {
                            var data1 = {code: 102};
                            callback(data1);
                            return;
                        }
                    } else {
                        var data = {code: 101};
                        callback(data);
                        return;
                    }
                })
            }
        } else {
            var data = {code: 101};
            callback(data);
            return;
        }
    })
}

//判断用户有没有开房的权利：
var check_permissions = function (txh_id, user_account, creator_id, callback) {
    callback = callback == null ? nop : callback;
    var sql = 'select user_title from txh_member_table where target_account = "' + user_account + '" and txh_id = "' + txh_id + '"';// 11/13 判断权限添加txh_id
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                if (rows[0].user_title == 111 || rows[0].user_title == 112) {
                    var ret = db.get_gems(user_account);
                    console.log("ret:", ret);
                    if (ret && ret.gems && ret.gems >= 8) {
                        var data1 = {code: 100}
                        callback(data1);
                    } else {
                        var s_gems = ret.gems
                        var user_uuid = user_account.substring(3);
                        var need_data = {user_id: creator_id};
                        var is_daili = http.getSync(DAI_LI_IP + ":" + DAL_LI_PORT + "/api/v1/dealers/checkdaili", need_data);
                        console.log("is_daili", is_daili);
                        if (is_daili.data.code == 0) {
                            var gems = is_daili.data.msg[0].gems;
                            console.log('gems>>>', gems);
                            if ((parseInt(gems) + parseInt(s_gems)) > 18) {
                                var data5 = {code: 120};
                                num = 18 - s_gems;
                                callback(data5);
                            } else {
                                var data2 = {code: 106}
                                callback(data2);
                            }
                        } else if (is_daili.data.code == 2) {
                            var data2 = {code: 106}
                            callback(data2);
                        }
                    }
                } else {
                    var data = {"code": 105};
                    callback(data);
                }
            } else {
                var data = {"code": 102};
                callback(data);
            }
        } else {
            var data = {"code": 101};
            callback(data);
        }
    })
}

//查询房间详情；
var check_room_detail = function (roomId, callback) {
    // var rets = db.get_room_uuid(roomId);
    // console.log('>>>>>>',rets)
    var rows = db.get_room_data(roomId)
    // console.log("!!!!", rows)
    var userdatas = [];
    if (rows && rows.user_id0) {
        userdatas.push(rows.user_id0);
    } else {
        userdatas.push(0);
    }
    if (rows && rows.user_id1) {
        userdatas.push(rows.user_id1);
    } else {
        userdatas.push(0);
    }
    if (rows && rows.user_id2) {
        userdatas.push(rows.user_id2);
    } else {
        userdatas.push(0);
    }
    if (rows && rows.user_id3) {
        userdatas.push(rows.user_id3);
    } else {
        userdatas.push(0);
    }
    var name = "name";
    for (var i = 0; i < userdatas.length; i++) {
        if (userdatas[i]) {
            var namedata = db.get_user_data_by_userid(userdatas[i]);
            if (namedata) {
                rows[name + i] = namedata.name;
            }
        }
    }
    callback(rows);
}

//查询缺角房间；
var que_jiao_room = function (txh_id, callback) {
    callback = callback == null ? nop : callback;
    if (txh_id == null) {
        var data = {code: 103};
        return;
    }
    var sql = 'select room_id from txh_room_table where txh_id = "' + txh_id + '" and room_is_excit = 0';
    query(sql, function (err, rows) {
        if (!err) {
            if (rows && rows.length > 0) {
                console.log('chaxunquejiao>', rows);
                var rowsL = rows;
                var py_room_list = []
                for (var i = 0; i < rows.length; i++) {
                    //py_room_list.push(rowsL[i].room_id);
                    var n_roomid = rows[i].room_id;
                    if (n_roomid) { //查询房间信息时要加roomID是否存在；11/13
                        check_room_detail(n_roomid, function (data) {
                            var roomData = data;
                            if (roomData) {
                                var str = 'room_id';
                                roomData[str] = n_roomid;
                                if (roomData.user_id0 || roomData.user_id1 || roomData.user_id2 || roomData.user_id3) {
                                    py_room_list.push(roomData);
                                }
                            }
                        })
                    } else {
                        console.log('room_id is null');
                    }
                }
                callback({code: 100, rows: py_room_list});
            } else {
                var data = {code: 102};
                callback(data);
                return;
            }
        } else {
            var data = {code: 101};
            callback(data);
            return;
        }
    })

}
//====================================以上是数据库接口==================
//======================================================================
//生成随机数
function generateRoomId() {
    var txhId = "";
    for (var i = 0; i < 6; ++i) {
        txhId += Math.floor(Math.random() * 10);
    }
    return txhId;
}
//====================================以下是通用接口====================
//会长同意添加用户如表；
function hz_add_member(txh_id, user_id, target_account, user_name, apply_position, res, http) {
    var user_title = 113;

    if (txh_id == null || user_id == null || target_account == null || user_name == null || user_title == null) {
        http.send(res, 103, "shengqing add txh data error !");
        return;
    }
    txh_addnumbers(txh_id, user_id, target_account, user_name, user_title, apply_position, function (data) {
        console.log('tonbuinfo = ', data);
        if (data.code == 100) {
            var todo_user_account = target_account;
            var about_user_account = null;
            var todo_status = 1;
            add_active_info(txh_id, todo_user_account, about_user_account, todo_status, function (data) {
                if (data.code == 100) {
                    console.log('add user info successed !');
                    http.send(res, 100, "add user txh successed !");
                    return;
                } else {
                    console.log('tonbu add_active_info info failed !');
                    http.send(res, 101, "tonbu add_active_info info send failed !");
                    return;
                }
            })

        } else if (data.code == 101) {
            console.log('add user apply info failed !');
            http.send(res, 101, "sheng qing info send failed !");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
};

//同步创建房间人的信息
function syscreatorinfo(txh_id, user_id, target_account, user_name, user_title, apply_position, res, http) {
    if (txh_id == null || user_id == null || target_account == null || user_name == null || user_title == null || apply_position == null || res == null) {
        http.send(res, 103, "create and baocun txh data error !");
        return;
    }
    txh_addnumbers(txh_id, user_id, target_account, user_name, user_title, apply_position, function (data) {
        console.log('tonbuinfo = ', data);
        if (data.code == 100) {
            console.log('tonbu info successed !');
            var todo_user_account = target_account;
            var about_user_account = null;
            var todo_status = 0;
            add_active_info(txh_id, todo_user_account, about_user_account, todo_status, function (data) {
                if (data.code == 100) {
                    console.log('add_active_info success !');
                    http.send(res, 100, "create and baocun txh successed !");
                    return;
                } else {
                    console.log('tonbu add_active_info info failed !');
                    http.send(res, 101, "tonbu add_active_info info send failed !");
                    return;
                }
            })
        } else if (data.code == 101) {
            console.log('tonbu info failed !');
            http.send(res, 101, "tongbu info failed !");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
}

//======================================================================
//====================================以下是http服务接口====================
//玩家创建同乡会：
var t_creat_txh = function (req, res, http) {
    var data = req.query;
    var txh_name = data.txh_name;
    var txh_quyu = data.txh_quyu;
    var txh_disc = data.txh_disc;
    var target_account = data.target_account;
    var creator_name = data.creator_name;
    var creator_id = data.creator_id;
    var creator_position = data.creator_position;

    if (data.txh_name == null || data.txh_quyu == null || data.txh_disc == null || data.target_account == null || data.creator_id == null || data.creator_name == null || data.creator_position == null) {
        http.send(res, 103, "data err !");
        return;
    }
    if (txh_disc.length > 525) {
        http.send(res, 114, "数据长度超过525字节 !");
        return;
    }
    is_creat_txh(target_account, creator_id, function (data) {
        if (data.code == 100) {
            var fncreate = function () {
                var txh_id = generateRoomId();
                console.log('txh_id = ', txh_id);
                if (txh_id != null) {
                    isexcittxhid(txh_id, function (data) {
                        console.log('txh gggg = ', data);
                        if (data.code == 112) {
                            creat_association(txh_name, txh_id, txh_quyu, txh_disc, target_account, creator_id, creator_name, creator_position, function (data) {
                                if (data.code == 100) {
                                    console.log('create txh successed !');
                                    var user_title = 111;
                                    var user_id = creator_id;
                                    var user_name = creator_name;
                                    var apply_position = creator_position;
                                    syscreatorinfo(txh_id, user_id, target_account, user_name, user_title, apply_position, res, http)
                                } else if (data.code == 101) {
                                    console.log('creat txh failed !');
                                    http.send(res, 101, "creat txh failed !");
                                }
                            });
                        } else if (data.code == 111) {
                            console.log('txh_id is excite');
                            fncreate();
                        } else if (data.code == 101) {
                            console.log('creat txh failed !');
                            http.send(res, 101, "creat txh failed !");
                        } else {
                            http.send(res, 10000, "未知错误一万年");
                            return;
                        }
                    })
                } else {
                    console.log('生牌友会会ID 失败 !');
                    http.send(res, 120, "生成牌友会ID 失败 !");
                }
            }();
        } else if (data.code == 118) {
            console.log('代理只能创建3个牌友会');
            http.send(res, 118, "代理只能创建3个牌友会 !");
        } else if (data.code == 119) {
            console.log('普通玩家只能创建1个牌友会');
            http.send(res, 119, "您只能创建1个牌友会(申请代理可建更多哦) !");
        } else if (data.code == 101) {
            console.log('search create txh num error !');
            http.send(res, 101, "search create txh num error !");
        } else {
            http.send(res, 10000, "未知错误10000");
            return;
        }
    });
};

//玩家申请加入同乡会, moved to mailservice

//会长同意添加成员到同乡会 时调用；
var t_add_member = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    var user_id = data.user_id;
    var target_account = data.target_account;
    var user_name = data.user_name;
    var apply_position = data.apply_position;
    if (txh_id == null || user_id == null || target_account == null || user_name == null) {
        http.send(res, 103, " add txh data error !");
        return;
    }
    txh_add_member(txh_id, target_account, function (data) {
        console.log('add member data >>>', data);
        if (data && data.code && data.code == 100) {
            hz_add_member(txh_id, user_id, target_account, user_name, apply_position, res, http);
        } else if (data && data.code && data.code == 110) {
            http.send(res, 110, " 牌友会人数已满 !");
            return;
        } else if (data && data.code && data.code == 100) {
            http.send(res, 102, " 数据不存在 !");
            return;
        } else if (data && data.code && data.code == 101) {
            http.send(res, 101, " 数据请求错误 !");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })

}

//会长删除成员接口：
var t_txh_del_user = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    var hz_target_account = data.hz_target_account;
    var cy_target_account = data.cy_target_account;
    if (txh_id == null || hz_target_account == null || cy_target_account == null) {
        http.send(res, 103, "del user post data error !");
        return;
    }
    if (hz_target_account == cy_target_account) {
        http.send(res, 113, "自己不能对自己进行操作!");
        return;
    }
    pdishuizhang(txh_id, hz_target_account, function (data) {
        console.log('panduan hizhang data : ', data);
        if (data.code == 100) {
            if (data.rows.user_title == 111 || data.rows.user_title == 112) {
                del_user_info(txh_id, cy_target_account, function (data) {
                    console.log('del_user_info = ', data);
                    if (data.code == 100) {
                        var todo_user_account = hz_target_account;
                        var about_user_account = cy_target_account;
                        var todo_status = 8;
                        add_active_info(txh_id, todo_user_account, about_user_account, todo_status, function (data) {
                            if (data.code == 100) {
                                console.log('tongbu and del success !')
                                http.send(res, 100, "del user data successed !");
                                return;
                            } else {
                                console.log('tonbu add_active_info info failed !');
                                http.send(res, 101, "tonbu add_active_info info send failed !");
                                return;
                            }
                        })
                    } else if (data.code == 102) {
                        http.send(res, 102, "del user data is not excit !");
                        return;
                    } else if (data.code == 101) {
                        http.send(res, 101, "del user apply error !");
                        return;
                    } else if (data.code == 120) {
                        http.send(res, 120, "不能对会长进行操作 !");
                        return;
                    } else {
                        http.send(res, 10000, "未知错误一万年");
                        return;
                    }
                })
            } else {
                http.send(res, 105, "不是会长不能删除会员!");
                return;
            }

        } else if (data.code == 102) {
            console.log('check huizhang data is not excit !')
            http.send(res, 102, "check huizhang data is not excit !");
            return;
        } else if (data.code == 101) {
            console.log('check huizhang  error !')
            http.send(res, 101, "check huizhang  error !");
            return;
        } else if (data.colde == 103) {
            console.log('pdshihuizhang post data error')
            http.send(res, 103, "pdshihuizhang post data error !");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
};

//查询member表info;
var t_member_search_txh = function (req, res, http) {
    var data = req.query;
    var target_account = data.target_account;
    if (target_account == null) {
        http.send(res, 103, "hz account search txh data error !");
        return;
    }
    hz_searchtxh_info(target_account, function (data) {
        if (data.code == 100) {
            http.send(res, 100, data.rows);
        } else if (data.code == 101) {
            console.log('hz id search txh data error !');
            http.send(res, 101, "hz id search txh data error !");
            return;
        } else if (data.code == 102) {
            console.log('check hui zhang data not excit !');
            http.send(res, 102, "hz id search txh not excit !");
            return;
        } else {
            http.send(res, 10000, "未知错误");
            return;
        }
    })
}

//查询txh all data 接口；
var t_search_txh_all_data = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    searchtxh(txh_id, function (data) {
        //console.log('search_txh_all_data ! >>>', data);
        if (data && data.code && data.code == 100) {
            console.log('all txh data >>>');
            http.send(res, 100, data.rows);
        } else if (data && data.code && data.code == 102) {
            console.log('all txh data  is null>>>');
            http.send(res, 102, "数据不存在！");
        } else if (data && data.code && data.code == 101) {
            console.log('all txh data >>>');
            http.send(res, 101, "查询出错");
        } else if (data && data.code && data.code == 103) {
            console.log('all txh data >>>');
            http.send(res, 103, "如参错误");
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
}

//会长封玩家为副会长；{
var t_set_vicechairman = function (req, res, http) {
    var data = req.query;
    var hz_target_account = data.hz_target_account;
    var cy_target_account = data.cy_target_account;
    var txh_id = data.txh_id;
    if (hz_target_account == null || cy_target_account == null || txh_id == null) {
        http.send(res, 103, "hz account search txh data error !");
        return;
    }
    if (hz_target_account == cy_target_account) {
        http.send(res, 113, "自己不能对自己进行操作 !");
        return;
    }
    console.log(hz_target_account, cy_target_account)
    pdishuizhang(txh_id, hz_target_account, function (data) {
        console.log('pdishuizhang 11 = ', data);
        if (data.code == 100) {
            if (data.rows.user_title == 111) {
                set_vicechairman(txh_id, cy_target_account, function (data) {
                    console.log('set_vicechairman = ', data);
                    if (data.code == 100) {
                        var todo_user_account = hz_target_account;
                        var about_user_account = cy_target_account;
                        var todo_status = 9;
                        add_active_info(txh_id, todo_user_account, about_user_account, todo_status, function (data) {
                            if (data.code == 100) {
                                console.log('封官成功 and add_active_info info chenggong !');
                                http.send(res, 100, "设置副会长成功 ！");
                                return;
                            } else {
                                console.log('tonbu add_active_info info failed !');
                                http.send(res, 116, "同步action表信息失败 !");
                                return;
                            }
                        })
                        // http.send(res,100,"封官成功 !");
                        // return;
                    } else if (data.code == 102) {
                        http.send(res, 102, "set_vicechairman data is not excit !");
                        return;
                    } else if (data.code == 122) {
                        http.send(res, 122, "成员已经是副会长了 !");
                        return;
                    } else if (data.code == 101) {
                        http.send(res, 101, "set_vicechairman error !");
                        return;
                    } else if (data.code == 104) {
                        http.send(res, 104, "只能设置两个副会长!");
                        return;
                    } else {
                        http.send(res, 10000, "未知错误一万年");
                        return;
                    }
                })
            } else {
                http.send(res, 105, "不是会长不能执行设置副会长操作!");
                return;
            }

        } else if (data.code == 102) {
            console.log('check huizhang data is not excit !')
            http.send(res, 102, "check huizhang data is not excit !");
            return;
        } else if (data.code == 101) {
            console.log('check huizhang  error !')
            http.send(res, 101, "check huizhang  error !");
            return;
        } else if (data.colde == 103) {
            console.log('pdshihuizhang post data error')
            http.send(res, 103, "pdshihuizhang post data error !");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })

}
//会长解除玩家副会长职位；{
var t_fire_user_post = function (req, res, http) {
    var data = req.query;
    var hz_target_account = data.hz_target_account;
    var cy_target_account = data.cy_target_account;
    var txh_id = data.txh_id;
    if (hz_target_account == null || cy_target_account == null || txh_id == null) {
        http.send(res, 103, "hz account search txh data error !");
        return;
    }
    if (hz_target_account == cy_target_account) {
        http.send(res, 113, "自己不能对自己进行操作 !");
        return;
    }
    console.log(hz_target_account, cy_target_account)
    pdishuizhang(txh_id, hz_target_account, function (data) {
        console.log('pdishuizhang 11 = ', data);
        if (data.code == 100) {
            if (data.rows && data.rows.user_title == 111) {
                fire_user_post(txh_id, cy_target_account, function (data) {
                    console.log('fire_user_post = ', data);
                    if (data.code == 100) {
                        var todo_user_account = hz_target_account;
                        var about_user_account = cy_target_account;
                        var todo_status = 6;
                        add_active_info(txh_id, todo_user_account, about_user_account, todo_status, function (data) {
                            if (data.code == 100) {
                                console.log('tonbu add_active_info 解除官位成功 !');
                                http.send(res, 100, "解除副会长职位成功 !");
                                return;
                            } else {
                                console.log('tonbu add_active_info info failed !');
                                http.send(res, 116, "同步action表信息失败 !");
                                return;
                            }
                        })
                        // http.send(res,100,"解除官位成功 !");
                        // return;
                    } else if (data.code == 121) {
                        http.send(res, 121, "该成员没有职务！");
                        return;
                    } else if (data.code == 102) {
                        http.send(res, 102, "成员信息没有查询到 !");
                        return;
                    } else if (data.code == 101) {
                        http.send(res, 101, "fire_user_post error !");
                        return;
                    } else {
                        http.send(res, 10000, "未知错误一万年");
                        return;
                    }
                })
            } else {
                http.send(res, 105, "不是会长不能执行解除职位操作!");
                return;
            }

        } else if (data.code == 102) {
            console.log('check huizhang data is not excit !')
            http.send(res, 102, "check huizhang data is not excit !");
            return;
        } else if (data.code == 101) {
            console.log('check huizhang  error !')
            http.send(res, 101, "check huizhang  error !");
            return;
        } else if (data.colde == 103) {
            console.log('pdshihuizhang post data error')
            http.send(res, 103, "pdshihuizhang post data error !");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
};
//成员退出同乡会；
var t_user_sign_out_txh = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    var user_id = data.user_id;
    var target_account = data.target_account;
    user_sign_out_txh(user_id, txh_id, function (data) {
        console.log("退出 牌友会 ", data);
        if (data && data.code && data.code == 100) {
            var todo_user_account = target_account;
            var about_user_account = null;
            var todo_status = 2;
            add_active_info(txh_id, todo_user_account, about_user_account, todo_status, function (data) {
                if (data.code == 100) {
                    console.log('tonbu add_active_info info chenggong !');
                    http.send(res, 100, "退出成功 ！");
                    return;
                } else {
                    console.log('tonbu add_active_info info failed !');
                    http.send(res, 101, "同步action表信息失败 !");
                    return;
                }
            })
        } else if (data && data.code && data.code == 101) {
            console.log('user 退出 失败 !');
            http.send(res, 101, "退出失败 !");
            return;
        } else if (data && data.code && data.code == 116) {
            console.log('user 已经退出该牌友会了!');
            http.send(res, 116, "已经退出该牌友会了 !");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
};

//会长删除txh;
var t_hz_del_txh = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    var creator_id = data.creator_id;
    var target_account = data.target_account;
    if (txh_id == null || creator_id == null) {
        var data = {'code': 103};
        http.send(res, 103, "如参错误!");
        return;
    }
    hz_del_txh(txh_id, creator_id, function (data) {
        if (data && data.code && data.code == 100) {
            var todo_user_account = target_account;
            var about_user_account = null;
            var todo_status = 3;
            add_active_info(txh_id, todo_user_account, about_user_account, todo_status, function (data) {
                if (data.code == 100) {
                    console.log('删除牌友会成功 !');
                    http.send(res, 100, "删除牌友会成功 !");
                    return;
                } else {
                    console.log('tonbu add_active_info info failed !');
                    http.send(res, 116, "tonbu add_active_info info send failed !");
                    return;
                }
            })
        } else if (data && data.code && data.code == 101) {
            console.log('删除牌友会失败 !');
            http.send(res, 101, "删除牌友会失败!");
            return;
        } else if (data && data.code && data.code == 123) {
            console.log('牌友会有房间未解散，不能解散牌友会!');
            http.send(res, 123, "牌友会有房间未解散，不能解散牌友会，请先去解散房间！");
            return;
        }
        else if (data && data.code && data.code == 105) {
            console.log('不是会长不能删除牌友会!');
            http.send(res, 105, "不是会长不能删除牌友会 !");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
};

//查询同乡会所有成员
var t_all_member = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    txh_all_member(txh_id, function (data) {
        if (data && data.code && data.code == 100) {
            console.log('查询同乡会成员信息成功!');
            http.send(res, 100, data.rows);
            return;
        } else if (data && data.code && data.code == 102) {
            console.log('查询同乡会成员数据不存在!');
            http.send(res, 102, "查询同乡会成员数据不存在");
            return;
        } else if (data && data.code && data.code == 101) {
            console.log('查询同乡会成员信息失败!');
            http.send(res, 101, "查询同乡会成员信息失败");
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
};

//会长修改同乡会；
var t_change_txh_info = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    var creator_id = data.creator_id;
    var txh_disc = data.txh_disc;
    var txh_name = data.txh_name;
    change_txh_info(txh_id, txh_disc, creator_id, txh_name, function (data) {
        console.log('change_txh data>>', data);
        if (data && data.code == 100) {
            console.log('修改同乡会信息成功!');
            http.send(res, 100, '修改同乡会信息成功！');
            return;
        } else if (data && data.code == 101) {
            console.log('修改同乡会信息失败!');
            http.send(res, 101, '修改同乡会信息失败！');
            return;
        } else if (data && data.code == 105) {
            console.log('不是会长不能修改同乡会!');
            http.send(res, 105, '不是会长不能修改同乡会！');
            return;
        } else if (data && data.code == 103) {
            console.log('修改同乡会信息如参错误!');
            http.send(res, 103, '修改同乡会信息如参错误！');
            return;
        } else {
            console.log('未知错误!');
            http.send(res, 10000, '未知错误！');
            return;
        }
    })

}

//创建房间接口；
var t_txh_create_room = function (req, res, http) {
    var data = req.query;
    var room_id = data.room_id;
    var target_account = data.target_account;
    var txh_id = data.txh_id;
    var creator_id = data.creator_id;
    if (room_id == null || txh_id == null || creator_id == null) {
        console.log('创建房间如参错误!');
        http.send(res, 103);
        return;
    }

    txh_create_room(room_id, txh_id, creator_id, function (data) {
        if (data && data.code && data.code == 100) {
            var todo_user_account = target_account;
            var about_user_account = null;
            var todo_status = 4;
            add_active_info(txh_id, todo_user_account, about_user_account, todo_status, function (data) {
                if (data.code == 100) {
                    console.log('创建房间成功 !');
                    http.send(res, 100, "创建房间成功 !");
                    return;
                } else {
                    console.log('tonbu add_active_info info failed !');
                    http.send(res, 116, "tonbu add_active_info info send failed !");
                    return;
                }
            })
            // console.log('创建房间成功!');
            // http.send(res,100,'创建房间成功');
            // return;
        } else if (data && data.code && data.code == 101) {
            console.log('创建房间存储信息失败!');
            http.send(res, 101, '创建房间存储为同乡会房间信息失败');
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
};

//查询房间接口：
var t_search_txh_room = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    var user_id = data.user_id;
    if (txh_id == null || user_id == null) {
        console.log('搜索房如参错误');
        http.send(res, 103, '搜索房如参错误');
        return;
    }
    search_txh_room(txh_id, user_id, function (data) {
        if (data && data.code && data.code == 100) {
            var isdata = data.rows
            console.log('搜索房间成功!');
            http.send(res, 100, isdata);
            return;
        } else if (data && data.code && data.code == 102) {
            console.log('搜索房间成功! 房间为空');
            http.send(res, 102, '搜索房间成功! 房间为空');
            return;
        } else if (data && data.code && data.code == 101) {
            console.log('搜索房间出错');
            http.send(res, 101, '搜索房间出错');
            return;
        }
        else if (data && data.code && data.code == 116) {
            console.log('搜索房间出错');
            http.send(res, 116, '您不在该同乡会不能查看，请加入');
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }

    })
};
//查询房间详情；roomid 查询；
var t_search_room_detail = function (req, res, http) {
    var data = req.query;
    var room_id = data.room_id;
    if (room_id == null) {
        console.log('如参错误');
        http.send(res, 103, '如参error');
        return;
    }
    check_room_detail(room_id, function (data) {
        if (data) {
            http.send(res, 100, data);
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }

    })
}

//检查是否有权限创建房间；

var t_check_permissions = function (req, res, http) {
    var data = req.query;
    var target_account = data.target_account;
    var creator_id = data.creator_id;
    var txh_id = data.txh_id;
    console.log('this check premissions>txh_id >>', txh_id);
    if (txh_id == null || target_account == null || creator_id == null) {
        console.log('判断是否能创建房间如参错误');
        http.send(res, 103, '判断是否能创建房间如参错误');
        return;
    }
    check_permissions(txh_id, target_account, creator_id, function (data) {
        if (data && data.code == 100) {
            console.log('玩家能够创建房间');
            http.send(res, 100, '玩家能够创建房间');
            return;
        } else if (data && data.code == 105) {
            console.log('玩家不是会长，不能创建房间');
            http.send(res, 105, '玩家不是会长，不能创建房间');
            return;
        } else if (data && data.code == 106) {
            console.log('玩家钻石不够，不能创建房间');
            http.send(res, 106, '玩家钻石不够，不能创建房间');
            return;
        } else if (data && data.code == 101) {
            console.log('查询数据错误');
            http.send(res, 101, '查询数据错误');
            return;
        } else if (data && data.code == 102) {
            console.log('查询信息为空');
            http.send(res, 102, '查询信息为空');
            return;
        } else if (data && data.code && data.code == 120) {
            console.log('您的游戏账号钻石不足。你的代理账号有钻石');
            http.send(res, 120, '您的游戏账号钻石不足，您的代理账号有钻石，是否使用代理账号钻石为游戏账号充值！');
            return;
        }
        else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
}

//查询缺角房间；
var t_que_jiao_room = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    if (txh_id == null) {
        console.log('如参错误');
        http.send(res, 103, '如参error');
        return;
    }
    que_jiao_room(txh_id, function (data) {
        if (data && data.code && data.code == 100) {
            console.log("txh_room_data>>", data.rows);
            http.send(res, 100, data.rows);
            return;
        } else if (data && data.code && data.code == 101) {
            console.log("txh_room_data error");
            http.send(res, 101, 'txh_room_data error');
            return;
        } else if (data && data.code && data.code == 102) {
            console.log("txh_room_data 数据为空");
            http.send(res, 102, 'txh_room_data 数据为空');
            return;
        } else {
            http.send(res, 10000, "未知错误一万年");
            return;
        }
    })
};

//过滤牌友会历史房间；
var t_txh_room_history = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    var user_id = data.user_id;
    if (txh_id == null || user_id == null) {
        console.log('查询txh历史房间如参错误!');
        http.send(res, 103, '查询txh历史房间如参错误');
        return;
    }
    txh_room_history(thx_id, user_id, function (data) {
        if (data && data.code && data.code == 100) {
            console.log('查询txh历史房间成功!');
            http.send(res, 100, data.rows);
            return;
        } else if (data && data.code && data.code == 101) {
            console.log('查询pxh历史房间失败!');
            http.send(res, 101, '查询pxh历史房间失败!');
            return;
        } else if (data && data.code && data.code == 102) {
            console.log('查询pxh历史房间数据为空!');
            http.send(res, 102, '查询pxh历史房间数据为空!');
            return;
        } else {
            console.log('未知错误!');
            http.send(res, 10000, '未知错误!');
            return;
        }
    })
}
//判断玩家加入几个牌友会了；
var t_user_join_pyh_num = function (req, res, http) {
    var data = req.query;
    var txh_id = data.txh_id;
    var user_id = data.user_id;
    if (user_id == null || txh_id == null) {
        console.log('查询玩家加入pyh num如参错误!');
        http.send(res, 103, '查询玩家加入pyh num如参错误!');
        return;
    }
    user_join_pyh_num(user_id, txh_id, function (data) {
        if (data && data.code && data.code == 100) {
            console.log('玩家已经加入过牌友会！');
            http.send(res, 100, data.rows);
            return;
        } else if (data && data.code && data.code == 102) {
            console.log('玩家已还没有加入任何牌友会！');
            http.send(res, 102, '您还没有加入任何牌友会，快去加入吧！');
            return;
        } else if (data && data.code && data.code == 101) {
            console.log('查询玩家加入牌友会出错！');
            http.send(res, 101, '查询玩家加入牌友会出错！');
            return;
        } else if (data && data.code && data.code == 117) {
            console.log('查询玩家已经在该牌友会了！');
            http.send(res, 117, '您已经在该牌友会了！');
            return;
        } else {
            console.log('未知错误！');
            http.send(res, 10000, '未知错误！');
            return;
        }
    })
};

//查询房间历史信息；
exports.search_room_history = function (roomid, callback) {
    if (roomid == null) {
        var data = {code: 103};
        callback(data);
    }
    var sql = 'select * from t_rooms_archive where id ="' + roomid + '"';
    //var sql = 'select * from t_rooms_archive where uuid ="'+roomuuid+'"';
    var history_data = pool.query(sql);
    var data = {code: 100, history_data: history_data.vals};
    callback(data)
};
//get user_info 通过 account;
exports.get_user_info_by_account = function (account) {
    if (account == null) {
        var data = {code: 103};
        return;
    }
    var sql = 'select * from t_user_addinfo where account = "' + account + '"';
    var ret = pool.query(sql);
    if (ret.err) {
        return false;
    }
    return ret.rows[0];
}

//===============================================================
//================ 对外接口申明 ================================
exports.creat_association = t_creat_txh;
exports.add_member = t_add_member;
exports.txh_dele_user = t_txh_del_user;
exports.txh_member_search_txh = t_member_search_txh;
exports.search_txh_all_data = t_search_txh_all_data;
exports.set_vicechairman = t_set_vicechairman;
exports.fire_user_post = t_fire_user_post;
exports.user_sign_out_txh = t_user_sign_out_txh;
exports.hz_del_txh = t_hz_del_txh;
exports.all_member = t_all_member;
exports.t_txh_create_room = t_txh_create_room;
exports.t_search_txh_room = t_search_txh_room;
exports.t_check_permissions = t_check_permissions;
exports.t_search_room_detail = t_search_room_detail;
exports.t_change_txh_info = t_change_txh_info;
exports.t_txh_room_history = t_txh_room_history;
exports.t_user_join_pyh_num = t_user_join_pyh_num;
exports.t_que_jiao_room = t_que_jiao_room;

//===============================================================
//txh socket;

handles.agree_add_gems = function (socket, datas) {
    console.log('接收到同意添加钻石的消息；', datas);
    var data1 = JSON.parse(datas);
    console.log('data1>>>', data1);
    console.log('data1333>>>', data1.code);
    if (data1 && data1.code == 1) {
        var nums = num;
        console.log('nums >>>', nums);
        var s_data = {num: nums, user_id: data1.user_id}
        var newGems = http.getSync(DAI_LI_IP + ":" + DAL_LI_PORT + "/api/v1/dealers/des_gems", s_data);
        console.log("newGems >>>" + newGems);
        if (newGems.data.code == 0) {
            hallUsermgr.sendMsg(data1.user_id, "go_to_creat_room", {code: 0, data: '充值成功，您可以替别人开房间了'});
        } else {
            hallUsermgr.sendMsg(data1.user_id, "go_to_creat_room", {code: 1, data: '充值失败，请稍后再试！'});
        }
    } else {
        console.log('玩家放弃了充值！')
    }
}

exports.getHandles = function () {
    return handles;
};
