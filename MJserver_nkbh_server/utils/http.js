var http = require('http');
var https = require('https');
var qs = require('querystring');
var fibers = require('fibers');

exports.post = function (host, port, path, data, callback) {

    var content = qs.stringify(data);
    var options = {
        hostname: host,
        port: port,
        path: path + '?' + content,
        method: 'GET'
    };

    var req = http.request(options, function (res) {
        console.log('STATUS: ' + res.statusCode);
        console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            //console.log('BODY: ' + chunk);
            callback(chunk);
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });

    req.end();
};

exports.get2 = function (url, data, callback, safe) {
    var content = qs.stringify(data);
    var url = url + '?' + content;
    var proto = http;
    if (safe) {
        proto = https;
    }
    var req = proto.get(url, function (res) {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            //console.log('BODY: ' + chunk);
            var json = JSON.parse(chunk);
            callback(true, json);
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
        callback(false, e);
    });

    req.end();
};

exports.getSync = function (url, data, safe) {
    var content = qs.stringify(data);
    var url = url + '?' + content;
    var proto = http;
    if (safe) {
        proto = https;
    }

    var ret = {
        err: null,
        data: null,
    };

    var f = fibers.current;

    var req = proto.get(url, function (res) {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            try {
                ret.data = JSON.parse(chunk);
            } catch (e) {
                console.log('http json parse error[' + e + '], data[' + chunk + '], url:' + url);
                ret.data = {};
            }
            f.run();
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
        ret.err = e;
        f.run();
    });

    req.end();

    fibers.yield();
    return ret;
};

exports.get = function (host, port, path, data, callback, safe) {
    var content = qs.stringify(data);
    var options = {
        hostname: host,
        path: path + '?' + content,
        method: 'GET'
    };
    if (port) {
        options.port = port;
    }
    var proto = http;
    if (safe) {
        proto = https;
    }
    var req = proto.request(options, function (res) {
        //console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            //console.log('BODY: ' + chunk);
            var json = JSON.parse(chunk);
            callback(true, json);
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
        callback(false, e);
    });

    req.end();
};

exports.send = function (res, errcode, errmsg, data) {
    if (data == null) {
        data = {};
    }
    data.errcode = errcode;
    data.errmsg = errmsg;
    var jsonstr = JSON.stringify(data);
    res.send(jsonstr);
};