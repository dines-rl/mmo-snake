const GRID_W = 80;
const GRID_H = 60;
const CELL_SIZE = 12;
const INITIAL_LENGTH = 4;
const MAX_FOOD = 40;

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export class GameEngine {
  constructor() {
    this.gridW = GRID_W;
    this.gridH = GRID_H;
    this.cellSize = CELL_SIZE;
    this.players = new Map();
    this.food = [];
    this.tickCount = 0;

    // Spawn initial food
    for (let i = 0; i < MAX_FOOD; i++) {
      this.spawnFood();
    }
  }

  addPlayer(id, hue) {
    const spawn = this.findSafeSpawn();
    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      segments.push({ x: spawn.x - i, y: spawn.y });
    }

    this.players.set(id, {
      id,
      name: `Snake ${id}`,
      hue,
      segments,
      dir: 'right',
      nextDir: 'right',
      score: 0,
      alive: true,
      kills: 0,
    });
  }

  removePlayer(id) {
    const player = this.players.get(id);
    if (player && player.alive) {
      // Drop food where the snake was
      for (const seg of player.segments) {
        if (this.food.length < MAX_FOOD * 2 && Math.random() < 0.5) {
          this.food.push({ x: seg.x, y: seg.y, value: 1, hue: player.hue });
        }
      }
    }
    this.players.delete(id);
  }

  respawnPlayer(id) {
    const player = this.players.get(id);
    if (!player || player.alive) return;

    const spawn = this.findSafeSpawn();
    const segments = [];
    for (let i = 0; i < INITIAL_LENGTH; i++) {
      segments.push({ x: spawn.x - i, y: spawn.y });
    }
    player.segments = segments;
    player.dir = 'right';
    player.nextDir = 'right';
    player.score = 0;
    player.alive = true;
  }

  setDirection(id, dir) {
    const player = this.players.get(id);
    if (!player || !player.alive) return;
    if (!DIRS[dir]) return;
    // Prevent 180-degree turns
    if (OPPOSITE[dir] === player.dir) return;
    player.nextDir = dir;
  }

  setName(id, name) {
    const player = this.players.get(id);
    if (!player) return;
    player.name = String(name).slice(0, 16) || `Snake ${id}`;
  }

  findSafeSpawn() {
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = Math.floor(Math.random() * (GRID_W - 20)) + 10;
      const y = Math.floor(Math.random() * (GRID_H - 10)) + 5;
      let safe = true;
      for (const [, p] of this.players) {
        if (!p.alive) continue;
        for (const seg of p.segments) {
          if (Math.abs(seg.x - x) < 6 && Math.abs(seg.y - y) < 6) {
            safe = false;
            break;
          }
        }
        if (!safe) break;
      }
      if (safe) return { x, y };
    }
    return { x: Math.floor(GRID_W / 2), y: Math.floor(GRID_H / 2) };
  }

  spawnFood() {
    const x = Math.floor(Math.random() * GRID_W);
    const y = Math.floor(Math.random() * GRID_H);
    // Random food types with different values
    const rand = Math.random();
    let value, hue;
    if (rand < 0.7) {
      value = 1; hue = 50; // yellow - normal
    } else if (rand < 0.9) {
      value = 3; hue = 120; // green - medium
    } else {
      value = 5; hue = 0; // red - high value
    }
    this.food.push({ x, y, value, hue });
  }

  tick() {
    this.tickCount++;

    // Move each alive player
    for (const [, player] of this.players) {
      if (!player.alive) continue;

      player.dir = player.nextDir;
      const d = DIRS[player.dir];
      const head = player.segments[0];
      const newHead = { x: head.x + d.x, y: head.y + d.y };

      // Wall collision - wrap around
      if (newHead.x < 0) newHead.x = GRID_W - 1;
      if (newHead.x >= GRID_W) newHead.x = 0;
      if (newHead.y < 0) newHead.y = GRID_H - 1;
      if (newHead.y >= GRID_H) newHead.y = 0;

      player.segments.unshift(newHead);

      // Check food collision
      let ate = false;
      for (let i = this.food.length - 1; i >= 0; i--) {
        if (this.food[i].x === newHead.x && this.food[i].y === newHead.y) {
          player.score += this.food[i].value;
          // Grow by value amount (keep extra segments)
          for (let g = 1; g < this.food[i].value; g++) {
            player.segments.push({ ...player.segments[player.segments.length - 1] });
          }
          this.food.splice(i, 1);
          ate = true;
          break;
        }
      }

      if (!ate) {
        player.segments.pop();
      }
    }

    // Check collisions between snakes
    const deaths = new Set();
    const alivePlayers = [...this.players.values()].filter(p => p.alive);

    for (const player of alivePlayers) {
      const head = player.segments[0];

      // Self collision (skip head)
      for (let i = 1; i < player.segments.length; i++) {
        if (player.segments[i].x === head.x && player.segments[i].y === head.y) {
          deaths.add(player.id);
          break;
        }
      }

      // Collision with other snakes
      for (const other of alivePlayers) {
        if (other.id === player.id) continue;
        for (const seg of other.segments) {
          if (seg.x === head.x && seg.y === head.y) {
            deaths.add(player.id);
            // Award kill to the other snake
            other.kills++;
            other.score += 5;
            break;
          }
        }
      }
    }

    // Process deaths
    for (const id of deaths) {
      const player = this.players.get(id);
      if (!player) continue;
      player.alive = false;

      // Drop food where the snake died
      for (const seg of player.segments) {
        if (this.food.length < MAX_FOOD * 3 && Math.random() < 0.6) {
          this.food.push({ x: seg.x, y: seg.y, value: 1, hue: player.hue });
        }
      }
    }

    // Replenish food
    while (this.food.length < MAX_FOOD) {
      this.spawnFood();
    }
  }

  getState() {
    const snakes = [];
    for (const [, p] of this.players) {
      snakes.push({
        id: p.id,
        name: p.name,
        hue: p.hue,
        segments: p.segments,
        score: p.score,
        alive: p.alive,
      });
    }
    return { snakes, food: this.food };
  }

  getLeaderboard() {
    return [...this.players.values()]
      .filter(p => p.alive)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(p => ({ name: p.name, score: p.score, kills: p.kills, hue: p.hue }));
  }
}
