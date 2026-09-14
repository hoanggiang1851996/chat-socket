@echo off
REM Chay dev server bang Node 18 (o o D), khong dung Node 16 mac dinh
set "PATH=D:\node-v18.20.8-win-x64\node-v18.20.8-win-x64;%PATH%"
echo Node version:
node -v
echo.
npm run dev
