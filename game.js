// Game initialization
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Game state
let score = 0;
const gridSize = 40;
const rows = canvas.height / gridSize;
const cols = canvas.width / gridSize;

// Create grid
let grid = Array(rows).fill().map(() => Array(cols).fill(1)); // 1 = grass, 0 = mowed
let stones = [];

// Stone class
class Stone {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = gridSize / 2;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#7f8c8d';
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Draw grass
function drawGrass() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (grid[i][j] === 1) {
                ctx.fillStyle = '#27ae60';
                ctx.fillRect(j * gridSize, i * gridSize, gridSize, gridSize);
                
                // Draw grass texture
                ctx.strokeStyle = '#219a52';
                ctx.lineWidth = 1;
                for (let k = 0; k < 3; k++) {
                    const x = j * gridSize + Math.random() * gridSize;
                    const y = i * gridSize + Math.random() * gridSize;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y - 10);
                    ctx.stroke();
                }
            } else {
                ctx.fillStyle = '#2ecc71';
                ctx.fillRect(j * gridSize, i * gridSize, gridSize, gridSize);
            }
        }
    }
}

// Check if position is valid for stone placement
function isValidPosition(x, y) {
    const gridX = Math.floor(x / gridSize);
    const gridY = Math.floor(y / gridSize);
    
    // Check if position is within bounds
    if (gridX < 0 || gridX >= cols || gridY < 0 || gridY >= rows) return false;
    
    // Check if there's already a stone nearby
    for (let stone of stones) {
        const dx = stone.x - x;
        const dy = stone.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < gridSize) return false;
    }
    
    return true;
}

// Place stone and mow grass
function placeStone(x, y) {
    if (!isValidPosition(x, y)) return;
    
    const stone = new Stone(x, y);
    stones.push(stone);
    
    // Mow grass in a circular pattern
    const gridX = Math.floor(x / gridSize);
    const gridY = Math.floor(y / gridSize);
    
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            const newX = gridX + i;
            const newY = gridY + j;
            
            if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
                const dx = newX - gridX;
                const dy = newY - gridY;
                if (dx * dx + dy * dy <= 4) { // Circular pattern
                    if (grid[newY][newX] === 1) {
                        grid[newY][newX] = 0;
                        score += 10;
                    }
                }
            }
        }
    }
    
    scoreElement.textContent = `Score: ${score}`;
}

// Game loop
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrass();
    stones.forEach(stone => stone.draw());
    requestAnimationFrame(gameLoop);
}

// Event listeners
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    placeStone(x, y);
});

// Start game
console.log('Starting game...');
gameLoop(); 