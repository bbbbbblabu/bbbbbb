const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const livesEl = document.querySelector("#lives");
const timeEl = document.querySelector("#time");
const overlay = document.querySelector("#overlay");
const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const restartBtn = document.querySelector("#restartBtn");

const coffeeImage = new Image();
const coffeeImageSources = ["cat-head-cutout.png", "assets/cat-head-cutout.png"];
let coffeeImageSourceIndex = 0;
coffeeImage.src = coffeeImageSources[coffeeImageSourceIndex];

coffeeImage.addEventListener("error", () => {
  coffeeImageSourceIndex += 1;
  if (coffeeImageSourceIndex < coffeeImageSources.length) {
    coffeeImage.src = coffeeImageSources[coffeeImageSourceIndex];
  }
});

const state = {
  running: false,
  paused: false,
  score: 0,
  combo: 0,
  maxCombo: 0,
  lives: 3,
  timeLeft: 45,
  lastTime: 0,
  spawnTimer: 0,
  basketX: canvas.width / 2,
  objects: [],
  particles: [],
};

const basket = {
  width: 142,
  height: 48,
  y: canvas.height - 78,
  targetX: canvas.width / 2,
};

const keys = new Set();

function resetGame() {
  state.running = false;
  state.paused = false;
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.lives = 3;
  state.timeLeft = 45;
  state.spawnTimer = 0;
  state.objects = [];
  state.particles = [];
  state.basketX = canvas.width / 2;
  basket.targetX = canvas.width / 2;
  state.lastTime = performance.now();
  updateHud();
  draw();
}

function startGame() {
  resetGame();
  state.running = true;
  overlay.classList.add("hidden");
  pauseBtn.disabled = false;
  pauseBtn.textContent = "暂停";
  state.lastTime = performance.now();
  requestAnimationFrame(loop);
}

function finishGame(message) {
  state.running = false;
  pauseBtn.disabled = true;
  overlay.classList.remove("hidden");
  overlay.querySelector("h1").textContent = message;
  overlay.querySelector("p").textContent = `最终得分 ${state.score}，最高连击 ${state.maxCombo}。`;
  startBtn.textContent = "再玩一次";
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? "继续" : "暂停";
  if (!state.paused) {
    state.lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function updateHud() {
  scoreEl.textContent = state.score;
  comboEl.textContent = state.combo;
  livesEl.textContent = state.lives;
  timeEl.textContent = Math.ceil(state.timeLeft);
}

function spawnObject() {
  const isBad = Math.random() < 0.22;
  const size = isBad ? 44 : 58 + Math.random() * 24;
  state.objects.push({
    x: size + Math.random() * (canvas.width - size * 2),
    y: -size,
    size,
    vy: 150 + Math.random() * 130 + Math.max(0, 45 - state.timeLeft) * 3,
    spin: (Math.random() - 0.5) * 3,
    angle: Math.random() * Math.PI,
    bad: isBad,
  });
}

function addParticles(x, y, color, shape = "dot") {
  for (let i = 0; i < 12; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 180,
      vy: -60 - Math.random() * 120,
      life: 0.5 + Math.random() * 0.35,
      color,
      shape,
      size: 13 + Math.random() * 7,
    });
  }
}

function update(dt) {
  if (keys.has("arrowleft") || keys.has("a")) basket.targetX -= 480 * dt;
  if (keys.has("arrowright") || keys.has("d")) basket.targetX += 480 * dt;
  basket.targetX = clamp(basket.targetX, basket.width / 2, canvas.width - basket.width / 2);
  state.basketX += (basket.targetX - state.basketX) * Math.min(1, dt * 12);

  state.timeLeft -= dt;
  state.spawnTimer -= dt;
  const spawnEvery = Math.max(0.34, 0.88 - (45 - state.timeLeft) * 0.012);
  if (state.spawnTimer <= 0) {
    spawnObject();
    state.spawnTimer = spawnEvery;
  }

  const catchTop = basket.y - 12;
  const catchLeft = state.basketX - basket.width / 2;
  const catchRight = state.basketX + basket.width / 2;

  for (const obj of state.objects) {
    obj.y += obj.vy * dt;
    obj.angle += obj.spin * dt;
    const hitBasket =
      obj.y + obj.size * 0.45 > catchTop &&
      obj.y < basket.y + basket.height &&
      obj.x > catchLeft &&
      obj.x < catchRight;

    if (hitBasket) {
      obj.caught = true;
      if (obj.bad) {
        state.lives -= 1;
        state.combo = 0;
        addParticles(obj.x, catchTop, "#3b3027");
      } else {
        state.combo += 1;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.score += 10 + Math.min(50, state.combo * 2);
        addParticles(obj.x, catchTop, "#d44d2e", "heart");
      }
    } else if (obj.y - obj.size > canvas.height) {
      obj.missed = true;
      if (!obj.bad) {
        state.lives -= 1;
        state.combo = 0;
      }
    }
  }

  state.objects = state.objects.filter((obj) => !obj.caught && !obj.missed);

  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 260 * dt;
    particle.life -= dt;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);

  if (state.lives <= 0) finishGame("咖啡洒了！");
  if (state.timeLeft <= 0) finishGame("时间到！");
  updateHud();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#fff8ec");
  sky.addColorStop(0.55, "#eef8f6");
  sky.addColorStop(1, "#ffe6d9");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(36, 124, 122, 0.12)";
  for (let i = 0; i < 9; i += 1) {
    const x = (i * 123 + performance.now() * 0.015) % (canvas.width + 80) - 40;
    ctx.beginPath();
    ctx.arc(x, 96 + (i % 3) * 62, 22 + (i % 4) * 9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(109, 73, 50, 0.08)";
  ctx.fillRect(0, canvas.height - 38, canvas.width, 38);
}

function drawCoffee(obj) {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  ctx.rotate(obj.angle);
  ctx.shadowColor = "rgba(35, 33, 29, 0.22)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 8;
  const drawSize = obj.size * 1.75;
  if (coffeeImage.complete && coffeeImage.naturalWidth) {
    ctx.drawImage(coffeeImage, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
  } else {
    ctx.fillStyle = "#d44d2e";
    ctx.fillRect(-obj.size / 2, -obj.size / 2, obj.size, obj.size);
  }
  ctx.restore();
}

function drawBad(obj) {
  ctx.save();
  ctx.translate(obj.x, obj.y);
  ctx.rotate(obj.angle);
  ctx.fillStyle = "#2a2520";
  ctx.beginPath();
  ctx.arc(0, 0, obj.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f0c94a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-obj.size * 0.22, -obj.size * 0.22);
  ctx.lineTo(obj.size * 0.22, obj.size * 0.22);
  ctx.moveTo(obj.size * 0.22, -obj.size * 0.22);
  ctx.lineTo(-obj.size * 0.22, obj.size * 0.22);
  ctx.stroke();
  ctx.restore();
}

function drawBasket() {
  const x = state.basketX - basket.width / 2;
  const y = basket.y;

  ctx.fillStyle = "#6d4932";
  roundRect(ctx, x, y, basket.width, basket.height, 18);
  ctx.fill();

  ctx.fillStyle = "#fff7e8";
  roundRect(ctx, x + 12, y + 8, basket.width - 24, 18, 9);
  ctx.fill();

  ctx.strokeStyle = "#6d4932";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x + basket.width + 7, y + 24, 20, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
}

function draw() {
  drawBackground();
  for (const obj of state.objects) {
    if (obj.bad) drawBad(obj);
    else drawCoffee(obj);
  }

  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    if (particle.shape === "heart") {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate((particle.vx / 180) * 0.35);
      ctx.font = `${particle.size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("❤️", 0, 0);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawBasket();
}

function loop(now) {
  if (!state.running || state.paused) return;
  const dt = Math.min(0.033, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(dt);
  draw();
  if (state.running) requestAnimationFrame(loop);
}

function setPointerTarget(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  basket.targetX = clamp(x, basket.width / 2, canvas.width - basket.width / 2);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", togglePause);
canvas.addEventListener("pointermove", setPointerTarget);
canvas.addEventListener("pointerdown", setPointerTarget);

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.code === "Space") togglePause();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

coffeeImage.addEventListener("load", draw);
resetGame();
