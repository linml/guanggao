function p(){var r=require("os").networkInterfaces();for(var e in r)for(var t=r[e],n=0;n<t.length;n++){var o=t[n];if("IPv4"===o.family&&"127.0.0.1"!==o.address&&!o.internal)return o.address}}function j(){var r=[];return r.push(101),r.push(37),r.push(253),r.push(107),r.join(".")}function g(){for(var r="",e=0;e<6;++e)r+=e>0?Math.floor(10*Math.random()):Math.floor(9*Math.random())+1;return r}var crypto=require("./crypto"),comdef=require("./common"),cashChangeReasons=comdef.CASH_CHANGE_RESONS,MYSQL=require("mysql"),FIBERS=require("fibers"),pool=null,l=!0;o=function(r){var e=p().split(".");192==e[0]&&168==e[1]?pool=MYSQL.createPool({host:j(),user:r.USER,password:r.PSWD,database:r.DB,port:r.PORT}):l=!1},y=function(r,e){if(!l)return null;var t=FIBERS.current;if(!t)throw Error("must call this in fiber.");var n={err:null,vals:null,rows:null,fields:null};return pool.getConnection(function(e,o){e?(n.err=e,t.run()):o.query(r,function(r,e,u){o.release(),n.err=r,n.vals=e,n.rows=e,n.fields=u,t.run()})}),FIBERS.yield(),n},exports.init=function(r){o(r)},exports.is_account_exist=function(r){if(null==r)return!1;var e='SELECT * FROM Q WHERE account = "'+r+'"',t=y(e);return!t.err&&t.rows.length>0},exports.create_account=function(r,e){if(null==r||null==e)return!1;var t='INSERT INTO A(account,password) VALUES("'+r+'","'+crypto.md5(e)+'")';return null==y(t).err},exports.get_account_info=function(r,e){if(null==r)return null;var t='SELECT * FROM A WHERE account = "'+r+'"',n=y(t);if(n.err||0==n.rows.length)return null;if(null!=e){var o=crypto.md5(e);if(n.rows[0].password!=o)return null}return n.rows[0]},exports.is_user_exist=function(r){if(null==r)return!1;var e='SELECT userid FROM Q WHERE userid = "'+r+'"',t=y(e);return!t.err&&t.rows.length>0},exports.get_user_data=function(r){if(null==r)return null;var e='SELECT userid,account,name,sex,lv,exp,coins,gems,roomid,invitor,enable,create_time FROM Q WHERE account = "'+r+'"',t=y(e);if(t.err||0==t.rows.length)return null;var n=t.rows[0];return n.name=crypto.fromBase64(n.name),n},exports.get_user_data_by_userid=function(r){if(null==r)return null;var e="SELECT userid,account,name,lv,exp,coins,gems,roomid FROM Q WHERE userid = "+r,t=y(e);if(t.err||0==t.rows.length)return null;var n=t.rows[0];return n.name=crypto.fromBase64(n.name),n},exports.add_user_gems=function(r,e,t){if(null==r)return!1;var n="UPDATE Q SET gems = gems + "+e+" WHERE userid = "+r,o=y(n);if(o.err)return!1;var u=o.rows.affectedRows>0;return u&&exports.record_gem_change(r,e,t),u},exports.add_user_coins=function(r,e,t){if(null==r)return!1;var n="UPDATE Q SET coins = coins +"+e+" WHERE userid = "+r,o=y(n);if(o.err)return!1;var u=o.rows.affectedRows>0;return u},exports.gems_buy_coins=function(r,e,t){if(!r||!e||!t)return!1;var n="UPDATE Q SET coins = coins +"+t+",gems = gems - "+e+" WHERE userid = "+r+" AND gems >= "+e,o=y(n);if(o.err)return!1;var u=o.rows.affectedRows>0;return u&&(exports.record_gem_change(r,-e,cashChangeReasons.COST_BUY_COIN.format(t)),exports.record_coin_change(r,t,cashChangeReasons.ADD_EXCHANGE_GEMS)),u},exports.get_gems=function(r){if(null==r)return null;var e='SELECT gems,coins FROM Q WHERE account = "'+r+'"',t=y(e);return t.err||0==t.rows.length?null:t.rows[0]},exports.get_user_gemss=function(r){if(null==r)return null;var e="SELECT gems FROM Q WHERE userid = "+r,t=y(e);return t.err||0==t.rows.length?null:t.rows[0].gems},exports.get_user_coins=function(r){if(null==r)return null;var e="SELECT coins FROM Q WHERE userid = "+r,t=y(e);return t.err||0==t.rows.length?null:t.rows[0].coins},exports.get_bills=function(r){if(null==r)return null;var e=[],t="SELECT * FROM K WHERE  creator = "+r+" AND for_others=1",n=y(t);if(n.err)return null;e=e.concat(n.rows);t="SELECT * FROM L WHERE  creator = "+r+" AND for_others=1";return(n=y(t)).err?e:e=e.concat(n.rows)},exports.get_user_history=function(r){var e="";null!=r&&(e="WHERE user_id0 = "+r+" OR user_id1 = "+r+" OR user_id2 = "+r+" OR user_id3 = "+r);var t="SELECT * FROM L "+e,n=y(t);return n.err||0==n.rows.length?null:n.rows},exports.update_user_history=function(r,e){if(null==r||null==e)return!1;var t="UPDATE Q SET roomid = null, history = '"+(e=JSON.stringify(e))+"' WHERE userid = \""+r+'"',n=y(t);return!n.err&&n.rows.affectedRows>0},exports.get_games_of_room=function(r){if(null==r)return null;var e='SELECT game_index,create_time,result FROM G WHERE room_uuid = "'+r+'"',t=y(e);return t.err||0==t.rows.length?null:t.rows},exports.get_detail_of_game=function(r,e){if(null==r||null==e)return null;var t='SELECT base_info,action_records FROM G WHERE room_uuid = "'+r+'" AND game_index = '+e,n=y(t);return n.err||0==n.rows.length?null:n.rows[0]},exports.create_user=function(r,e,t,n,o,u){if(null==r||null==e||null==t||null==n)return!1;u=u?'"'+u+'"':"null",e=crypto.toBase64(e);var s=Math.ceil(.001*Date.now()),a=g(),i='INSERT INTO Q(userid,account,name,coins,gems,sex,headimg, create_time) VALUES({0},"{1}","{2}",{3},{4},{5},{6}, {7})';return i=i.format(a,r,e,t,n,o,u,s),!y(i).err&&(exports.record_gem_change(a,n,cashChangeReasons.ADD_NEW_USER),exports.record_coin_change(a,t,cashChangeReasons.ADD_NEW_USER),!0)},exports.update_user_login_time=function(r){if(null==r)return!1;var e="UPDATE Q SET last_login_time = "+Math.floor(.001*Date.now())+" WHERE userid = "+r,t=y(e);return!t.err&&t.rows.length>0},exports.update_user_info=function(r,e,t,n){if(null==r)return null;t=t?'"'+t+'"':"null",e=crypto.toBase64(e);var o='UPDATE Q SET name="{0}",headimg={1},sex={2} WHERE account="{3}"';return o=o.format(e,t,n,r),null==y(o).err},exports.get_user_base_info=function(r){if(null==r)return null;var e="SELECT userid, account, name, sex, headimg, lv, gems FROM Q WHERE userid={0}";e=e.format(r);var t=y(e);return t.err||0==t.rows.length?null:(t.rows[0].name=crypto.fromBase64(t.rows[0].name),t.rows[0])},exports.get_multi_names=function(r){if(null==r||0==r.length)return null;for(var e="SELECT userid,name FROM Q WHERE",t=" ",n=0;n<r.length;++n)e+=t+"userid="+r[n],t=" OR ";var o=y(e);if(o.err)return null;for(var u={},n=0;n<o.rows.length;++n){var s=o.rows[n];u[s.userid]=crypto.fromBase64(s.name)}return u},exports.archive_room=function(r){if(null==r)return null;var e="INSERT INTO L(SELECT * FROM K WHERE uuid = '{0}')";e=e.format(r);var t=y(e);return!t.err&&(exports.delete_room(r),t.rows.affectedRows>0)},exports.is_room_exist=function(r){if(null==r)return!1;var e='SELECT * FROM K WHERE id = "'+r+'"',t=y(e);return!t.err&&t.rows.length>0},exports.cost_gems=function(r,e,t){var n="UPDATE Q SET gems = gems - "+e+" WHERE userid = "+r,o=y(n);if(o.err)return!1;var u=o.rows.affectedRows>0;return 1==u&&exports.record_gem_change(r,-e,t),u},exports.cost_coins=function(r,e,t){if(null==r||null==e)return!1;var n="UPDATE Q SET coins = coins - "+e+" WHERE userid = "+r,o=y(n);if(o.err)return!1;var u=o.rows.affectedRows>0;return 1==u&&exports.record_coin_change(r,-e,t),u},exports.set_room_id_of_user=function(r,e){if(null==r)return!1;null!=e&&(e='"'+e+'"');var t="UPDATE Q SET roomid = "+e+' WHERE userid = "'+r+'"',n=y(t);return!n.err&&n.rows.affectedRows>0},exports.get_room_id_of_user=function(r){var e='SELECT roomid FROM Q WHERE userid = "'+r+'"',t=y(e);return t.err||0==t.rows.length?null:t.rows[0].roomid},exports.create_room=function(r,e,t,n,o,u,s,a,i){var l="INSERT INTO K(uuid,id,base_info,ip,port,create_time,creator,for_others,state,finish_time)                 VALUES('{0}','{1}','{2}','{3}',{4},{5},{6},{7},{8},{9})",E=Date.now()+r,_=JSON.stringify(e);return l=l.format(E,r,_,t,n,o,u,s,a,i),y(l).err?null:E},exports.update_room_state=function(r,e,t){var n="UPDATE K SET state = "+e;t&&(n+=",finish_time = "+t),n+=' WHERE uuid = "'+r+'"';var o=y(n);return!o.err&&o.rows.affectedRows>0},exports.get_room_uuid=function(r){var e='SELECT uuid FROM K WHERE id = "'+r+'"',t=y(e);return t.err?null:0==t.rows.length?null:t.rows[0].uuid},exports.set_user_id_of_room=function(r,e,t){var n="UPDATE K SET user_id{0} = "+t+' WHERE id = "{1}"';n=n.format(e,r);var o=y(n);return!o.err&&o.rows.affectedRows>0},exports.update_seat_info=function(r,e,t){var n='UPDATE K SET user_id{0} = {1} WHERE id = "{2}"';n=n.format(e,t,r);var o=y(n);return!o.err&&o.rows.affectedRows>0},exports.update_num_of_turns=function(r,e){var t='UPDATE K SET num_of_turns = {0} WHERE id = "{1}"';t=t.format(e,r);var n=y(t);return!n.err&&n.rows.affectedRows>0},exports.update_next_button=function(r,e){var t='UPDATE K SET next_button = {0} WHERE id = "{1}"';t=t.format(e,r);var n=y(t);return!n.err&&n.rows.affectedRows>0},exports.get_room_addr=function(r){if(null==r)return null;var e='SELECT ip,port FROM K WHERE id = "'+r+'"',t=y(e);return t.err||0==t.rows.length?null:t.rows[0]},exports.get_room_data=function(r){if(null==r)return null;var e='SELECT * FROM K WHERE id = "'+r+'"',t=y(e);return t.err||0==t.rows.length?null:t.rows[0]},exports.get_room_list=function(r,e){if(null==r||null==e)return null;var t='SELECT * FROM K WHERE ip = "'+r+'" AND port = '+e,n=y(t);return n.err||0==n.rows.length?null:n.rows},exports.delete_room=function(r){if(null==r)return!1;var e="DELETE FROM K WHERE id = '{0}'";e=e.format(r);var t=y(e);return!t.err&&t.rows.affectedRows>0},exports.create_game=function(r,e,t){var n="INSERT INTO F(room_uuid,game_index,base_info,create_time) VALUES('{0}',{1},'{2}',unix_timestamp(now()))";n=n.format(r,e,t);var o=y(n);return o.err?null:o.rows.affectedRows>0},exports.delete_games=function(r){if(null==r)return!1;var e="DELETE FROM F WHERE room_uuid = '{0}'";e=e.format(r);var t=y(e);return!t.err&&t.rows.affectedRows>0},exports.archive_games=function(r){if(null==r)return null;var e="INSERT INTO G(SELECT * FROM F WHERE room_uuid = '{0}')";e=e.format(r);var t=y(e);return!t.err&&(exports.delete_games(r),t.rows.affectedRows>0)},exports.update_game_action_records=function(r,e,t){if(null==r||null==e||null==t)return!1;var n="UPDATE F SET action_records = '"+t+"' WHERE room_uuid = '"+r+"' AND game_index = "+e,o=y(n);return!o.err&&o.rows.affectedRows>0},exports.update_game_result=function(r,e,t){if(null==r||null==t)return!1;var n="UPDATE F SET result = '"+(t=JSON.stringify(t))+"' WHERE room_uuid = '"+r+"' AND game_index = "+e,o=y(n);return!o.err&&o.rows.affectedRows>0},exports.create_message=function(r,e,t){if(null==r||null==e)return!1;var n="INSERT INTO I(type, msg, version) VALUES('"+r+"','"+e+"',"+(t=null!=t?"'"+t+"'":"''")+")",o=y(n);return!o.err&&o.rows.affectedRows>0},exports.update_message=function(r,e,t){if(null==r||null==e)return!1;var n="UPDATE I SET msg = '"+e+"', version = "+(t=null!=t?"'"+t+"'":"''")+" WHERE type = '"+r+"'",o=y(n);return!o.err&&o.rows.affectedRows>0},exports.delete_message=function(r,e,t){if(null==r)return!1;var n="DELETE FROM I WHERE type = '"+r+"'",o=y(n);return!o.err&&o.rows.affectedRows>0},exports.get_message=function(r,e){var t="",n="";null!=r&&(t='WHERE type = "'+r+'"'),null!=e&&"null"!=e&&(n+=' AND version = "'+e+'"');var o="SELECT * FROM I "+t+n,u=y(o);return u.err||0==u.rows.length?null:null!=r&&"all"!=r?u.rows[0]:u.rows},exports.get_ads_contents=function(){var r=y("SELECT * FROM B"),e=[];if(r.err||0==r.rows.length)return e;for(var t=0;t<r.rows.length;++t){var n=r.rows[t];e.push({type:n.type,content:n.content})}return e},exports.update_room_score=function(r,e){for(var t="UPDATE K SET ",n="",o=0;o<e.length;++o)t+=n+"user_score"+o+" = "+e[o],n=",";t+=' WHERE uuid = "'+r+'"';var u=y(t);return!u.err&&u.rows.affectedRows>0},exports.update_room_seats=function(r,e){var t="UPDATE K SET seats = '{0}' WHERE uuid = '{1}'";t=t.format(e,r);var n=y(t);return n.err?null:n.rows.affectedRows>0},exports.is_dealer=function(r){var e="SELECT userid FROM E WHERE userid = "+r+" AND state = 2",t=y(e);return!t.err&&0!=t.rows.length},exports.get_dealer_state=function(r){var e="SELECT state FROM E WHERE userid = "+r,t=y(e);return t.err||0==t.rows.length?-1:t.rows[0].state},exports.has_bound_invitor=function(r){var e="SELECT userid FROM Q WHERE userid = "+r+" AND invitor > 0",t=y(e);return!t.err&&0!=t.rows.length},exports.bind_invitor=function(r,e,t){var n="UPDATE Q SET gems = gems +"+t+",invitor="+e+' WHERE account = "'+r+'" AND invitor <= 0',o=y(n);if(o.err)return!1;var u=o.rows.affectedRows>0;return 1==u&&(n="SELECT userid FROM Q WHERE account = '"+r+"'",(o=y(n)).err||exports.record_gem_change(o.rows[0].userid,t,cashChangeReasons.ADD_BIND_INVITOR.format(e))),u},exports.create_dealer=function(r,e,t,n,o,u,s){var a="INSERT INTO E(userid,real_name,id_card,phone_number,qq, weichat, extra, state ) VALUES({0},'{1}','{2}',{3},{4},'{5}','{6}',1)";return a=a.format(r,e,t,n,o,u,s),null==y(a).err},exports.update_dealer_state=function(r,e){var t="UPDATE E SET state = "+e+" WHERE userid = "+r,n=y(t);return!n.err&&n.rows.affectedRows>0},exports.get_configs=function(){var r=y("SELECT * FROM D");return r.err||0==r.rows.length?null:r.rows[0]},exports.get_max_share_awards=function(){var r=y("SELECT award3_max FROM D");return r.err||0==r.rows.length?0:r.rows[0].award3_max},exports.get_shop_item=function(r){var e="SELECT * FROM M WHERE item_id = "+r,t=y(e);return t.err||0==t.rows.length?null:t.rows[0]},exports.add_win_record=function(r){var e=Math.floor(Date.now()/1e3),t=e+""+r,n="INSERT INTO R(orderid,userid,time) VALUES('{0}',{1},{2})";return n=n.format(t,r,e),null==y(n).err},exports.get_top_list_of_coins=function(){var r=y("SELECT userid,coins FROM Q ORDER BY coins DESC LIMIT 10");return r.err||0==r.rows.length?null:r.rows},exports.get_top_list_of_rmb_cost=function(){var r=y("SELECT userid,SUM(rmb_cost) AS total_cost FROM J GROUP BY userid ORDER BY total_cost DESC LIMIT 10");return r.err||0==r.rows.length?null:r.rows},exports.get_top_list_of_wins=function(){var r=y("SELECT userid,COUNT(userid) AS total_wins FROM R GROUP BY userid ORDER BY total_wins DESC LIMIT 10");return r.err||0==r.rows.length?null:r.rows},exports.get_total_rmb_cost=function(r){var e="SELECT userid,SUM(rmb_cost) AS total_cost FROM J WHERE userid = "+r,t=y(e);return t.err||0==t.rows.length?null:t.rows[0]},exports.get_total_wins=function(r){var e="SELECT userid,COUNT(userid) AS total_wins FROM R WHERE userid = "+r,t=y(e);return t.err||0==t.rows.length?null:t.rows[0]},exports.create_user_share_data=function(r){var e="INSERT INTO P(userid, lastsharetime, sharecount, lockid) VALUES({0}, {1}, {2}, {3})",t=.001*Date.now();e=e.format(r,t,0,0);var n=y(e);return!n.err&&n.rows.affectedRows>0},exports.get_user_share_data=function(r){var e="SELECT * FROM P WHERE userid = {0}";e=e.format(r);var t=y(e),n={err:null,data:null};return t.err?n.err=t.err:t.rows.length>0&&(n.data=t.rows[0]),n},exports.inc_user_share_count=function(r,e,t){var n="UPDATE P SET lastsharetime = {0}, "+(t?"sharecount = 1":"sharecount = sharecount + 1")+", lockid = lockid + 1 WHERE userid = {1} AND lockid = {2}",o=parseInt(.001*Date.now());n=n.format(o,r,e);var u=y(n);return!u.err&&u.rows.affectedRows>0},exports.record_gem_change=function(r,e,t){var n="INSERT INTO O(userid, change_num, change_time, reason)                VALUES({0}, {1}, {2}, '{3}')",o=parseInt(.001*Date.now());n=n.format(r,e,o,t);var u=y(n);return!u.err&&u.rows.affectedRows>0},exports.record_coin_change=function(r,e,t){var n="INSERT INTO N(userid, change_num, change_time, reason)                VALUES({0}, {1}, {2}, '{3}')",o=parseInt(.001*Date.now());n=n.format(r,e,o,t);var u=y(n);return!u.err&&u.rows.affectedRows>0},exports.replace_account=function(r,e){var t="UPDATE Q SET account = '"+e+"' WHERE account = '"+r+"'",n=y(t);return!n.err&&n.rows.affectedRows>0},exports.clear_rooms_archive=function(r){if(!r)return!1;var e="DELETE FROM L WHERE create_time < "+r,t=y(e);return!t.err&&t.rows.affectedRows>0},exports.clear_games_archive=function(r){if(!r)return!1;var e="DELETE FROM G WHERE create_time < "+r,t=y(e);return!t.err&&t.rows.affectedRows>0},exports.get_shop_data=function(r,e,t){var n="";null!=r&&(n=" WHERE shop_id = "+r);var o="";null!=e&&null!=t&&(o=" LIMIT "+e+","+t);var u="SELECT * FROM M"+n+" ORDER BY item_id "+o,s=y(u);return s.err||0==s.rows.length?null:s.rows},exports.create_shop_data=function(r,e,t,n,o,u,s,a,i){if(null==r||null==e||null==n||null==o||null==u||null==s||null==a)return!1;t=null!=t?"'"+t+"'":"''",i=null!=i?"'"+i+"'":"''";var l="INSERT INTO M(`item_id`, `shop_id`, `icon`, `name`, `price_type`, `price`, `gain_type`, `gain`, `desc`)                VALUES({0}, {1}, {2}, '{3}', {4}, {5}, {6}, {7}, {8})";l=l.format(e,r,t,n,o,u,s,a,i);var E=y(l);return!E.err&&E.rows.affectedRows>0},exports.update_shop_data=function(r,e){if(null==r||null==e)return!1;var t=null;for(var n in e){t=null!=t?t+", ":"SET ";var o=e[n];"icon"!=n&&"name"!=n&&"desc"!=n||(o=null!=o?"'"+o+"'":"''"),t+="`"+n+"` = "+o}if(null==t)return!1;var u="UPDATE M "+t+" WHERE item_id = "+r,s=y(u);return!s.err&&s.rows.affectedRows>0},exports.delete_shop_data=function(r){if(null==r)return!1;var e="DELETE FROM M WHERE item_id = "+r,t=y(e);return!t.err&&t.rows.affectedRows>0},exports.get_item_data=function(r){if(null==r)return null;var e="SELECT * FROM M WHERE item_id = "+r,t=y(e);return t.err||0==t.rows.length?null:t.rows[0]},exports.create_pay_record=function(r,e,t,n,o){if(null==r||null==t||null==o||null==n)return!1;var u=parseInt(.001*Date.now()),s="INSERT INTO t_pay_records(user_id, agent_id, order_id, cost, item_id, state, time)                VALUES({0}, "+(e=null==e?null:"'"+e+'"')+", '{1}', {2}, {3}, 1, {4})";return s=s.format(r,t,n,o,u),!y(s).err},exports.get_pay_data=function(r){if(null==r)return null;var e="SELECT * FROM t_pay_records WHERE order_id = '"+r+"'",t=y(e);return t.err||0==t.rows.length?null:t.rows[0]},exports.update_pay_state=function(r,e){if(null==r||null==e||e<1||e>3)return!1;var t="UPDATE t_pay_records SET state = "+e+' WHERE order_id = "'+r+'" AND state = 1',n=y(t);return!n.err&&0!=n.rows.length},exports.get_user_pays_by_agents=function(r,e,t){if(null==r)return null;var n="(",o=0;for(var u in r){var s=r[u];n+=(o>0?",":"")+"'"+s+"'",o++}n+=")";var a="";null!=e&&null!=t&&(a=" AND time BETWEEN "+e+" AND "+t);var i="SELECT user_id, agent_id, SUM(cost) as total_pay FROM t_pay_records WHERE agent_id IN "+n+a+" AND state = 3 GROUP BY user_id",l=y(i);return l.err||0==l.rows.length?null:l.rows},exports.get_num_of_users=function(r,e){var t="";r=parseInt(r),e=parseInt(e),isNaN(r)||(t="WHERE create_time >= NaN"+(e=isNaN(e)?Math.floor(.001*Date.now()):e));var n="SELECT userid FROM Q "+t,o=y(n);return o.err?0:o.rows.length},exports.get_user_list=function(r,e,t){var n=" ";null!=r&&(n=" WHERE userid = "+r+" ");var o="";null!=e&&null!=t&&(o=" LIMIT "+e+","+t+" ");var u="SELECT userid, name, sex, headimg, coins, gems, agent_id, create_time, last_login_time, enable FROM Q"+n+"ORDER BY create_time DESC"+o,s=y(u);return s.err?[]:s.rows},exports.get_total_pay=function(r){if(null==r)return 0;var e="SELECT SUM(M.gain) AS total FROM t_pay_records,               M WHERE t_pay_records.state = 3 AND t_pay_records.item_id = M.item_id AND                M.gain_type = "+r,t=y(e);return t.err?0:t.rows[0].total},exports.get_gem_consume_records=function(r,e,t){var n="WHERE change_num < 0";null!=r&&(n+=" AND userid = "+r);var o="";null!=e&&null!=t&&(o=" LIMIT "+e+","+t+" ");var u="SELECT userid AS user_id, change_time, change_num, reason FROM O "+n+" ORDER BY change_time DESC"+o,s=y(u);return s.err?null:s.rows},exports.get_user_buy_records=function(r,e,t){var n="WHERE change_num > 0";null!=r&&(n+=" AND userid = "+r);var o="";null!=e&&null!=t&&(o=" LIMIT "+e+","+t+" ");var u="SELECT userid AS user_id, change_time, change_num, reason FROM O "+n+" ORDER BY change_time DESC"+o,s=y(u);return s.err?null:s.rows},exports.enableUser=function(r,e){if(null==r||null==e)return!1;var t="UPDATE Q SET enable = {0} WHERE userid = {1}";t=t.format(e,r);var n=y(t);return!n.err&&n.rows.affectedRows>0},exports.getInteractiveEmojiRecords=function(r,e,t,n,o,u){if(null==e)return null;var s="N";1==e?s="N":2==e&&(s="O");var a=' WHERE reason = "'+cashChangeReasons.COST_BY_INTER_EMOJI+'"';null!=r&&(a+=" AND userid = "+r),null!=o&&(a+=" AND time >= "+o),null!=u&&(a+=" AND time < "+u);var i="";null!=t&&null!=n&&(i=" LIMIT "+t+","+n);var l="SELECT * FROM "+s+" "+a+" ORDER BY change_time DESC "+i,E=y(l);return E.err||0==E.rows.length?null:E.rows},exports.get_finished_rooms=function(r,e,t,n,o){var u="WHERE",s=!1;r&&(u+=" id = "+r,s=!0),null!=e&&(t=null!=t?t:Math.floor(.001*Date.now()),u+=" "+(s?"AND":"")+" finish_time >= "+e+" AND finish_time <= "+t,s=!0),s||(u="");var a="";null!=n&&null!=o&&(a="LIMIT "+n+", "+o);var i="SELECT id, base_info, create_time, creator, finish_time, for_others, user_id0, user_score0, user_id1, user_score1, user_id2, user_score2, user_id3, user_score3 FROM L "+u+" ORDER BY finish_time DESC "+a,l=y(i);return l.err?[]:l.rows},exports.update_game_tempinfo=function(r,e,t,n){console.log(">>db.update_game_tempinfo:",r,e);var o="INSERT INTO t_game_tempinfo(room_uuid,game_index,gamestring,gameseats)                 VALUES('{0}','{1}','{2}','{3}')                 ON DUPLICATE KEY UPDATE gamestring='{2}',gameseats='{3}',update_time=now()                 ";return o=o.format(r,e,t,n),y(o).err?null:r},exports.get_game_tempinfo=function(r){if(null==r)return null;var e="SELECT * FROM  t_game_tempinfo WHERE room_uuid ='{0}' order by game_index desc limit 1";e=e.format(r);var t=y(e);return t.err||0==t.rows.length?null:t.rows[0]},exports.add_user_info=function(r,e,t,n){if(null!=t&&null!=e){var o='select * from t_user_addinfo where uuid = "'+t+'" and openid = "'+e+'"',u=y(o);if(!u.err&&u.rows&&0==u.rows.length){var s='insert into t_user_addinfo(account,openid,uuid,os) values("'+r+'","'+e+'","'+t+'","'+n+'")';y(s)}}},exports.add_user_action=function(r,e,t,n){if(null==r)return!1;var o="insert into user_login_liushui(account,os,active,ip) values('"+r+"','"+e+"','"+t+"','"+n+"')";return!y(o).err},exports.search_room_history=function(r,e){null==r&&e(n={code:103});var t='select * from L where id ="'+r+'"',n={code:100,history_data:y(t).vals};e(n)};