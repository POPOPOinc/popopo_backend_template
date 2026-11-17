@echo off
setlocal enableextensions
rem 暗号化した設定を編集する（復号した状態でエディタが開き、保存時に再暗号化される）
rem   edit.bat        --> beta.config.encrypted.json
rem   edit.bat stage  --> stage.config.encrypted.json
pushd "%~dp0"

where /q sops
if ERRORLEVEL 1 (
	echo missing sops.exe. please install e.g. 'scoop install sops'
	goto end
)

set ENV=%~1
if "%ENV%" == "" set ENV=beta
set FILE=%ENV%.config.encrypted.json
if not exist "%FILE%" (
	echo %FILE% not found.
	goto end
)

if "%EDITOR%" == "" set EDITOR=notepad.exe
set SOPS_AGE_KEY_FILE=keys-%ENV%.txt
sops --ignore-mac "%FILE%"

:end
popd
endlocal
