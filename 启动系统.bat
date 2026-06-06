@echo off
chcp 65001 >nul
cd /d %~dp0
echo ============================================
echo    按摩院柜台系统 启动中...
echo ============================================
echo.

if not exist node_modules (
  echo 首次运行，正在安装依赖...
  call npm install
)

echo 正在打包前端...
call npm run build

echo.
echo 启动服务（请保持本窗口开着）...
echo 浏览器打开下面显示的地址即可使用。
echo 手机连同一个 WiFi，用「局域网」那一行地址访问。
echo.
node server/index.js
pause
