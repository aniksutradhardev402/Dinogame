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
        
        // Ground level adjustment
        this.groundLevel = this.canvas.height - 70; // Elevated ground level
        
        // Dinosaur object with physics properties
        this.dino = {
            x: 50,
            y: this.groundLevel,  // Use new ground level
            width: 30,
            height: 40,
            jumping: false,
            ducking: false,  // New ducking state
            normalHeight: 40, // Store normal height
            duckHeight: 25,   // Height while ducking
            jumpSpeed: -15,
            gravity: 1.2, // Increased gravity
            velocityY: 0,
            minJumpSpeed: -10,  // Minimum jump velocity
            maxJumpSpeed: -15,  // Maximum jump velocity
            jumpPressed: false, // Track if jump button is held
            currentJumpForce: 0, // Track current jump force for visualization
            animationFrame: 0,
            runningFrames: 6,  // Number of frames before switching running pose
            frameCounter: 0
        };
        
        // Bird properties
        this.birds = [];
        this.birdSpawnInterval = 150;
        this.lastBirdSpawn = 0;
        this.minBirdHeight = this.groundLevel - 180; // Increased minimum height to clear ducking dino
        this.maxBirdHeight = this.groundLevel - 50;  // Adjusted max height for better gameplay
        this.birdWidths = [30, 40]; // Different bird sizes
        this.birdSpeeds = [6, 8, 10]; // Different bird speeds

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
        
        // Add cactus group properties
        this.cactusGroups = [
            { count: 1, spacing: 0 },
            { count: 2, spacing: 30 },
            { count: 3, spacing: 25 },
            { count: 4, spacing: 20 }
        ];
        
        // Event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Add reset high score button listener
        document.getElementById('resetHighScore').addEventListener('click', this.resetHighScore.bind(this));
        
        // Start the game
        this.updateHighScoreDisplay();
        this.gameLoop();
    }
    
    // Game mechanics methods
    handleKeyDown(event) {
        // Space bar or up arrow triggers jump and game reset
        if ((event.code === 'Space' || event.key === ' ' || event.code === 'ArrowUp')) {
            if (!this.dino.jumping && !this.dino.ducking) {
                this.dino.jumping = true;
                this.dino.jumpPressed = true;
                this.dino.velocityY = this.dino.maxJumpSpeed;
            }
        }
        
        // Down arrow triggers ducking
        if (event.code === 'ArrowDown') {
            if (!this.dino.jumping) {
                this.dino.ducking = true;
                this.dino.height = this.dino.duckHeight;
                this.dino.y = this.groundLevel + (this.dino.normalHeight - this.dino.duckHeight);
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
        
        // Release ducking
        if (event.code === 'ArrowDown') {
            this.dino.ducking = false;
            this.dino.height = this.dino.normalHeight;
            this.dino.y = this.groundLevel;
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
            
            if (this.dino.y >= this.groundLevel) {
                this.dino.y = this.groundLevel;
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
        if (this.frameCount >= this.nextCactusSpawn) {
            // Randomly select a cactus group configuration
            const groupConfig = this.cactusGroups[Math.floor(Math.random() * this.cactusGroups.length)];
            
            // Create the group of cacti
            for (let i = 0; i < groupConfig.count; i++) {
                const height = Math.random() * (this.maxCactusHeight - this.minCactusHeight) + this.minCactusHeight;
                this.cacti.push({
                    x: this.canvas.width + (i * groupConfig.spacing),
                    y: this.canvas.height - height,
                    width: 20,
                    height: height
                });
            }
            
            // Set next spawn time with longer interval for groups
            const baseInterval = Math.random() * (this.maxSpawnInterval - this.minSpawnInterval) + this.minSpawnInterval;
            const groupMultiplier = 1 + (groupConfig.count * 0.5); // Longer delay for larger groups
            this.nextCactusSpawn = this.frameCount + (baseInterval * groupMultiplier);
            
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
            
            // Check collision with the dinosaur
            const cactusHitbox = {
                x: cactus.x + 6,  // Adjust for cactus body position
                y: cactus.y,
                width: 14,       // Width of main cactus body
                height: cactus.height
            };
            
            if (this.checkCollisionWithCactus(this.dino, cactusHitbox)) {
                this.gameOver();
                return false;
            }
            
            return cactus.x > -20;
        });
    }

    checkCollisionWithCactus(dino, cactus) {
        // Create hitboxes for dino body and head
        const dinoBodyHitbox = {
            x: dino.x + dino.width * 0.2,
            y: dino.y,
            width: dino.width * 0.6,
            height: dino.height
        };

        const dinoHeadHitbox = dino.ducking ? {
            x: dino.x + dino.width + 5,
            y: dino.y - 5,
            width: 20,
            height: 15
        } : {
            x: dino.x + dino.width - 10,
            y: dino.y - 15,
            width: 20,
            height: 20
        };

        // Check if either the body or head collides with the cactus
        const boxesIntersect = (box1, box2) => {
            return box1.x < box2.x + box2.width &&
                   box1.x + box1.width > box2.x &&
                   box1.y < box2.y + box2.height &&
                   box1.y + box1.height > box2.y;
        };

        return boxesIntersect(dinoBodyHitbox, cactus) || boxesIntersect(dinoHeadHitbox, cactus);
    }
    
    checkCollision(rect1, rect2) {
        // Create separate hitboxes for dino body and head
        const dinoBodyHitbox = {
            x: rect1.x + rect1.width * 0.2,
            y: rect1.y + rect1.height * 0.1,
            width: rect1.width * 0.6,
            height: rect1.height * 0.8
        };

        const dinoHeadHitbox = {
            x: rect1.x + rect1.width - 10,
            y: rect1.y - 15,
            width: 20,
            height: 20
        };

        // Create hitboxes for bird body and wings
        const birdBodyHitbox = {
            x: rect2.x + rect2.width * 0.1,
            y: rect2.y + rect2.height * 0.1,
            width: rect2.width * 0.8,
            height: rect2.height * 0.8
        };

        // Create wing hitbox based on wing animation state
        const wingHitbox = rect2.wingUp ? {
            x: rect2.x + rect2.width - 40,
            y: rect2.y - 15,
            width: 30,
            height: 15
        } : {
            x: rect2.x + rect2.width - 40,
            y: rect2.y + rect2.height,
            width: 30,
            height: 15
        };

        // Create head hitbox for bird
        const birdHeadHitbox = {
            x: rect2.x - 2,
            y: rect2.y - 5,
            width: 12,
            height: 12
        };

        // Helper function to check if two boxes intersect
        const boxesIntersect = (box1, box2) => {
            return box1.x < box2.x + box2.width &&
                   box1.x + box1.width > box2.x &&
                   box1.y < box2.y + box2.height &&
                   box1.y + box1.height > box2.y;
        };

        // Check all possible collision combinations
        return boxesIntersect(dinoBodyHitbox, birdBodyHitbox) ||
               boxesIntersect(dinoBodyHitbox, wingHitbox) ||
               boxesIntersect(dinoBodyHitbox, birdHeadHitbox) ||
               boxesIntersect(dinoHeadHitbox, birdBodyHitbox) ||
               boxesIntersect(dinoHeadHitbox, wingHitbox) ||
               boxesIntersect(dinoHeadHitbox, birdHeadHitbox);
    }
    
    drawDino() {
        this.ctx.fillStyle = '#333';
        
        // Update animation frame
        if (!this.dino.jumping) {
            this.dino.frameCounter++;
            if (this.dino.frameCounter >= this.dino.runningFrames) {
                this.dino.frameCounter = 0;
                this.dino.animationFrame = (this.dino.animationFrame + 1) % 2;
            }
        }

        // Draw tail
        this.ctx.beginPath();
        if (this.dino.ducking) {
            // Tail stretched out while ducking
            this.ctx.moveTo(this.dino.x, this.dino.y + this.dino.height * 0.5);
            this.ctx.quadraticCurveTo(
                this.dino.x - 25,
                this.dino.y + this.dino.height * 0.5,
                this.dino.x - 30,
                this.dino.y + this.dino.height * 0.4
            );
        } else if (this.dino.jumping) {
            // Tail up position during jump
            this.ctx.moveTo(this.dino.x, this.dino.y + this.dino.height * 0.4);
            this.ctx.quadraticCurveTo(
                this.dino.x - 15,
                this.dino.y + this.dino.height * 0.3,
                this.dino.x - 20,
                this.dino.y + this.dino.height * 0.2
            );
        } else {
            // Normal running tail animation
            const tailOffset = this.dino.animationFrame === 0 ? 5 : -5;
            this.ctx.moveTo(this.dino.x, this.dino.y + this.dino.height * 0.4);
            this.ctx.quadraticCurveTo(
                this.dino.x - 15,
                this.dino.y + this.dino.height * 0.4 + tailOffset,
                this.dino.x - 20,
                this.dino.y + this.dino.height * 0.3 + tailOffset
            );
        }
        this.ctx.lineWidth = 8;
        this.ctx.strokeStyle = '#333';
        this.ctx.stroke();

        // Draw body
        this.ctx.fillRect(this.dino.x, this.dino.y, this.dino.width, this.dino.height);
        
        // Draw head with adjusted position when ducking
        if (this.dino.ducking) {
            // Head stretched forward while ducking
            this.ctx.fillRect(this.dino.x + this.dino.width + 5, 
                            this.dino.y - 5, 
                            20, 
                            15);
        } else {
            // Normal head position
            this.ctx.fillRect(this.dino.x + this.dino.width - 10, 
                            this.dino.y - 15, 
                            20, 
                            20);
        }
        
        // Draw eye
        this.ctx.fillStyle = '#FFF';
        if (this.dino.ducking) {
            this.ctx.fillRect(this.dino.x + this.dino.width + 15, 
                            this.dino.y - 2, 
                            3, 
                            3);
        } else {
            this.ctx.fillRect(this.dino.x + this.dino.width + 5, 
                            this.dino.y - 10, 
                            3, 
                            3);
        }
        
        // Draw legs based on animation frame
        this.ctx.fillStyle = '#333';
        if (this.dino.ducking) {
            // Crouched legs while ducking
            this.ctx.fillRect(this.dino.x + 5, this.dino.y + this.dino.height - 5, 5, 5);
            this.ctx.fillRect(this.dino.x + this.dino.width - 10, this.dino.y + this.dino.height - 5, 5, 5);
        } else if (this.dino.jumping) {
            // Jumping pose - both legs tucked up
            this.ctx.fillRect(this.dino.x + 5, this.dino.y + this.dino.height - 10, 5, 10);
            this.ctx.fillRect(this.dino.x + this.dino.width - 10, this.dino.y + this.dino.height - 10, 5, 10);
        } else {
            // Running animation
            if (this.dino.animationFrame === 0) {
                this.ctx.fillRect(this.dino.x + 5, this.dino.y + this.dino.height, 5, 15);
                this.ctx.fillRect(this.dino.x + this.dino.width - 10, this.dino.y + this.dino.height - 15, 5, 15);
            } else {
                this.ctx.fillRect(this.dino.x + 5, this.dino.y + this.dino.height - 15, 5, 15);
                this.ctx.fillRect(this.dino.x + this.dino.width - 10, this.dino.y + this.dino.height, 5, 15);
            }
        }
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

        // Draw dino with animation
        this.drawDino();
        
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
        
        // Draw cacti groups
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
            const oldHighScore = this.highScore;
            this.highScore = this.score;
            this.updateHighScoreDisplay();
            localStorage.setItem('highScore', this.highScore);
            
            // Only trigger celebration when actually beating the high score
            if (oldHighScore > 0) {
                const container = document.querySelector('.game-container');
                // Remove the class if it's already there
                container.classList.remove('new-highscore');
                // Force a reflow to ensure the animation plays again
                void container.offsetWidth;
                // Add the class back
                container.classList.add('new-highscore');
            }
        }
    }
    
    updateHighScoreDisplay() {
        document.getElementById('highScore').textContent = `High Score: ${this.highScore}`;
    }
    
    resetHighScore() {
        this.highScore = 0;
        localStorage.setItem('highScore', 0);
        this.updateHighScoreDisplay();
        
        // Add quick flash animation to confirm reset
        const highScoreElement = document.getElementById('highScore');
        highScoreElement.style.transition = 'opacity 0.2s';
        highScoreElement.style.opacity = '0';
        setTimeout(() => {
            highScoreElement.style.opacity = '1';
        }, 200);
    }
    
    gameLoop() {
        if (!this.isGameOver) {
            this.frameCount++;
            this.updateDino();
            this.updateClouds();
            this.spawnCactus();
            this.updateCacti();
            this.spawnBird();
            this.updateBirds();
            this.updateScore();
            
            this.draw();
            
            // Add bird drawing to the draw method
            this.drawBirds();
            
            this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    gameOver() {
        // Handle end game state
        this.isGameOver = true;
        document.getElementById('gameOver').classList.remove('hidden');
        
        // Add death animation
        const container = document.querySelector('.game-container');
        container.classList.add('dead');
        container.addEventListener('animationend', () => {
            container.classList.remove('dead');
        }, { once: true });
        
        cancelAnimationFrame(this.animationId);
    }
    
    resetGame() {
        // Reset all game parameters
        this.score = 0;
        this.isGameOver = false;
        this.cacti = [];
        this.cactusSpawnInterval = 50;
        this.frameCount = 0;
        this.dino.y = this.groundLevel;
        this.dino.jumping = false;
        this.dino.velocityY = 0;
        this.currentSpeed = this.baseSpeed;
        this.nextCactusSpawn = 0;
        this.clouds = [];
        this.lastCloudSpawn = 0;
        this.groundDots = this.generateGroundDots();
        this.birds = [];
        this.lastBirdSpawn = 0;
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

    spawnBird() {
        if (this.score >= 1000 && this.frameCount - this.lastBirdSpawn > this.birdSpawnInterval) {
            const birdWidth = this.birdWidths[Math.floor(Math.random() * this.birdWidths.length)];
            const birdSpeed = this.birdSpeeds[Math.floor(Math.random() * this.birdSpeeds.length)];
            const birdHeight = Math.random() * (this.maxBirdHeight - this.minBirdHeight) + this.minBirdHeight;
            
            this.birds.push({
                x: this.canvas.width,
                y: birdHeight,
                width: birdWidth,
                height: 20,
                speed: birdSpeed,
                wingUp: false,
                wingCounter: 0
            });
            
            this.lastBirdSpawn = this.frameCount;
            this.birdSpawnInterval = Math.floor(Math.random() * 100) + 100; // Random interval between 100-200 frames
        }
    }

    updateBirds() {
        this.birds = this.birds.filter(bird => {
            bird.x -= bird.speed;
            
            // Update wing animation
            bird.wingCounter++;
            if (bird.wingCounter > 15) {
                bird.wingUp = !bird.wingUp;
                bird.wingCounter = 0;
            }
            
            // Check collision with dino
            if (this.checkCollision(this.dino, bird)) {
                this.gameOver();
                return false;
            }
            
            return bird.x > -bird.width;
        });
    }

    drawBirds() {
        this.ctx.fillStyle = '#555';
        this.birds.forEach(bird => {
            // Draw body
            this.ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
            
            // Draw head (now on the left side)
            this.ctx.fillRect(bird.x - 2, bird.y - 5, 12, 12);
            
            // Draw beak (now pointing left)
            this.ctx.fillStyle = '#FFD700';
            this.ctx.fillRect(bird.x - 10, bird.y - 2, 8, 4);
            this.ctx.fillStyle = '#555';
            
            // Draw wings with flipped orientation
            if (bird.wingUp) {
                this.ctx.beginPath();
                this.ctx.moveTo(bird.x + bird.width - 10, bird.y);
                this.ctx.lineTo(bird.x + bird.width - 25, bird.y - 15);
                this.ctx.lineTo(bird.x + bird.width - 40, bird.y);
                this.ctx.fill();
            } else {
                this.ctx.beginPath();
                this.ctx.moveTo(bird.x + bird.width - 10, bird.y + bird.height);
                this.ctx.lineTo(bird.x + bird.width - 25, bird.y + bird.height + 15);
                this.ctx.lineTo(bird.x + bird.width - 40, bird.y + bird.height);
                this.ctx.fill();
            }
        });
    }
}

// Initialize game on window load
window.onload = () => new Game();