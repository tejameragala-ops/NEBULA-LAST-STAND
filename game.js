
"use strict";

// ==========================================
// NEBULA: LAST STAND
// ==========================================

// ELEMENTS
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const gameArea = document.getElementById("gameArea");

const scoreText = document.getElementById("score");
const healthText = document.getElementById("health");
const levelText = document.getElementById("level");
const livesText = document.getElementById("lives");
const bestScoreText = document.getElementById("bestScore");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");

// MOBILE CONTROLS
const mobileControls = document.getElementById("mobileControls");
const joystickZone = document.getElementById("joystickZone");
const joystickKnob = document.getElementById("joystickKnob");

const directionButtons = document.getElementById("directionButtons");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const fireBtn = document.getElementById("fireBtn");

const joystickModeBtn = document.getElementById("joystickModeBtn");
const buttonModeBtn = document.getElementById("buttonModeBtn");

// ==========================================
// CANVAS SIZE
// ==========================================

let width = 0;
let height = 0;

function resizeCanvas() {
    const rect = gameArea.getBoundingClientRect();

    const oldWidth = width;
    const oldHeight = height;

    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));

    canvas.width = width;
    canvas.height = height;

    if (oldWidth > 0 && oldHeight > 0) {
        player.x = (player.x / oldWidth) * width;
        player.y = (player.y / oldHeight) * height;
    } else {
        player.x = width / 2;
        player.y = height - 70;
    }

    player.x = Math.max(20, Math.min(width - 20, player.x));
    player.y = Math.max(25, Math.min(height - 25, player.y));

    createStars();
}

const keys = {};

let score = 0;
let health = 100;
let level = 1;
let lives = 3;

let bestScore = 0;

try {
    bestScore = Number(localStorage.getItem("nebulaBestScore")) || 0;
} catch (error) {
    console.warn("Local storage unavailable.");
}

let gameRunning = false;
let gamePaused = false;

let lastTime = 0;
let enemyTimer = 0;
let shootTimer = 0;
let damageCooldown = 0;

const originalPlayerSpeed = 350;

const player = {
    x: 0,
    y: 0,
    speed: originalPlayerSpeed,
    size: 16
};

let bullets = [];
let enemies = [];
let enemyBullets = [];
let particles = [];
let stars = [];
let powerUps = [];

let boss = null;
let nextBossScore = 100;

let shieldActive = false;
let shieldTimer = 0;

let tripleShotActive = false;
let tripleShotTimer = 0;

let speedBoostActive = false;
let speedBoostTimer = 0;

let audioCtx = null;

// ==========================================
// MOBILE CONTROL STATE
// ==========================================

let controlMode = "joystick";

let joystickPointerId = null;
let joystickDX = 0;
let joystickDY = 0;

let leftPressed = false;
let rightPressed = false;
let firePressed = false;

function setControlMode(mode) {
    controlMode = mode;

    joystickDX = 0;
    joystickDY = 0;
    leftPressed = false;
    rightPressed = false;

    resetJoystick();

    if (mode === "joystick") {
        mobileControls.classList.remove("button-mode");
        mobileControls.classList.add("joystick-mode");

        joystickModeBtn.classList.add("active");
        buttonModeBtn.classList.remove("active");
    } else {
        mobileControls.classList.remove("joystick-mode");
        mobileControls.classList.add("button-mode");

        buttonModeBtn.classList.add("active");
        joystickModeBtn.classList.remove("active");
    }
}

joystickModeBtn.addEventListener("click", function () {
    setControlMode("joystick");
});

buttonModeBtn.addEventListener("click", function () {
    setControlMode("buttons");
});

// ==========================================
// JOYSTICK CONTROL
// ==========================================

function resetJoystick() {
    joystickDX = 0;
    joystickDY = 0;
    joystickPointerId = null;

    if (joystickKnob) {
        joystickKnob.style.transform = "translate(0px, 0px)";
    }
}

function updateJoystick(event) {
    const rect = joystickZone.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;

    const maxDistance = 35;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) {
        dx = (dx / distance) * maxDistance;
        dy = (dy / distance) * maxDistance;
    }

    joystickDX = dx / maxDistance;
    joystickDY = dy / maxDistance;

    joystickKnob.style.transform =
        `translate(${dx}px, ${dy}px)`;
}

joystickZone.addEventListener("pointerdown", function (event) {
    if (controlMode !== "joystick") return;

    event.preventDefault();

    joystickPointerId = event.pointerId;
    joystickZone.setPointerCapture(event.pointerId);

    updateJoystick(event);
});

joystickZone.addEventListener("pointermove", function (event) {
    if (event.pointerId !== joystickPointerId) return;

    event.preventDefault();
    updateJoystick(event);
});

function releaseJoystick(event) {
    if (event.pointerId !== joystickPointerId) return;
    resetJoystick();
}

joystickZone.addEventListener("pointerup", releaseJoystick);
joystickZone.addEventListener("pointercancel", releaseJoystick);
joystickZone.addEventListener("lostpointercapture", resetJoystick);

// ==========================================
// LEFT / RIGHT BUTTON CONTROLS
// ==========================================

function setupDirectionButton(button, direction) {
    button.addEventListener("pointerdown", function (event) {
        event.preventDefault();

        if (controlMode !== "buttons") return;

        button.setPointerCapture(event.pointerId);

        if (direction === "left") {
            leftPressed = true;
        } else {
            rightPressed = true;
        }
    });

    function releaseDirection(event) {
        if (direction === "left") {
            leftPressed = false;
        } else {
            rightPressed = false;
        }
    }

    button.addEventListener("pointerup", releaseDirection);
    button.addEventListener("pointercancel", releaseDirection);
    button.addEventListener("lostpointercapture", releaseDirection);
}

setupDirectionButton(leftBtn, "left");
setupDirectionButton(rightBtn, "right");

// ==========================================
// FIRE BUTTON
// ==========================================

fireBtn.addEventListener("pointerdown", function (event) {
    event.preventDefault();

    firePressed = true;

    try {
        fireBtn.setPointerCapture(event.pointerId);
    } catch (error) {
        // Ignore pointer capture errors.
    }

    shoot();
});

function releaseFire() {
    firePressed = false;
}

fireBtn.addEventListener("pointerup", releaseFire);
fireBtn.addEventListener("pointercancel", releaseFire);
fireBtn.addEventListener("lostpointercapture", releaseFire);

// ==========================================
// INITIAL SETUP
// ==========================================

function createStars() {
    stars = [];

    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 70 + 20
        });
    }
}

function updateHUD() {
    scoreText.textContent = String(score).padStart(6, "0");
    healthText.textContent = health + "%";
    levelText.textContent = String(level).padStart(2, "0");
    livesText.textContent = lives;
    bestScoreText.textContent = String(bestScore).padStart(6, "0");
}

// ==========================================
// SOUND
// ==========================================

function playSound(frequency, duration, type = "sine", volume = 0.04) {
    if (!audioCtx) return;

    try {
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioCtx.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    } catch (error) {
        console.warn("Audio error:", error);
    }
}

// ==========================================
// PLAYER
// ==========================================

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);

    ctx.fillStyle = "#00e5ff";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#00e5ff";

    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-13, 13);
    ctx.lineTo(0, 8);
    ctx.lineTo(13, 13);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Engine flame
    ctx.fillStyle = "#ff9900";
    ctx.beginPath();
    ctx.moveTo(-4, 12);
    ctx.lineTo(0, 23 + Math.random() * 5);
    ctx.lineTo(4, 12);
    ctx.fill();

    // Shield
    if (shieldActive) {
        ctx.strokeStyle = "#00ccff";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#00ccff";

        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
}

function movePlayer(dt) {
    let dx = 0;
    let dy = 0;

    // Keyboard
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) dx--;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) dx++;
    if (keys["ArrowUp"] || keys["w"] || keys["W"]) dy--;
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) dy++;

    // Joystick
    if (controlMode === "joystick") {
        dx += joystickDX;
        dy += joystickDY;
    }

    // Button mode
    if (controlMode === "buttons") {
        if (leftPressed) dx--;
        if (rightPressed) dx++;
    }

    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 1) {
        dx /= length;
        dy /= length;
    }

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    player.x = Math.max(20, Math.min(width - 20, player.x));
    player.y = Math.max(25, Math.min(height - 25, player.y));
}

// ==========================================
// SHOOTING
// ==========================================

function shoot() {
    if (!gameRunning || gamePaused || shootTimer > 0) return;

    if (tripleShotActive) {
        bullets.push({ x: player.x, y: player.y - 18, speed: 550 });
        bullets.push({ x: player.x - 12, y: player.y - 15, speed: 550 });
        bullets.push({ x: player.x + 12, y: player.y - 15, speed: 550 });
    } else if (score >= 100) {
        bullets.push({ x: player.x - 7, y: player.y - 18, speed: 550 });
        bullets.push({ x: player.x + 7, y: player.y - 18, speed: 550 });
    } else {
        bullets.push({ x: player.x, y: player.y - 18, speed: 550 });
    }

    playSound(700, 0.08, "square", 0.04);
    shootTimer = 0.22;
}

function drawBullets(dt) {
    ctx.fillStyle = "#00ffff";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#00ffff";

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        bullet.y -= bullet.speed * dt;

        ctx.fillRect(bullet.x - 1, bullet.y - 6, 2, 10);

        if (bullet.y < -20) {
            bullets.splice(i, 1);
        }
    }

    ctx.shadowBlur = 0;
}

// ==========================================
// ENEMIES
// ==========================================

function spawnEnemy() {
    enemies.push({
        x: Math.random() * (width - 40) + 20,
        y: -20,
        size: 14,
        speed: 65 + level * 8
    });
}

function drawEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        enemy.y += enemy.speed * dt;

        ctx.save();

        ctx.fillStyle = "#ff3366";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ff3366";

        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y + 12);
        ctx.lineTo(enemy.x - 13, enemy.y - 10);
        ctx.lineTo(enemy.x, enemy.y - 5);
        ctx.lineTo(enemy.x + 13, enemy.y - 10);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        if (enemy.y > height + 25) {
            enemies.splice(i, 1);
            damagePlayer(10);
        }
    }
}

// ==========================================
// ENEMY BULLETS
// ==========================================

function drawEnemyBullets(dt) {
    ctx.fillStyle = "#ff3333";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#ff0000";

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];

        bullet.y += bullet.speed * dt;

        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        ctx.fill();

        if (bullet.y > height + 20) {
            enemyBullets.splice(i, 1);
        }
    }

    ctx.shadowBlur = 0;
}

function enemyShoot() {
    for (const enemy of enemies) {
        if (Math.random() < 0.006) {
            enemyBullets.push({
                x: enemy.x,
                y: enemy.y + 10,
                speed: 220
            });
        }
    }
}

// ==========================================
// BOSS
// ==========================================

function spawnBoss() {
    boss = {
        x: width / 2,
        y: 85,
        health: 20,
        maxHealth: 20,
        speed: 100,
        direction: 1,
        shootTimer: 0
    };

    playSound(150, 0.5, "sawtooth", 0.08);
}

function drawBoss(dt) {
    if (!boss && score >= nextBossScore) {
        spawnBoss();
    }

    if (!boss) return;

    boss.x += boss.speed * boss.direction * dt;

    if (boss.x > width - 45 || boss.x < 45) {
        boss.direction *= -1;
    }

    boss.shootTimer -= dt;

    if (boss.shootTimer <= 0) {
        enemyBullets.push({
            x: boss.x,
            y: boss.y + 20,
            speed: 260
        });

        boss.shootTimer = 1.2;
    }

    ctx.save();

    ctx.fillStyle = "#bb00ff";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#bb00ff";

    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y + 25);
    ctx.lineTo(boss.x - 32, boss.y - 15);
    ctx.lineTo(boss.x, boss.y - 7);
    ctx.lineTo(boss.x + 32, boss.y - 15);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Boss health bar
    ctx.fillStyle = "#333";
    ctx.fillRect(boss.x - 30, boss.y - 25, 60, 5);

    ctx.fillStyle = "#ff3366";
    ctx.fillRect(
        boss.x - 30,
        boss.y - 25,
        60 * (boss.health / boss.maxHealth),
        5
    );
}

// ==========================================
// POWER-UPS
// ==========================================

function spawnPowerUp(x, y) {
    const types = ["health", "shield", "triple", "speed"];
    const type = types[Math.floor(Math.random() * types.length)];

    powerUps.push({
        x,
        y,
        type,
        speed: 100,
        size: 14
    });
}

function trySpawnPowerUp(x, y) {
    if (Math.random() < 0.20) {
        spawnPowerUp(x, y);
    }
}

function drawPowerUps(dt) {
    const colors = {
        health: "#00ff66",
        shield: "#00ccff",
        triple: "#ffcc00",
        speed: "#ff00ff"
    };

    const icons = {
        health: "❤️",
        shield: "🛡️",
        triple: "🔫",
        speed: "⚡"
    };

    for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i];

        p.y += p.speed * dt;

        ctx.save();

        ctx.fillStyle = colors[p.type];
        ctx.shadowBlur = 12;
        ctx.shadowColor = colors[p.type];

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.font = "13px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(icons[p.type], p.x, p.y);

        ctx.restore();

        if (
            Math.abs(p.x - player.x) < 25 &&
            Math.abs(p.y - player.y) < 25
        ) {
            if (p.type === "health") {
                health = Math.min(100, health + 30);
            }

            if (p.type === "shield") {
                shieldActive = true;
                shieldTimer = 5;
            }

            if (p.type === "triple") {
                tripleShotActive = true;
                tripleShotTimer = 8;
            }

            if (p.type === "speed") {
                speedBoostActive = true;
                speedBoostTimer = 8;
                player.speed = 550;
            }

            playSound(900, 0.15, "sine", 0.06);
            updateHUD();

            powerUps.splice(i, 1);
            continue;
        }

        if (p.y > height + 25) {
            powerUps.splice(i, 1);
        }
    }
}

// ==========================================
// PARTICLES
// ==========================================

function createExplosion(x, y) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 250,
            vy: (Math.random() - 0.5) * 250,
            life: 0.5 + Math.random() * 0.5,
            maxLife: 1,
            size: Math.random() * 4 + 2
        });
    }

    playSound(120, 0.2, "sawtooth", 0.04);
}

function drawParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;

        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = "#ffaa00";

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }

    ctx.globalAlpha = 1;
}

// ==========================================
// COLLISIONS
// ==========================================

function detectCollisions() {

    // PLAYER BULLETS VS ENEMIES
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];

            if (
                Math.abs(bullet.x - enemy.x) < 15 &&
                Math.abs(bullet.y - enemy.y) < 15
            ) {
                bullets.splice(j, 1);
                enemies.splice(i, 1);

                score += 10;

                createExplosion(enemy.x, enemy.y);
                trySpawnPowerUp(enemy.x, enemy.y);

                break;
            }
        }
    }

    // PLAYER BULLETS VS BOSS
    if (boss) {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];

            if (
                Math.abs(bullet.x - boss.x) < 35 &&
                Math.abs(bullet.y - boss.y) < 25
            ) {
                bullets.splice(i, 1);
                boss.health--;

                if (boss.health <= 0) {
                    createExplosion(boss.x, boss.y);
                    createExplosion(boss.x - 20, boss.y);
                    createExplosion(boss.x + 20, boss.y);

                    score += 500;
                    nextBossScore = score + 500;
                    boss = null;

                    playSound(1000, 0.5, "sine", 0.08);
                    break;
                }
            }
        }
    }

    // ENEMY BULLETS VS PLAYER
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];

        if (
            Math.abs(bullet.x - player.x) < 18 &&
            Math.abs(bullet.y - player.y) < 20
        ) {
            enemyBullets.splice(i, 1);
            damagePlayer(10);
        }
    }

    // BOSS VS PLAYER
    if (
        boss &&
        Math.abs(boss.x - player.x) < 35 &&
        Math.abs(boss.y - player.y) < 30
    ) {
        damagePlayer(20);
    }

    // ENEMIES VS PLAYER
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        if (
            Math.abs(enemy.x - player.x) < 22 &&
            Math.abs(enemy.y - player.y) < 22
        ) {
            enemies.splice(i, 1);
            damagePlayer(20);
            createExplosion(enemy.x, enemy.y);
        }
    }

    level = Math.floor(score / 100) + 1;

    if (score > bestScore) {
        bestScore = score;

        try {
            localStorage.setItem("nebulaBestScore", bestScore);
        } catch (error) {
            console.warn("Could not save best score.");
        }
    }

    updateHUD();
}

// ==========================================
// DAMAGE & LIVES
// ==========================================

function damagePlayer(amount) {
    if (
        damageCooldown > 0 ||
        !gameRunning ||
        shieldActive
    ) {
        return;
    }

    health -= amount;
    damageCooldown = 1;

    playSound(180, 0.15, "sawtooth", 0.05);

    if (health <= 0) {
        lives--;

        if (lives <= 0) {
            health = 0;
            updateHUD();
            endGame();
            return;
        }

        health = 100;
        createExplosion(player.x, player.y);
    }

    updateHUD();
}

// ==========================================
// BACKGROUND
// ==========================================

function drawStars(dt) {
    ctx.fillStyle = "#050816";
    ctx.fillRect(0, 0, width, height);

    for (const star of stars) {
        star.y += star.speed * dt;

        if (star.y > height) {
            star.y = 0;
            star.x = Math.random() * width;
        }

        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.4 + Math.random() * 0.6;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    ctx.globalAlpha = 1;
}

// ==========================================
// POWER-UP TIMERS
// ==========================================

function updatePowerUpTimers(dt) {
    if (shieldActive) {
        shieldTimer -= dt;

        if (shieldTimer <= 0) {
            shieldActive = false;
            shieldTimer = 0;
        }
    }

    if (tripleShotActive) {
        tripleShotTimer -= dt;

        if (tripleShotTimer <= 0) {
            tripleShotActive = false;
            tripleShotTimer = 0;
        }
    }

    if (speedBoostActive) {
        speedBoostTimer -= dt;

        if (speedBoostTimer <= 0) {
            speedBoostActive = false;
            speedBoostTimer = 0;
            player.speed = originalPlayerSpeed;
        }
    }
}

// ==========================================
// MAIN GAME LOOP
// ==========================================

function gameLoop(timestamp) {
    if (!gameRunning || gamePaused) return;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    drawStars(dt);
    movePlayer(dt);

    enemyTimer += dt;

    if (enemyTimer > Math.max(1.5, 2.5 - level * 0.03)) {
        spawnEnemy();
        enemyTimer = 0;
    }

    shootTimer = Math.max(0, shootTimer - dt);
    damageCooldown = Math.max(0, damageCooldown - dt);

    // Continuous mobile firing
    if (firePressed) {
        shoot();
    }

    drawBullets(dt);
    drawEnemies(dt);

    enemyShoot();
    drawPowerUps(dt);
    drawBoss(dt);
    drawEnemyBullets(dt);

    drawPlayer();
    drawParticles(dt);

    detectCollisions();

    if (!gameRunning) return;

    updatePowerUpTimers(dt);

    requestAnimationFrame(gameLoop);
}

// ==========================================
// START GAME
// ==========================================

function startGame() {
    if (gameRunning && !gamePaused) return;

    if (gameRunning && gamePaused) {
        togglePause();
        return;
    }

    if (!audioCtx) {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }

    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    score = 0;
    health = 100;
    level = 1;
    lives = 3;

    bullets = [];
    enemies = [];
    enemyBullets = [];
    particles = [];
    powerUps = [];

    boss = null;
    nextBossScore = 100;

    enemyTimer = 0;
    shootTimer = 0;
    damageCooldown = 0;

    shieldActive = false;
    shieldTimer = 0;

    tripleShotActive = false;
    tripleShotTimer = 0;

    speedBoostActive = false;
    speedBoostTimer = 0;

    player.speed = originalPlayerSpeed;
    player.x = width / 2;
    player.y = height - 70;

    resetJoystick();

    leftPressed = false;
    rightPressed = false;
    firePressed = false;

    gameRunning = true;
    gamePaused = false;

    pauseBtn.textContent = "PAUSE";
    overlay.style.display = "none";

    updateHUD();
    createStars();

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// ==========================================
// GAME OVER
// ==========================================

function endGame() {
    gameRunning = false;
    gamePaused = false;

    firePressed = false;
    leftPressed = false;
    rightPressed = false;
    resetJoystick();

    if (score > bestScore) {
        bestScore = score;

        try {
            localStorage.setItem("nebulaBestScore", bestScore);
        } catch (error) {
            console.warn("Could not save best score.");
        }
    }

    updateHUD();

    overlayTitle.textContent = "GAME OVER";
    overlayText.textContent = "Final Score: " + score;
    startBtn.textContent = "PLAY AGAIN";

    pauseBtn.textContent = "PAUSE";
    overlay.style.display = "flex";
}

// ==========================================
// PAUSE / RESUME
// ==========================================

function togglePause() {
    if (!gameRunning) return;

    gamePaused = !gamePaused;

    if (gamePaused) {
        firePressed = false;
        leftPressed = false;
        rightPressed = false;
        resetJoystick();

        pauseBtn.textContent = "RESUME";

        overlayTitle.textContent = "GAME PAUSED";
        overlayText.textContent = "Take a break, pilot!";
        startBtn.textContent = "RESUME GAME";

        overlay.style.display = "flex";
    } else {
        pauseBtn.textContent = "PAUSE";
        overlay.style.display = "none";

        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

// ==========================================
// KEYBOARD CONTROLS
// ==========================================

window.addEventListener("keydown", function (event) {
    keys[event.key] = true;

    if (
        event.code === "Space" ||
        event.key.startsWith("Arrow")
    ) {
        event.preventDefault();
    }

    if (event.code === "Space") {
        shoot();
    }

    if (event.key === "Escape" && gameRunning) {
        togglePause();
    }
});

window.addEventListener("keyup", function (event) {
    keys[event.key] = false;
});

window.addEventListener("blur", function () {
    for (const key in keys) {
        keys[key] = false;
    }

    leftPressed = false;
    rightPressed = false;
    firePressed = false;
    resetJoystick();
});

// ==========================================
// BUTTON EVENTS
// ==========================================

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);

// ==========================================
// RESIZE EVENTS
// ==========================================

window.addEventListener("resize", resizeCanvas);

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", resizeCanvas);
}

// ==========================================
// INITIALIZE
// ==========================================

resizeCanvas();
setControlMode("joystick");
updateHUD();

overlay.style.display = "flex";
overlayTitle.textContent = "NEBULA: LAST STAND";
overlayText.textContent = "Defend the galaxy. Survive the battle!";
startBtn.textContent = "START GAME";

console.log("NEBULA: LAST STAND loaded successfully!");
