@echo off
setlocal enabledelayedexpansion
cd /d %~dp0
if not exist logs mkdir logs
call mvn -q -pl data-foundry-agent-service -DskipTests spring-boot:run 1>> logs\agent.out.log 2>> logs\agent.err.log
