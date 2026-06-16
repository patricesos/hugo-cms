@echo off
echo Demarrage de Hugo CMS...
if not exist ".env" (
    echo Copie de .env.example vers .env — modifiez-le selon votre configuration.
    copy .env.example .env >nul
)
node build\index.js
pause
