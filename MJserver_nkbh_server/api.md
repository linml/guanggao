远程调用密钥 KEY
udd98765dhiiwqsxg

获取玩家用户ID接口
http://xibao99.com:9000/api/get_user_id

参数
unionid  字符串  微信平台获取的unionid
sign    字符串   MD5({unionid}+密钥);
返回值
{
    errcode 整型  0：操作成功，1：参数不匹配 2：无效的签名 3：找不到对应的玩家
    errmsg 字符串 对应的错误描述
    user_id 用户ID， 如果errcode为0，则user_id有值
    coins 玩家金币数量
    gems 玩家钻石数量
}


为用户充值
http://xibao99.com:9000/api/recharge

参数
user_id  字符串  通过接口获取到的用户游戏ID
type 整型   1：金币  2：钻石
value 整型       需要充值的数目
sign    字符串   MD5({user_id}+{type}+{value}+密钥);
返回值
{
    errcode 整型  0：操作成功，1：参数不匹配 2：无效的签名 3：找不到对应的玩家
    errmsg 字符串 对应的错误描述
    result 充值结果， 如果errcode为0，则result有值  0为充值失败 1为充值成功
    coins 玩家金币数量
    gems 玩家钻石数量
}