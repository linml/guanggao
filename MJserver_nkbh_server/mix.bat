cd account_server
call del account_server.min.js
call uglifyjs account_server.js -o account_server.min.js -c -m
call del account_server.js
call rename account_server.min.js account_server.js
call del app.min.js
call uglifyjs app.js -o app.min.js -c -m
call del app.js
call rename app.min.js app.js
call del dealer_api.min.js
call uglifyjs dealer_api.js -o dealer_api.min.js -c -m
call del dealer_api.js
call rename dealer_api.min.js dealer_api.js

cd ..
cd game_server
cd games
call del gamemgr_gdjh.min.js
call uglifyjs gamemgr_gdjh.js -o gamemgr_gdjh.min.js -c -m
call del gamemgr_gdjh.js
call rename gamemgr_gdjh.min.js gamemgr_gdjh.js
call del gamemgr_xlch.min.js
call uglifyjs gamemgr_xlch.js -o gamemgr_xlch.min.js -c -m
call del gamemgr_xlch.js
call rename gamemgr_xlch.min.js gamemgr_xlch.js
call del gamemgr_xzdd.min.js
call uglifyjs gamemgr_xzdd.js -o gamemgr_xzdd.min.js -c -m
call del gamemgr_xzdd.js
call rename gamemgr_xzdd.min.js gamemgr_xzdd.js
call del laizimjutils.min.js
call uglifyjs laizimjutils.js -o laizimjutils.min.js -c -m
call del laizimjutils.js
call rename laizimjutils.min.js laizimjutils.js
call del mjutils.min.js
call uglifyjs mjutils.js -o mjutils.min.js -c -m
call del mjutils.js
call rename mjutils.min.js mjutils.js

cd ..
call del app.min.js
call uglifyjs app.js -o app.min.js -c -m
call del app.js
call rename app.min.js app.js
call del chat_service.min.js
call uglifyjs chat_service.js -o chat_service.min.js -c -m
call del chat_service.js
call rename chat_service.min.js chat_service.js
call del http_service.min.js
call uglifyjs http_service.js -o http_service.min.js -c -m
call del http_service.js
call rename http_service.min.js http_service.js
call del roommgr.min.js
call uglifyjs roommgr.js -o roommgr.min.js -c -m
call del roommgr.js
call rename roommgr.min.js roommgr.js
call del socket_service.min.js
call uglifyjs socket_service.js -o socket_service.min.js -c -m
call del socket_service.js
call rename socket_service.min.js socket_service.js
call del tms.min.js
call uglifyjs tms.js -o tms.min.js -c -m
call del tms.js
call rename tms.min.js tms.js
call del tokenmgr.min.js
call uglifyjs tokenmgr.js -o tokenmgr.min.js -c -m
call del tokenmgr.js
call rename tokenmgr.min.js tokenmgr.js
call del usermgr.min.js
call uglifyjs usermgr.js -o usermgr.min.js -c -m
call del usermgr.js
call rename usermgr.min.js usermgr.js

cd ..
cd hall_server
call del app.min.js
call uglifyjs app.js -o app.min.js -c -m
call del app.js
call rename app.min.js app.js
call del client_service.min.js
call uglifyjs client_service.js -o client_service.min.js -c -m
call del client_service.js
call rename client_service.min.js client_service.js
call del room_service.min.js
call uglifyjs room_service.js -o room_service.min.js -c -m
call del room_service.js
call rename room_service.min.js room_service.js

cd ..
cd manage_server
call del app.min.js
call uglifyjs app.js -o app.min.js -c -m
call del app.js
call rename app.min.js app.js
call del manage_service.min.js
call uglifyjs manage_service.js -o manage_service.min.js -c -m
call del manage_service.js
call rename manage_service.min.js manage_service.js

cd ..
cd utils
call del common.min.js
call uglifyjs common.js -o common.min.js -c -m
call del common.js
call rename common.min.js common.js
call del crypto.min.js
call uglifyjs crypto.js -o crypto.min.js -c -m
call del crypto.js
call rename crypto.min.js crypto.js
call del db.min.js
call uglifyjs db.js -o db.min.js -c -m
call del db.js
call rename db.min.js db.js
call del dbpool.min.js
call uglifyjs dbpool.js -o dbpool.min.js -c -m
call del dbpool.js
call rename dbpool.min.js dbpool.js
call del dbsync.min.js
call uglifyjs dbsync.js -o dbsync.min.js -c -m
call del dbsync.js
call rename dbsync.min.js dbsync.js
call del errcode.min.js
call uglifyjs errcode.js -o errcode.min.js -c -m
call del errcode.js
call rename errcode.min.js errcode.js
call del http.min.js
call uglifyjs http.js -o http.min.js -c -m
call del http.js
call rename http.min.js http.js
call del sys.min.js
call uglifyjs sys.js -o sys.min.js -c -m
call del sys.js
call rename sys.min.js sys.js

cd ..
pause

