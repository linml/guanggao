/*
 Navicat MySQL Data Transfer

 Source Server         : localhost
 Source Server Version : 50717
 Source Host           : localhost
 Source Database       : db_ycmj

 Target Server Version : 50717
 File Encoding         : utf-8

 Date: 04/20/2017 23:10:13 PM
*/

SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `t_accounts`
-- ----------------------------
DROP TABLE IF EXISTS `t_accounts`;
CREATE TABLE `t_accounts` (
  `account` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  PRIMARY KEY (`account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_ads_contents`
-- ----------------------------
DROP TABLE IF EXISTS `t_ads_contents`;
CREATE TABLE `t_ads_contents` (
  `id` int(11) NOT NULL auto_increment,
  `content` varchar(255) NOT NULL,
  `type` int NOT NULL DEFAULT '1' COMMENT '0-text, 1-image',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_bills`
-- ----------------------------
DROP TABLE IF EXISTS `t_bills`;
CREATE TABLE `t_bills` (
  `uuid` char(20) NOT NULL,
  `creator` int(11) NOT NULL,
  `state` int(11) NOT NULL,
  `room_id` varchar(6) NOT NULL,
  `conf` varchar(255) NOT NULL,
  `create_time` bigint(20) NOT NULL,
  PRIMARY KEY (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_configs`
-- ----------------------------
DROP TABLE IF EXISTS `t_configs`;
CREATE TABLE `t_configs` (
  `first_gems` int(11) NOT NULL COMMENT '初次登陆送钻石',
  `first_coins` int(11) NOT NULL COMMENT '初次登陆送金币',
  `bind_invitor_gems` int(11) NOT NULL COMMENT '绑定邀请者奖利房卡',
  `promotion_page_info` varchar(255) NOT NULL COMMENT '微信号联系方式',
  `max_share_times` int(11) NOT NULL COMMENT '每天分享能获得奖励的最大次数',
  `award1_min` int(11) NOT NULL COMMENT '1档奖励最低值',
  `award1_max` int(11) NOT NULL COMMENT '1档奖励最高值',
  `award1_probability` int(11) NOT NULL COMMENT '获得1档奖励的概率，万分比',
  `award2_min` int(11) NOT NULL COMMENT '2档奖励最低值',
  `award2_max` int(11) NOT NULL COMMENT '2档奖励最高值',
  `award2_probability` int(11) NOT NULL COMMENT '获得2档奖励的概率，万分比',
  `award3_min` int(11) NOT NULL COMMENT '3档奖励最低值',
  `award3_max` int(11) NOT NULL COMMENT '3档奖励最高值',
  `award3_probability` int(11) NOT NULL COMMENT '获得3档奖励的概率，万分比',
  `interactive_emoji_cost_type` tinyint NOT NULL DEFAULT '1' COMMENT '互动表情消耗品类型，1-金币， 2-钻石， 3-人民币',
  `interactive_emoji_cost_num` int(11) NOT NULL DEFAULT '500' COMMENT '互动表情消耗'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Records of `t_configs`
-- ----------------------------
BEGIN;
INSERT INTO `t_configs` VALUES ('48', '888', '8', '推广员申请请联系微信号 :wx_ycmj001,wx_ycmj002咨询\n当你满足以下条件后，可以关注微信公众号\n在微信公众号中联系我们，咨询推广事宜\n\n1、热爱麻将，拥有麻将微信群或者QQ群\n2、能严格保证在做推广员期间不违法违规。保证自己旗下推广员及用户不涉及违法违规事项\n\n微信公众号：kuanqianycqp', 1, 1, 10, 9500, 11, 50, 450, 51, 999, 50, 1, 500);
COMMIT;

-- ----------------------------
--  Table structure for `t_dealers`
-- ----------------------------
DROP TABLE IF EXISTS `t_dealers`;
CREATE TABLE `t_dealers` (
  `userid` int(11) NOT NULL COMMENT '用户ID，对应t_users表中的字段',
  `real_name` varchar(255) NOT NULL COMMENT '真实姓名，与身份证上的信息一致',
  `id_card` varchar(18) NOT NULL COMMENT '身份证号码',
  `phone_number` int(11) NOT NULL COMMENT '电话号码',
  `qq` int(11) NOT NULL COMMENT 'QQ号码',
  `weichat` int(11) NOT NULL COMMENT '微信号码',
  `extra` varchar(128) NOT NULL COMMENT '个人说明',
  `state` int(11) NOT NULL COMMENT '状态   0：未通过，1审核中，2审核通过',
  PRIMARY KEY (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_games`
-- ----------------------------
DROP TABLE IF EXISTS `t_games`;
CREATE TABLE `t_games` (
  `room_uuid` char(20) NOT NULL,
  `game_index` smallint(6) NOT NULL,
  `base_info` varchar(1024) NOT NULL,
  `create_time` int(11) NOT NULL,
  `snapshots` char(255) DEFAULT NULL,
  `action_records` varchar(2048) DEFAULT NULL,
  `result` char(255) DEFAULT NULL,
  PRIMARY KEY (`room_uuid`,`game_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_games_archive`
-- ----------------------------
DROP TABLE IF EXISTS `t_games_archive`;
CREATE TABLE `t_games_archive` (
  `room_uuid` char(20) NOT NULL,
  `game_index` smallint(6) NOT NULL,
  `base_info` varchar(1024) NOT NULL,
  `create_time` int(11) NOT NULL,
  `snapshots` char(255) DEFAULT NULL,
  `action_records` varchar(2048) DEFAULT NULL,
  `result` char(255) DEFAULT NULL,
  PRIMARY KEY (`room_uuid`,`game_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_guests`
-- ----------------------------
DROP TABLE IF EXISTS `t_guests`;
CREATE TABLE `t_guests` (
  `guest_account` varchar(255) NOT NULL,
  PRIMARY KEY (`guest_account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_message`
-- ----------------------------
DROP TABLE IF EXISTS `t_message`;
CREATE TABLE `t_message` (
  `type` varchar(32) NOT NULL,
  `msg` varchar(1024) NOT NULL,
  `version` varchar(32) NOT NULL,
  PRIMARY KEY (`type`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_rmb_bills`
-- ----------------------------
DROP TABLE IF EXISTS `t_rmb_bills`;
CREATE TABLE `t_rmb_bills` (
  `orderid` varchar(64) NOT NULL,
  `userid` int(11) NOT NULL,
  `buy_type` int(11) NOT NULL,
  `buy_num` int(11) NOT NULL,
  `rmb_cost` int(11) NOT NULL,
  `but_time` int(11) NOT NULL,
  PRIMARY KEY (`orderid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_rooms`
-- ----------------------------
DROP TABLE IF EXISTS `t_rooms`;
CREATE TABLE `t_rooms` (
  `uuid` char(20) NOT NULL COMMENT '房间唯一id',
  `id` char(8) NOT NULL COMMENT '房间id号',
  `base_info` varchar(256) NOT NULL DEFAULT '' COMMENT '房间基本信息',
  `create_time` int(11) NOT NULL DEFAULT '0' COMMENT '房间创建时间',
  `num_of_turns` int(11) NOT NULL DEFAULT '0' COMMENT '房间局数',
  `next_button` int(11) NOT NULL DEFAULT '0' COMMENT '下一个庄家',
  `user_id0` int(11) NOT NULL DEFAULT '0' COMMENT '第一个位置的玩家id',
  `user_score0` int(11) NOT NULL DEFAULT '0' COMMENT '第一个位置的玩家分数',
  `user_id1` int(11) NOT NULL DEFAULT '0' COMMENT '第二个位置的玩家id',
  `user_score1` int(11) NOT NULL DEFAULT '0' COMMENT '第二个位置的玩家分数',
  `user_id2` int(11) NOT NULL DEFAULT '0' COMMENT '第三个位置的玩家id',
  `user_score2` int(11) NOT NULL DEFAULT '0' COMMENT '第三个位置的玩家分数',
  `user_id3` int(11) NOT NULL DEFAULT '0' COMMENT '第四个位置的玩家ID',
  `user_score3` int(11) NOT NULL DEFAULT '0' COMMENT '第四个位置的玩家分数',
  `ip` varchar(255) DEFAULT NULL,
  `port` int(11) DEFAULT '0',
  `creator` int(11) NOT NULL,
  `state` int(11) NOT NULL,
  `for_others` int(11) NOT NULL,
  `finish_time` int(11) NOT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_rooms_archive`
-- ----------------------------
DROP TABLE IF EXISTS `t_rooms_archive`;
CREATE TABLE `t_rooms_archive` (
  `uuid` char(20) NOT NULL COMMENT '房间唯一id',
  `id` char(8) NOT NULL COMMENT '房间id号',
  `base_info` varchar(256) NOT NULL DEFAULT '' COMMENT '房间基本信息',
  `create_time` int(11) NOT NULL DEFAULT '0' COMMENT '房间创建时间',
  `num_of_turns` int(11) NOT NULL DEFAULT '0' COMMENT '房间局数',
  `next_button` int(11) NOT NULL DEFAULT '0' COMMENT '下一个庄家',
  `user_id0` int(11) NOT NULL DEFAULT '0' COMMENT '第一个位置的玩家id',
  `user_score0` int(11) NOT NULL DEFAULT '0' COMMENT '第一个位置的玩家分数',
  `user_id1` int(11) NOT NULL DEFAULT '0' COMMENT '第二个位置的玩家id',
  `user_score1` int(11) NOT NULL DEFAULT '0' COMMENT '第二个位置的玩家分数',
  `user_id2` int(11) NOT NULL DEFAULT '0' COMMENT '第三个位置的玩家id',
  `user_score2` int(11) NOT NULL DEFAULT '0' COMMENT '第三个位置的玩家分数',
  `user_id3` int(11) NOT NULL DEFAULT '0' COMMENT '第四个位置的玩家ID',
  `user_score3` int(11) NOT NULL DEFAULT '0' COMMENT '第四个位置的玩家分数',
  `ip` varchar(255) DEFAULT NULL,
  `port` int(11) DEFAULT '0',
  `creator` int(11) NOT NULL,
  `state` int(11) NOT NULL,
  `for_others` int(11) NOT NULL,
  `finish_time` int(11) NOT NULL,
  PRIMARY KEY (`uuid`),
  UNIQUE KEY `uuid` (`uuid`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_shop`
-- ----------------------------
DROP TABLE IF EXISTS `t_shop`;
CREATE TABLE `t_shop` (
  `item_id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL DEFAULT '0' COMMENT 'id of shop. classfy item groups.',
  `icon` varchar(100) DEFAULT NULL COMMENT `商品图标`,
  `name` varchar(32) NOT NULL,
  `price_type` int(11) NOT NULL DEFAULT '0' COMMENT '1: coin, 2: gems, 3: rmb',
  `price` int(11) NOT NULL,
  `gain_type` int(11) NOT NULL DEFAULT '0' COMMENT '1: coin, 2: gems, 3: rmb',
  `gain` int(11) NOT NULL,
  `desc` varchar(32) NOT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Records of `t_shop`
-- ----------------------------
BEGIN;
INSERT INTO `t_shop` VALUES ('1001', '1', null, '60,000金币', '2', '6', '1', '60000', '热销商品');
INSERT INTO `t_shop` VALUES ('1002', '1', null, '68,000金币', '2', '6', '1', '68000', '88折优惠');
INSERT INTO `t_shop` VALUES ('1003', '1', null, '150,000金币', '2', '12', '1', '150000', '80折优惠');
INSERT INTO `t_shop` VALUES ('1004', '1', null, '250,000金币', '2', '18', '1', '250000', '72折优惠');
INSERT INTO `t_shop` VALUES ('1005', '1', null, '1,100,000金币', '2', '68', '1', '1100000', '62折优惠');
INSERT INTO `t_shop` VALUES ('1006', '1', null, '1,880,000金币', '2', '108', '1', '1880000', '57折优惠');
INSERT INTO `t_shop` VALUES ('1007', '1', null, '3,180,000金币', '2', '178', '1', '3180000', '55折优惠');
INSERT INTO `t_shop` VALUES ('1008', '1', null, '8,888,000金币', '2', '468', '1', '8888000', '53折优惠');
INSERT INTO `t_shop` VALUES ('1009', '1', null, '23,800,000金币', '2', '998', '1', '23800000', '42折优惠');
INSERT INTO `t_shop` VALUES ('2001', '2', null, '12钻石', '3', '12', '2', '12', '热销商品');
INSERT INTO `t_shop` VALUES ('2002', '2', null, '34钻石', '3', '30', '2', '34', '88折优惠');
INSERT INTO `t_shop` VALUES ('2003', '2', null, '80钻石', '3', '68', '2', '80', '85折优惠');
INSERT INTO `t_shop` VALUES ('2004', '2', null, '228钻石', '3', '188', '2', '228', '82折优惠');
COMMIT;

-- ----------------------------
--  Table structure for `t_users`
-- ----------------------------
DROP TABLE IF EXISTS `t_users`;
CREATE TABLE `t_users` (
  `userid` int(11) unsigned NOT NULL COMMENT '用户ID',
  `account` varchar(64) NOT NULL DEFAULT '' COMMENT '账号',
  `name` varchar(32) DEFAULT NULL COMMENT '用户昵称',
  `sex` int(1) DEFAULT NULL COMMENT '用户性别',
  `headimg` varchar(256) DEFAULT NULL COMMENT '用户头像',
  `lv` smallint(6) DEFAULT '1' COMMENT '用户等级',
  `exp` int(11) DEFAULT '0' COMMENT '用户经验',
  `coins` int(11) DEFAULT '0' COMMENT '用户金币',
  `gems` int(11) DEFAULT '0' COMMENT '用户钻石',
  `roomid` varchar(8) DEFAULT NULL COMMENT '用户当前所在的房间ID',
  `history` varchar(4096) NOT NULL DEFAULT '' COMMENT '玩家历史记录',
  `last_share_time` bigint(20) NOT NULL DEFAULT '0',
  `invitor` int(11) NOT NULL DEFAULT '0',
  `agent_id` varchar(64) DEFAULT NULL COMMENT '代理ID',
  `total_games` int(11) NOT NULL DEFAULT '0',
  `total_score` int(11) NOT NULL DEFAULT '0',
  `create_time` int(11) NOT NULL DEFAULT '0', 
  `enable` tinyint NOT NULL DEFAULT '1' COMMENT '0 - disable, 1 - enable',
  `last_login_time` int(11) NOT NULL DEFAULT '0', 
  PRIMARY KEY (`userid`),
  UNIQUE KEY `account` (`account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Table structure for `t_wins`
-- ----------------------------
DROP TABLE IF EXISTS `t_wins`;
CREATE TABLE `t_wins` (
  `orderid` varchar(255) NOT NULL,
  `userid` int(11) NOT NULL,
  `time` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for t_user_shares
-- ----------------------------
DROP TABLE IF EXISTS `t_user_shares`;
CREATE TABLE `t_user_shares` (
  `userid` int(11) unsigned NOT NULL COMMENT '用户ID',
  `lastsharetime` int(11) NOT NULL DEFAULT '0' COMMENT '最近分享时间',
  `sharecount` int(11) NOT NULL DEFAULT '0' COMMENT '分享次数',
  `lockid` int(11) NOT NULL DEFAULT '0' COMMENT '锁ID',
  PRIMARY KEY (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for t_user_gem_records
-- ----------------------------
DROP TABLE IF EXISTS `t_user_gem_records`;
CREATE TABLE `t_user_gem_records` (
  `id` int(11) unsigned AUTO_INCREMENT COMMENT 'id',
  `userid` int(11) unsigned NOT NULL COMMENT '用户ID',
  `change_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '变更时间戳',
  `change_num` int(11) NOT NULL DEFAULT '0' COMMENT '变更数量',
  `reason` varchar(80) NOT NULL DEFAULT '' COMMENT '变更原因',
  PRIMARY KEY (`id`),
  KEY `index_reason` (`reason`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for t_user_coin_records
-- ----------------------------
DROP TABLE IF EXISTS `t_user_coin_records`;
CREATE TABLE `t_user_coin_records` (
  `id` int(11) unsigned AUTO_INCREMENT COMMENT 'id',
  `userid` int(11) unsigned NOT NULL COMMENT '用户ID',
  `change_time` int(11) unsigned NOT NULL DEFAULT '0' COMMENT '变更时间戳',
  `change_num` int(11) NOT NULL DEFAULT '0' COMMENT '变更数量',
  `reason` varchar(80) NOT NULL DEFAULT '' COMMENT '变更原因',
  PRIMARY KEY (`id`),
  KEY `index_reason` (`reason`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

SET FOREIGN_KEY_CHECKS = 1;


-- ----------------------------
-- Table structure for `user_login_liushui`  //guolin 11/11
-- ----------------------------
DROP TABLE IF EXISTS `user_login_liushui`;
CREATE TABLE `user_login_liushui` (
  `liushi_num` int(11) unsigned AUTO_INCREMENT COMMENT '流水号',
  `account` int(11) NOT NULL COMMENT '用户account',
   `todo_time` timestamp NOT NUll default current_timestamp COMMENT '动作发生时间',
  `os` VARCHAR (11) NULL COMMENT '用户使用什么系统登录的',
  `active` varchar(80) NULL COMMENT '用户动作',
  `ip` VARCHAR (20) NULL  COMMENT '用户使用的ip',
  PRIMARY KEY (`liushi_num`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of user_login_liushui
-- ----------------------------
