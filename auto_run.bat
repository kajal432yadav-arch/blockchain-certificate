@echo off
setlocal

echo ### PHASE 0: Cleaning Corrupted Blockchain Cache ###
if exist .ganache_db (
    echo Deleting existing blockchain data...
    rmdir /s /q .ganache_db || echo WARNING: Could not delete .ganache_db. Is another process using it?
)
if exist build rmdir /s /q build

echo ### PHASE 1: Installing Dependencies ###
echo Running npm install...
call npm install --no-audit --no-fund || echo ERROR: npm install failed.

echo ### PHASE 2: Starting Ganache (Local Blockchain) ###
echo Starting Ganache on port 7545...
start "GANACHE" /b npx ganache --port 7545 --database.dbPath .ganache_db --wallet.seed "IEEE Xpert"
echo Waiting for Ganache to initialize (5s)...
timeout /t 5 /nobreak

echo ### PHASE 3: Deploying Smart Contracts (Truffle) ###
echo Deploying contracts to development network...
call npx truffle migrate --reset --network development || (echo ERROR: Truffle migration failed. && pause && exit /b)

echo ### PHASE 4: Starting Node.js Server ###
echo Starting server on port 8000...
echo Check http://localhost:8000 in your browser.
call npm run dev

pause
