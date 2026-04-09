@echo off
setlocal enabledelayedexpansion
cd /d %~dp0
if not exist logs mkdir logs
call mvn -q -pl data-foundry-backend-service -DskipTests spring-boot:run 1>> logs\backend.out.log 2>> logs\backend.err.log
