# Pathfinder — Grid Traversal Lab (static, no server)

An interactive pathfinding visualizer that's just **4 static files** —
`index.html`, `style.css`, `script.js`, `algorithms.py` — with no backend to
run or deploy. The BFS / DFS / Dijkstra / A* implementations are real Python,
but they execute *inside the visitor's browser* via
[Pyodide](https://pyodide.org) (CPython compiled to WebAssembly). You can
drag this folder onto any static host and it works immediately.

## How it fits together

- `algorithms.py` — the four search algorithms, plus a `solve()` function
  at the bottom that takes a JSON string and returns a JSON string. This is
  the same file a "real" backend would run; it just never touches a server.
- `script.js` — builds the grid, handles wall drawing and dragging the
  start/end nodes, and on page load calls `loadPyodide()` from the Pyodide
  CDN script, fetches `algorithms.py` as plain text, and runs it inside that
  Python runtime. When you click **run traversal**, it calls the Python
  `solve()` function directly (`pySolve(JSON.stringify(payload))`) and
  animates the JSON it gets back.
- `index.html` / `style.css` — the page and the dark control-room theme.

The first page load takes a few seconds longer than a normal static page,
since the browser has to download the Python runtime (~10 MB, cached by the
browser after that). The status indicator in the top bar shows "loading
python runtime…" during that window and the **run traversal** button stays
disabled until it's ready.

## Running it locally

Because `script.js` fetches `algorithms.py` with `fetch()`, opening
`index.html` directly via `file://` won't work (browsers block that kind of
local fetch). Serve the folder over plain HTTP instead — any static server
works, for example:

```bash
cd pathfinder-website
python3 -m http.server 8000
```

Then open **http://localhost:8000**.

## Publishing it online

Since there's no backend, any static host works. A few options:

**GitHub Pages**
1. Push this folder to a GitHub repo.
2. Repo Settings → Pages → set the source branch/folder.
3. Your site is live at `https://<username>.github.io/<repo>`.

**Netlify**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag the `pathfinder-website` folder onto the page.
3. It deploys instantly with a live URL.

**Vercel**
```bash
npm i -g vercel
cd pathfinder-website
vercel
```

No build step, no environment variables, no server process to keep alive —
it's the same 4 files everywhere.

## Algorithms

| Algorithm | Guarantees shortest path? | Notes |
|---|---|---|
| BFS | Yes | Level-order traversal via a queue, O(V+E) |
| DFS | No | Explicit stack, dives deep before backtracking |
| Dijkstra | Yes | Min-heap keyed on distance from start |
| A* | Yes | Min-heap keyed on `g(n) + h(n)`, Manhattan-distance heuristic |

## Using it

- **Drag** the green (start) or red (end) node to reposition it.
- **Click and drag** on empty tiles to draw walls; switch to `erase` to
  remove them.
- Pick an algorithm, adjust speed, hit **run traversal**.
- **generate maze** scatters random walls; **clear walls** / **reset board**
  reset the grid.
- The diagnostics panel reports nodes visited, path length, and how long the
  in-browser Python call took — useful for comparing how many fewer nodes
  A* touches versus Dijkstra on the same board.
