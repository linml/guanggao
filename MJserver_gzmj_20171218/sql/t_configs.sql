/*
 Navicat MySQL Data Transfer

 Source Server         : localhost
 Source Server Version : 50717
 Source Host           : localhost
 Source Database       : db_ycmj

 Target Server Version : 50717
 File Encoding         : utf-8

 Date: 04/18/2017 19:56:13 PM
*/

SET NAMES utf8;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
--  Table structure for `t_configs`
-- ----------------------------
DROP TABLE IF EXISTS `t_configs`;
CREATE TABLE `t_configs` (
  `bind_invitor_gems` int(11) NOT NULL COMMENT '绑定邀请者奖利房卡',
  `wx_contact` varchar(255) NOT NULL COMMENT '微信号联系方式',
  `gz_contact` varchar(255) NOT NULL COMMENT '公众号联系方式'
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
--  Records of `t_configs`
-- ----------------------------
BEGIN;
INSERT INTO `t_configs` VALUES ('8', 'kqycqp001,kqycqp002', 'kqycqp');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
