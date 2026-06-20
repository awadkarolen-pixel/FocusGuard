@echo off
cd /d "%~dp0"
echo ============================================================
echo  FocusGuard - one-time backend setup
echo ============================================================
echo.
echo This creates a local Python environment and installs the
echo detection libraries (downloads ~1.5 GB - please be patient).
echo.

where python >nul 2>nul || (echo [ERROR] Python was not found on PATH. & echo Install Python 3.12 from https://www.python.org/downloads/ ^(tick "Add python.exe to PATH"^), then re-run this file. & pause & exit /b 1)

echo Creating virtual environment (.venv)...
python -m venv .venv || (echo [ERROR] Could not create the virtual environment. & pause & exit /b 1)

echo Upgrading pip...
".venv\Scripts\python.exe" -m pip install --upgrade pip

echo Installing dependencies from requirements.txt...
".venv\Scripts\python.exe" -m pip install -r requirements.txt || (echo [ERROR] Dependency install failed. Check your internet connection and re-run. & pause & exit /b 1)

echo.
echo ============================================================
echo  Setup complete. You can now launch FocusGuard.
echo ============================================================
pause
