@echo off
REM GoMVC Forge for Windows: forge migrate, forge make:controller Post
setlocal
cd /d "%~dp0"
go build -o tmp\forge.exe . || exit /b 1
tmp\forge.exe %*
