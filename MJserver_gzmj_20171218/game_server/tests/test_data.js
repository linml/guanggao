/**
 * Created by Administrator on 2017/10/14.
 */

exports.get_laizimjutils_test_data = function () {
    return [
        // {type: "xzdd", laiZis: {0: true}, holds: [1, 4, 7, 9, 12, 15, 18, 21, 25, 27, 28, 29, 30, 31], daChuDePai: -1},
        // {type: "xzdd", laiZis: {0: true}, holds: [1, 2, 7, 9, 12, 15, 18, 21, 25, 27, 28], daChuDePai: -1},

        //十三烂 OK
        // {type: "xzdd", laiZis: {1:true, 2: true,}, holds: [2, 4, 8, 12, 15, 18, 21, 25, 27, 28, 29, 30, 31], daChuDePai: 1},

        //十三烂 精还原OK
        // {type: "xzdd", laiZis: {1:true, 2: true,}, holds: [ 4, 8, 12, 15, 18, 21, 25, 27, 28, 29, 30, 31,32 , 1], daChuDePai: -1},

        //十三烂+qixing OK
        // {type: "xzdd", laiZis: {1:true, 33: true,}, holds: [1, 4, 8, 12, 15, 18, 21, 27, 28, 29, 30, 31, 33, 32], daChuDePai: -1},

        //小七对
        // {type: "xzdd", laiZis: {1:true, 33: true,}, holds: [1, 2, 2, 4, 4, 21, 21, 28, 28, 30, 30,32, 32, 3], daChuDePai: -1},

        //精必钓
        // {type: "xzdd", laiZis: {32:true, 2: true}, holds: [4, 4, 4, 1,2,3, 32, 32], daChuDePai: -1},

        // {type: "xzdd", laiZis: {0: true}, holds: [1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14,0, 20], daChuDePai: -1},

        // 带癞子,精钓
        // {type: "xzdd", laiZis: {2: true,11:true }, holds: [2, 3, 4, 5, 6, 7, 8,  12, 12, 12, 27, 27, 10,27], daChuDePai: -1}

        //平胡
        // {type: "xzdd", laiZis: {31:true, 6: true}, holds: [4, 4, 1,2,3, 32,32], daChuDePai: 32},

        //测试吃，条
        // {type: "xzdd", laiZis: {0: true,1:true}, holds: [1, 2, 3, 21, 21, 21, 27, 28, 20, 20, 20 ], daChuDePai: -1},

        // {type: "xzdd", laiZis: {31: true,1:true}, holds: [ 2,1,2,  3,4,5, 31,33, 8,8,8, ], daChuDePai: -1},
        // {type: "xzdd", laiZis: {2: true, 3: true}, holds: [18, 18, 21, 0, 0, 3, 22, 15, 2, 4, 23, 16], daChuDePai: 1}
        // {type: "xzdd", laiZis: { 18: true, 26: true }, holds: [6, 16, 21, 21, 18, 24, 16, 6, 24, 12, 12, 4, 26, 8 ], daChuDePai: -1}
        // {type: "xzdd", laiZis: { 18: true, 26: true }, holds: [6, 16, 21, 21, 18, 24, 16, 6, 24, 12, 12, 4, 26, 1 ], daChuDePai: -1}
        // {
        //     type: "xzdd",
        //     laiZis: {1: true, 2: true},
        //     holds: [1, 7, 7, 12, 12, 18, 18, 24, 24, 28, 28, 30, 30,4],
        //     daChuDePai: -1
        // }
        // {
        //     type: "xzdd",
        //     laiZis: {4: true, 5: true},
        //     holds: [5, 5, 13,14, 15, 15, 17, 17, 31, 31, 32, 33, 33],
        //     daChuDePai: 14
        // }
        // {
        //     type: "xzdd",
        //     laiZis: {4: true, 5: true},
        //     holds: [5,5],
        //     daChuDePai: -1
        // }
        // {
        //     type: "xzdd",
        //     laiZis: {15: true, 16: true},
        //     holds: [ 16,16,7,7,16],
        //     daChuDePai: -1
        // }
        // {
        //     type: "xzdd",
        //     laiZis: {1: true, 2: true},
        //     holds: [2, 3, 9, 2, 17,21, 0, 13, 25, 30, 31, 32, 33],
        //     daChuDePai: 8
        // }
        // {
        //     type: "xzdd",
        //     laiZis: {12: true, 13: true},
        //     holds: [ 13,27, 28, 29,31, 31, 13, 30, 30, 13,28],
        //     daChuDePai: -1
        // }
        // {type: "xzdd", laiZis: {  }, holds: [27, 28,  33, 32, 31,31, 31], daChuDePai: 29}
        // {
        //     type: "xzdd",
        //     laiZis: {31: true, 32: true},
        //     holds: [0, 8, 10, 13, 16, 31, 32, 32, 27, 28, 29, 30, 33, 4],
        //     daChuDePai: -1
        // }
        // {
        //     type: "xzdd",
        //     laiZis: {},
        //     holds: [5, 5, 5, 16, 16, 27, 27, 16],
        //     daChuDePai: -1
        // }
        {
            type: "xzdd",
            laiZis: {22:true,23:true},
            holds: [4, 8, 10, 13, 21, 22, 22, 26,28,29,31,32,33],
            daChuDePai: 27
        }
    ];
};