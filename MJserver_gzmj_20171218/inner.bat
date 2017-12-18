cd game_server
call del socket_service.min.js
call uglifyjs socket_service.js -o socket_service.min.js -c -m
call del socket_service.js
call rename socket_service.min.js socket_service.js

cd ..
cd utils
call del dbsync.min.js
call uglifyjs dbsync.js -o dbsync.min.js -c -m
call del dbsync.js
call rename dbsync.min.js dbsync.js

cd ..
pause