class Game {
    constructor() {
        // Canvas setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 300;
        
        // Game state initialization
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.isGameOver = false;
        this.animationId = null;
        
        // Dinosaur object with physics properties
        this.dino = {
            x: 50,
            y: this.canvas.height - 55,
            width: 30,
            height: 40,
            jumping: false,
            jumpSpeed: -15,
            gravity: 1.2, // Increased gravity
            velocityY: 0,
            minJumpSpeed: -10,  // Minimum jump velocity
            maxJumpSpeed: -15,  // Maximum jump velocity
            jumpPressed: false, // Track if jump button is held
            currentJumpForce: 0 // Track current jump force for visualization
        };
        
        // Jump force visualization properties
        this.jumpForceBar = {
            x: 20,
            y: 40,
            width: 10, // Made width smaller
            height: 60, // Made height smaller
            borderWidth: 2,
            currentFill: 0,  // Current fill level for smooth animation
            targetFill: 0    // Target fill level based on jump force
        };
        
        this.cacti = [];
        this.cactusSpawnInterval = 50;
        this.frameCount = 0;
        
        // Add speed properties
        this.baseSpeed = 5;
        this.currentSpeed = this.baseSpeed;
        this.speedIncrementInterval = 500; // Increase speed every 500 points
        this.speedIncrementAmount = 0.5;
        
        this.cacti = [];
        this.minCactusHeight = 30;
        this.maxCactusHeight = 60;
        this.nextCactusSpawn = 0;
        this.minSpawnInterval = 40;
        this.maxSpawnInterval = 100;
        
        // Add cloud properties
        this.clouds = [];
        this.cloudSpawnInterval = 200;
        this.lastCloudSpawn = 0;
        
        // Ground texture properties
        this.groundDots = this.generateGroundDots();
        
        // Event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Start the game
        this.updateHighScoreDisplay();
        this.gameLoop();
    }
    
    // Game mechanics methods
    handleKeyDown(event) {
        // Space bar or up arrow triggers jump and game reset
        if ((event.code === 'Space' || event.key === ' ' || event.code === 'ArrowUp')) {
            if (!this.dino.jumping) {
                this.dino.jumping = true;
                this.dino.jumpPressed = true;
                this.dino.velocityY = this.dino.maxJumpSpeed;
            }
        }
        
        if (this.isGameOver && (event.code === 'Space' || event.key === ' ' || event.code === 'ArrowUp')) {
            this.resetGame();
        }
    }
    
    handleKeyUp(event) {
        if ((event.code === 'Space' || event.key === ' ' || event.code === 'ArrowUp')) {
            this.dino.jumpPressed = false;
            // Cut the upward velocity if still moving upward
            if (this.dino.velocityY < this.dino.minJumpSpeed) {
                this.dino.velocityY = this.dino.minJumpSpeed;
            }
        }
    }
    
    updateDino() {
        // Apply gravity and jump physics
        if (this.dino.jumping) {
            // Update jump force visualization
            this.dino.currentJumpForce = Math.abs(this.dino.velocityY);
            
            // Update the target fill for the jump force bar
            const normalizedForce = Math.min(Math.abs(this.dino.velocityY) / Math.abs(this.dino.maxJumpSpeed), 1);
            this.jumpForceBar.targetFill = normalizedForce;
            
            // Apply less gravity when jump is held and moving upward
            const gravityMultiplier = this.dino.jumpPressed && this.dino.velocityY < 0 ? 0.6 : 1;
            this.dino.velocityY += this.dino.gravity * gravityMultiplier;
            this.dino.y += this.dino.velocityY;
            
            if (this.dino.y >= this.canvas.height - 60) {
                this.dino.y = this.canvas.height - 60;
                this.dino.jumping = false;
                this.dino.velocityY = 0;
                this.dino.currentJumpForce = 0;
                this.jumpForceBar.targetFill = 0;
            }
        } else {
            this.jumpForceBar.targetFill = 0;
        }
        
        // Smoothly animate the jump force bar
        const animationSpeed = 0.2;
        this.jumpForceBar.currentFill += (this.jumpForceBar.targetFill - this.jumpForceBar.currentFill) * animationSpeed;
    }
    
    spawnCactus() {
        // Create obstacles at random intervals
        if (this.frameCount >= this.nextCactusSpawn) {
            const height = Math.random() * (this.maxCactusHeight - this.minCactusHeight) + this.minCactusHeight;
            this.cacti.push({
                x: this.canvas.width,
                y: this.canvas.height - height,
                width: 20,
                height: height
            });
            
            // Set next spawn time randomly
            const spawnInterval = Math.random() * (this.maxSpawnInterval - this.minSpawnInterval) + this.minSpawnInterval;
            this.nextCactusSpawn = this.frameCount + spawnInterval;
            
            // Gradually decrease spawn intervals as score increases
            this.minSpawnInterval = Math.max(30, this.minSpawnInterval - 0.1);
            this.maxSpawnInterval = Math.max(60, this.maxSpawnInterval - 0.2);
        }
    }
    
    updateCacti() {
        // Update speed based on score
        this.currentSpeed = this.baseSpeed + Math.floor(this.score / this.speedIncrementInterval) * this.speedIncrementAmount;
        
        this.cacti = this.cacti.filter(cactus => {
            cactus.x -= this.currentSpeed;
            return cactus.x > -20;
        });
    }
    
    checkCollision(rect1, rect2) {
        // Create smaller hitboxes for more precise collision
        const dinoHitbox = {
            x: rect1.x + rect1.width * 0.2,  // 20% inset from left
            y: rect1.y + rect1.height * 0.1,  // 10% inset from top
            width: rect1.width * 0.6,         // 60% of original width
            height: rect1.height * 0.8        // 80% of original height
        };

        const cactusHitbox = {
            x: rect2.x + rect2.width * 0.1,   // 10% inset from left
            y: rect2.y + rect2.height * 0.1,  // 10% inset from top
            width: rect2.width * 0.8,         // 80% of original width
            height: rect2.height * 0.8        // 80% of original height
        };

        return dinoHitbox.x < cactusHitbox.x + cactusHitbox.width &&
               dinoHitbox.x + dinoHitbox.width > cactusHitbox.x &&
               dinoHitbox.y < cactusHitbox.y + cactusHitbox.height &&
               dinoHitbox.y + dinoHitbox.height > cactusHitbox.y;
    }
    
    draw() {
        // Clear canvas and draw sky background
        this.ctx.fillStyle = '#87CEEB';  // Sky blue color
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw clouds
        this.drawClouds();

        // Draw sandy ground
        const groundY = this.canvas.height - 20;
        this.ctx.fillStyle = '#F4D03F';  // Sandy yellow color
        this.ctx.fillRect(0, groundY, this.canvas.width, this.canvas.height - groundY);
        
        // Add a subtle line for ground definition
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY);
        this.ctx.lineTo(this.canvas.width, groundY);
        this.ctx.strokeStyle = '#D4B14F';  // Slightly darker sand color for the line
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Draw ground texture dots
        this.ctx.fillStyle = '#B7950B';  // Darker sand color for dots
        this.groundDots.forEach(dot => {
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        // Slide ground dots
        this.groundDots.forEach(dot => {
            dot.x -= this.currentSpeed * 0.5;  // Move dots slower than game speed
            if (dot.x < 0) {
                dot.x = this.canvas.width;
                dot.y = groundY + Math.random() * 20;
                dot.size = Math.random() * 2 + 1;
            }
        });

        // Draw dino
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(this.dino.x, this.dino.y, this.dino.width, this.dino.height);
        
        // Draw jump force bar
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = this.jumpForceBar.borderWidth;
        this.ctx.strokeRect(
            this.jumpForceBar.x, 
            this.jumpForceBar.y, 
            this.jumpForceBar.width, 
            this.jumpForceBar.height
        );
        
        // Draw the animated fill
        const fillHeight = this.jumpForceBar.currentFill * this.jumpForceBar.height;
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(
            this.jumpForceBar.x,
            this.jumpForceBar.y + this.jumpForceBar.height - fillHeight,
            this.jumpForceBar.width,
            fillHeight
        );
        
        // Draw cacti
        this.ctx.fillStyle = '#2d5a27'; // Dark green color for cacti
        this.cacti.forEach(cactus => {
            // Draw main body
            this.ctx.fillRect(cactus.x + 6, cactus.y, 8, cactus.height);
            
            // Draw arms (if cactus is tall enough)
            if (cactus.height > 40) {
                // Left arm
                this.ctx.fillRect(cactus.x, cactus.y + cactus.height * 0.3, 6, 5);
                this.ctx.fillRect(cactus.x, cactus.y + cactus.height * 0.3 - 10, 3, 12);
                
                // Right arm
                this.ctx.fillRect(cactus.x + 14, cactus.y + cactus.height * 0.6, 6, 5);
                this.ctx.fillRect(cactus.x + 17, cactus.y + cactus.height * 0.6 - 10, 3, 12);
            }
            
            // Add cactus spikes
            this.ctx.strokeStyle = '#1a3a18';
            this.ctx.beginPath();
            for (let i = 1; i < cactus.height / 8; i++) {
                // Left spikes
                this.ctx.moveTo(cactus.x + 6, cactus.y + i * 8);
                this.ctx.lineTo(cactus.x + 3, cactus.y + i * 8 - 3);
                
                // Right spikes
                this.ctx.moveTo(cactus.x + 14, cactus.y + i * 8);
                this.ctx.lineTo(cactus.x + 17, cactus.y + i * 8 - 3);
            }
            this.ctx.stroke();
        });
    }
    
    updateScore() {
        this.score++;
        document.getElementById('score').textContent = `Score: ${this.score}`;
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.updateHighScoreDisplay();
            localStorage.setItem('highScore', this.highScore);
        }
    }
    
    updateHighScoreDisplay() {
        document.getElementById('highScore').textContent = `High Score: ${this.highScore}`;
    }
    
    gameLoop() {
        // Main game loop for continuous updates
        if (!this.isGameOver) {
            this.frameCount++;
            this.updateDino();
            this.updateClouds();
            this.spawnCactus();
            this.updateCacti();
            this.updateScore();
            
            // Check collisions
            for (const cactus of this.cacti) {
                if (this.checkCollision(this.dino, cactus)) {
                    this.gameOver();
                    return;
                }
            }
            
            this.draw();
            this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    gameOver() {
        // Handle end game state
        this.isGameOver = true;
        document.getElementById('gameOver').classList.remove('hidden');
        cancelAnimationFrame(this.animationId);
    }
    
    resetGame() {
        // Reset all game parameters
        this.score = 0;
        this.isGameOver = false;
        this.cacti = [];
        this.cactusSpawnInterval = 50;
        this.frameCount = 0;
        this.dino.y = this.canvas.height - 55;
        this.dino.jumping = false;
        this.dino.velocityY = 0;
        this.currentSpeed = this.baseSpeed;
        this.nextCactusSpawn = 0;
        this.clouds = [];
        this.lastCloudSpawn = 0;
        this.groundDots = this.generateGroundDots();
        document.getElementById('gameOver').classList.add('hidden');
        this.gameLoop();
    }

    generateGroundDots() {
        const dots = [];
        const groundY = this.canvas.height - 20;
        // Generate initial set of ground dots
        for (let x = 0; x < this.canvas.width; x += 4) {
            if (Math.random() > 0.7) {
                dots.push({
                    x: x + Math.random() * 4,
                    y: groundY + Math.random() * 20,
                    size: Math.random() * 2 + 1
                });
            }
        }
        return dots;
    }

    updateClouds() {
        // Spawn new clouds
        if (this.frameCount - this.lastCloudSpawn > this.cloudSpawnInterval) {
            if (Math.random() > 0.7) {  // 30% chance to spawn a cloud
                const cloudWidth = Math.random() * 60 + 40;  // Cloud width between 40-100
                const cloudHeight = Math.random() * 20 + 15; // Cloud height between 15-35
                this.clouds.push({
                    x: this.canvas.width,
                    y: Math.random() * (this.canvas.height / 3),  // Only in top third of screen
                    width: cloudWidth,
                    height: cloudHeight
                });
                this.lastCloudSpawn = this.frameCount;
            }
        }

        // Update cloud positions - move at 1/3 of the current game speed
        this.clouds = this.clouds.filter(cloud => {
            cloud.x -= this.currentSpeed * 0.33;  // Clouds move at 1/3 of the ground speed
            return cloud.x > -cloud.width;
        });
    }

    drawClouds() {
        this.ctx.fillStyle = '#FFFFFF';
        this.clouds.forEach(cloud => {
            // Draw a fluffy cloud shape
            this.ctx.beginPath();
            this.ctx.arc(cloud.x + cloud.width * 0.3, cloud.y + cloud.height * 0.5, 
                        cloud.height * 0.5, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + cloud.width * 0.7, cloud.y + cloud.height * 0.5, 
                        cloud.height * 0.6, 0, Math.PI * 2);
            this.ctx.arc(cloud.x + cloud.width * 0.5, cloud.y + cloud.height * 0.3, 
                        cloud.height * 0.7, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}

// Initialize game on window load
window.onload = () => new Game();