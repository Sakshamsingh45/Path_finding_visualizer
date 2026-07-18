# 🧭 Pathfinder — Grid Traversal Lab

An interactive pathfinding visualizer that runs **real Python algorithms directly in the browser** using **Pyodide (CPython compiled to WebAssembly)**. The project combines a modern JavaScript interface with Python implementations of classic graph traversal algorithms, allowing users to explore and compare their behavior without requiring any backend server.

The goal of this project was to keep the architecture as close as possible to a traditional Python application while making it completely client-side. Instead of rewriting the algorithms in JavaScript, the original Python code executes inside the browser, making the project an interesting demonstration of WebAssembly and Pyodide.

---
# 🎮 Demo

Live Demo:

```
https://Sakshamsingh45.github.io/Path_finding_visualizer/
```

---

## ✨ Features

- 🚀 **100% Static Website** — deploy anywhere (GitHub Pages, Netlify, Vercel, etc.)
- 🐍 **Real Python Algorithms** executed in-browser with **Pyodide**
- 🎯 Interactive grid with draggable start/end nodes
- 🧱 Draw and erase walls with click & drag
- ⚡ Adjustable animation speed
- 📊 Live diagnostics (visited nodes, path length, execution time)
- 🌐 No backend, database, or server required after hosting

---

# Algorithms Implemented

## Breadth-First Search (BFS)

Breadth-First Search explores nodes level by level using a queue. Since every move has equal cost on the grid, BFS always discovers the shortest possible path.

**Characteristics**

- Shortest path guaranteed
- Queue-based traversal
- Ideal for unweighted graphs

**Complexity**

- Time: **O(V + E)**
- Space: **O(V)**

---

## Depth-First Search (DFS)

Depth-First Search explores one branch completely before backtracking. Although it is efficient for traversal, it does not guarantee the shortest route.

**Characteristics**

- Uses a stack
- Deep exploration
- Fast traversal
- No shortest-path guarantee

**Complexity**

- Time: **O(V + E)**
- Space: **O(V)**

---

## Dijkstra's Algorithm

Dijkstra's algorithm expands nodes according to their minimum known distance from the source. It guarantees the optimal path and forms the basis for many shortest-path applications.

**Characteristics**

- Priority Queue (Min Heap)
- Guaranteed shortest path
- Suitable for weighted graphs

**Complexity**

- Time: **O((V + E) log V)**
- Space: **O(V)**

---

## A* Search

A* enhances Dijkstra's algorithm by introducing a heuristic function that estimates the remaining distance to the destination.

This implementation uses the Manhattan Distance heuristic:

```
f(n) = g(n) + h(n)
```

where

- **g(n)** = distance traveled from the start
- **h(n)** = Manhattan distance to the goal

Because of the heuristic, A* usually visits significantly fewer nodes than Dijkstra while still guaranteeing the shortest path.

**Complexity**

- Worst Case: **O((V + E) log V)**
- Usually much faster in practice

---

# Project Structure

```
Pathfinder/
│
├── index.html
├── style.css
├── script.js
├── algorithms.py
└── README.md
```

---

# Architecture

The application follows a simple client-side workflow.

```
User Interaction
        │
        ▼
 JavaScript Interface
        │
        ▼
 JSON Request
        │
        ▼
 Pyodide Runtime
        │
        ▼
 algorithms.py
        │
        ▼
 JSON Response
        │
        ▼
 Animation Engine
```

The browser loads the Pyodide runtime once, executes the Python code directly inside WebAssembly, and returns the computed traversal data back to JavaScript for animation.

---

# Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)
- Python
- Pyodide
- WebAssembly
- JSON

---

# User Interaction

The application supports an interactive workflow:

- Drag the green node to change the starting position.
- Drag the red node to change the destination.
- Click and drag on empty cells to create walls.
- Switch to erase mode to remove walls.
- Select any supported algorithm.
- Adjust animation speed.
- Generate random mazes.
- Run the traversal visualization.
- Compare algorithm performance using the diagnostics panel.

---

# What Makes This Project Different?

Most browser-based pathfinding visualizers either:

- implement every algorithm in JavaScript, or
- rely on a backend server to execute Python code.

This project takes a different approach.

The exact Python implementations run directly inside the browser using **Pyodide**, allowing the project to preserve Python code while remaining completely client-side.

This means there is:

- No backend server
- No API endpoints
- No Flask or Django
- No Node.js server
- No database

Only static files and an in-browser Python runtime.

---

# Learning Outcomes

This project provided practical experience with:

- Graph traversal algorithms
- Pathfinding heuristics
- Python and JavaScript interoperability
- WebAssembly
- Pyodide
- Browser runtime execution
- Interactive UI design
- Animation techniques
- JSON communication between Python and JavaScript

---


## Author

**Saksham Singh**

GitHub: https://github.com/sakshamsingh45

If you found this project interesting, consider leaving a ⭐ on the repository.
