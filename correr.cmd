@echo off
rem Ejecuta TrendLens Lab (practice-lab) en Windows desde cmd o PowerShell.
rem En macOS, Linux, Git Bash o WSL usa ./correr
rem
rem Uso:  .\correr.cmd                        -> http://localhost:8501
rem       .\correr.cmd --server.port 8600     (las opciones se pasan a streamlit)
rem
rem La primera vez crea practice-lab\.venv e instala requirements.txt.
rem Vuelve a instalar solo si requirements.txt cambia.
setlocal
set "LAB=%~dp0practice-lab"
set "VENV=%LAB%\.venv"
set "PY=%VENV%\Scripts\python.exe"
set "MARCA=%VENV%\.requirements.instalado"

if exist "%PY%" goto :venv_listo
if exist "%VENV%" goto :venv_roto

set "BASE="
for %%C in ("py -3.12" "py -3.13" "py -3.11" "py -3" "python") do if not defined BASE call :probar %%~C
if not defined BASE goto :sin_python

echo Creando entorno virtual con %BASE% ...
%BASE% -m venv "%VENV%"
if errorlevel 1 exit /b 1

:venv_listo
"%PY%" -c "import sys; sys.exit(sys.version_info < (3, 11))" >nul 2>&1
if errorlevel 1 goto :venv_roto

if exist "%MARCA%" fc /b "%LAB%\requirements.txt" "%MARCA%" >nul 2>&1 && goto :ejecutar
echo Instalando dependencias (requirements.txt)...
"%PY%" -m pip install -r "%LAB%\requirements.txt"
if errorlevel 1 exit /b 1
copy /y "%LAB%\requirements.txt" "%MARCA%" >nul

:ejecutar
rem Streamlit lee .streamlit\config.toml del directorio actual.
cd /d "%LAB%"
"%PY%" -m streamlit run app.py %*
exit /b %errorlevel%

:probar
%* -c "import sys; sys.exit(sys.version_info < (3, 11))" >nul 2>&1 && set "BASE=%*"
exit /b 0

:sin_python
echo Error: se necesita Python 3.11 o superior y no se encontro ninguno. 1>&2
echo Instalalo desde https://www.python.org/downloads/ y vuelve a intentarlo. 1>&2
exit /b 1

:venv_roto
echo Error: %VENV% no contiene un Python 3.11+ utilizable. 1>&2
echo Borralo y vuelve a ejecutar correr.cmd para recrearlo. 1>&2
exit /b 1
