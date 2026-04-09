@echo off
setlocal enabledelayedexpansion
cd /d %~dp0
if not exist logs mkdir logs
call mvn -q -pl data-foundry-scheduler-service -DskipTests spring-boot:run 1>> logs\scheduler.out.log 2>> logs\scheduler.err.log
