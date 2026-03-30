@echo off
set SOURCE=C:\Users\123\helmsman-stable-backup
set TARGET=C:\Users\123\ai-stock-app

echo Restoring Helmsman project...
robocopy "%SOURCE%" "%TARGET%" /MIR /XD node_modules .expo .git
echo Restore complete.
pause
