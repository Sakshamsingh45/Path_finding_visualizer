/* ---------------------------------------------------------------
   script.js
   The grid UI lives entirely here. The actual pathfinding logic is
   real Python (algorithms.py), executed in-browser by Pyodide --
   CPython compiled to WebAssembly. There's no server: this file
   fetches algorithms.py as plain text, hands it to a Pyodide
   runtime, and then calls the Python `solve()` function directly
   from JavaScript whenever the user hits "run traversal".
------------------------------------------------------------------ */

const ROWS = 20;
const COLS = 36;

const START_NODE = { row: 6, col: 6 };
const END_NODE = { row: 13, col: 29 };

const state = {
  start: { ...START_NODE },
  end: { ...END_NODE },
  walls: new Set(),          // "row,col" strings
  algorithm: 'bfs',
  tool: 'wall',
  isMouseDown: false,
  draggingNode: null,        // 'start' | 'end' | null
  isRunning: false,
};

const gridEl = document.getElementById('grid');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const visualizeBtn = document.getElementById('visualizeBtn');

const key = (row, col) => `${row},${col}`;

// ---------------------------------------------------------------
// Build the grid as a plain 2D array of <div> nodes
// ---------------------------------------------------------------
function buildGrid() {
  gridEl.style.gridTemplateColumns = `repeat(${COLS}, 24px)`;
  gridEl.style.gridTemplateRows = `repeat(${ROWS}, 24px)`;
  gridEl.innerHTML = '';

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const node = document.createElement('div');
      node.classList.add('node');
      node.dataset.row = r;
      node.dataset.col = c;
      gridEl.appendChild(node);
    }
  }
  paintStartEnd();
}

function nodeAt(row, col) {
  return gridEl.children[row * COLS + col];
}

function paintStartEnd() {
  document.querySelectorAll('.node.start, .node.end').forEach((n) => {
    n.classList.remove('start', 'end');
  });
  nodeAt(state.start.row, state.start.col).classList.add('start');
  nodeAt(state.end.row, state.end.col).classList.add('end');
}

function isStartOrEnd(row, col) {
  return (
    (row === state.start.row && col === state.start.col) ||
    (row === state.end.row && col === state.end.col)
  );
}

// ---------------------------------------------------------------
// Mouse interaction: draw/erase walls, drag start & end nodes
// ---------------------------------------------------------------
function handleMouseDown(e) {
  if (state.isRunning) return;
  const target = e.target.closest('.node');
  if (!target) return;

  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);

  if (target.classList.contains('start')) {
    state.draggingNode = 'start';
    return;
  }
  if (target.classList.contains('end')) {
    state.draggingNode = 'end';
    return;
  }

  state.isMouseDown = true;
  applyTool(row, col);
}

function handleMouseEnter(e) {
  if (!state.isMouseDown && !state.draggingNode) return;
  const target = e.target.closest('.node');
  if (!target) return;

  const row = Number(target.dataset.row);
  const col = Number(target.dataset.col);

  if (state.draggingNode) {
    if (isStartOrEnd(row, col) || state.walls.has(key(row, col))) return;
    state[state.draggingNode] = { row, col };
    paintStartEnd();
    return;
  }

  if (state.isMouseDown) applyTool(row, col);
}

function handleMouseUp() {
  state.isMouseDown = false;
  state.draggingNode = null;
}

function applyTool(row, col) {
  if (isStartOrEnd(row, col)) return;
  const k = key(row, col);
  const el = nodeAt(row, col);

  if (state.tool === 'wall') {
    state.walls.add(k);
    el.classList.add('wall');
  } else {
    state.walls.delete(k);
    el.classList.remove('wall');
  }
}

gridEl.addEventListener('mousedown', handleMouseDown);
gridEl.addEventListener('mouseover', handleMouseEnter);
document.addEventListener('mouseup', handleMouseUp);
gridEl.addEventListener('dragstart', (e) => e.preventDefault());

// ---------------------------------------------------------------
// Sidebar controls
// ---------------------------------------------------------------
document.querySelectorAll('.algo-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.algo-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    state.algorithm = tab.dataset.algo;
    document.getElementById('readoutAlgo').textContent = state.algorithm;
  });
});

document.querySelectorAll('.tool-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.tool = btn.dataset.tool;
  });
});

document.getElementById('clearWallsBtn').addEventListener('click', () => {
  if (state.isRunning) return;
  state.walls.clear();
  document.querySelectorAll('.node.wall').forEach((n) => n.classList.remove('wall'));
});

document.getElementById('clearBoardBtn').addEventListener('click', () => {
  if (state.isRunning) return;
  state.walls.clear();
  state.start = { ...START_NODE };
  state.end = { ...END_NODE };
  buildGrid();
  clearAnimationClasses();
  resetReadout();
});

document.getElementById('mazeBtn').addEventListener('click', () => {
  if (state.isRunning) return;
  generateRandomMaze();
});

function generateRandomMaze() {
  state.walls.clear();
  document.querySelectorAll('.node.wall').forEach((n) => n.classList.remove('wall'));
  clearAnimationClasses();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (isStartOrEnd(r, c)) continue;
      if (Math.random() < 0.28) {
        state.walls.add(key(r, c));
        nodeAt(r, c).classList.add('wall');
      }
    }
  }
}

// ---------------------------------------------------------------
// Talking to the backend + animating the response
// ---------------------------------------------------------------
function clearAnimationClasses() {
  document.querySelectorAll('.node.visited, .node.path').forEach((n) => {
    n.classList.remove('visited', 'path');
  });
}

function resetReadout() {
  document.getElementById('readoutVisited').textContent = '—';
  document.getElementById('readoutPath').textContent = '—';
  document.getElementById('readoutFound').textContent = '—';
  document.getElementById('readoutTime').textContent = '—';
}

function setStatus(mode, label) {
  statusDot.classList.remove('running', 'done');
  if (mode) statusDot.classList.add(mode);
  statusText.textContent = label;
}

// ---------------------------------------------------------------
// Pyodide: load CPython (WebAssembly) once, then load algorithms.py
// into it. `pySolve` ends up as a callable JS wrapper around the
// Python `solve()` function.
// ---------------------------------------------------------------
let pySolve = null;

async function initPyodide() {
  setStatus('running', 'loading python runtime…');
  try {
    const pyodide = await loadPyodide();
    const source = await (await fetch('algorithms.py')).text();
    pyodide.runPython(source);
    pySolve = pyodide.globals.get('solve');

    setStatus(null, 'idle — ready');
    visualizeBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setStatus(null, 'failed to load python runtime');
  }
}

// speed slider (1-4) -> ms delay per animated node, inverted so higher = faster
function currentDelay() {
  const speed = Number(document.getElementById('speedSlider').value);
  const table = { 1: 40, 2: 22, 3: 10, 4: 3 };
  return table[speed] ?? 20;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function animatePath(visited, path, endReached) {
  const delay = currentDelay();

  for (const [r, c] of visited) {
    if (isStartOrEnd(r, c)) continue;
    nodeAt(r, c).classList.add('visited');
    await sleep(delay);
  }

  if (endReached) {
    const pathDelay = Math.max(delay * 2, 20);
    for (const [r, c] of path) {
      if (isStartOrEnd(r, c)) continue;
      nodeAt(r, c).classList.add('path');
      await sleep(pathDelay);
    }
  }
}

async function runVisualization() {
  if (state.isRunning || !pySolve) return;
  state.isRunning = true;
  visualizeBtn.disabled = true;
  clearAnimationClasses();
  resetReadout();
  setStatus('running', 'searching…');

  const payload = {
    rows: ROWS,
    cols: COLS,
    start: [state.start.row, state.start.col],
    end: [state.end.row, state.end.col],
    walls: Array.from(state.walls).map((k) => k.split(',').map(Number)),
    algorithm: state.algorithm,
  };

  const startedAt = performance.now();

  try {
    // This is a real call into CPython running in the browser --
    // pySolve is the Python `solve()` function, called directly.
    const resultJson = pySolve(JSON.stringify(payload));
    const data = JSON.parse(resultJson);

    if (data.error) throw new Error(data.error);

    const elapsedMs = Math.round(performance.now() - startedAt);

    await animatePath(data.visited, data.path, data.found);

    document.getElementById('readoutVisited').textContent = data.nodesVisited;
    document.getElementById('readoutPath').textContent = data.found ? data.pathLength : 'n/a';
    document.getElementById('readoutFound').textContent = data.found ? 'yes' : 'no';
    document.getElementById('readoutTime').textContent = `${elapsedMs} ms`;

    setStatus('done', data.found ? 'path found' : 'no path');
  } catch (err) {
    setStatus(null, 'error running python');
    console.error(err);
  } finally {
    state.isRunning = false;
    visualizeBtn.disabled = false;
  }
}

visualizeBtn.addEventListener('click', runVisualization);

// ---------------------------------------------------------------
// Boot
// ---------------------------------------------------------------
buildGrid();
document.getElementById('readoutAlgo').textContent = state.algorithm;
initPyodide();
