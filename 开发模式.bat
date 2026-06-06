@echo off
chcp 65001 >nul
cd /d %~dp0
echo 开发模式：前端热更新 + 后端自动重启
echo 前端: http://localhost:5173
echo.
if not exist node_modules call npm install
call npm run dev
pause
