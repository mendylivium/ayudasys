@echo off
setlocal
cd /d "%~dp0"
if not exist "bin\ayudasys.exe" (
  echo Missing bin\ayudasys.exe. Build it with: go build -o bin/ayudasys.exe .
  exit /b 1
)
"bin\ayudasys.exe" serve
exit /b %errorlevel%
