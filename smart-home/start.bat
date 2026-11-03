@echo off
rem Smart flat: run without Docker (needs Python 3.8+ from python.org). Double-click this file.
cd /d "%~dp0"
start "" http://localhost:8080
py server.py %* || python server.py %*
pause
