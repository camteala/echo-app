@echo off
REM filepath: c:\Users\HP\Desktop\code-editor-backend\start-auth.bat

echo Starting AUTH services...

REM Terminal 1: Start Auth Service
start cmd /k "title Auth Service && cd /d C:\Users\HP\Desktop\code-editor-backend && node src/services/auth-service.js"

REM Wait a moment for auth service to start
timeout /t 3 >nul

REM Terminal 2: Start Gateway
start cmd /k "title Gateway && cd /d C:\Users\HP\Desktop\code-editor-backend && node src/gateway.js"

echo Services started!