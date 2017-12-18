/*
 Navicat MySQL Data Transfer

 Source Server         : 安游盐城新
 Source Server Version : 50173
 Source Host           : 118.184.168.119
 Source Database       : db_ayycmj

 Target Server Version : 50173
 File Encoding         : utf-8

 Date: 06/05/2017 20:38:01 PM
*/

SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `t_shop`
-- ----------------------------
DROP TABLE IF EXISTS `t_shop`;
CREATE TABLE `t_shop` (
  `item_id` int(11) NOT NULL,
  `shop_id` int(11) NOT NULL DEFAULT '0' COMMENT 'id of shop. classfy item groups.',
  `name` varchar(32) NOT NULL,
  `price_type` int(11) NOT NULL DEFAULT '0' COMMENT '0:coin,1:gems,2:rmb',
  `price` int(11) NOT NULL,
  `gain_type` int(11) NOT NULL DEFAULT '0' COMMENT '0:coin,1:gems,2:rmb',
  `gain` int(11) NOT NULL,
  `desc` varchar(32) NOT NULL,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Records of `t_shop`
-- ----------------------------
BEGIN;
INSERT INTO `t_shop` VALUES ('1001', '1', '5,000金币', '1', '1', '0', '5000', '热销商品'), ('1002', '1', '27,000金币', '1', '5', '0', '27000', ''), ('1003', '1', '55,000金币', '1', '10', '0', '55000', ''), ('1004', '1', '115,000金币', '1', '20', '0', '115000', '');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
