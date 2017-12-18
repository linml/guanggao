set MAIN_JS=%~dp0\game_server\app.js
set CONFIG=%~dp0\configs_win_game_2.js
call node.exe %MAIN_JS% %CONFIG%
pause