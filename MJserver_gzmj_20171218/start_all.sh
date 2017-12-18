ps -ef|grep -E 'game|configs_jxgzmj'|grep -v grep|awk '{print $2}'|xargs kill -9


nohup node ./account_server/app.js ../configs_jxgzmj.js &
nohup node ./hall_server/app.js ../configs_jxgzmj.js &
nohup node ./manage_server/app.js ../configs_jxgzmj.js &
nohup node ./game_server/app.js ../configs_game_server_1.js &
nohup node ./game_server/app.js ../configs_game_server_2.js &
nohup node ./game_server/app.js ../configs_game_server_3.js &
nohup node ./game_server/app.js ../configs_game_server_4.js &
