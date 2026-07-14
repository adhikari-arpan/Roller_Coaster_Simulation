import { useRef, useState, useEffect } from 'react';
import { getPositionOnPath, getPathLength, QUEUE_PATH, VIP_QUEUE_PATH } from '../hooks/useCoasterSimulation';

// Track SVG path definition
export const TRACK_PATH_D = `
  M 180,450 
  L 260,450 
  L 380,200 
  C 410,150 440,150 470,200 
  L 530,380 
  C 550,440 580,450 610,450 
  C 640,450 670,450 690,410 
  C 715,360 690,290 655,290 
  C 620,290 600,360 625,410 
  C 645,450 685,450 730,450 
  C 770,450 790,320 830,320 
  C 870,320 890,450 930,450 
  C 960,450 975,400 955,370 
  C 935,340 910,375 890,425 
  L 870,450 
  L 180,450
`.replace(/\s+/g, ' ').trim();

// Custom SVG avatar drawing for guest representation
const GuestAvatar = ({ guest }) => {
  const { color, vip, style, satisfaction } = guest;
  const isAngry = satisfaction < 40;
  const isSad = satisfaction >= 40 && satisfaction < 70;
  const isVipGlow = vip;

  // Draw face details based on satisfaction level
  let eyes = (
    <>
      <circle cx="-3" cy="-3" r="1" fill="#fff" />
      <circle cx="3" cy="-3" r="1" fill="#fff" />
      <circle cx="-3" cy="-3" r="0.5" fill="#000" />
      <circle cx="3" cy="-3" r="0.5" fill="#000" />
    </>
  );

  let mouth = <path d="M -3 3 Q 0 6 3 3" stroke="#fff" strokeWidth="1" fill="none" />; // smile
  let cheekGlow = null;

  if (isAngry) {
    eyes = (
      <>
        {/* Angled eyebrows */}
        <line x1="-5" y1="-5" x2="-1" y2="-3" stroke="#000" strokeWidth="1" />
        <line x1="5" y1="-5" x2="1" y2="-3" stroke="#000" strokeWidth="1" />
        <circle cx="-3" cy="-2" r="0.8" fill="#000" />
        <circle cx="3" cy="-2" r="0.8" fill="#000" />
      </>
    );
    mouth = <path d="M -3 4 Q 0 1 3 4" stroke="#ff3b30" strokeWidth="1.2" fill="none" />; // frown
  } else if (isSad) {
    mouth = <line x1="-3" y1="3" x2="3" y2="3" stroke="#e5e7eb" strokeWidth="1" />; // neutral
  } else {
    // Happy
    cheekGlow = (
      <>
        <circle cx="-4.5" cy="1.5" r="1.2" fill="#f43f5e" opacity="0.4" />
        <circle cx="4.5" cy="1.5" r="1.2" fill="#f43f5e" opacity="0.4" />
      </>
    );
  }

  // Draw custom hair styles
  let hairStyle = null;
  const hairColor = style.hair === 0 ? '#1f2937' : style.hair === 1 ? '#d97706' : style.hair === 2 ? '#b45309' : style.hair === 3 ? '#e11d48' : '#3b82f6';
  if (style.hair === 0) {
    // Spiky
    hairStyle = <path d="M -8 -6 L -5 -11 L -2 -7 L 1 -11 L 4 -7 L 7 -10 L 8 -5 Z" fill={hairColor} />;
  } else if (style.hair === 1) {
    // Bob/Cap
    hairStyle = <path d="M -8 -3 C -8 -11 8 -11 8 -3 C 8 -3 6 -5 0 -5 C -6 -5 -8 -3 -8 -3 Z" fill={hairColor} />;
  } else if (style.hair === 2) {
    // Curly/ Afro-ish
    hairStyle = (
      <g fill={hairColor}>
        <circle cx="-5" cy="-7" r="3.5" />
        <circle cx="0" cy="-9" r="4" />
        <circle cx="5" cy="-7" r="3.5" />
      </g>
    );
  } else {
    // Top-knot/bun
    hairStyle = (
      <g fill={hairColor}>
        <path d="M -7 -4 C -7 -9 7 -9 7 -4 Z" />
        <circle cx="0" cy="-10" r="3" />
      </g>
    );
  }

  return (
    <g className="guest-avatar" style={{ filter: isVipGlow ? 'drop-shadow(0 0 4px #eab308)' : 'none' }}>
      {/* Shadow */}
      <ellipse cx="0" cy="9" rx="6" ry="2" fill="rgba(0,0,0,0.25)" />

      {/* Body capsule */}
      <path
        d={`M -6 4 C -6 0 6 0 6 4 L 5 9 L -5 9 Z`}
        fill={color}
        stroke={isVipGlow ? '#eab308' : 'rgba(255,255,255,0.1)'}
        strokeWidth={isVipGlow ? 1.5 : 0.5}
      />

      {/* Head */}
      <circle
        cx="0"
        cy="-1"
        r="6.5"
        fill={isAngry ? '#fecaca' : '#ffedd5'}
        stroke={isAngry ? '#ef4444' : 'none'}
        strokeWidth={isAngry ? 0.8 : 0}
      />

      {hairStyle}
      {eyes}
      {cheekGlow}
      {mouth}

      {/* VIP crown */}
      {vip && (
        <path d="M -4 -11 L -2 -8 L 0 -12 L 2 -8 L 4 -11 L 3 -7 L -3 -7 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="0.5" />
      )}

      {/* Hat accessory */}
      {style.accessory === 'hat' && !vip && (
        <path d="M -8 -6 L 8 -6 L 5 -9 L -5 -9 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.5" />
      )}
    </g>
  );
};

export default function CoasterTrack({
  train,
  regularQueue,
  vipQueue,
  exitedVisitors,
  mechanic,
  isBrokenDown,
  maintenanceProgress,
  weather,
  stats
}) {
  const pathRef = useRef(null);
  const [pathLength, setPathLength] = useState(0);
  const [carPositions, setCarPositions] = useState([]);
  const [standingSpots, setStandingSpots] = useState([]);
  const [vipStandingSpots, setVipStandingSpots] = useState([]);

  // Track parameters
  const carCount = 4;
  const carSpacing = 28; // spacing in pixels between cars

  useEffect(() => {
    if (pathLength === 0) return;

    // Pre-calculate standing spots along regular queue
    const spots = [];
    const count = Math.floor(pathLength / 16);
    for (let i = 0; i < count - 1; i++) {
      const dist = pathLength - (i * 16);
      if (dist > 15) {
        spots.push(getPositionOnPath(QUEUE_PATH, dist));
      }
    }
    setStandingSpots(spots);

    // Pre-calculate VIP spots
    const vipLen = getPathLength(VIP_QUEUE_PATH);
    const vSpots = [];
    const vCount = Math.floor(vipLen / 16);
    for (let i = 0; i < vCount - 1; i++) {
      const dist = vipLen - (i * 16);
      if (dist > 15) {
        vSpots.push(getPositionOnPath(VIP_QUEUE_PATH, dist));
      }
    }
    setVipStandingSpots(vSpots);
  }, [pathLength]);

  // Measure SVG path length
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, []);

  // Recalculate train carriage positions along track path whenever progress changes
  useEffect(() => {
    if (pathLength === 0 || !pathRef.current) return;

    const positions = [];
    // The current progress maps to a length along the path
    const headLength = train.progress * pathLength;

    for (let i = 0; i < carCount; i++) {
      // Find length of this carriage (shifted back)
      let currentLen = headLength - (i * carSpacing);

      // Wrap around as the coaster is a continuous loop
      if (currentLen < 0) {
        currentLen = pathLength + currentLen;
      }

      // Get point coordinate (x, y)
      const point = pathRef.current.getPointAtLength(currentLen);

      // Measure direction vector to rotate car
      const deltaLen = 1.5;
      let nextLen = currentLen + deltaLen;
      if (nextLen > pathLength) nextLen -= pathLength;

      const pointAhead = pathRef.current.getPointAtLength(nextLen);
      const angle = Math.atan2(pointAhead.y - point.y, pointAhead.x - point.x) * (180 / Math.PI);

      positions.push({ x: point.x, y: point.y, angle });
    }

    setCarPositions(positions);
  }, [train.progress, pathLength]);

  // Rain particles rendering
  const [rainDrops, setRainDrops] = useState([]);
  useEffect(() => {
    if (weather === 'rainy') {
      const interval = setInterval(() => {
        setRainDrops(prev => {
          const newRain = Array.from({ length: 8 }).map(() => ({
            id: Math.random(),
            x: Math.random() * 1000,
            y: -10,
            len: 12 + Math.random() * 12,
            speed: 15 + Math.random() * 10
          }));
          return [...prev.slice(-60), ...newRain]; // Keep max 60 particles
        });
      }, 50);
      return () => clearInterval(interval);
    } else {
      setRainDrops([]);
    }
  }, [weather]);

  // Particle update logic
  useEffect(() => {
    if (rainDrops.length === 0) return;
    const animation = requestAnimationFrame(() => {
      setRainDrops(prev =>
        prev.map(drop => ({
          ...drop,
          x: drop.x - 1.5, // slight diagonal wind
          y: drop.y + drop.speed
        })).filter(drop => drop.y < 600)
      );
    });
    return () => cancelAnimationFrame(animation);
  }, [rainDrops]);

  // Spark/Smoke particles when broken down
  const [breakdownParticles, setBreakdownParticles] = useState([]);
  useEffect(() => {
    if (isBrokenDown && carPositions.length > 0) {
      const interval = setInterval(() => {
        // Spawn sparks from front engine car
        const engine = carPositions[0];
        setBreakdownParticles(prev => {
          const newParticles = Array.from({ length: 3 }).map(() => ({
            id: Math.random(),
            x: engine.x + (Math.random() * 20 - 10),
            y: engine.y - 5,
            vx: (Math.random() - 0.5) * 2,
            vy: -2 - Math.random() * 2,
            life: 1.0,
            color: Math.random() < 0.4 ? '#94a3b8' : '#f97316' // Gray smoke / orange spark
          }));
          return [...prev.slice(-30), ...newParticles];
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setBreakdownParticles([]);
    }
  }, [isBrokenDown, carPositions]);

  // Update breakdown particles
  useEffect(() => {
    if (breakdownParticles.length === 0) return;
    const animation = requestAnimationFrame(() => {
      setBreakdownParticles(prev =>
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.05
        })).filter(p => p.life > 0)
      );
    });
    return () => cancelAnimationFrame(animation);
  }, [breakdownParticles]);

  return (
    <div className="coaster-track-container glass-panel">
      <svg
        viewBox="0 0 1000 580"
        className="simulation-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Neon gradients for aesthetic glow */}
          <linearGradient id="sky-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0d0b14" />
            <stop offset="60%" stopColor="#1e182f" />
            <stop offset="100%" stopColor="#2c2242" />
          </linearGradient>

          <linearGradient id="mountain-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#181326" />
            <stop offset="100%" stopColor="#0a0812" />
          </linearGradient>

          <linearGradient id="station-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- SKY & SUN/MOON BACKGROUND --- */}
        <rect width="1000" height="580" fill="url(#sky-grad)" />

        {/* Glowing Retro Sun/Moon */}
        <circle cx="850" cy="130" r="50" fill="#a78bfa" opacity="0.15" filter="url(#glow)" />
        <circle cx="850" cy="130" r="35" fill="#f5f3ff" opacity="0.8" />

        {/* Ambient clouds floating */}
        <g opacity="0.12" fill="#fff">
          <path d="M 120 180 C 140 180 150 170 160 160 C 170 170 190 180 210 180 C 230 180 240 170 250 160 C 260 170 280 180 300 180 L 120 180 Z" className="float-cloud-1" />
          <path d="M 620 120 C 640 120 650 110 660 100 C 670 110 690 120 710 120 C 730 120 740 110 750 100 C 760 110 780 120 800 120 L 620 120 Z" className="float-cloud-2" />
        </g>

        {/* --- BACKGROUND MOUNTAINS / SCENERY --- */}
        {/* Back ridge */}
        <path d="M 0 580 L 0 460 Q 150 400 300 480 Q 450 520 650 430 Q 800 390 1000 470 L 1000 580 Z" fill="#161224" opacity="0.8" />
        {/* Mid ridge */}
        <path d="M 0 580 L 0 490 Q 200 440 450 510 Q 700 430 1000 500 L 1000 580 Z" fill="url(#mountain-grad)" />

        {/* --- RIDE STATION --- */}
        {/* Station platform background */}
        <rect x="140" y="440" width="150" height="35" rx="5" fill="url(#station-grad)" stroke="#8b5cf6" strokeWidth="1" />
        {/* Station poles */}
        <line x1="145" y1="440" x2="145" y2="475" stroke="#7c3aed" strokeWidth="3" />
        <line x1="285" y1="440" x2="285" y2="475" stroke="#7c3aed" strokeWidth="3" />
        {/* Canopy roof */}
        <path d="M 130 425 L 300 425 Q 215 405 130 425 Z" fill="#7c3aed" stroke="#6d28d9" strokeWidth="1.5" />
        <text x="215" y="420" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="1">STATION</text>

        {/* Boarding Gates (rendered as small barriers that swing open/closed) */}
        {/* If coaster state is loading, swing gate lines out of path */}
        <g stroke="#eab308" strokeWidth="2.5" opacity="0.8">
          {/* Gate 1 */}
          <line
            x1="252" y1="448"
            x2={train.state === 'loading' ? '252' : '265'}
            y2={train.state === 'loading' ? '440' : '448'}
            className="gate-transition"
          />
          {/* Gate 2 */}
          <line
            x1="230" y1="448"
            x2={train.state === 'loading' ? '230' : '243'}
            y2={train.state === 'loading' ? '440' : '448'}
            className="gate-transition"
          />
        </g>
        <line x1="220" y1="452" x2="265" y2="452" stroke="#eab308" strokeWidth="1" strokeDasharray="3,3" />

        {/* Park Exit Archway */}
        <path d="M 30 560 A 20 20 0 0 1 70 560" fill="none" stroke="#10b981" strokeWidth="4" />
        <text x="50" y="535" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">EXIT</text>

        {/* Maintenance / Repair Shed */}
        <rect x="75" y="490" width="50" height="35" fill="#374151" stroke="#4b5563" strokeWidth="2" />
        <polygon points="70,490 100,472 130,490" fill="#f87171" stroke="#ef4444" strokeWidth="1" />
        <rect x="92" y="500" width="16" height="25" fill="#1f2937" />
        <text x="100" y="487" fill="#fecaca" fontSize="7" fontWeight="bold" textAnchor="middle">DEPO</text>

        {/* --- TRACK SUPPORT STRUCTURES --- */}
        {/* Draw metal scaffolding under the main lift and drop curves */}
        <g stroke="#312e81" strokeWidth="1.5" opacity="0.6">
          {/* Support A - Lift hill */}
          <line x1="320" y1="320" x2="320" y2="520" />
          <line x1="380" y1="200" x2="380" y2="510" />
          {/* Cross truss members */}
          <line x1="260" y1="450" x2="320" y2="320" />
          <line x1="320" y1="320" x2="380" y2="200" />
          <line x1="320" y1="520" x2="380" y2="510" />

          {/* Support B - Apex & Drop */}
          <line x1="440" y1="160" x2="440" y2="500" />
          <line x1="470" y1="200" x2="470" y2="510" />
          <line x1="440" y1="160" x2="470" y2="200" />

          {/* Support C - Loop structures */}
          <line x1="655" y1="290" x2="655" y2="450" />
          <line x1="610" y1="450" x2="655" y2="290" />
          <line x1="655" y1="290" x2="700" y2="450" />

          {/* Support D - Camelback crest */}
          <line x1="830" y1="320" x2="830" y2="520" />
          <line x1="790" y1="450" x2="830" y2="320" />
          <line x1="830" y1="320" x2="870" y2="450" />

          {/* Ground rails linking structure bases */}
          <line x1="300" y1="510" x2="900" y2="510" stroke="#1e1b4b" strokeWidth="2" />
        </g>

        {/* --- MAIN PATH MEASURING TRACK RAIL --- */}
        {/* Underlay thick tube track */}
        <path
          ref={pathRef}
          d={TRACK_PATH_D}
          fill="none"
          stroke="#475569"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Glow neon inner rail */}
        <path
          d={TRACK_PATH_D}
          fill="none"
          stroke="#a855f7"
          strokeWidth="3"
          filter="url(#glow)"
          strokeLinecap="round"
        />
        {/* Top-running white line for tube aesthetic */}
        <path
          d={TRACK_PATH_D}
          fill="none"
          stroke="#fdf4ff"
          strokeWidth="0.8"
          strokeDasharray="10,6"
          strokeLinecap="round"
        />

        {/* --- RIDE ACCESSORIES --- */}
        {/* Safety yellow barrier line along the station floor */}
        <line x1="140" y1="472" x2="290" y2="472" stroke="#fbbf24" strokeWidth="2" strokeDasharray="5,3" />

        {/* --- WALKWAYS & VISITOR LINES --- */}
        {/* Serpent queue visual floor */}
        <g stroke="rgba(255,255,255,0.04)" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 920 540 L 920 520 L 740 520 L 740 485 L 420 485 L 420 450 L 260 450" />
        </g>

        {/* Standing footprint rings along queue lines */}
        {standingSpots.map((spot, idx) => (
          <ellipse key={`spot-${idx}`} cx={spot.x} cy={spot.y + 7} rx="5" ry="1.6" fill="rgba(168, 85, 247, 0.06)" stroke="rgba(168, 85, 247, 0.3)" strokeWidth="0.8" strokeDasharray="2,2" />
        ))}

        {/* Fences separating queue rows (Amusement park maze handrails) */}
        <g stroke="#475569" strokeWidth="1.2" fill="none" opacity="0.75">
          {/* Lane 1 Fences */}
          <path d="M 260,438 L 410,438" />
          <path d="M 260,462 L 434,462 L 434,472" />

          {/* Lane 2 Fences */}
          <path d="M 406,472 L 406,474 L 726,474" />
          <path d="M 434,496 L 754,496 L 754,508" />

          {/* Lane 3 Fences */}
          <path d="M 726,508 L 726,510 L 910,510" />
          <path d="M 754,530 L 934,530 L 934,545" />

          {/* Fence poles */}
          <g fill="#64748b" stroke="none">
            <circle cx="260" cy="438" r="2" />
            <circle cx="330" cy="438" r="2" />
            <circle cx="410" cy="438" r="2" />
            <circle cx="260" cy="462" r="2" />
            <circle cx="330" cy="462" r="2" />
            <circle cx="434" cy="462" r="2" />

            <circle cx="406" cy="472" r="2" />
            <circle cx="560" cy="472" r="2" />
            <circle cx="726" cy="472" r="2" />
            <circle cx="434" cy="496" r="2" />
            <circle cx="600" cy="496" r="2" />
            <circle cx="754" cy="496" r="2" />

            <circle cx="726" cy="510" r="2" />
            <circle cx="820" cy="510" r="2" />
            <circle cx="910" cy="510" r="2" />
            <circle cx="754" cy="530" r="2" />
            <circle cx="840" cy="530" r="2" />
            <circle cx="934" cy="530" r="2" />
          </g>
        </g>

        {/* Revolving Entrance Turnstile */}
        <g transform="translate(920, 520)">
          <rect x="-8" y="5" width="16" height="20" fill="#334155" stroke="#475569" strokeWidth="1" rx="1.5" />
          <line x1="0" y1="8" x2="-14" y2="18" stroke="#ef4444" strokeWidth="2.2" />
          <line x1="0" y1="8" x2="14" y2="18" stroke="#374151" strokeWidth="1.8" />
          <circle cx="0" cy="8" r="2.5" fill="#4b5563" />
          <rect x="-5" y="7" width="10" height="2.5" fill="#10b981" />
        </g>

        {/* VIP queue visual express lane */}
        <g stroke="rgba(234, 179, 8, 0.05)" strokeWidth="14" strokeLinecap="round" fill="none">
          <path d="M 800 540 L 780 400 L 380 400 L 380 420 L 250 420" />
        </g>
        {vipStandingSpots.map((spot, idx) => (
          <ellipse key={`vipspot-${idx}`} cx={spot.x} cy={spot.y + 7} rx="5" ry="1.6" fill="rgba(234, 179, 8, 0.06)" stroke="rgba(234, 179, 8, 0.35)" strokeWidth="0.8" strokeDasharray="2,2" />
        ))}

        {/* VIP entry scan post */}
        <g transform="translate(800, 535)">
          <rect x="-3" y="0" width="6" height="15" fill="#ca8a04" rx="1" />
          <circle cx="0" cy="0" r="2.5" fill="#facc15" filter="url(#glow)" />
          <text x="0" y="-5" fill="#facc15" fontSize="6.5" fontWeight="bold" textAnchor="middle">VIP</text>
        </g>

        {/* Exit walkway path */}
        <g stroke="rgba(16, 185, 129, 0.08)" strokeWidth="16" strokeLinecap="round" fill="none">
          <path d="M 180 450 L 180 520 L 50 520 L 50 560" />
        </g>

        {/* Dynamic LED Wait Time Signboard */}
        {stats && (
          <g transform="translate(860, 480)">
            <line x1="-25" y1="-25" x2="-25" y2="0" stroke="#475569" strokeWidth="1" />
            <line x1="25" y1="-25" x2="25" y2="0" stroke="#475569" strokeWidth="1" />
            <rect x="-38" y="0" width="76" height="18" rx="4" fill="#090714" stroke="#06b6d4" strokeWidth="1.5" filter="url(#glow)" />
            <text
              x="0"
              y="12"
              fill="#06b6d4"
              fontSize="8"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
              letterSpacing="0.5"
            >
              WAIT: {Math.max(1, Math.round(stats.avgWaitTime / 60))} MIN
            </text>
          </g>
        )}

        {/* --- VISITORS RENDER --- */}
        {/* Regular queue list with bobbing inner containers */}
        {regularQueue.map(guest => (
          <g key={guest.id} transform={`translate(${guest.x}, ${guest.y})`}>
            <g className={guest.status === 'waiting' ? 'waiting-bob' : ''} style={{ animationDelay: `${(guest.id.charCodeAt(0) % 10) / 10}s` }}>
              <GuestAvatar guest={guest} />
            </g>
          </g>
        ))}

        {/* VIP queue list with bobbing */}
        {vipQueue.map(guest => (
          <g key={guest.id} transform={`translate(${guest.x}, ${guest.y})`}>
            <g className={guest.status === 'waiting' ? 'waiting-bob' : ''} style={{ animationDelay: `${(guest.id.charCodeAt(0) % 10) / 10}s` }}>
              <GuestAvatar guest={guest} />
            </g>
          </g>
        ))}

        {/* Exited queue list */}
        {exitedVisitors.map(guest => (
          <g key={guest.id} transform={`translate(${guest.x}, ${guest.y})`}>
            <g className={guest.status === 'waiting' ? 'waiting-bob' : ''}>
              <GuestAvatar guest={guest} />
            </g>
          </g>
        ))}

        {/* --- MECHANICAL SMOKE / SPARKS PARTICLES --- */}
        {breakdownParticles.map(p => (
          <circle key={p.id} cx={p.x} cy={p.y} r={p.color === '#94a3b8' ? 4 * (1 - p.life) + 2 : 1.5} fill={p.color} opacity={p.life} />
        ))}

        {/* --- MECHANIC CHARACTER --- */}
        {isBrokenDown && mechanic.state !== 'idle' && (
          <g transform={`translate(${mechanic.x}, ${mechanic.y})`} className="mechanic-avatar">
            {/* Shadow */}
            <ellipse cx="0" cy="8" rx="5" ry="1.5" fill="rgba(0,0,0,0.3)" />
            {/* Mechanic Body (Blue overalls) */}
            <path d="M -5 3 C -5 -1 5 -1 5 3 L 4 8 L -4 8 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="0.5" />
            <rect x="-2" y="2" width="4" height="6" fill="#f59e0b" /> {/* Tool belt */}
            {/* Head */}
            <circle cx="0" cy="-2" r="5" fill="#fed7aa" />
            {/* Yellow Hardhat */}
            <path d="M -5 -3 C -5 -8 5 -8 5 -3 Z" fill="#fbbf24" />
            <line x1="-6" y1="-3" x2="6" y2="-3" stroke="#fbbf24" strokeWidth="1.5" />
            {/* Wrench tool */}
            <g transform={mechanic.state === 'repairing' ? 'rotate(-30) translate(5, 0)' : 'translate(4, 2)'} style={{ transformOrigin: '0 0' }}>
              <path d="M 0 0 L 0 8 M -2 6 L 2 6" stroke="#9ca3af" strokeWidth="1.5" />
              <circle cx="0" cy="8" r="1.5" fill="#9ca3af" />
            </g>
            <text x="0" y="-9" fill="#fbbf24" fontSize="6" fontWeight="bold" textAnchor="middle">MECH</text>
          </g>
        )}

        {/* --- ROLLER COASTER TRAIN CARRIAGES --- */}
        {carPositions.length > 0 && carPositions.map((pos, idx) => {
          // Identify riders in this carriage. Each carriage has 2 seats side-by-side or front-back.
          // Spacing index logic:
          const passengerLeft = train.passengers[idx * 2];
          const passengerRight = train.passengers[idx * 2 + 1];
          const isEngine = idx === 0;

          return (
            <g
              key={idx}
              transform={`translate(${pos.x}, ${pos.y}) rotate(${pos.angle})`}
            >
              {/* Wheels */}
              <circle cx="-10" cy="5" r="4.5" fill="#1e2937" stroke="#4b5563" strokeWidth="1" />
              <circle cx="10" cy="5" r="4.5" fill="#1e2937" stroke="#4b5563" strokeWidth="1" />

              {/* Carriage frame chassis */}
              <rect x="-14" y="-2" width="28" height="6" fill="#374151" rx="1" />

              {/* Carriage Tub Body */}
              <path
                d="M -15 -8 L -14 -2 L 14 -2 L 15 -8 Z"
                fill={isEngine ? '#ef4444' : '#3b82f6'}
                stroke={isEngine ? '#dc2626' : '#2563eb'}
                strokeWidth="1.5"
              />

              {/* Decorative side decals */}
              <line x1="-10" y1="-5" x2="10" y2="-5" stroke="#fff" strokeWidth="1" opacity="0.5" />
              {isEngine && (
                <>
                  {/* Grill nose / aerodynamic nose */}
                  <polygon points="15,-8 22,-5 15,-2" fill="#ef4444" stroke="#dc2626" strokeWidth="1" />
                  {/* Wing decals */}
                  <path d="M 5 -8 L -2 -14 L -8 -14 L -4 -8 Z" fill="#facc15" opacity="0.8" />
                </>
              )}

              {/* Render passenger heads sitting inside seats */}
              {/* Seat Left (back seat) */}
              <g transform="translate(-6, -7)">
                {passengerLeft ? (
                  <GuestAvatar
                    guest={{
                      ...passengerLeft,
                      // Override position/styles slightly for riding scaling
                      satisfaction: train.state === 'riding' ? 100 : passengerLeft.satisfaction,
                      style: { ...passengerLeft.style, accessory: 'none' } // hide hats in ride
                    }}
                  />
                ) : (
                  // Empty seat back
                  <rect x="-3.5" y="-5" width="7" height="8" rx="1.5" fill="#1f2937" stroke="#111827" strokeWidth="0.5" />
                )}
              </g>

              {/* Seat Right (front seat) */}
              <g transform="translate(4, -7)">
                {passengerRight ? (
                  <GuestAvatar
                    guest={{
                      ...passengerRight,
                      satisfaction: train.state === 'riding' ? 100 : passengerRight.satisfaction,
                      style: { ...passengerRight.style, accessory: 'none' }
                    }}
                  />
                ) : (
                  // Empty seat back
                  <rect x="-3.5" y="-5" width="7" height="8" rx="1.5" fill="#1f2937" stroke="#111827" strokeWidth="0.5" />
                )}
              </g>

              {/* Restraint Lapbar Harness */}
              <rect x="-11" y="-8" width="22" height="2.5" rx="1" fill="#4b5563" stroke="#1f2937" strokeWidth="0.5" />
            </g>
          );
        })}

        {/* --- BREAKDOWN BLOCK SIGN OVERLAY --- */}
        {isBrokenDown && (
          <g transform="translate(500, 80)" filter="url(#glow)">
            <rect x="-140" y="-18" width="280" height="36" rx="6" fill="#1f2937" stroke="#ef4444" strokeWidth="2.5" />
            <text x="0" y="5" fill="#ef4444" fontSize="11" fontWeight="extrabold" fontFamily="monospace" textAnchor="middle" letterSpacing="1.5" className="flash-alert">
              ⚠️ BLOCK SIGNAL ACTIVE: RIDE STUCK ({Math.round(maintenanceProgress)}%)
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
