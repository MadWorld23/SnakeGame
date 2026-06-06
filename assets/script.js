// DOM Elemente selektieren
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

// Konstanten
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;

// Spielzustand
let snake = [];
let food = null;
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameLoop = null;
let isRunning = false;
let isPaused = false;
let speed = 5;

// Initialisierung anzeigen
highScoreElement.textContent = highScore;

// --- HAUPTFUNKTIONEN ---

function init() {
    // Schlange mittig platzieren
    snake = [
        {x: 10, y: 10},
        {x: 9, y: 10},
        {x: 8, y: 10}
    ];
    direction = 'right';
    nextDirection = 'right';
    score = 0;
    scoreElement.textContent = score;
    spawnFood();
    draw();
}

function spawnFood() {
    // Essen zufällig platzieren, aber nicht im Körper der Schlange
    let validPosition = false;
    while (!validPosition) {
        food = {
            x: Math.floor(Math.random() * TILE_COUNT),
            y: Math.floor(Math.random() * TILE_COUNT)
        };
        // Prüfen ob Food auf Schlange liegt
        const onSnake = snake.some(segment => segment.x === food.x && segment.y === food.y);
        if (!onSnake) validPosition = true;
    }
}

function changeDirection(newDir) {
    // Verhindern, dass die Schlange sich selbst um 180° dreht
    if ((newDir === 'up' && direction !== 'down') ||
        (newDir === 'down' && direction !== 'up') ||
        (newDir === 'left' && direction !== 'right') ||
        (newDir === 'right' && direction !== 'left')) {
        nextDirection = newDir;
    }
}

function update() {
    if (!isRunning || isPaused) return;

    direction = nextDirection;
    const head = {...snake[0]};

    // Bewegung berechnen
    switch(direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }

    // --- WRAPPING LOGIK (Durch die Wand fliegen) ---
    if (head.x < 0) {
        head.x = TILE_COUNT - 1;
    } else if (head.x >= TILE_COUNT) {
        head.x = 0;
    }
    
    if (head.y < 0) {
        head.y = TILE_COUNT - 1;
    } else if (head.y >= TILE_COUNT) {
        head.y = 0;
    }

    // Kollision mit eigenem Körper prüfen (nur ab Index 1, da Kopf neu ist)
    if (snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    // Kopf hinzufügen
    snake.unshift(head);

    // Essen gegessen?
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        spawnFood();
    } else {
        // Wenn kein Essen, Schwanz entfernen (Bewegungseffekt)
        snake.pop();
    }

    draw();
}

function draw() {
    // Hintergrund löschen
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gitter zeichnen (optional, für Retro-Look)
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }

    // Schlange zeichnen
    snake.forEach((segment, index) => {
        const gradient = ctx.createRadialGradient(
            segment.x * GRID_SIZE + GRID_SIZE/2,
            segment.y * GRID_SIZE + GRID_SIZE/2, 0,
            segment.x * GRID_SIZE + GRID_SIZE/2,
            segment.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2
        );
        
        if (index === 0) {
            gradient.addColorStop(0, '#00ff88');
            gradient.addColorStop(1, '#00cc66');
        } else {
            gradient.addColorStop(0, '#00aa00');
            gradient.addColorStop(1, '#008800');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(
            segment.x * GRID_SIZE + 1,
            segment.y * GRID_SIZE + 1,
            GRID_SIZE - 2,
            GRID_SIZE - 2,
            5
        );
        ctx.fill();

        // Augen auf dem Kopf
        if (index === 0) {
            ctx.fillStyle = '#1a1a2e';
            const eyeSize = 4;
            const px = segment.x * GRID_SIZE;
            const py = segment.y * GRID_SIZE;
            
            if (direction === 'right') {
                ctx.beginPath(); ctx.arc(px + 14, py + 6, eyeSize, 0, Math.PI * 2);
                ctx.arc(px + 14, py + 14, eyeSize, 0, Math.PI * 2); ctx.fill();
            } else if (direction === 'left') {
                ctx.beginPath(); ctx.arc(px + 6, py + 6, eyeSize, 0, Math.PI * 2);
                ctx.arc(px + 6, py + 14, eyeSize, 0, Math.PI * 2); ctx.fill();
            } else if (direction === 'up') {
                ctx.beginPath(); ctx.arc(px + 6, py + 6, eyeSize, 0, Math.PI * 2);
                ctx.arc(px + 14, py + 6, eyeSize, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.beginPath(); ctx.arc(px + 6, py + 14, eyeSize, 0, Math.PI * 2);
                ctx.arc(px + 14, py + 14, eyeSize, 0, Math.PI * 2); ctx.fill();
            }
        }
    });

    // Essen zeichnen
    const foodGradient = ctx.createRadialGradient(
        food.x * GRID_SIZE + GRID_SIZE/2, food.y * GRID_SIZE + GRID_SIZE/2, 0,
        food.x * GRID_SIZE + GRID_SIZE/2, food.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2
    );
    foodGradient.addColorStop(0, '#ff0066');
    foodGradient.addColorStop(1, '#cc0055');

    ctx.fillStyle = foodGradient;
    ctx.beginPath();
    ctx.arc(food.x * GRID_SIZE + GRID_SIZE/2, food.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Pause Anzeige
    if (isPaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSE', canvas.width/2, canvas.height/2);
    }

    // Game Over Anzeige
    if (!isRunning) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff0066';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, canvas.width/2, canvas.height/2 + 40);
        ctx.fillText('Versuch es noch einmal!', canvas.width/2, canvas.height/2 + 70);
    }
}

function startGame() {
    if (isRunning) return;
    init();
    isRunning = true;
    isPaused = false;
    
    // Geschwindigkeit berechnen (höherer Slider Wert = schnelleres Spiel = kleineres Intervall)
    const baseSpeed = 150;
    const speedDecrease = 10;
    const interval = Math.max(50, baseSpeed - (speed - 1) * speedDecrease);
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, interval);
}

function resetGame() {
    stopGame();
    init();
    draw();
}

function stopGame() {
    isRunning = false;
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
}

function gameOver() {
    stopGame();
    draw();
}

function togglePause() {
    if (!isRunning) return;
    isPaused = !isPaused;
    draw();
}

function updateSpeed() {
    speed = parseInt(speedSlider.value);
    speedValue.textContent = speed;
    
    if (isRunning && gameLoop) {
        clearInterval(gameLoop);
        const baseSpeed = 150;
        const speedDecrease = 10;
        const interval = Math.max(50, baseSpeed - (speed - 1) * speedDecrease);
        gameLoop = setInterval(update, interval);
    }
}

// --- EVENT LISTENER ---

// Tastatur
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp': 
            e.preventDefault(); 
            changeDirection('up'); 
            break;
        case 'ArrowDown': 
            e.preventDefault(); 
            changeDirection('down'); 
            break;
        case 'ArrowLeft': 
            e.preventDefault(); 
            changeDirection('left'); 
            break;
        case 'ArrowRight': 
            e.preventDefault(); 
            changeDirection('right'); 
            break;
        case 'r':
        case 'R':
            resetGame();
            break;
        case ' ':
            e.preventDefault();
            togglePause();
            break;
        case 'Enter':
            e.preventDefault();
            if (!isRunning) startGame();
            break;
    }
});

// Button Clicks
startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', resetGame);

// Speed Slider
speedSlider.addEventListener('input', updateSpeed);

// Touch Support für Mobile (Wischen auf Canvas)
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
}, {passive: false});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, {passive: false});

canvas.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) changeDirection('right');
        else if (dx < -30) changeDirection('left');
    } else {
        if (dy > 30) changeDirection('down');
        else if (dy < -30) changeDirection('up');
    }
});

// Spiel initialisieren beim Laden
init();