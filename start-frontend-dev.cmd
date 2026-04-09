@echo off
setlocal enabledelayedexpansion
cd /d %~dp0\data-foundry-frontend
if not exist ..\logs mkdir ..\logs
call npm run dev 1>> ..\logs\frontend.out.log 2>> ..\logs\frontend.err.log
