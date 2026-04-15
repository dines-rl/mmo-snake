import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GameEngine } from './engine.js';

const PORT = 5000;
const TICK_RATE = 150; // ms per game tick

const engine = new GameEngine();
let playerIdCounter = 0;

// Create Vite dev server as middleware
const vite = await createViteServer({
  root: '.',
  server: {
    port: PORT,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: {
      // HMR over the same server
    },
  },
  configFile: false,
});

const httpServer = vite.httpServer;

// Attach WebSocket server to the same HTTP server
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

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

  if (engine.tickCount % 5 === 0) {
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(lbMsg);
      }
    }
  }
}, TICK_RATE);

await vite.listen();
console.log(`MMO Snake running on http://0.0.0.0:${PORT}`);
