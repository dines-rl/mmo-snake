import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { GameEngine } from './engine.js';

const PORT = 5001;
const TICK_RATE = 150; // ms per game tick

const server = createServer();
const wss = new WebSocketServer({ server, path: '/ws' });
const engine = new GameEngine();

let playerIdCounter = 0;

wss.on('connection', (ws) => {
  const playerId = ++playerIdCounter;
  const hue = Math.floor(Math.random() * 360);

  engine.addPlayer(playerId, hue);
  ws.playerId = playerId;

  ws.send(JSON.stringify({
    type: 'welcome',
    id: playerId,
    config: {
      gridW: engine.gridW,
      gridH: engine.gridH,
      cellSize: engine.cellSize,
    },
  }));

  // Send current leaderboard
  ws.send(JSON.stringify({
    type: 'leaderboard',
    entries: engine.getLeaderboard(),
  }));

  console.log(`Player ${playerId} connected (${wss.clients.size} online)`);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'dir') {
        engine.setDirection(playerId, msg.dir);
      } else if (msg.type === 'name') {
        engine.setName(playerId, msg.name);
      } else if (msg.type === 'respawn') {
        engine.respawnPlayer(playerId);
      }
    } catch {}
  });

  ws.on('close', () => {
    engine.removePlayer(playerId);
    console.log(`Player ${playerId} disconnected (${wss.clients.size} online)`);
  });
});

// Game loop
setInterval(() => {
  engine.tick();
  const state = engine.getState();
  const leaderboard = engine.getLeaderboard();

  const stateMsg = JSON.stringify({ type: 'state', ...state });
  const lbMsg = JSON.stringify({ type: 'leaderboard', entries: leaderboard });

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(stateMsg);
    }
  }

  // Send leaderboard less frequently (every 5 ticks)
  if (engine.tickCount % 5 === 0) {
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(lbMsg);
      }
    }
  }
}, TICK_RATE);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Game server running on ws://0.0.0.0:${PORT}/ws`);
});
