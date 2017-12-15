var MYSQL = require("mysql");
var FIBERS = require('fibers');

var pool = null;

exports.init = function (config) {
    if (pool == null) {
        pool = MYSQL.createPool({
            host: config.HOST,
            user: config.USER,
            password: config.PSWD,
            database: config.DB,
            port: config.PORT,
        });
    }
};

exports.query = function (sql, print) {
    print = false;
    if (print) {
        console.log(sql);
    }
    var fc = FIBERS.current;
    if (!fc) {
        throw Error('must call this in fiber.');
    }
    var ret = {
        err: null,
        vals: null,
        rows: null,
        fields: null,
    };
    pool.getConnection(function (err, conn) {
        if (err) {
            ret.err = err;
            console.log(err);
            fc.run();
        } else {
            conn.query(sql, function (qerr, vals, fields) {
                //释放连接
                conn.release();
                if (qerr) {
                    console.log(qerr);
                }
                ret.err = qerr;
                ret.vals = vals;
                ret.rows = vals;
                ret.fields = fields;
                fc.run();
            });
        }
    });
    FIBERS.yield();
    return ret;
};