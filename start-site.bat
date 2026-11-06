@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ========================================
echo       A STAR FOR US - 사이트 실행
echo ========================================
echo.
where npm >nul 2>nul
if errorlevel 1 (
  echo [오류] Node.js와 npm이 설치되어 있지 않습니다.
  echo https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요.
  pause
  exit /b 1
)
if not exist node_modules (
  echo [1/2] 필요한 패키지를 설치합니다. 처음 실행할 때는 시간이 걸릴 수 있습니다.
  call npm install
  if errorlevel 1 (
    echo.
    echo [오류] 패키지 설치에 실패했습니다. 인터넷 연결을 확인해 주세요.
    pause
    exit /b 1
  )
)
echo.
echo [2/2] 개발 서버를 시작합니다.
echo 브라우저가 자동으로 열리지 않으면 http://localhost:5173 을 열어 주세요.
echo 이 창을 닫으면 사이트 서버가 종료됩니다.
echo.
call npm run dev -- --open
pause
