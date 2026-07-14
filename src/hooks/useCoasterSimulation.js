import { useState, useEffect, useRef, useCallback } from 'react';
import { soundManager } from '../simulation/audio';

// Visual paths coordinates
// Serpentine queue path (from park entrance at 950,550 to gate at 260,450)
export const QUEUE_PATH = [
  { x: 260, y: 450 }, // Gate/Boarding point
  { x: 420, y: 450 }, // Turn 1
  { x: 420, y: 485 }, // Go down
  { x: 740, y: 485 }, // Turn 2
  { x: 740, y: 520 }, // Go down further
  { x: 920, y: 520 }, // Near entrance
  { x: 920, y: 550 }, // Park entrance gate
];

// VIP Queue path (shorter, high priority lane, from 920,550 to prioritised boarding point at 250,430)
export const VIP_QUEUE_PATH = [
  { x: 250, y: 420 }, // Priority gate
  { x: 380, y: 420 }, // Turn
  { x: 380, y: 400 },
  { x: 780, y: 400 },
  { x: 800, y: 550 }, // VIP entrance
];

// Exit path (from coaster station exit at 180,450 to exit gate at 50,550)
export const EXIT_PATH = [
  { x: 180, y: 450 },
  { x: 180, y: 520 },
  { x: 50,  y: 520 },
  { x: 50,  y: 560 }
];

// Helper to interpolate position along a multi-segment path at a given distance from start
export function getPositionOnPath(path, distance) {
  if (path.length === 0) return { x: 0, y: 0 };
  if (distance <= 0) return { x: path[0].x, y: path[0].y };
  
  let accumulatedDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    
    if (accumulatedDistance + segmentLength >= distance) {
      const ratio = (distance - accumulatedDistance) / segmentLength;
      return {
        x: p1.x + dx * ratio,
        y: p1.y + dy * ratio,
      };
    }
    accumulatedDistance += segmentLength;
  }
  
  const lastPoint = path[path.length - 1];
  return { x: lastPoint.x, y: lastPoint.y };
}

// Helper to calculate total length of a path
export function getPathLength(path) {
  let length = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    length += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }
  return length;
}

export function useCoasterSimulation() {
  // Settings state
  const [settings, setSettings] = useState({
    arrivalRate: 25,     // visitors per minute
    ticketPrice: 15,     // $ per ticket
    capacity: 12,        // coaster capacity
    speedMultiplier: 1,  // simulation speed
    rideDuration: 12,    // target duration in seconds
  });

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Simulation run state
  const [isPaused, setIsPaused] = useState(false);
  const [weather, setWeather] = useState('sunny'); // 'sunny' | 'rainy'
  const [isBrokenDown, setIsBrokenDown] = useState(false);
  const [maintenanceProgress, setMaintenanceProgress] = useState(0);

  // Discrete state variables
  const [simTime, setSimTime] = useState(0);
  const [regularQueue, setRegularQueue] = useState([]);
  const [vipQueue, setVipQueue] = useState([]);
  const [exitedVisitors, setExitedVisitors] = useState([]);
  const [announcements, setAnnouncements] = useState([
    { id: 'init-1', text: '🎢 Welcome to the Theme Park! Simulation loaded.', type: 'info', time: '00:00' },
    { id: 'init-2', text: '📢 Click START to begin theme park operations.', type: 'info', time: '00:00' }
  ]);

  // Coaster Train state
  const [train, setTrain] = useState({
    state: 'empty', // 'empty' | 'loading' | 'full' | 'climbing' | 'riding' | 'braking' | 'unloading'
    progress: 0,    // 0.0 to 1.0 along the track path
    passengers: [], // currently riding visitors
    speed: 0,
    tripsCompleted: 0
  });

  // Mechanic state
  const [mechanic, setMechanic] = useState({
    x: 100,
    y: 520,
    state: 'idle', // 'idle' | 'walking' | 'repairing'
    targetX: 100,
    targetY: 520
  });

  // Stats dashboard state
  const [stats, setStats] = useState({
    totalArrivals: 0,
    totalServed: 0,
    totalWaitTime: 0,
    maxWaitTime: 0,
    totalRevenue: 0,
    avgWaitTime: 0,
    satisfaction: 100,
    breakdownsCount: 0,
    history: []
  });

  // Use refs to hold mutable variables to avoid closure issues in requestAnimationFrame
  const simTimeRef = useRef(0);
  const regularQueueRef = useRef([]);
  const vipQueueRef = useRef([]);
  const exitedVisitorsRef = useRef([]);
  const trainRef = useRef({ state: 'empty', progress: 0, passengers: [], speed: 0, tripsCompleted: 0 });
  const mechanicRef = useRef({ x: 100, y: 520, state: 'idle', targetX: 100, targetY: 520 });
  const statsRef = useRef({ totalArrivals: 0, totalServed: 0, totalWaitTime: 0, maxWaitTime: 0, totalRevenue: 0, avgWaitTime: 0, satisfaction: 100, breakdownsCount: 0, history: [] });
  const isBrokenDownRef = useRef(false);
  const weatherRef = useRef('sunny');
  const isPausedRef = useRef(true); // Start paused so Web Audio is triggered on user action
  const boardTimerRef = useRef(0);
  const historyTimerRef = useRef(0);
  const arrivalAccumulatorRef = useRef(0);

  // Sync refs
  useEffect(() => { isBrokenDownRef.current = isBrokenDown; }, [isBrokenDown]);
  useEffect(() => { weatherRef.current = weather; }, [weather]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // Audio helper
  const addAnnouncement = useCallback((text, type = 'info') => {
    const min = Math.floor(simTimeRef.current / 60).toString().padStart(2, '0');
    const sec = Math.floor(simTimeRef.current % 60).toString().padStart(2, '0');
    const timeStr = `${min}:${sec}`;
    
    setAnnouncements(prev => [
      { id: Math.random().toString(), text, type, time: timeStr },
      ...prev.slice(0, 49) // Keep last 50
    ]);
    
    // Play sound on special events
    if (type === 'alert') soundManager.playBuzzer();
    if (type === 'success') soundManager.playDingDong();
  }, []);

  // Event handlers
  const startSimulation = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    soundManager.init();
    soundManager.resumeContext();
    addAnnouncement("🎡 Theme park gates are open! Simulation started.", "info");
  };

  const pauseSimulation = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    soundManager.stopLiftChainClack();
    soundManager.playWhooshStop();
    addAnnouncement("⏸️ Operations paused.", "info");
  };

  const triggerBreakdown = () => {
    if (isBrokenDownRef.current) return;
    setIsBrokenDown(true);
    isBrokenDownRef.current = true;
    setMaintenanceProgress(0);
    
    setStats(prev => {
      const next = { ...prev, breakdownsCount: prev.breakdownsCount + 1 };
      statsRef.current = next;
      return next;
    });

    addAnnouncement("⚠️ WARNING: Roller Coaster mechanical breakdown detected! Ride halted.", "alert");
    
    // Mechanic AI: head to repair
    const coasterPos = getCoasterStationCoords(trainRef.current.progress);
    setMechanic(prev => {
      const next = {
        ...prev,
        state: 'walking',
        targetX: coasterPos.x,
        targetY: coasterPos.y + 15
      };
      mechanicRef.current = next;
      return next;
    });
  };

  const repairCoaster = () => {
    if (!isBrokenDownRef.current) return;
    setMaintenanceProgress(100);
    setIsBrokenDown(false);
    isBrokenDownRef.current = false;
    addAnnouncement("🛠️ Quick maintenance patch complete! Coaster operational.", "success");
    
    setMechanic(prev => {
      const next = {
        ...prev,
        state: 'walking',
        targetX: 100,
        targetY: 520
      };
      mechanicRef.current = next;
      return next;
    });
  };

  const triggerVipRush = () => {
    soundManager.playDingDong();
    const count = 3 + Math.floor(Math.random() * 3);
    const newVips = [];
    for (let i = 0; i < count; i++) {
      newVips.push({
        id: `vip-${Math.random().toString(36).substr(2, 5)}`,
        arrivalTime: simTimeRef.current,
        patience: 120 + Math.random() * 60, // VIPs have more patience
        vip: true,
        satisfaction: 100,
        color: '#FFD700', // Golden
        style: {
          height: 14 + Math.random() * 4,
          hair: Math.floor(Math.random() * 5),
          accessory: 'glasses'
        },
        status: 'walking_in',
        x: 800,
        y: 550
      });
    }

    setVipQueue(prev => {
      const next = [...prev, ...newVips];
      vipQueueRef.current = next;
      return next;
    });

    setStats(prev => {
      const next = { ...prev, totalArrivals: prev.totalArrivals + count };
      statsRef.current = next;
      return next;
    });

    addAnnouncement(`🌟 VIP ALERT: A group of ${count} VIPs has entered the priority lane!`, "success");
  };

  const toggleWeather = () => {
    const nextWeather = weatherRef.current === 'sunny' ? 'rainy' : 'sunny';
    setWeather(nextWeather);
    weatherRef.current = nextWeather;
    
    if (nextWeather === 'rainy') {
      addAnnouncement("🌧️ Weather forecast: It has started raining. Arrival rates are reduced.", "info");
    } else {
      addAnnouncement("☀️ Weather forecast: Sky cleared up! Attendance rising.", "success");
    }
  };

  // Helper to approximate coaster visual position based on its track progress
  // Since the track layout is rendered in SVG, we match coordinates along the layout roughly
  const getCoasterStationCoords = (progress) => {
    // Station zone is at around x = 160-260, y = 450
    // Returns estimated coordinates for mechanic targeting
    if (progress < 0.1 || progress > 0.9) {
      return { x: 200, y: 440 };
    }
    // Mid drop loop coords
    if (progress < 0.4) {
      return { x: 450, y: 200 };
    }
    if (progress < 0.6) {
      return { x: 620, y: 350 };
    }
    return { x: 800, y: 430 };
  };

  // Core Simulation Tick Loop
  useEffect(() => {
    let lastTime = performance.now();
    let animationFrameId = null;

    const tick = (now) => {
      if (isPausedRef.current) {
        lastTime = now;
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const dt = (now - lastTime) / 1000; // time delta in seconds
      lastTime = now;

      // Advance simulation clock based on speed multiplier
      const speed = settingsRef.current.speedMultiplier;
      const simDt = dt * speed;
      simTimeRef.current += simDt;
      setSimTime(simTimeRef.current);

      // --- 1. VISITOR ARRIVAL SYSTEM ---
      // Arrival rate from sliders: visitors per minute
      let currentArrivalRate = settingsRef.current.arrivalRate;
      if (weatherRef.current === 'rainy') {
        currentArrivalRate *= 0.5; // reduce arrivals by 50% in rain
      }
      
      arrivalAccumulatorRef.current += (currentArrivalRate / 60) * simDt;
      if (arrivalAccumulatorRef.current >= 1) {
        const arrivalCount = Math.floor(arrivalAccumulatorRef.current);
        arrivalAccumulatorRef.current -= arrivalCount;
        
        const newArrivals = [];
        const isVipChance = 0.08; // 8% chance of VIP guest

        for (let i = 0; i < arrivalCount; i++) {
          const isVip = Math.random() < isVipChance;
          const id = `guest-${Math.random().toString(36).substr(2, 5)}`;
          const patience = 50 + Math.random() * 80; // patience in seconds
          const colors = isVip ? ['#FFD700'] : ['#a78bfa', '#60a5fa', '#34d399', '#f87171', '#fb7185', '#f59e0b'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          
          newArrivals.push({
            id,
            arrivalTime: simTimeRef.current,
            patience,
            vip: isVip,
            satisfaction: 100,
            color: randomColor,
            style: {
              height: 13 + Math.random() * 5,
              hair: Math.floor(Math.random() * 5),
              accessory: Math.random() < 0.25 ? 'hat' : 'none'
            },
            status: 'walking_in',
            x: isVip ? 800 : 920,
            y: 550
          });
        }

        // Distribute to queues
        let addedRegular = 0;
        let addedVips = 0;

        newArrivals.forEach(guest => {
          if (guest.vip) {
            vipQueueRef.current.push(guest);
            addedVips++;
          } else {
            regularQueueRef.current.push(guest);
            addedRegular++;
          }
        });

        // Update counts
        setStats(prev => {
          const next = { ...prev, totalArrivals: prev.totalArrivals + newArrivals.length };
          statsRef.current = next;
          return next;
        });

        if (addedRegular > 0) setRegularQueue([...regularQueueRef.current]);
        if (addedVips > 0) {
          setVipQueue([...vipQueueRef.current]);
          addAnnouncement(`⭐ VIP Guest arrived in fast line!`, 'info');
        }
      }

      // --- 2. UPDATE VISITOR POSITIONS & PATIENCE ---
      // Winding Regular Queue coordinates layout spacing
      const regularLen = regularQueueRef.current.length;
      const regularPathLen = getPathLength(QUEUE_PATH);
      const regularQueueUpdate = regularQueueRef.current.map((guest, idx) => {
        // Space guests by 16px along the queue path
        const targetDistance = regularPathLen - (idx * 16);
        const targetPos = getPositionOnPath(QUEUE_PATH, Math.max(0, targetDistance));
        
        // Linear interpolate position for smoothness
        const dx = targetPos.x - guest.x;
        const dy = targetPos.y - guest.y;
        const distanceToTarget = Math.sqrt(dx*dx + dy*dy);
        
        let nextX = guest.x;
        let nextY = guest.y;
        
        if (distanceToTarget > 2) {
          const stepSize = 80 * simDt; // speed of walking in queue
          const angle = Math.atan2(dy, dx);
          nextX += Math.cos(angle) * Math.min(stepSize, distanceToTarget);
          nextY += Math.sin(angle) * Math.min(stepSize, distanceToTarget);
        }

        // Calculate patience satisfaction decay
        const waitTime = simTimeRef.current - guest.arrivalTime;
        const patienceDecaySpeed = isBrokenDownRef.current ? 3.0 : 1.0; // breakdown = 3x frustration
        const waitRatio = (waitTime / guest.patience) * patienceDecaySpeed;
        const satisfaction = Math.max(10, Math.round(100 - waitRatio * 90));

        return {
          ...guest,
          x: nextX,
          y: nextY,
          status: distanceToTarget > 15 ? 'walking_in' : 'waiting',
          satisfaction
        };
      });

      regularQueueRef.current = regularQueueUpdate;
      setRegularQueue(regularQueueUpdate);

      // VIP Queue positions spacing
      const vipLen = vipQueueRef.current.length;
      const vipPathLen = getPathLength(VIP_QUEUE_PATH);
      const vipQueueUpdate = vipQueueRef.current.map((guest, idx) => {
        const targetDistance = vipPathLen - (idx * 16);
        const targetPos = getPositionOnPath(VIP_QUEUE_PATH, Math.max(0, targetDistance));
        
        const dx = targetPos.x - guest.x;
        const dy = targetPos.y - guest.y;
        const distanceToTarget = Math.sqrt(dx*dx + dy*dy);
        
        let nextX = guest.x;
        let nextY = guest.y;
        
        if (distanceToTarget > 2) {
          const stepSize = 90 * simDt;
          const angle = Math.atan2(dy, dx);
          nextX += Math.cos(angle) * Math.min(stepSize, distanceToTarget);
          nextY += Math.sin(angle) * Math.min(stepSize, distanceToTarget);
        }

        const waitTime = simTimeRef.current - guest.arrivalTime;
        const patienceDecaySpeed = isBrokenDownRef.current ? 3.0 : 1.0;
        const waitRatio = (waitTime / guest.patience) * patienceDecaySpeed;
        const satisfaction = Math.max(15, Math.round(100 - waitRatio * 85));

        return {
          ...guest,
          x: nextX,
          y: nextY,
          status: distanceToTarget > 15 ? 'walking_in' : 'waiting',
          satisfaction
        };
      });

      vipQueueRef.current = vipQueueUpdate;
      setVipQueue(vipQueueUpdate);

      // --- 3. EXITED VISITORS WALKING AWAY ---
      const exitedUpdate = exitedVisitorsRef.current.map(guest => {
        const targetPos = EXIT_PATH[EXIT_PATH.length - 1];
        const dx = targetPos.x - guest.x;
        const dy = targetPos.y - guest.y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance <= 5) {
          return null; // remove guest
        }
        
        // Walk along exit path
        // We find the current segment of EXIT_PATH
        const stepSize = 100 * simDt;
        const exitPathLen = getPathLength(EXIT_PATH);
        // Exited guests just walk towards exit nodes sequentially
        let nextX = guest.x;
        let nextY = guest.y;
        
        // Find next target node
        let currentTarget = EXIT_PATH[1]; // Exit turn
        if (Math.abs(guest.x - EXIT_PATH[0].x) < 5 && Math.abs(guest.y - EXIT_PATH[0].y) < 20) {
          currentTarget = EXIT_PATH[1];
        }
        if (Math.abs(guest.x - EXIT_PATH[1].x) < 5 && Math.abs(guest.y - EXIT_PATH[1].y) < 5) {
          currentTarget = EXIT_PATH[2];
        }
        if (Math.abs(guest.x - EXIT_PATH[2].x) < 5 && Math.abs(guest.y - EXIT_PATH[2].y) < 5) {
          currentTarget = EXIT_PATH[3];
        }
        
        const gDx = currentTarget.x - guest.x;
        const gDy = currentTarget.y - guest.y;
        const gDist = Math.sqrt(gDx*gDx + gDy*gDy);
        const gAngle = Math.atan2(gDy, gDx);
        
        nextX += Math.cos(gAngle) * Math.min(stepSize, gDist);
        nextY += Math.sin(gAngle) * Math.min(stepSize, gDist);
        
        return {
          ...guest,
          x: nextX,
          y: nextY
        };
      }).filter(Boolean);
      
      exitedVisitorsRef.current = exitedUpdate;
      setExitedVisitors(exitedUpdate);

      // --- 4. MECHANIC REPAIR MECHANICS ---
      const mech = mechanicRef.current;
      if (isBrokenDownRef.current) {
        if (mech.state === 'walking') {
          const dx = mech.targetX - mech.x;
          const dy = mech.targetY - mech.y;
          const distance = Math.sqrt(dx*dx + dy*dy);
          
          if (distance <= 8) {
            // Arrived! Start repairing
            const nextMech = { ...mech, x: mech.targetX, y: mech.targetY, state: 'repairing' };
            mechanicRef.current = nextMech;
            setMechanic(nextMech);
            addAnnouncement("🔧 Mechanic has arrived at the train. Commencing repair works.", "info");
          } else {
            // Move towards breakdown
            const step = 90 * simDt;
            const angle = Math.atan2(dy, dx);
            const nextMech = {
              ...mech,
              x: mech.x + Math.cos(angle) * step,
              y: mech.y + Math.sin(angle) * step
            };
            mechanicRef.current = nextMech;
            setMechanic(nextMech);
          }
        } else if (mech.state === 'repairing') {
          // Increase progress
          setMaintenanceProgress(prev => {
            const next = Math.min(100, prev + 15 * simDt);
            if (Math.floor(prev / 15) !== Math.floor(next / 15)) {
              soundManager.playClang(); // clang hammer hits sound
            }
            
            if (next >= 100) {
              // Repair finished
              setIsBrokenDown(false);
              isBrokenDownRef.current = false;
              addAnnouncement("✅ Roller Coaster has been successfully repaired! Resuming operations.", "success");
              
              // Return mechanic to shed
              const returningMech = {
                ...mech,
                state: 'walking',
                targetX: 100,
                targetY: 520
              };
              mechanicRef.current = returningMech;
              setMechanic(returningMech);
            }
            return next;
          });
        }
      } else {
        // Not broken down: if mechanic is walking back, let them continue
        if (mech.state === 'walking') {
          const dx = mech.targetX - mech.x;
          const dy = mech.targetY - mech.y;
          const distance = Math.sqrt(dx*dx + dy*dy);
          
          if (distance <= 5) {
            const idleMech = { ...mech, x: mech.targetX, y: mech.targetY, state: 'idle' };
            mechanicRef.current = idleMech;
            setMechanic(idleMech);
          } else {
            const step = 60 * simDt;
            const angle = Math.atan2(dy, dx);
            const nextMech = {
              ...mech,
              x: mech.x + Math.cos(angle) * step,
              y: mech.y + Math.sin(angle) * step
            };
            mechanicRef.current = nextMech;
            setMechanic(nextMech);
          }
        }
      }

      // --- 5. ROLLER COASTER TRAIN DISCRETE EVENT LOOP ---
      const train = trainRef.current;
      const capacity = settingsRef.current.capacity;
      
      // If broken down, freeze progress
      if (isBrokenDownRef.current) {
        // Coaster is stuck mid-track. Do nothing.
        // Satisfaction decays (handled above)
      } else {
        if (train.state === 'empty') {
          // Check if anyone to load, open gates
          if (regularQueueRef.current.length > 0 || vipQueueRef.current.length > 0) {
            train.state = 'loading';
            soundManager.playGateSound();
            addAnnouncement("🚪 Gates open. Coaster loading passengers...", "info");
          }
        } else if (train.state === 'loading') {
          // Boarding tick timer (load one passenger every 0.25s of simulation time)
          boardTimerRef.current += simDt;
          
          if (boardTimerRef.current >= 0.25) {
            boardTimerRef.current = 0;
            
            const currentPassCount = train.passengers.length;
            const hasVIP = vipQueueRef.current.length > 0;
            const hasRegular = regularQueueRef.current.length > 0;
            
            if (currentPassCount < capacity && (hasVIP || hasRegular)) {
              // Priority given to VIP queue
              let passenger = null;
              if (hasVIP) {
                passenger = vipQueueRef.current[0];
                vipQueueRef.current = vipQueueRef.current.slice(1);
                setVipQueue([...vipQueueRef.current]);
              } else {
                passenger = regularQueueRef.current[0];
                regularQueueRef.current = regularQueueRef.current.slice(1);
                setRegularQueue([...regularQueueRef.current]);
              }
              
              // Move passenger into seats
              passenger.status = 'boarding';
              train.passengers.push(passenger);
              
              // Quick boarding sound pitch sweep
              soundManager.playGateSound();
            }
            
            // Launch conditions: Coaster full OR queue empty and coaster has passengers
            const isFull = train.passengers.length >= capacity;
            const isQueueEmpty = vipQueueRef.current.length === 0 && regularQueueRef.current.length === 0;
            
            if (isFull || (isQueueEmpty && train.passengers.length > 0 && boardTimerRef.current === 0)) {
              train.state = 'full';
              addAnnouncement(`🔒 Harnesses locked! Coaster is departing with ${train.passengers.length} riders.`, 'info');
              soundManager.playGateSound();
              
              // Small delay to trigger launch
              setTimeout(() => {
                if (!isBrokenDownRef.current && !isPausedRef.current) {
                  trainRef.current.state = 'climbing';
                  soundManager.playDingDong();
                  soundManager.startLiftChainClack();
                }
              }, 600);
            }
          }
        } else if (train.state === 'climbing') {
          // Coaster climbs slowly: lift progress from 0.0 to 0.26
          const climbRate = (0.26 - 0.0) / (settingsRef.current.rideDuration * 0.35); // takes 35% of ride duration
          train.progress += climbRate * simDt;
          train.speed = 12; // slow constant visual speed
          
          if (train.progress >= 0.26) {
            // Apex reached! Transition to riding drop!
            train.progress = 0.26;
            train.state = 'riding';
            soundManager.stopLiftChainClack();
            soundManager.playWhooshStart();
            soundManager.playScream(); // Screams at top of drop
            addAnnouncement("🎢 Coaster crests the hill! Speeding down!", 'info');
          }
        } else if (train.state === 'riding') {
          // Riding progress from 0.26 to 0.85
          // We apply physics curves to vary visual speed along track positions
          const p = train.progress;
          let trackSpeedFactor = 1.0;
          
          if (p < 0.40) {
            // First drop (0.26 to 0.40) - massive acceleration
            const progressRatio = (p - 0.26) / 0.14; // 0 to 1
            trackSpeedFactor = 1.0 + progressRatio * 4.0; // speed climbs from 1x to 5x
            
            if (Math.abs(p - 0.33) < 0.01) {
              soundManager.playScream();
            }
          } else if (p < 0.55) {
            // The loop-the-loop (0.40 to 0.55)
            // slows down slightly at apex of loop, speeds back up
            const loopAngle = ((p - 0.40) / 0.15) * Math.PI * 2;
            trackSpeedFactor = 3.0 - Math.sin(loopAngle) * 1.5; // range 1.5 to 4.5
            
            if (Math.abs(p - 0.48) < 0.01) {
              soundManager.playCheer();
            }
          } else if (p < 0.70) {
            // Camelback hills (0.55 to 0.70)
            const hillRatio = (p - 0.55) / 0.15;
            trackSpeedFactor = 2.5 + Math.cos(hillRatio * Math.PI * 2) * 1.2;
            
            if (Math.abs(p - 0.65) < 0.01) {
              soundManager.playCheer();
            }
          } else {
            // Helix / curves
            trackSpeedFactor = 2.0;
          }

          // In rainy weather, rain adds slipperiness, slightly faster drops but 20% slower climbs
          if (weatherRef.current === 'rainy') {
            trackSpeedFactor *= 1.08;
          }

          // Advance progress
          const rideRate = (0.85 - 0.26) / (settingsRef.current.rideDuration * 0.50); // takes 50% of duration
          const actualDtStep = rideRate * simDt * (trackSpeedFactor / 2.5);
          train.progress += actualDtStep;
          train.speed = Math.round(trackSpeedFactor * 16);
          
          // Sound update
          soundManager.updateWhooshIntensity(trackSpeedFactor / 5.0);

          if (train.progress >= 0.85) {
            train.progress = 0.85;
            train.state = 'braking';
            soundManager.playWhooshStop();
            addAnnouncement("⚠️ Coaster hits the magnetic brake run. Decelerating.", 'info');
          }
        } else if (train.state === 'braking') {
          // Brakes slow coaster from 0.85 to 0.95
          const brakeRate = (0.95 - 0.85) / (settingsRef.current.rideDuration * 0.10); // takes 10%
          train.progress += brakeRate * simDt;
          
          const rem = (0.95 - train.progress) / 0.10; // 1 down to 0
          train.speed = Math.max(2, Math.round(rem * 25));
          
          if (train.progress >= 0.95) {
            train.progress = 0.95;
            train.state = 'unloading';
            soundManager.playGateSound();
            addAnnouncement("🚪 Coaster parked in station. Unloading passengers.", 'info');
          }
        } else if (train.state === 'unloading') {
          // Passengers exit to Exit Path
          const passengersToUnload = train.passengers.map(guest => ({
            ...guest,
            status: 'exiting',
            x: EXIT_PATH[0].x + (Math.random() * 15 - 7.5),
            y: EXIT_PATH[0].y + (Math.random() * 10 - 5)
          }));

          // Queue exited guests
          setExitedVisitors(prev => {
            const next = [...prev, ...passengersToUnload];
            exitedVisitorsRef.current = next;
            return next;
          });

          // Tally analytics stats
          let totalWaitThisBatch = 0;
          let batchSatisfactionSum = 0;
          let batchMaxWait = 0;
          const ticketPrice = settingsRef.current.ticketPrice;
          
          train.passengers.forEach(guest => {
            const waitTime = simTimeRef.current - guest.arrivalTime;
            totalWaitThisBatch += waitTime;
            batchSatisfactionSum += guest.satisfaction;
            batchMaxWait = Math.max(batchMaxWait, waitTime);
          });
          
          const batchSize = train.passengers.length;
          const batchRevenue = batchSize * ticketPrice;

          setStats(prev => {
            const nextServed = prev.totalServed + batchSize;
            const nextWait = prev.totalWaitTime + totalWaitThisBatch;
            const nextMax = Math.max(prev.maxWaitTime, batchMaxWait);
            const nextRev = prev.totalRevenue + batchRevenue;
            
            // Rolling satisfaction average
            const avgSat = Math.round(
              prev.totalServed === 0 
                ? (batchSatisfactionSum / batchSize) 
                : (prev.satisfaction * 0.7 + (batchSatisfactionSum / batchSize) * 0.3)
            );

            const next = {
              ...prev,
              totalServed: nextServed,
              totalWaitTime: nextWait,
              maxWaitTime: nextMax,
              totalRevenue: nextRev,
              avgWaitTime: Math.round(nextWait / nextServed),
              satisfaction: Math.max(10, Math.min(100, avgSat))
            };
            statsRef.current = next;
            return next;
          });

          train.passengers = [];
          train.progress = 0;
          train.tripsCompleted += 1;
          
          train.state = 'empty';
          soundManager.playCheer(); // crowd cheers when trip finishes!
        }
      }

      trainRef.current = { ...train };
      setTrain({ ...train });

      // --- 6. HISTORY LOGGER FOR TELEMETRY GRAPHS ---
      // Records dashboard details every 5 simulation seconds
      historyTimerRef.current += simDt;
      if (historyTimerRef.current >= 6) {
        historyTimerRef.current = 0;
        
        const graphData = {
          time: Math.round(simTimeRef.current),
          queueLength: regularQueueRef.current.length + vipQueueRef.current.length,
          avgWaitTime: statsRef.current.avgWaitTime,
          satisfaction: statsRef.current.satisfaction
        };

        setStats(prev => {
          const nextHistory = [...prev.history, graphData].slice(-20); // Keep last 20 ticks
          const next = { ...prev, history: nextHistory };
          statsRef.current = next;
          return next;
        });

        // Small random breakdown check (0.8% chance every 6s if running, not broken)
        if (!isBrokenDownRef.current && trainRef.current.state !== 'empty' && trainRef.current.state !== 'loading' && Math.random() < 0.008) {
          triggerBreakdown();
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return {
    simTime,
    regularQueue,
    vipQueue,
    exitedVisitors,
    train,
    mechanic,
    isPaused,
    weather,
    isBrokenDown,
    maintenanceProgress,
    announcements,
    stats,
    settings,
    startSimulation,
    pauseSimulation,
    triggerBreakdown,
    repairCoaster,
    triggerVipRush,
    toggleWeather,
    setSettings: (updater) => {
      setSettings(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        settingsRef.current = next;
        return next;
      });
    },
    addAnnouncement
  };
}
