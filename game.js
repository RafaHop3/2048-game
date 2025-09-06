document.addEventListener('DOMContentLoaded', () => {
    // Config and runtime flags
    const config = {
        animMs: parseInt(localStorage.getItem('cfg.animMs') || '150', 10),
        winTarget: parseInt(localStorage.getItem('cfg.winTarget') || '2048', 10),
        prob4: parseInt(localStorage.getItem('cfg.prob4') || '10', 10), // percent
        apiKey: localStorage.getItem('cfg.apiKey') || ''
    };

    // Apply initial CSS var
    document.documentElement.style.setProperty('--anim-ms', `${config.animMs}ms`);

    // Auth / role
    let role = sessionStorage.getItem('role') || '';

    // Game state
    let grid = [];
    let score = 0;
    let bestScore = parseInt(localStorage.getItem('bestScore') || '0', 10);
    let gameOver = false;
    let win = false;
    let canMove = true;

    // Self-test
    let selfTestRunning = false;
    let selfTestTimer = null;

    // DOM elements
    const gridContainer = document.querySelector('.grid');
    const scoreDisplay = document.getElementById('score');
    const bestScoreDisplay = document.getElementById('best-score');
    const newGameBtn = document.getElementById('new-game');
    const tryAgainBtn = document.getElementById('try-again');
    const keepGoingBtn = document.getElementById('keep-going');
    const gameOverScreen = document.querySelector('.game-over');
    const winScreen = document.querySelector('.win');
    // Login / Admin UI
    const overlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const loginUser = document.getElementById('login-username');
    const loginPass = document.getElementById('login-password');
    const loginError = document.getElementById('login-error');
    const adminPanel = document.getElementById('admin-dashboard');
    const liveStyle = document.getElementById('live-style');
    const tabsButtons = document.querySelectorAll('.tab-button');
    const tabs = document.querySelectorAll('.tab');
    const logoutBtn = document.getElementById('logout');
    const cfgAnim = document.getElementById('cfg-anim');
    const cfgWin = document.getElementById('cfg-win');
    const cfgProb4 = document.getElementById('cfg-prob4');
    const cfgOpenAI = document.getElementById('cfg-openai');
    const btnApplySettings = document.getElementById('btn-apply-settings');
    const btnResetBest = document.getElementById('btn-reset-best');
    const btnDownloadCss = document.getElementById('btn-download-css');
    const cssEditor = document.getElementById('css-editor');
    const btnApplyCss = document.getElementById('btn-apply-css');
    const btnClearCss = document.getElementById('btn-clear-css');
    const btnSelfTest = document.getElementById('btn-selftest');
    const btnAiFix = document.getElementById('btn-ai-fix');
    const qaOutput = document.getElementById('qa-output');

    // Initialize the game
    function initGame() {
        // Reset game state
        grid = Array(4).fill().map(() => Array(4).fill(0));
        score = 0;
        gameOver = false;
        win = false;
        canMove = true;
        
        // Update UI
        updateScore();
        clearGrid();
        hideGameOver();
        hideWin();
        
        // Add initial tiles
        addRandomTile();
        addRandomTile();
    }
    
    // Clear the grid visually
    function clearGrid() {
        gridContainer.innerHTML = '';
        
        // Create empty cells
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                gridContainer.appendChild(cell);
            }
        }
    }
    
    // Add a new random tile (2 or 4) to an empty cell
    function addRandomTile() {
        const emptyCells = [];
        
        // Find all empty cells
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (grid[i][j] === 0) {
                    emptyCells.push({ row: i, col: j });
                }
            }
        }
        
        if (emptyCells.length > 0) {
            // Choose a random empty cell
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            // Controlled probability of 4
            grid[row][col] = Math.random() * 100 < config.prob4 ? 4 : 2;
            
            // Create and animate the new tile
            createTile(row, col, grid[row][col], true);
        }
    }
    
    // Create a tile element
    function createTile(row, col, value, isNew = false) {
        const tile = document.createElement('div');
        tile.className = `tile tile-${value}`;
        tile.textContent = value;
        tile.dataset.value = value;
        tile.dataset.row = row;
        tile.dataset.col = col;
        
        if (isNew) {
            tile.classList.add('tile-new');
            setTimeout(() => tile.classList.remove('tile-new'), 200);
        }
        
        // Position the tile
        updateTilePosition(tile, row, col);
        
        gridContainer.appendChild(tile);
        return tile;
    }
    
    // Update tile position with animation
    function updateTilePosition(tile, row, col) {
        const size = gridContainer.offsetWidth;
        const cellSize = (size - 5 * 15) / 4; // 5 gaps (4 cells + 1)
        const x = col * (cellSize + 15) + 15;
        const y = row * (cellSize + 15) + 15;
        
        tile.style.width = `${cellSize}px`;
        tile.style.height = `${cellSize}px`;
        tile.style.transform = `translate(${x}px, ${y}px)`;
    }
    
    // Handle keyboard input
    function handleKeyDown(e) {
        if (!canMove || gameOver) return;
        
        let moved = false;
        
        switch (e.key) {
            case 'ArrowUp':
                moved = moveTiles('up');
                break;
            case 'ArrowDown':
                moved = moveTiles('down');
                break;
            case 'ArrowLeft':
                moved = moveTiles('left');
                break;
            case 'ArrowRight':
                moved = moveTiles('right');
                break;
            default:
                return; // Ignore other keys
        }
        
        if (moved) {
            canMove = false;
            
            // Wait for animations to complete
            setTimeout(() => {
                addRandomTile();
                updateScore();
                checkGameOver();
                canMove = true;
            }, config.animMs);
        }
    }
    
    // Move tiles in the specified direction
    function moveTiles(direction) {
        let moved = false;
        const newGrid = JSON.parse(JSON.stringify(grid));
        
        // Process the grid based on direction
        for (let i = 0; i < 4; i++) {
            let row = [];
            
            // Extract the row or column to process
            for (let j = 0; j < 4; j++) {
                if (direction === 'left') row.push(grid[i][j]);
                else if (direction === 'right') row.unshift(grid[i][3 - j]);
                else if (direction === 'up') row.push(grid[j][i]);
                else if (direction === 'down') row.unshift(grid[3 - j][i]);
            }
            
            // Merge tiles
            const mergedRow = mergeTiles(row);
            
            // Update the grid and check if anything moved
            for (let j = 0; j < 4; j++) {
                let value = mergedRow[j] || 0;
                let newRow, newCol;
                
                if (direction === 'left') {
                    newRow = i;
                    newCol = j;
                    if (grid[i][j] !== value) moved = true;
                } else if (direction === 'right') {
                    newRow = i;
                    newCol = 3 - j;
                    if (grid[i][3 - j] !== value) moved = true;
                } else if (direction === 'up') {
                    newRow = j;
                    newCol = i;
                    if (grid[j][i] !== value) moved = true;
                } else if (direction === 'down') {
                    newRow = 3 - j;
                    newCol = i;
                    if (grid[3 - j][i] !== value) moved = true;
                }
                
                newGrid[newRow][newCol] = value;
            }
        }
        
        // Update the grid if anything moved
        if (moved) {
            // Animate tiles before updating the grid
            animateTiles(grid, newGrid, direction);
            grid = newGrid;
        }
        
        return moved;
    }
    
    // Merge tiles in a row/column
    function mergeTiles(row) {
        // Remove zeros
        let nonZeros = row.filter(x => x !== 0);
        const result = [];
        
        // Merge adjacent equal numbers
        for (let i = 0; i < nonZeros.length; i++) {
            if (i < nonZeros.length - 1 && nonZeros[i] === nonZeros[i + 1]) {
                const mergedValue = nonZeros[i] * 2;
                result.push(mergedValue);
                score += mergedValue;
                i++; // Skip the next tile as it's merged
                
                // Check for win condition
                if (mergedValue === config.winTarget && !win) {
                    showWin();
                }
            } else {
                result.push(nonZeros[i]);
            }
        }
        
        // Fill the rest with zeros
        while (result.length < 4) {
            result.push(0);
        }
        
        return result;
    }
    
    // Animate tiles during movement
    function animateTiles(oldGrid, newGrid, direction) {
        const tiles = document.querySelectorAll('.tile');
        
        // Map current tiles by value and position
        const current = [];
        tiles.forEach(t => current.push(t));

        // For simplicity: animate move by recalculating positions for existing tiles,
        // then after animation duration, re-render to match newGrid exactly.
        current.forEach(tile => {
            const r = parseInt(tile.dataset.row, 10);
            const c = parseInt(tile.dataset.col, 10);
            // Find nearest non-zero in movement direction to approximate motion
            let nr = r, nc = c;
            if (direction === 'left') {
                for (let j = c - 1; j >= 0; j--) if (oldGrid[r][j] === 0) nc = j; else break;
            } else if (direction === 'right') {
                for (let j = c + 1; j < 4; j++) if (oldGrid[r][j] === 0) nc = j; else break;
            } else if (direction === 'up') {
                for (let i = r - 1; i >= 0; i--) if (oldGrid[i][c] === 0) nr = i; else break;
            } else if (direction === 'down') {
                for (let i = r + 1; i < 4; i++) if (oldGrid[i][c] === 0) nr = i; else break;
            }
            tile.dataset.row = nr;
            tile.dataset.col = nc;
            updateTilePosition(tile, nr, nc);
        });

        // After animation, re-render exact newGrid
        setTimeout(() => {
            // Remove all existing tiles and rebuild from newGrid
            document.querySelectorAll('.tile').forEach(t => t.remove());
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (newGrid[i][j] !== 0) createTile(i, j, newGrid[i][j]);
                }
            }
        }, config.animMs);
    }
    
    // Check if the game is over
    function checkGameOver() {
        // If there are empty cells, game is not over
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (grid[i][j] === 0) return false;
                
                // Check right neighbor
                if (j < 3 && grid[i][j] === grid[i][j + 1]) return false;
                
                // Check bottom neighbor
                if (i < 3 && grid[i][j] === grid[i + 1][j]) return false;
            }
        }
        
        // If we get here, no moves are possible
        showGameOver();
        return true;
    }
    
    // Update score display
    function updateScore() {
        scoreDisplay.textContent = score;
        
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('bestScore', bestScore);
        }
        
        bestScoreDisplay.textContent = bestScore;
    }
    
    // Show game over screen
    function showGameOver() {
        gameOver = true;
        gameOverScreen.style.display = 'flex';
    }
    
    // Hide game over screen
    function hideGameOver() {
        gameOverScreen.style.display = 'none';
    }
    
    // Show win screen
    function showWin() {
        win = true;
        winScreen.style.display = 'flex';
    }
    
    // Hide win screen
    function hideWin() {
        winScreen.style.display = 'none';
    }
    
    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    
    newGameBtn.addEventListener('click', () => {
        initGame();
    });
    
    tryAgainBtn.addEventListener('click', () => {
        initGame();
    });
    
    keepGoingBtn.addEventListener('click', () => {
        hideWin();
    });

    // Touch event handling for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, false);
    
    document.addEventListener('touchend', e => {
        if (!touchStartX || !touchStartY) return;
        
        touchEndX = e.changedTouches[0].clientX;
        touchEndY = e.changedTouches[0].clientY;
        
        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;
        
        // Determine the direction of the swipe
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (dx > 0) {
                // Right swipe
                handleKeyDown({ key: 'ArrowRight' });
            } else {
                // Left swipe
                handleKeyDown({ key: 'ArrowLeft' });
            }
        } else {
            // Vertical swipe
            if (dy > 0) {
                // Down swipe
                handleKeyDown({ key: 'ArrowDown' });
            } else {
                // Up swipe
                handleKeyDown({ key: 'ArrowUp' });
            }
        }
        
        // Reset touch coordinates
        touchStartX = 0;
        touchStartY = 0;
        touchEndX = 0;
        touchEndY = 0;
    }, false);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            const row = parseInt(tile.dataset.row);
            const col = parseInt(tile.dataset.col);
            updateTilePosition(tile, row, col);
        });
    });
    
    // ===== Admin & Login =====
    function openLoginIfNeeded() {
        if (!role) {
            overlay.classList.remove('hidden');
            // Pre-fill for convenience when testing
            loginUser.value = '';
            loginPass.value = '';
        } else {
            overlay.classList.add('hidden');
            if (role === 'admin') showAdmin();
        }
    }

    function showAdmin() {
        // Populate config inputs
        cfgAnim.value = config.animMs;
        cfgWin.value = config.winTarget;
        cfgProb4.value = config.prob4;
        cfgOpenAI.value = config.apiKey || '';
        adminPanel.classList.remove('hidden');
    }

    function hideAdmin() {
        adminPanel.classList.add('hidden');
    }

    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = loginUser.value.trim();
        const p = loginPass.value;
        if (u === 'Hop3Liv3' && p === 'Megaware.jhu130798') {
            role = 'admin';
            sessionStorage.setItem('role', role);
            loginError.classList.add('hidden');
            overlay.classList.add('hidden');
            showAdmin();
        } else if (u && p) {
            role = 'user';
            sessionStorage.setItem('role', role);
            loginError.classList.add('hidden');
            overlay.classList.add('hidden');
            hideAdmin();
        } else {
            loginError.classList.remove('hidden');
            loginError.textContent = 'Please enter username and password';
        }
    });

    logoutBtn?.addEventListener('click', () => {
        sessionStorage.removeItem('role');
        role = '';
        hideAdmin();
        overlay.classList.remove('hidden');
    });

    // Tabs
    tabsButtons.forEach(btn => btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        tabsButtons.forEach(b => b.classList.remove('active'));
        tabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(target).classList.add('active');
    }));

    // Settings actions
    btnApplySettings?.addEventListener('click', () => {
        config.animMs = Math.max(50, Math.min(1000, parseInt(cfgAnim.value || '150', 10)));
        config.winTarget = Math.max(128, parseInt(cfgWin.value || '2048', 10));
        config.prob4 = Math.max(0, Math.min(100, parseInt(cfgProb4.value || '10', 10)));
        config.apiKey = (cfgOpenAI.value || '').trim();
        // Persist
        localStorage.setItem('cfg.animMs', String(config.animMs));
        localStorage.setItem('cfg.winTarget', String(config.winTarget));
        localStorage.setItem('cfg.prob4', String(config.prob4));
        if (config.apiKey) localStorage.setItem('cfg.apiKey', config.apiKey); else localStorage.removeItem('cfg.apiKey');
        // Apply
        document.documentElement.style.setProperty('--anim-ms', `${config.animMs}ms`);
        appendLog(`Applied settings: animMs=${config.animMs}, winTarget=${config.winTarget}, prob4=${config.prob4}`);
    });

    btnResetBest?.addEventListener('click', () => {
        localStorage.removeItem('bestScore');
        bestScore = 0;
        updateScore();
        appendLog('Best score reset.');
    });

    btnDownloadCss?.addEventListener('click', () => {
        const css = liveStyle.textContent || '/* no overrides */\n';
        const blob = new Blob([css], { type: 'text/css' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '2048-overrides.css';
        a.click();
        URL.revokeObjectURL(a.href);
    });

    // Style editor
    btnApplyCss?.addEventListener('click', () => {
        liveStyle.textContent = cssEditor.value;
        appendLog('Live CSS applied.');
    });
    btnClearCss?.addEventListener('click', () => {
        cssEditor.value = '';
        liveStyle.textContent = '';
        appendLog('Live CSS cleared.');
    });

    // QA / Self-test
    btnSelfTest?.addEventListener('click', () => {
        if (!selfTestRunning) {
            selfTestRunning = true;
            btnSelfTest.textContent = 'Stop Self-Test';
            appendLog('Self-test started.');
            startSelfTestLoop();
        } else {
            selfTestRunning = false;
            btnSelfTest.textContent = 'Run Self-Test';
            appendLog('Self-test stopped.');
            if (selfTestTimer) clearTimeout(selfTestTimer);
        }
    });

    btnAiFix?.addEventListener('click', async () => {
        const suggestion = await requestAISuggestions('Please analyze the 2048 game for potential issues and provide concise JS/CSS suggestions.');
        if (suggestion) appendLog(`AI Suggestion:\n${suggestion}`);
    });

    function startSelfTestLoop() {
        const dirs = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
        let idx = 0;
        const playStep = () => {
            if (!selfTestRunning) return;
            try {
                const key = dirs[idx % 4];
                idx++;
                handleKeyDown({ key });
                // If game over, restart
                if (gameOver) {
                    appendLog('Game over during self-test. Restarting.');
                    initGame();
                }
            } catch (err) {
                appendLog('Error during self-test: ' + (err?.message || err));
                // Request AI help if key is present (optional)
                requestAISuggestions('Error: ' + (err?.stack || String(err)));
            }
            selfTestTimer = setTimeout(playStep, Math.max(80, config.animMs));
        };
        playStep();
    }

    function appendLog(text) {
        if (!qaOutput) return;
        const now = new Date().toLocaleTimeString();
        qaOutput.textContent += `[${now}] ${text}\n`;
        qaOutput.scrollTop = qaOutput.scrollHeight;
    }

    async function requestAISuggestions(userPrompt) {
        if (!config.apiKey) {
            appendLog('No API key set. Skipping AI request.');
            return null;
        }
        try {
            const sys = 'You are an expert front-end engineer. Analyze issues and suggest minimal, safe JS/CSS changes. Return plain text.';
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: sys },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.2
                })
            });
            if (!res.ok) {
                appendLog('AI API error: ' + res.status + ' ' + res.statusText);
                return null;
            }
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content || '';
            return content;
        } catch (e) {
            appendLog('AI request failed: ' + (e?.message || e));
            return null;
        }
    }

    // Global error capture for QA
    window.addEventListener('error', (e) => {
        appendLog('Global error: ' + e.message);
    });

    // Initialize the game
    initGame();

    // Open login overlay if not logged
    openLoginIfNeeded();
});
