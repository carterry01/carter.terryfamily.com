// Wait for the window to load before starting the game
window.onload = function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');

    // Game objects
    const paddle = {
        width: 100,
        height: 20,
        x: canvas.width / 2 - 50,
        y: canvas.height - 40,
        speed: 12,
        color: '#0ff',
        segments: 5,
        segmentWidth: 20,
        segmentGap: 0,
        glowIntensity: 0
    };

    const ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 10,
        speed: 12,
        dx: 12,
        dy: -12,
        color: '#f0f',
        trail: [],
        glowIntensity: 0,
        lastX: 0,
        lastY: 0
    };

    // Brick configuration
    const brickRowCount = 5;
    const brickColumnCount = 8;
    const brickWidth = 80;
    const brickHeight = 20;
    const brickPadding = 10;
    const brickOffsetTop = 30;
    const brickOffsetLeft = 35;

    // Create bricks array
    const bricks = [];
    for(let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for(let r = 0; r < brickRowCount; r++) {
            bricks[c][r] = { 
                x: 0, 
                y: 0, 
                status: 1,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                particles: [],
                glowIntensity: 0
            };
        }
    }

    // Particle system for brick breaking animation
    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.size = Math.random() * 2 + 1;
            this.speedX = (Math.random() - 0.5) * 8;
            this.speedY = (Math.random() - 0.5) * 8;
            this.life = 1;
            this.angle = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.2;
            this.glowIntensity = 1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            this.life -= 0.05;
            this.angle += this.rotationSpeed;
            this.glowIntensity = this.life;
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            ctx.beginPath();
            ctx.moveTo(-this.size, -this.size);
            ctx.lineTo(this.size, -this.size);
            ctx.lineTo(this.size, this.size);
            ctx.lineTo(-this.size, this.size);
            ctx.closePath();
            
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10 * this.glowIntensity;
            ctx.strokeStyle = this.color;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            ctx.restore();
        }
    }

    let score = 0;
    let gameOver = false;

    // Event listeners
    document.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, mouseX - paddle.width / 2));
    });

    // Game functions
    function drawPaddle() {
        // Draw paddle segments
        for(let i = 0; i < paddle.segments; i++) {
            const segmentX = paddle.x + (i * (paddle.segmentWidth + paddle.segmentGap));
            ctx.beginPath();
            ctx.rect(segmentX, paddle.y, paddle.segmentWidth, paddle.height);
            ctx.fillStyle = paddle.color;
            ctx.fill();
            ctx.shadowColor = paddle.color;
            ctx.shadowBlur = 20 + Math.sin(Date.now() * 0.008) * 10;
            ctx.strokeStyle = paddle.color;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    function drawBall() {
        // Draw ball trail
        for(let i = 0; i < ball.trail.length; i++) {
            const trail = ball.trail[i];
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, ball.radius * (1 - i/ball.trail.length), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(240, 0, 240, ${0.3 * (1 - i/ball.trail.length)})`;
            ctx.fill();
            ctx.shadowColor = '#f0f';
            ctx.shadowBlur = 10 * (1 - i/ball.trail.length);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Draw main ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 20 + Math.sin(Date.now() * 0.008) * 10;
        ctx.strokeStyle = ball.color;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Update trail
        ball.trail.unshift({x: ball.x, y: ball.y});
        if(ball.trail.length > 5) ball.trail.pop();
    }

    function drawBricks() {
        for(let c = 0; c < brickColumnCount; c++) {
            for(let r = 0; r < brickRowCount; r++) {
                if(bricks[c][r].status === 1) {
                    const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                    const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                    bricks[c][r].x = brickX;
                    bricks[c][r].y = brickY;
                    
                    ctx.beginPath();
                    ctx.rect(brickX, brickY, brickWidth, brickHeight);
                    ctx.fillStyle = bricks[c][r].color;
                    ctx.fill();
                    ctx.shadowColor = bricks[c][r].color;
                    ctx.shadowBlur = 20 + Math.sin(Date.now() * 0.008) * 10;
                    ctx.strokeStyle = bricks[c][r].color;
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            }
        }
    }

    function createBrickParticles(x, y, color) {
        const particles = [];
        for(let i = 0; i < 15; i++) {
            particles.push(new Particle(x + brickWidth/2, y + brickHeight/2, color));
        }
        return particles;
    }

    function checkCollision(obj1, obj2) {
        // For paddle
        if (obj1 === paddle) {
            const paddleLeft = obj1.x;
            const paddleRight = obj1.x + obj1.width;
            const paddleTop = obj1.y;
            const paddleBottom = obj1.y + obj1.height;

            // Check if ball is moving towards paddle
            if (ball.dy > 0) {
                if (ball.x + ball.radius > paddleLeft && 
                    ball.x - ball.radius < paddleRight && 
                    ball.y + ball.radius > paddleTop && 
                    ball.y - ball.radius < paddleBottom) {
                    
                    // Calculate which part of the paddle was hit
                    const hitPoint = (ball.x - paddleLeft) / obj1.width;
                    
                    // Adjust ball position to prevent going inside paddle
                    ball.y = paddleTop - ball.radius;
                    
                    // Adjust angle based on where the ball hit the paddle
                    const angle = hitPoint * Math.PI - Math.PI/2;
                    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                    ball.dx = Math.cos(angle) * speed;
                    ball.dy = -Math.abs(Math.sin(angle) * speed);
                    
                    return true;
                }
            }
            return false;
        }
        
        // For bricks
        const brickLeft = obj2.x;
        const brickRight = obj2.x + brickWidth;
        const brickTop = obj2.y;
        const brickBottom = obj2.y + brickHeight;

        // Store last position
        ball.lastX = ball.x;
        ball.lastY = ball.y;

        // Calculate next position
        const nextX = ball.x + ball.dx;
        const nextY = ball.y + ball.dy;

        // Check if ball will intersect with brick
        if (nextX + ball.radius > brickLeft && 
            nextX - ball.radius < brickRight && 
            nextY + ball.radius > brickTop && 
            nextY - ball.radius < brickBottom) {
            
            // Determine which side was hit
            const fromLeft = Math.abs(nextX - brickLeft);
            const fromRight = Math.abs(nextX - brickRight);
            const fromTop = Math.abs(nextY - brickTop);
            const fromBottom = Math.abs(nextY - brickBottom);
            
            const min = Math.min(fromLeft, fromRight, fromTop, fromBottom);
            
            // Adjust ball position based on which side was hit
            if (min === fromLeft) {
                ball.x = brickLeft - ball.radius;
                ball.dx = -Math.abs(ball.dx);
            } else if (min === fromRight) {
                ball.x = brickRight + ball.radius;
                ball.dx = Math.abs(ball.dx);
            } else if (min === fromTop) {
                ball.y = brickTop - ball.radius;
                ball.dy = -Math.abs(ball.dy);
            } else {
                ball.y = brickBottom + ball.radius;
                ball.dy = Math.abs(ball.dy);
            }
            
            return true;
        }
        return false;
    }

    function moveBall() {
        // Wall collision
        if (ball.x + ball.radius > canvas.width) {
            ball.x = canvas.width - ball.radius;
            ball.dx = -Math.abs(ball.dx);
        }
        if (ball.x - ball.radius < 0) {
            ball.x = ball.radius;
            ball.dx = Math.abs(ball.dx);
        }
        if (ball.y - ball.radius < 0) {
            ball.y = ball.radius;
            ball.dy = Math.abs(ball.dy);
        }

        // Paddle collision
        if (checkCollision(paddle, null)) {
            // Collision handled in checkCollision
        }

        // Brick collision
        for(let c = 0; c < brickColumnCount; c++) {
            for(let r = 0; r < brickRowCount; r++) {
                const b = bricks[c][r];
                if(b.status === 1) {
                    if(checkCollision(null, b)) {
                        b.status = 0;
                        score += 10;
                        scoreElement.textContent = `SCORE: ${score}`;
                        b.particles = createBrickParticles(b.x, b.y, b.color);
                    }
                }
            }
        }

        // Move ball
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Game over
        if (ball.y + ball.radius > canvas.height) {
            gameOver = true;
        }
    }

    function updateParticles() {
        for(let c = 0; c < brickColumnCount; c++) {
            for(let r = 0; r < brickRowCount; r++) {
                const brick = bricks[c][r];
                if(brick.particles.length > 0) {
                    brick.particles = brick.particles.filter(particle => {
                        particle.update();
                        particle.draw();
                        return particle.life > 0;
                    });
                }
            }
        }
    }

    function draw() {
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!gameOver) {
            drawBricks();
            drawPaddle();
            drawBall();
            updateParticles();
            moveBall();
            requestAnimationFrame(draw);
        } else {
            // Game over screen
            ctx.fillStyle = '#f0f';
            ctx.font = '48px "Courier New"';
            ctx.textAlign = 'center';
            ctx.fillText('SYSTEM FAILURE', canvas.width / 2, canvas.height / 2);
            ctx.font = '24px "Courier New"';
            ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, canvas.height / 2 + 40);
            ctx.fillText('CLICK TO REBOOT', canvas.width / 2, canvas.height / 2 + 80);
        }
    }

    // Start game
    canvas.addEventListener('click', () => {
        if (gameOver) {
            ball.x = canvas.width / 2;
            ball.y = canvas.height / 2;
            ball.dx = 12;
            ball.dy = -12;
            score = 0;
            scoreElement.textContent = `SCORE: ${score}`;
            gameOver = false;
            
            for(let c = 0; c < brickColumnCount; c++) {
                for(let r = 0; r < brickRowCount; r++) {
                    bricks[c][r].status = 1;
                    bricks[c][r].particles = [];
                }
            }
            
            draw();
        }
    });

    // Start the game
    draw();
}; 