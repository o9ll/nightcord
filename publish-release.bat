@echo off
:: ─── Nightcord — Publier une nouvelle release sur GitHub ─────────────────────
:: Usage : publish-release.bat 1.18.1 "Description des changements"
:: Necessite : pnpm, node, gh (GitHub CLI, authentifie)
::
:: Auth : gh auth login  (ou configurer GITHUB_TOKEN)

setlocal EnableDelayedExpansion

set "VERSION=%~1"
set "NOTES=%~2"

if "%VERSION%"=="" (
    echo [ERREUR] Usage: publish-release.bat VERSION "Notes de version"
    echo Exemple : publish-release.bat 1.18.1 "Correction bug audio"
    pause
    exit /b 1
)

if "%NOTES%"=="" set NOTES=Nightcord %VERSION%

:: ── Config GitHub ──────────────────────────────────────────────────────────────
set GITHUB_REPO=o9ll/nightcord

:: ── Verification gh CLI ──────────────────────────────────────────────────────
where gh >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] gh CLI introuvable. Installez-le depuis https://cli.github.com/
    pause
    exit /b 1
)

gh auth status >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] gh CLI non authentifie. Lancez : gh auth login
    pause
    exit /b 1
)

:: Chemins de sortie
set DIST_DIR=dist\desktop
set OUT_DIR=release\installer
set DIST_ZIP=%OUT_DIR%\nightcord-dist.zip
set INSTALLER_EXE=%OUT_DIR%\Nightcord-Installer.exe
set VERSION_JSON=%OUT_DIR%\version.json
set DESKTOP_ASAR=dist\desktop.asar

echo.
echo  ╔═══════════════════════════════════════════════════╗
echo  ║    NIGHTCORD — Publication release v%VERSION%
echo  ╚═══════════════════════════════════════════════════╝
echo.

:: ── 1. Mise à jour de la version ──────────────────────────────────────────────
echo  [1/8] Mise a jour de la version vers %VERSION%...
node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); pkg.version = '%VERSION%'; fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4) + '\n', 'utf8');"
echo  [1/8] Version mise a jour.

:: ── 2. Envoi du code source sur GitHub ─────────────────────────────────────────
echo.
echo  [2/8] Committer et pusher le code source...
git add .
git diff --quiet --cached
if errorlevel 1 (
    git commit -m "build: release v%VERSION% - %NOTES%"
) else (
    echo  Aucun changement a committer.
)
git push --set-upstream origin master
if errorlevel 1 (
    echo  [ERREUR] Impossible de push sur GitHub. Verifiez vos identifiants/droits d'acces.
    pause
    exit /b 1
)
echo  [2/8] Code source synchronise avec GitHub.

:: ── 3. Build JS ───────────────────────────────────────────────────────────────
echo.
echo  [3/8] Build + obfuscation en cours...
taskkill /F /IM Discord.exe /T >nul 2>&1
taskkill /F /IM node.exe    /T >nul 2>&1
timeout /t 2 /nobreak >nul
call pnpm build
if errorlevel 1 (
    echo  [ERREUR] pnpm build a echoue.
    pause
    exit /b 1
)
echo  [3/8] Build + obfuscation termines !

:: ── 4. Assets ─────────────────────────────────────────────────────────────────
echo.
echo  [4/8] Copie des assets (ffmpeg, node, modules...) vers %DIST_DIR%...
node scripts\build\collect-assets.mjs
echo  [4/8] Assets copies.

:: ── 5. Nightcord-Installer.exe ────────────────────────────────────────────────
echo.
echo  [5/8] Compilation de Nightcord-Installer.exe...
if not exist "%OUT_DIR%" mkdir "%OUT_DIR%"
powershell -NoProfile -ExecutionPolicy Bypass -File "build-installer.ps1"
if errorlevel 1 (
    echo  [ERREUR] Compilation de l'installeur echouee.
    pause
    exit /b 1
)
if not exist "%INSTALLER_EXE%" (
    echo  [ERREUR] Nightcord-Installer.exe introuvable apres compilation.
    pause
    exit /b 1
)
for %%F in ("%INSTALLER_EXE%") do echo  [5/8] Nightcord-Installer.exe cree (%%~zF octets)

:: ── 6. nightcord-dist.zip ─────────────────────────────────────────────────────
echo.
echo  [6/8] Creation de nightcord-dist.zip...
if not exist "%DIST_DIR%\patcher.js" (
    echo  [ERREUR] dist\desktop\patcher.js introuvable.
    pause
    exit /b 1
)
if exist "%DIST_ZIP%" del /F /Q "%DIST_ZIP%"
del /s /q "%DIST_DIR%\*.map" >nul 2>&1
del /s /q "%DIST_DIR%\*.LEGAL.txt" >nul 2>&1
node scripts\build\verify-dist.mjs
if errorlevel 1 (
    echo  [ERREUR] Verification du dist echouee.
    pause
    exit /b 1
)
powershell -NoProfile -Command "Add-Type -Assembly System.IO.Compression.FileSystem; $src = (Resolve-Path '%DIST_DIR%').Path; $dst = (Join-Path (Resolve-Path 'release\installer').Path 'nightcord-dist.zip'); [System.IO.Compression.ZipFile]::CreateFromDirectory($src, $dst, [System.IO.Compression.CompressionLevel]::Optimal, $false)"
if not exist "%DIST_ZIP%" (
    echo  [ERREUR] Impossible de creer nightcord-dist.zip
    pause
    exit /b 1
)
for %%F in ("%DIST_ZIP%") do echo  [6/8] nightcord-dist.zip cree (%%~zF octets)

:: ── 7. version.json ───────────────────────────────────────────────────────────
echo.
echo  [7/8] Mise a jour de version.json...
for /f "usebackq" %%d in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd'"`) do set ISO_DATE=%%d
(
    echo {
    echo   "version": "%VERSION%",
    echo   "releaseDate": "%ISO_DATE%",
    echo   "installerUrl": "https://github.com/%GITHUB_REPO%/releases/download/v%VERSION%/Nightcord-Installer.exe",
    echo   "distUrl": "https://github.com/%GITHUB_REPO%/releases/download/v%VERSION%/nightcord-dist.zip",
    echo   "downloadUrl": "https://github.com/%GITHUB_REPO%/releases/download/v%VERSION%/desktop.asar",
    echo   "changelog": "%NOTES%"
    echo }
) > "%VERSION_JSON%"
echo  [7/8] version.json mis a jour.

:: ── 8. Publier sur GitHub Releases ─────────────────────────────────────────────
echo.
echo  [8/8] Creation de la release v%VERSION% sur GitHub...

set "TAG_NAME=v%VERSION%"

:: Creer le tag et le pousser
git tag "%TAG_NAME%"
git push origin "%TAG_NAME%"
if errorlevel 1 (
    echo  [ERREUR] Impossible de pousser le tag.
    pause
    exit /b 1
)

:: Creer la release et uploader les assets via gh CLI
gh release create "%TAG_NAME%" ^
    --title "Nightcord v%VERSION%" ^
    --notes "%NOTES%" ^
    "%INSTALLER_EXE%" ^
    "%DIST_ZIP%" ^
    "%DESKTOP_ASAR%" ^
    "%VERSION_JSON%"
if errorlevel 1 (
    echo  [ERREUR] Echec de la creation de la release GitHub.
    pause
    exit /b 1
)

:: ── Done ───────────────────────────────────────────────────────────────────────
echo.
echo  ╔═══════════════════════════════════════════════════════════════════════╗
echo  ║  Nightcord v%VERSION% publie avec succes sur GitHub !
echo  ║
echo  ║  URL : https://github.com/%GITHUB_REPO%/releases/tag/%TAG_NAME%
echo  ║
echo  ║  Fichiers publies :
echo  ║    Nightcord-Installer.exe    — installeur .exe avec GUI
echo  ║    nightcord-dist.zip         — JS obfusques (pour l'injec.)
echo  ║    desktop.asar               — asar Discord patcher
echo  ║    version.json               — metadonnees de version
echo  ╚═══════════════════════════════════════════════════════════════════════╝
echo.
pause
