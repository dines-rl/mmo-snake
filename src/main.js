import { Renderer } from './renderer.js';
import { Input } from './input.js';

const canvas = document.getElementById('game-canvas');
const minimapCanvas = document.getElementById('minimap');
const overlay = document.getElementById('overlay');
const deathScreen = document.getElementById('death-screen');
const deathScore = document.getElementById('death-score');
const nameInput = document.getElementById('name-input');
const playBtn = document.getElementById('play-btn');
const respawnBtn = document.getElementById('respawn-btn');
const scoreDisplay = document.getElementById('score-display');
const playerCount = document.getElementById('player-count');
const lbList = document.getElementById('lb-list');

let ws = null;
let myId = null;
let config = null;
let gameState = { snakes: [], food: [] };
let leaderboard = [];
let playing = false;
let renderer = null;
let input = null;
let camera = { x: 0, y: 0 };

function connect() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${protocol}://${location.host}/ws`);

  ws.onopen = () => {
    console.log('Connected to game server');
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case 'welcome':
        myId = msg.id;
        config = msg.config;
        renderer = new Renderer(canvas, minimapCanvas, config);
        input = new Input((dir) => {
          if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'dir', dir }));
          }
        });
        resize();
        break;

      case 'state':
        gameState = msg;
        updateHUD();
        break;

      case 'leaderboard':
        leaderboard = msg.entries;
        updateLeaderboard();
        break;
    }
  };

  ws.onclose = () => {
    console.log('Disconnected. Reconnecting...');
    myId = null;
    setTimeout(connect, 1000);
  };
}

function startGame() {
  const name = nameInput.value.trim() || `Snake`;
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'name', name }));
  }
  overlay.classList.add('hidden');
  playing = true;
}

function respawn() {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'respawn' }));
    ws.send(JSON.stringify({ type: 'name', name: nameInput.value.trim() || 'Snake' }));
  }
  deathScreen.classList.add('hidden');
  playing = true;
}

playBtn.addEventListener('click', startGame);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') startGame();
});
respawnBtn.addEventListener('click', respawn);

function updateHUD() {
  const me = gameState.snakes.find(s => s.id === myId);
  if (me) {
    scoreDisplay.textContent = `Score: ${me.score}`;

    if (!me.alive && playing) {
      playing = false;
      deathScore.textContent = `Final score: ${me.score}`;
      deathScreen.classList.remove('hidden');
    }
  }

  const aliveCount = gameState.snakes.filter(s => s.alive).length;
  playerCount.textContent = `Players: ${aliveCount}`;
}

function updateLeaderboard() {
  lbList.innerHTML = '';
  for (const entry of leaderboard) {
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.className = 'lb-name';
    nameSpan.textContent = entry.name;
    nameSpan.style.color = `hsl(${entry.hue}, 80%, 70%)`;

    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'lb-score';
    scoreSpan.textContent = entry.score;

    li.appendChild(nameSpan);
    li.appendChild(scoreSpan);
    lbList.appendChild(li);
  }
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);

// Game render loop
function gameLoop() {
  if (renderer && config) {
    // Camera follows our snake
    const me = gameState.snakes.find(s => s.id === myId);
    if (me && me.segments.length > 0) {
      const head = me.segments[0];
      const targetX = head.x * config.cellSize - canvas.width / 2;
      const targetY = head.y * config.cellSize - canvas.height / 2;
      // Smooth camera
      camera.x += (targetX - camera.x) * 0.15;
      camera.y += (targetY - camera.y) * 0.15;
    }

    renderer.draw(gameState, camera, myId);
  }

  requestAnimationFrame(gameLoop);
}

connect();
requestAnimationFrame(gameLoop);
