# 🎢 Roller Coaster Queue Simulation using Discrete Event Modeling

An interactive web-based simulation that demonstrates **Discrete Event Simulation (DES)** concepts through the operation of a single roller coaster ride in a theme park. Visitors arrive randomly, wait in a queue, board the ride when seats are available, experience the ride, and leave the park while the system continuously updates live statistics and animations.

The project combines **simulation**, **visualization**, and **user interaction** to make queueing systems easier to understand in an engaging way.

---

## 📖 Overview

This project models the operation of a single roller coaster using **Discrete Event Simulation (DES)**. Instead of updating continuously, the simulation advances whenever an event occurs, such as:

- Visitor arrival
- Visitor joining the queue
- Ride loading
- Ride departure
- Ride completion
- Visitor exit

Users can modify simulation parameters and instantly observe how changes affect waiting time, queue length, ride utilization, and overall efficiency.

---

## ✨ Features

### 🎢 Interactive Roller Coaster

- Animated roller coaster
- Boarding and departure animations
- Ride movement during operation
- Passenger loading visualization

### 👥 Visitor Simulation

- Random visitor arrivals
- Animated movement toward the queue
- Queue visualization
- Boarding passengers
- Visitors leaving after the ride

### 📊 Live Statistics Dashboard

Displays real-time simulation metrics including:

- Total Visitors
- Visitors in Queue
- Visitors Served
- Average Waiting Time
- Maximum Queue Length
- Ride Utilization
- Ride Status
- Number of Ride Cycles

### ⚙ Simulation Controls

Users can configure:

- Visitor arrival rate
- Ride capacity
- Ride duration
- Loading time
- Simulation speed

Controls include:

- ▶ Start
- ⏸ Pause
- 🔄 Reset

### 🎵 Audio & Effects

- Theme park background music
- Roller coaster sound effects
- Ride announcements
- Boarding notifications

### 🎨 Modern UI

- Responsive design
- Animated visitors
- Smooth transitions
- Real-time graphs
- Interactive controls

---

## 🧠 Discrete Event Simulation

The simulation is event-driven rather than time-driven.

Major events include:

1. Visitor Arrival
2. Queue Entry
3. Ride Loading
4. Ride Departure
5. Ride Completion
6. Visitor Exit

Each event updates the system state and schedules future events.

---

## ⚙ Simulation Workflow

```
Visitor Arrives
        │
        ▼
Join Queue
        │
        ▼
Wait for Available Seats
        │
        ▼
Board Roller Coaster
        │
        ▼
Ride Starts
        │
        ▼
Ride Ends
        │
        ▼
Visitors Leave
```

---

## 📈 Simulation Parameters

| Parameter | Description |
|-----------|-------------|
| Visitor Arrival Rate | Number of visitors entering the park |
| Ride Capacity | Number of seats on the coaster |
| Ride Duration | Time taken for one ride cycle |
| Loading Time | Time required for boarding passengers |
| Simulation Speed | Speed multiplier of the simulation |

---

## 📊 Performance Metrics

The simulation continuously calculates:

- Average Waiting Time
- Maximum Queue Length
- Queue Size
- Ride Utilization
- Total Visitors
- Visitors Served
- Ride Cycles
- Throughput

---

## 🛠 Technologies

### Frontend

- React 19
- Vite
- JavaScript (ES6+)
- HTML5
- CSS3

### Simulation

- Discrete Event Simulation (DES)
- Event Scheduling
- Queue Management
- State Management using React Hooks

### Visualization

- CSS Animations & Transitions
- SVG/Canvas (optional for coaster animations)
- Responsive Web Design

### Audio

- Web Audio API
- Procedural Audio Synthesis
- Oscillators & Gain Nodes
- Biquad Filters
- HTML5 Audio Context

---

## 📂 Project Structure

```text
roller-coaster-simulation/
│
├── public/
│   ├── images/
│   ├── sounds/
│   └── icons/
│
├── src/
│   │
│   ├── components/
│   │   ├── RollerCoaster/
│   │   ├── Queue/
│   │   ├── Visitor/
│   │   ├── Dashboard/
│   │   ├── Controls/
│   │   ├── Statistics/
│   │   └── Layout/
│   │
│   ├── hooks/
│   │   ├── useSimulation.js
│   │   ├── useTimer.js
│   │   └── useAudio.js
│   │
│   ├── simulation/
│   │   ├── eventQueue.js
│   │   ├── visitor.js
│   │   ├── coaster.js
│   │   ├── simulator.js
│   │   └── statistics.js
│   │
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
│
├── package.json
├── vite.config.js
├── README.md
└── .gitignore
```

### Folder Description

| Folder/File | Purpose |
|-------------|---------|
| **components/** | Reusable React components such as the roller coaster, queue, dashboard, controls, and visitor animations. |
| **hooks/** | Custom React hooks for managing simulation logic, timers, and audio effects. |
| **simulation/** | Core Discrete Event Simulation logic including event scheduling, queue management, coaster operation, and statistics calculation. |
| **App.jsx** | Main application component that combines all simulation components. |
| **App.css** | Styles specific to the main application layout. |
| **main.jsx** | Entry point of the React application. |
| **index.css** | Global styles and theme definitions. |
| **public/** | Static assets such as images, icons, and sound effects. |


## 🎮 How to Use

1. Open the simulation in your browser.
2. Configure the simulation parameters.
3. Click **Start Simulation**.
4. Watch visitors arrive and join the queue.
5. Observe the roller coaster loading passengers.
6. Monitor live statistics and graphs.
7. Pause or reset the simulation at any time.

---

## 🎯 Learning Outcomes

This project demonstrates:

- Discrete Event Simulation (DES)
- Queue Management
- Event Scheduling
- Resource Allocation
- Waiting Time Analysis
- Queue Performance Evaluation
- Interactive Data Visualization

---

## 🔮 Future Improvements

- Multiple roller coasters
- Fast-pass/VIP queue
- Visitor satisfaction analysis
- Ride breakdown events
- Weather effects
- Dynamic arrival patterns
- Daily performance reports
- Leaderboards and achievements
- Mobile support

---

## 📸 Preview

The simulation includes:

- 🎢 Animated roller coaster
- 👥 Moving visitors
- 🚶 Queue visualization
- 🎵 Sound effects
- 📢 Ride announcements
- 📊 Live statistics dashboard
- 📈 Real-time performance graphs
- ⚙ Interactive simulation controls

---