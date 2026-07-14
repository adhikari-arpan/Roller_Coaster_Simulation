import { useState } from 'react';
import {
  Play, Pause, Users, Clock, AlertTriangle,
  CloudRain, Sun, DollarSign, Gauge, Smile,
  Flame, Volume2, VolumeX, ShieldAlert, Sparkles,
  BookOpen, Sliders, BarChart3, Binary
} from 'lucide-react';
import { soundManager } from '../simulation/audio';

// Custom lightweight SVG line graph for live telemetry
const SvgLineChart = ({ data, dataKey, color, label, maxValue = 100 }) => {
  if (!data || data.length < 2) {
    return (
      <div className="chart-placeholder flex items-center justify-center text-[10px] text-slate-500 py-6 border border-dashed border-slate-800 rounded-lg">
        Telemetry buffering...
      </div>
    );
  }

  const width = 280;
  const height = 80;
  const padding = 12;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const values = data.map(d => d[dataKey]);
  const highestVal = Math.max(...values, 5);
  const scaleMax = maxValue === 'auto' ? Math.ceil(highestVal * 1.2) : maxValue;

  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - (d[dataKey] / scaleMax) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${padding + chartWidth},${padding + chartHeight} L ${padding},${padding + chartHeight} Z`;

  return (
    <div className="chart-container mb-3">
      <div className="chart-header flex justify-between text-[10px] font-semibold mb-1">
        <span className="text-slate-400">{label}</span>
        <span style={{ color }}>{data[data.length - 1][dataKey]}</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <line x1={padding} y1={padding} x2={padding + chartWidth} y2={padding} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1={padding} y1={padding + chartHeight / 2} x2={padding + chartWidth} y2={padding + chartHeight / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1={padding} y1={padding + chartHeight} x2={padding + chartWidth} y2={padding + chartHeight} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3,3" />

        <path d={areaD} fill={`url(#grad-${dataKey})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export default function SidebarTabs({
  stats,
  settings,
  setSettings,
  isPaused,
  weather,
  isBrokenDown,
  maintenanceProgress,
  startSimulation,
  pauseSimulation,
  triggerBreakdown,
  repairCoaster,
  triggerVipRush,
  toggleWeather,
  regularQueueSize,
  vipQueueSize,
  train
}) {
  const [activeTab, setActiveTab] = useState('control'); // 'control' | 'stats' | 'theory'
  const [audioMusic, setAudioMusic] = useState(false);
  const [audioSfx, setAudioSfx] = useState(true);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [musicVolume, setMusicVolume] = useState(0.3);

  const handleToggleMusic = (e) => {
    const checked = e.target.checked;
    setAudioMusic(checked);
    soundManager.toggleMusic(checked);
  };

  const handleToggleSfx = (e) => {
    const checked = e.target.checked;
    setAudioSfx(checked);
    soundManager.toggleSfx(checked);
  };

  const handleMusicVolume = (e) => {
    const val = parseFloat(e.target.value);
    setMusicVolume(val);
    soundManager.setVolume('music', val);
  };

  const handleSfxVolume = (e) => {
    const val = parseFloat(e.target.value);
    setSfxVolume(val);
    soundManager.setVolume('sfx', val);
  };

  const getSatisfactionColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  // Queuing Theory Live values calculations
  const lambda = (settings.arrivalRate / 60); // visitors per second (effective)
  const averageWaitTime = stats.avgWaitTime;  // average wait time in seconds (W)
  const actualQueueLength = regularQueueSize + vipQueueSize; // current queue (L)
  const theoreticalQueueLength = (lambda * averageWaitTime).toFixed(2); // L = lambda * W

  return (
    <div className="sidebar-tabs-container glass-panel">
      {/* Tab Switcher Headers */}
      <div className="tabs-header-row">
        <button
          className={`tab-btn ${activeTab === 'control' ? 'active' : ''}`}
          onClick={() => setActiveTab('control')}
          title="Park Control & Settings"
        >
          <Sliders size={15} />
          <span>Control</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
          title="Live Analytics Timeline"
        >
          <BarChart3 size={15} />
          <span>Stats</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'theory' ? 'active' : ''}`}
          onClick={() => setActiveTab('theory')}
          title="Discrete Event Theories"
        >
          <BookOpen size={15} />
          <span>Theory</span>
        </button>
      </div>

      {/* Tab Content Panes */}
      <div className="tab-content-viewport">
        {/* --- TAB 1: PARK CONTROLS --- */}
        {activeTab === 'control' && (
          <div className="tab-pane flex flex-col gap-4">
            <h3 className="pane-title"><Sliders size={14} className="title-icon text-cyan-400" /> Park Operations</h3>

            {/* Dispatch controls */}
            <div className="simulation-actions-row">
              {isPaused ? (
                <button className="btn btn-primary flex items-center justify-center gap-2" onClick={startSimulation}>
                  <Play size={14} fill="#fff" /> Start Operations
                </button>
              ) : (
                <button className="btn btn-secondary flex items-center justify-center gap-2" onClick={pauseSimulation}>
                  <Pause size={14} fill="#fff" /> Pause Operations
                </button>
              )}
            </div>

            {/* Parameter adjusters */}
            <div className="settings-sliders-container mt-2">
              <div className="slider-group">
                <div className="slider-labels">
                  <label>Arrival Rate</label>
                  <span className="font-mono text-purple-400 text-xs">{settings.arrivalRate}/min</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="90"
                  value={settings.arrivalRate}
                  onChange={(e) => setSettings(prev => ({ ...prev, arrivalRate: parseInt(e.target.value) }))}
                  className="slider-bar"
                />
              </div>

              <div className="slider-group">
                <div className="slider-labels">
                  <label>Ticket Price</label>
                  <span className="font-mono text-purple-400 text-xs">${settings.ticketPrice}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={settings.ticketPrice}
                  onChange={(e) => setSettings(prev => ({ ...prev, ticketPrice: parseInt(e.target.value) }))}
                  className="slider-bar"
                />
              </div>

              <div className="slider-group">
                <div className="slider-labels">
                  <label>Ride Cycle Duration</label>
                  <span className="font-mono text-purple-400 text-xs">{settings.rideDuration}s</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="30"
                  value={settings.rideDuration}
                  onChange={(e) => setSettings(prev => ({ ...prev, rideDuration: parseInt(e.target.value) }))}
                  className="slider-bar"
                />
              </div>

              <div className="capacity-selector-row mt-1">
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Seating Capacity</label>
                <div className="flex gap-2">
                  {[8, 12, 16].map(cap => (
                    <button
                      key={cap}
                      onClick={() => setSettings(prev => ({ ...prev, capacity: cap }))}
                      className={`btn-toggle-cap ${settings.capacity === cap ? 'active' : ''}`}
                    >
                      {cap} Seats
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Event injectors */}
            <div className="events-triggers-box border-t border-slate-800 pt-3">
              <label className="text-[10px] text-slate-400 font-semibold block mb-2">Park Events</label>
              <div className="flex flex-col gap-2">
                {isBrokenDown ? (
                  <button className="btn btn-repair flex items-center justify-center gap-1.5" onClick={repairCoaster}>
                    <ShieldAlert size={13} /> Call Mechanic ({Math.round(maintenanceProgress)}%)
                  </button>
                ) : (
                  <button className="btn btn-warning flex items-center justify-center gap-1.5" onClick={triggerBreakdown} disabled={isPaused}>
                    <AlertTriangle size={13} /> Force Mechanical Failure
                  </button>
                )}

                <button className="btn btn-vip flex items-center justify-center gap-1.5" onClick={triggerVipRush} disabled={isPaused}>
                  <Sparkles size={13} /> VIP Group Rush
                </button>

                <button className="btn btn-weather flex items-center justify-center gap-1.5" onClick={toggleWeather} style={{ borderColor: weather === 'rainy' ? '#3b82f6' : '#eab308' }}>
                  {weather === 'rainy' ? (
                    <><CloudRain size={13} className="text-blue-400 animate-bounce" /> Set Sunny Skies</>
                  ) : (
                    <><Sun size={13} className="text-yellow-400" /> Trigger Heavy Rain</>
                  )}
                </button>
              </div>
            </div>

            {/* Audio mixer */}
            <div className="audio-settings-box mt-1">
              <label className="text-[10px] text-slate-400 font-semibold block mb-2">Procedural Audio Mixer</label>
              <div className="audio-row flex items-center justify-between text-[11px] font-semibold border-b border-slate-800 pb-1.5 mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-300">
                  {audioMusic ? <Volume2 size={12} className="text-purple-400" /> : <VolumeX size={12} className="text-slate-500" />}
                  Organ Theme Music
                </span>
                <label className="switch">
                  <input type="checkbox" checked={audioMusic} onChange={handleToggleMusic} />
                  <span className="slider-switch"></span>
                </label>
              </div>
              {audioMusic && (
                <div className="volume-slider-group mb-1.5">
                  <input type="range" min="0" max="0.7" step="0.05" value={musicVolume} onChange={handleMusicVolume} className="volume-slider" />
                </div>
              )}

              <div className="audio-row flex items-center justify-between text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-slate-300">
                  {audioSfx ? <Volume2 size={12} className="text-cyan-400" /> : <VolumeX size={12} className="text-slate-500" />}
                  Sound FX
                </span>
                <label className="switch">
                  <input type="checkbox" checked={audioSfx} onChange={handleToggleSfx} />
                  <span className="slider-switch"></span>
                </label>
              </div>
              {audioSfx && (
                <div className="volume-slider-group mt-1">
                  <input type="range" min="0" max="0.7" step="0.05" value={sfxVolume} onChange={handleSfxVolume} className="volume-slider" />
                </div>
              )}
            </div>

            {/* Time acceleration */}
            <div className="speed-multiplier-row border-t border-slate-800 pt-3">
              <span className="text-[10px] text-slate-400 font-semibold">Simulation Speed:</span>
              <div className="flex gap-2 mt-1">
                {[1, 2, 5].map(mult => (
                  <button
                    key={mult}
                    onClick={() => setSettings(prev => ({ ...prev, speedMultiplier: mult }))}
                    className={`btn-speed font-mono ${settings.speedMultiplier === mult ? 'active' : ''}`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: SYSTEM STATS --- */}
        {activeTab === 'stats' && (
          <div className="tab-pane flex flex-col gap-4">
            <h3 className="pane-title"><BarChart3 size={14} className="title-icon text-cyan-400" /> Telemetry Dashboard</h3>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="card-top">
                  <Users size={13} className="text-purple-400" />
                  <span className="card-label">Active Queue</span>
                </div>
                <div className="card-value font-mono text-base">
                  {actualQueueLength}
                  <span className="text-[9px] text-slate-400 font-normal block">
                    ({regularQueueSize} reg / {vipQueueSize} vip)
                  </span>
                </div>
              </div>

              <div className="metric-card">
                <div className="card-top">
                  <Clock size={13} className="text-blue-400" />
                  <span className="card-label">Avg Wait Time</span>
                </div>
                <div className="card-value font-mono text-base">
                  {stats.avgWaitTime}s
                  <span className="text-[9px] text-slate-400 font-normal block">
                    (max: {stats.maxWaitTime}s)
                  </span>
                </div>
              </div>

              <div className="metric-card">
                <div className="card-top">
                  <DollarSign size={13} className="text-green-400" />
                  <span className="card-label">Net Revenue</span>
                </div>
                <div className="card-value font-mono text-base text-green-400">
                  ${stats.totalRevenue}
                </div>
              </div>

              <div className="metric-card">
                <div className="card-top">
                  <Flame size={13} className="text-rose-400" />
                  <span className="card-label">Throughput</span>
                </div>
                <div className="card-value font-mono text-base">
                  {stats.totalServed}
                  <span className="text-[9px] text-slate-400 font-normal block">
                    ({stats.breakdownsCount} breakdowns)
                  </span>
                </div>
              </div>
            </div>

            {/* Satisfaction bar */}
            <div className="satisfaction-bar-container">
              <div className="flex justify-between items-center text-[10px] font-semibold mb-1">
                <span className="flex items-center text-slate-300">
                  <Smile size={12} className="mr-1" style={{ color: getSatisfactionColor(stats.satisfaction) }} />
                  Guest Satisfaction
                </span>
                <span className="font-mono" style={{ color: getSatisfactionColor(stats.satisfaction) }}>
                  {stats.satisfaction}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full satisfaction-progress-fill"
                  style={{
                    width: `${stats.satisfaction}%`,
                    backgroundColor: getSatisfactionColor(stats.satisfaction)
                  }}
                />
              </div>
            </div>

            {/* History Charts */}
            <div className="charts-grid-layout mt-2 border-t border-slate-800 pt-3">
              <SvgLineChart data={stats.history} dataKey="queueLength" color="#a855f7" label="Queue Size History" maxValue="auto" />
              <SvgLineChart data={stats.history} dataKey="satisfaction" color="#f43f5e" label="Satisfaction History" maxValue={100} />
            </div>
          </div>
        )}

        {/* --- TAB 3: QUEUING THEORIES --- */}
        {activeTab === 'theory' && (
          <div className="tab-pane flex flex-col gap-4 text-left overflow-y-auto max-h-[500px] pr-1">
            <h3 className="pane-title"><Binary size={14} className="title-icon text-cyan-400" /> Discrete Event Modeling</h3>

            {/* Live Little's Law Comparison */}
            <div className="theory-box-highlight">
              <h4 className="theory-subtitle flex items-center gap-1"><Sparkles size={11} className="text-yellow-400" /> Live Little's Law Validation</h4>
              <p className="theory-text font-serif italic text-slate-400 mb-2">
                "The long-term average number of customers in a stationary system (L) is equal to the long-term average effective arrival rate (&lambda;) multiplied by the average time (W) spent in the system."
              </p>

              <div className="math-formula text-center font-mono py-1.5 my-2 bg-slate-900/60 rounded border border-slate-800 text-xs">
                L = &lambda; &times; W
              </div>

              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono mt-1 text-slate-300">
                <div>&lambda; (arr. rate):</div>
                <div className="text-right text-cyan-400">{lambda.toFixed(3)} guests/s</div>

                <div>W (avg. wait):</div>
                <div className="text-right text-cyan-400">{averageWaitTime} seconds</div>

                <div className="border-t border-slate-800 pt-1 mt-1 font-bold">L (calculated):</div>
                <div className="border-t border-slate-800 pt-1 mt-1 text-right text-purple-400 font-bold">{theoreticalQueueLength} guests</div>

                <div className="font-bold">L (actual queue):</div>
                <div className="text-right text-emerald-400 font-bold">{actualQueueLength} guests</div>
              </div>
            </div>

            {/* Poisson distribution explanation */}
            <div className="theory-section-detail text-[11px] text-slate-300 space-y-2">
              <h4 className="font-bold text-xs text-white border-b border-slate-800 pb-1 mt-1">1. Poisson Arrival Process</h4>
              <p className="leading-relaxed">
                Guest arrivals represent a memoryless stochastic process. The probability of $k$ guest groups arriving in a time window $t$ is modeled by:
              </p>
              <div className="math-formula text-center font-mono py-1 my-1 bg-slate-950/40 rounded text-[10px]">
                P(N(t) = k) = &lambda;<sup>k</sup> &bull; e<sup>-&lambda;t</sup> / k!
              </div>
              <p className="leading-relaxed text-slate-400">
                In a DES engine, this is modeled by drawing step times from an exponential distribution, generating realistic random crowds instead of static uniform spacings.
              </p>
            </div>

            {/* Priority Queueing explanation */}
            <div className="theory-section-detail text-[11px] text-slate-300 space-y-2">
              <h4 className="font-bold text-xs text-white border-b border-slate-800 pb-1 mt-1">2. M/M/c Non-Preemptive Priority</h4>
              <p className="leading-relaxed">
                The coaster forms a multi-server server ($c$ seats) with two customer priority classes (VIP and Regular):
              </p>
              <ul className="list-disc list-inside pl-1 space-y-1 text-slate-400">
                <li>VIP guests utilize a separate priority queue lane.</li>
                <li>When the server (roller coaster) enters the <code className="text-purple-400 text-[10px]">loading</code> state, it queries the VIP queue first.</li>
                <li>VIP boarding is non-preemptive: if a regular ride cycle has started, VIPs do not halt it but go to the front of the next batch.</li>
              </ul>
            </div>

            {/* Breakdown state modeling */}
            <div className="theory-section-detail text-[11px] text-slate-300 space-y-2">
              <h4 className="font-bold text-xs text-white border-b border-slate-800 pb-1 mt-1">3. Mechanical Failures (DES Halts)</h4>
              <p className="leading-relaxed text-slate-400">
                We introduce random interruptions modeled as a failure rate. When active:
              </p>
              <ul className="list-disc list-inside pl-1 space-y-1 text-slate-400">
                <li>The server transits to an offline state, freezing the customer flow.</li>
                <li>Guests in the queue suffer an exponential decay in patience, shifting the satisfaction metric ($S$) downwards at a $3\times$ speed factor.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
