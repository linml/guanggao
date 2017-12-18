SET FOREIGN_KEY_CHECKS=0;
-- ----------------------------
-- Table structure for `txh_info`
-- ----------------------------
DROP TABLE IF EXISTS `txh_info`;
CREATE TABLE `txh_info` (
  `txh_id` varchar(11) NOT NULL COMMENT '同乡会id',
  `txh_name` varchar(112) NOT NULL COMMENT '同乡会name',
  `txh_disc` varchar(1024) NOT NULL COMMENT '同乡会公告信息',
  `creator_id` varchar(11) NOT NULL  COMMENT '会长id',
  `create_time` timestamp NOT NUll default current_timestamp COMMENT '同乡会创建时间',
  `txh_quyu` varchar(256) NOT NULL COMMENT '同乡会的地址',
  `txh_all_man` int(11) NULL COMMENT '同乡会总人数',
  `txh_now_man` int(11) NULL COMMENT '同乡会已有人数',
  `target_account` varchar(64) NOT NULL DEFAULT '账号',
  `creator_name` varchar(256) NOT NULL COMMENT '同乡会创建者name',
  `creator_position` varchar(256) NOT NULL COMMENT '创建者的位置',
  PRIMARY KEY (`txh_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of txh_info
-- ----------------------------

-- ----------------------------
-- Table structure for `txh_member_table`
-- ----------------------------
DROP TABLE IF EXISTS `txh_member_table`;
CREATE TABLE `txh_member_table` (
  `sign_num` int(10) NOT NULL AUTO_INCREMENT,
  `txh_id` varchar(11) NOT NULL COMMENT '同乡会id',
  `user_id` varchar(11) NOT NULL  COMMENT '成员id',
  `target_account` varchar(64) NOT NULL COMMENT '账号',
  `user_name` varchar(11) NOT NULL COMMENT '用户name',
  `send_join_time` timestamp NOT NUll default current_timestamp COMMENT '成员加入会同乡会时间',
  `user_title` int(8) NULL COMMENT '成员职位；111//会长; 112//副会长； 113 //成员',
  `apply_position` varchar(256)  NULL COMMENT '申请者的位置',
  PRIMARY KEY (`sign_num`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of txh_member_table
-- ----------------------------

-- ----------------------------
-- Table structure for `txh_all_table`
-- ----------------------------
DROP TABLE IF EXISTS `txh_room_table`;
CREATE TABLE `txh_room_table` (
  `room_num` int(10) NOT NULL AUTO_INCREMENT COMMENT'房间编号',
  `txh_id` varchar(11) NOT NULL COMMENT '同乡会id',
  `creator_id` varchar(11) NOT NULL COMMENT '创建者ID',
  `room_id` char(8) NOT NULL  COMMENT '房间id',
  `txh_room_creat_time` timestamp NOT NUll default current_timestamp COMMENT '房間創建时间',
  `room_is_excit` INT (3) NOT NULL COMMENT '房間是否被解散 0：沒被解散 1：被解散了',
  PRIMARY KEY (`room_num`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of txh_room_table
-- ----------------------------

-- ----------------------------
-- Table structure for `txh_all_table`
-- ----------------------------
DROP TABLE IF EXISTS `txh_action_table`;
CREATE TABLE `txh_action_table` (
  `activ_num` int(10) NOT NULL AUTO_INCREMENT,
  `txh_id` varchar(11) NOT NULL COMMENT '同乡会id',
  `todo_user_account` varchar(64) NULL COMMENT '动作执行者账号',
  `about_user_account` varchar(64) NULL COMMENT '被动者账号',
  `todo_time` timestamp NOT NUll default current_timestamp COMMENT '动作发生时间',
  `todo_status` int(11) NOT NUll COMMENT '动作状态；0：创建同乡会；1：加入，2：离开；3：删除同乡会；4：创建房间；5：解散房间，6：解除副会长;7:修改同乡会信息；8：删除成员 ；9:设置副会长',
  PRIMARY KEY (`activ_num`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of txh_action_table
-- ----------------------------

-- ----------------------------
-- Table structure for `email_info_table`
-- ----------------------------
DROP TABLE IF EXISTS `email_info_table`;
CREATE TABLE `email_info_table` (
  `info_num` int(10) NOT NULL AUTO_INCREMENT,
  `send_user_id` varchar(11) NOT NULL COMMENT '发送者id',
  `accept_user_id` varchar(11) NOT NULL COMMENT '接受者id',
  `email_title` varchar(21) NOT NULL COMMENT '邮件标题',
  `send_msg` varchar(256) NOT NULL COMMENT '发送的信息msg',
  `send_time` timestamp NOT NUll default current_timestamp COMMENT '消息发送的时间',
  `active_time` int(11) NOT NULL COMMENT '发送的信息有效时间 (天)',
  `info_qudao` int(11) NOT NULL COMMENT '发送的渠道：1：系统消息；2：同乡会消息；3：其它（待确定细分）默认： 1',
  `info_type` int(10) NOT NULL COMMENT '消息类型：1普通消息 2.提示选择是or否 3.提示选择 确认or取消; 默认：1',
  `additional_message` varchar(1024) NULL COMMENT '邮件附加消息：rspdata:event, extradata:用户name，成员account，同乡会id',
  `look_status` int(3) NOT NULL COMMENT '消息阅读状态;(1：已查看；0：未查看) 默认：0',
  `deal_status` int(3) NULL COMMENT '消息处理状态;(1:已处理；0:未处理) 默认： 0',
  PRIMARY KEY (`info_num`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of email_info_table
-- ----------------------------
-- ----------------------------
-- Table structure for `email_info_table`
-- ----------------------------
DROP TABLE IF EXISTS `email_liushui_table`;
CREATE TABLE `email_liushui_table` (
  `luishui_num` int(10) NOT NULL AUTO_INCREMENT,
  `todo_user_account` varchar(64) NOT NULL COMMENT '动作执行者账号',
  `about_user_account` varchar(64) NULL COMMENT '被动者账号',
  `todo_time` timestamp NOT NUll default current_timestamp COMMENT '动作发生时间',
  `todo_status` int(11) NOT NUll COMMENT '动作状态；0：发送消息；1：查看消息，3：删除',
  PRIMARY KEY (`luishui_num`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of email_liushui_table
-- ----------------------------

-- ----------------------------
-- Table structure for `user_address_table`
-- ----------------------------
DROP TABLE IF EXISTS `user_address_table`;
CREATE TABLE `user_address_table` (
  `adds_num` int(10) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(10) NOT NULL COMMENT '玩家id',
  `lontitude` varchar(11) NULL COMMENT '经度',
  `latitude` varchar(11) NULL COMMENT '纬度',
  `city` varchar(64) NULL COMMENT '城市',
  `addrStr` varchar(64) NULL COMMENT '玩家地址街道',
  `addrDescribe` varchar(64) NULL COMMENT '玩家地址详情',
  `add_time` timestamp NOT NUll default current_timestamp COMMENT '动作发生时间',
  PRIMARY KEY (`adds_num`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of user_address_table
-- ----------------------------

-- ----------------------------
-- Table structure for `t_user_addinfo`
-- ----------------------------
DROP TABLE IF EXISTS `t_user_addinfo`;
CREATE TABLE `t_user_addinfo` (
  `account` varchar(10) NOT NULL COMMENT '玩家account',
  `openid` varchar(30) NOT NULL COMMENT '玩家openid',
  `uuid` varchar(11) NOT NULL COMMENT '玩家uuid',
  `os` varchar(64) NULL COMMENT '玩家是使用什么系统进入的',
  `create_time` timestamp NOT NUll default current_timestamp COMMENT 'user create time',
  PRIMARY KEY (`account`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of t_user_addinfo
-- ----------------------------

-- ----------------------------
-- Table structure for `t_user_addinfo`
-- ----------------------------
DROP TABLE IF EXISTS `t_user_distance`;
CREATE TABLE `t_user_distance` (
  `dis_num` int(10) NOT NULL AUTO_INCREMENT,
  `userid1` varchar(11) NOT NULL COMMENT '玩家1的ID',
  `name1` varchar(11) NOT NULL COMMENT '玩家1name',
  `userid2` varchar(11) NOT NULL COMMENT '玩家2的ID',
  `name2` varchar(11) NOT NULL COMMENT '玩家2name',
  `distance` DOUBLE NOT NULL  COMMENT '两玩家之间的距离',
  `create_time` timestamp NOT NUll default current_timestamp COMMENT 'user create time',
  PRIMARY KEY (`dis_num`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of t_user_distance
-- ----------------------------


