@echo off
set SOURCE=C:\Users\123\ai-stock-app
set TARGET=C:\Users\123\helmsman-stable-backup

echo Backing up Helmsman project...
robocopy "%SOURCE%" "%TARGET%" /MIR /XD node_modules .expo .git
echo Backup complete.
pause
