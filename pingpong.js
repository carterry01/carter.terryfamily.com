const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Load background image
const bgImg = new Image();
bgImg.src = 'background.png';

// Game objects
const paddleWidth = 16;
const paddleHeight = 100;
const paddleSpeed = 8;
const ballSize = 16;
const ballSpeed = 7;

const leftPaddle = {
    x: 30,
    y: canvas.height / 2 - paddleHeight / 2,
    dy: 0
};
const rightPaddle = {
    x: canvas.width - 30 - paddleWidth,
    y: canvas.height / 2 - paddleHeight / 2,
    dy: 0
};
const ball = {
    x: canvas.width / 2 - ballSize / 2,
    y: canvas.height / 2 - ballSize / 2,
    dx: ballSpeed * (Math.random() > 0.5 ? 1 : -1),
    dy: ballSpeed * (Math.random() * 2 - 1)
};
let score = [0, 0];

function drawBackground() {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
}

function drawPaddle(paddle) {
    ctx.save();
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#0ff';
    ctx.fillRect(paddle.x, paddle.y, paddleWidth, paddleHeight);
    ctx.restore();
}

function drawBall() {
    ctx.save();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x + ballSize/2, ball.y + ballSize/2, ballSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function draw() {
    drawBackground();
    drawPaddle(leftPaddle);
    drawPaddle(rightPaddle);
    drawBall();
}

function update() {
    // Move paddles
    leftPaddle.y += leftPaddle.dy;
    rightPaddle.y += rightPaddle.dy;
    leftPaddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, leftPaddle.y));
    rightPaddle.y = Math.max(0, Math.min(canvas.height - paddleHeight, rightPaddle.y));

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Ball collision with top/bottom
    if (ball.y < 0) {
        ball.y = 0;
        ball.dy *= -1;
    }
    if (ball.y + ballSize > canvas.height) {
        ball.y = canvas.height - ballSize;
        ball.dy *= -1;
    }

    // Ball collision with paddles
    if (
        ball.x < leftPaddle.x + paddleWidth &&
        ball.x > leftPaddle.x &&
        ball.y + ballSize > leftPaddle.y &&
        ball.y < leftPaddle.y + paddleHeight
    ) {
        ball.x = leftPaddle.x + paddleWidth;
        ball.dx *= -1;
        // Add some spin
        ball.dy += leftPaddle.dy * 0.2;
    }
    if (
        ball.x + ballSize > rightPaddle.x &&
        ball.x + ballSize < rightPaddle.x + paddleWidth &&
        ball.y + ballSize > rightPaddle.y &&
        ball.y < rightPaddle.y + paddleHeight
    ) {
        ball.x = rightPaddle.x - ballSize;
        ball.dx *= -1;
        // Add some spin
        ball.dy += rightPaddle.dy * 0.2;
    }

    // Score
    if (ball.x < 0) {
        score[1]++;
        resetBall();
    }
    if (ball.x + ballSize > canvas.width) {
        score[0]++;
        resetBall();
    }
    scoreElement.textContent = `${score[0]} : ${score[1]}`;
}

function resetBall() {
    ball.x = canvas.width / 2 - ballSize / 2;
    ball.y = canvas.height / 2 - ballSize / 2;
    ball.dx = ballSpeed * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = ballSpeed * (Math.random() * 2 - 1);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Controls
window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'W') leftPaddle.dy = -paddleSpeed;
    if (e.key === 's' || e.key === 'S') leftPaddle.dy = paddleSpeed;
    if (e.key === 'ArrowUp') rightPaddle.dy = -paddleSpeed;
    if (e.key === 'ArrowDown') rightPaddle.dy = paddleSpeed;
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W') leftPaddle.dy = 0;
    if (e.key === 's' || e.key === 'S') leftPaddle.dy = 0;
    if (e.key === 'ArrowUp') rightPaddle.dy = 0;
    if (e.key === 'ArrowDown') rightPaddle.dy = 0;
});

// Start game when background loads
bgImg.onload = () => {
    gameLoop();
}; 