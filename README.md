# Roller Coaster Queue Simulator

A discrete-event simulation (Poisson arrivals, priority queueing, boarding,
breakdowns, statistics) with a Python backend and a browser front end.

## Project layout

```
coaster_park/
  app.py              <- ALL simulation logic (Flask backend)
  requirements.txt
  templates/
    index.html        <- page structure only
  static/
    style.css          <- all visual styling
    script.js           <- polls the backend and renders state; no sim logic
```

## Run it

```bash
cd coaster_park
python -m venv venv          # optional but recommended
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open **http://127.0.0.1:5000** in your browser and press **Start**.

## Why it's split this way

- `app.py` owns the event queue, the exponential-interarrival Poisson
  process (`random.expovariate`), queueing/boarding/balking logic, breakdown
  and repair rolls, and every statistic (average wait, utilization, max
  queue, etc.). This is the part your viva panel will ask about.
- The backend runs the simulation clock in a background thread in real time
  and exposes it through three JSON endpoints:
  - `GET /api/state` — full snapshot of the simulation, polled ~8x/second
  - `POST /api/control` — `{"action": "start"|"pause"|"reset"|"close"}`
  - `POST /api/config` — partial updates, e.g. `{"speed": 5}`
- `index.html` / `style.css` / `script.js` never touch simulation state —
  they just draw whatever `/api/state` reports, move the coaster along the
  SVG track with `getPointAtLength()`, and play sound/voice cues.

## Talking points for your defense

- Interarrival times use `random.expovariate(rate)`, the standard-library
  implementation of exponential sampling, which is what makes the arrival
  process Poisson.
- The main loop in `Simulation.advance()` is a textbook **next-event time
  advance**: it jumps the clock straight to the next event's timestamp and
  processes events in order, rather than looping second-by-second.
- Balking (`_handle_arrival`) and breakdown/repair rolls are separate
  stochastic processes layered on top of the arrival process — a natural
  "future work" discussion point is running multiple independent
  replications and reporting confidence intervals on the average wait time.
