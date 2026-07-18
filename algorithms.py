"""
algorithms.py
-------------
All four pathfinding algorithms live here. This file is loaded straight
into the browser and run by Pyodide (real CPython compiled to
WebAssembly) -- there is no server involved. script.js fetches this
file as text, hands it to Pyodide, and then calls the `solve()`
function at the bottom directly from JavaScript.

Each core algorithm function takes the grid dimensions, a set of wall
coordinates, a start node and an end node, and returns three things:

    visited_order -> list of (row, col) tuples in the order they were
                      explored (this is what the frontend animates first)
    path           -> list of (row, col) tuples from start to end, empty
                      if no path exists
    found          -> bool, True if the end node was reached

Every node is just a (row, col) tuple. Grids only allow up/down/left/right
movement (no diagonals), so every edge has the same weight of 1 -- that's
why Dijkstra ends up behaving like BFS here, but it's kept separate so the
heap-based mechanics (and the door to weighted grids later) are visible.
"""

from collections import deque
import heapq
import json


def get_neighbors(node, rows, cols, walls):
    """Return the walkable up/down/left/right neighbors of a node."""
    r, c = node
    candidates = [(r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)]
    return [
        (nr, nc)
        for nr, nc in candidates
        if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in walls
    ]


def reconstruct_path(came_from, start, end):
    """Walk backwards through came_from to rebuild the start -> end path."""
    if end != start and end not in came_from:
        return []

    path = [end]
    current = end
    while current != start:
        current = came_from[current]
        path.append(current)
    path.reverse()
    return path


def bfs(rows, cols, walls, start, end):
    """Breadth-first search. Explores level by level, so the first time
    it reaches `end` that path is guaranteed to be the shortest one
    (in terms of number of steps)."""
    visited_order = []
    visited = {start}
    came_from = {}
    queue = deque([start])

    while queue:
        current = queue.popleft()
        visited_order.append(current)

        if current == end:
            return visited_order, reconstruct_path(came_from, start, end), True

        for neighbor in get_neighbors(current, rows, cols, walls):
            if neighbor not in visited:
                visited.add(neighbor)
                came_from[neighbor] = current
                queue.append(neighbor)

    return visited_order, [], False


def dfs(rows, cols, walls, start, end):
    """Depth-first search using an explicit stack. This does NOT guarantee
    the shortest path -- it just commits to a direction and backtracks
    whenever it hits a dead end."""
    visited_order = []
    visited = {start}
    came_from = {}
    stack = [start]

    while stack:
        current = stack.pop()
        visited_order.append(current)

        if current == end:
            return visited_order, reconstruct_path(came_from, start, end), True

        for neighbor in get_neighbors(current, rows, cols, walls):
            if neighbor not in visited:
                visited.add(neighbor)
                came_from[neighbor] = current
                stack.append(neighbor)

    return visited_order, [], False


def dijkstra(rows, cols, walls, start, end):
    """Dijkstra's algorithm using a min-heap keyed on distance from start.
    On an unweighted grid this explores in the same order as BFS, but it's
    implemented independently since it's the algorithm that generalizes to
    weighted terrain (e.g. 'mud' tiles that cost more to cross)."""
    visited_order = []
    visited = set()
    came_from = {}
    dist = {start: 0}
    pq = [(0, start)]

    while pq:
        d, current = heapq.heappop(pq)

        if current in visited:
            continue
        visited.add(current)
        visited_order.append(current)

        if current == end:
            return visited_order, reconstruct_path(came_from, start, end), True

        for neighbor in get_neighbors(current, rows, cols, walls):
            new_dist = d + 1
            if neighbor not in dist or new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                came_from[neighbor] = current
                heapq.heappush(pq, (new_dist, neighbor))

    return visited_order, [], False


def manhattan_distance(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def a_star(rows, cols, walls, start, end):
    """A* search. Same bookkeeping as Dijkstra, but the priority queue is
    ordered by g(n) + h(n) instead of just g(n), where h(n) is the
    Manhattan distance to the goal. Since Manhattan distance never
    overestimates the real cost on a grid with 4-directional movement,
    this heuristic is admissible and the path found is still optimal --
    it just gets there having explored far fewer nodes than Dijkstra."""
    visited_order = []
    visited = set()
    came_from = {}
    g_score = {start: 0}
    open_set = [(manhattan_distance(start, end), start)]

    while open_set:
        _, current = heapq.heappop(open_set)

        if current in visited:
            continue
        visited.add(current)
        visited_order.append(current)

        if current == end:
            return visited_order, reconstruct_path(came_from, start, end), True

        for neighbor in get_neighbors(current, rows, cols, walls):
            tentative_g = g_score[current] + 1
            if neighbor not in g_score or tentative_g < g_score[neighbor]:
                g_score[neighbor] = tentative_g
                f_score = tentative_g + manhattan_distance(neighbor, end)
                came_from[neighbor] = current
                heapq.heappush(open_set, (f_score, neighbor))

    return visited_order, [], False


ALGORITHMS = {
    "bfs": bfs,
    "dfs": dfs,
    "dijkstra": dijkstra,
    "astar": a_star,
}

MAX_GRID_CELLS = 10000  # e.g. 100x100, a generous safety cap


def solve(payload_json):
    """Single entry point called from JavaScript via Pyodide.

    Takes a JSON string (built by script.js from the current grid state)
    and returns a JSON string -- this keeps the JS <-> Python boundary
    to plain strings, which Pyodide passes back and forth with no
    special conversion code needed on either side.

    Expected input shape:
        {
          "rows": int, "cols": int,
          "start": [r, c], "end": [r, c],
          "walls": [[r, c], ...],
          "algorithm": "bfs" | "dfs" | "dijkstra" | "astar"
        }
    """
    data = json.loads(payload_json)

    try:
        rows = int(data["rows"])
        cols = int(data["cols"])
        start = tuple(data["start"])
        end = tuple(data["end"])
        walls = {tuple(w) for w in data.get("walls", [])}
        algorithm = data.get("algorithm", "bfs")
    except (KeyError, TypeError, ValueError):
        return json.dumps({"error": "Malformed request"})

    if rows <= 0 or cols <= 0 or rows * cols > MAX_GRID_CELLS:
        return json.dumps({"error": "Grid dimensions out of range"})

    if algorithm not in ALGORITHMS:
        return json.dumps({"error": f"Unknown algorithm '{algorithm}'"})

    def in_bounds(node):
        r, c = node
        return 0 <= r < rows and 0 <= c < cols

    if not in_bounds(start) or not in_bounds(end):
        return json.dumps({"error": "Start or end node is out of bounds"})

    if start in walls or end in walls:
        return json.dumps({"error": "Start or end node cannot be a wall"})

    solve_fn = ALGORITHMS[algorithm]
    visited_order, path, found = solve_fn(rows, cols, walls, start, end)

    return json.dumps(
        {
            "visited": visited_order,
            "path": path,
            "found": found,
            "nodesVisited": len(visited_order),
            "pathLength": len(path),
        }
    )
