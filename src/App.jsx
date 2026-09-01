import { useCoasterSimulation } from './hooks/useCoasterSimulation';
import CoasterTrack from './components/CoasterTrack';
import SidebarTabs from './components/SidebarTabs';
import AnnouncementFeed from './components/AnnouncementFeed';
import { Sparkles, Activity, HelpCircle, Globe } from 'lucide-react';
import './App.css';

function App() {
  const sim = useCoasterSimulation();

  // Format simulation clock time as mm:ss
  const formatTime = (timeInSecs) => {
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      {/* GLOWING AMBIENT HEADLIGHTS */}
      <div className="bg-glow bg-glow-purple"></div>
      <div className="bg-glow bg-glow-cyan"></div>

      {/* HEADER SECTION */}
      <header className="main-header glass-panel">
        <div className="header-left">
          <div className="logo-badge">
            <Activity className="logo-icon text-cyan-400 animate-pulse" size={20} />
          </div>
          <div>
            <h1 className="header-title">
              ROLLER COASTER SIMULATION <span className="text-glow-purple">OPERATOR</span>
            </h1>
            <p className="header-subtitle font-mono">
              DISCRETE EVENT QUEUE SIMULATOR • ARPAN • v1.0.0
            </p>
          </div>
        </div>

        <div className="header-right font-mono">
          {/* Clock telemetry */}
          <div className="header-stat">
            <span className="stat-label">ELAPSED TIME</span>
            <span className="stat-val text-cyan-400 text-glow-cyan">{formatTime(sim.simTime)}</span>
          </div>

          {/* Weather telemetry */}
          <div className="header-stat">
            <span className="stat-label">ENVIRONMENT</span>
            <span className={`stat-val ${sim.weather === 'rainy' ? 'text-blue-400' : 'text-yellow-400'}`}>
              {sim.weather === 'rainy' ? '🌧️ RAINY' : '☀️ SUNNY'}
            </span>
          </div>

          {/* Coaster Speed telemetry */}
          <div className="header-stat">
            <span className="stat-label">COASTER SPEED</span>
            <span className="stat-val text-purple-400 text-glow-purple">
              {sim.isBrokenDown ? 'STUCK' : `${sim.train.speed} MPH`}
            </span>
          </div>

          {/* Core operating state */}
          <div className="header-stat">
            <span className="stat-label">STATUS</span>
            <span className={`stat-val font-semibold px-2 py-0.5 rounded text-[11px] ${sim.isBrokenDown ? 'bg-red-950/60 text-red-400 border border-red-800' :
              sim.isPaused ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                'bg-emerald-950/60 text-emerald-400 border border-emerald-800 animate-pulse'
              }`}>
              {sim.isBrokenDown ? '⚡ CRASH' : sim.isPaused ? '⏸️ HALTED' : '🟢 ACTIVE'}
            </span>
          </div>
        </div>
      </header>

      {/* INITIAL RUN OVERLAY (to start browser audio context on user action) */}
      {sim.isPaused && sim.simTime === 0 && (
        <div className="init-overlay">
          <div className="init-dialog glass-panel text-center">
            <div className="w-16 h-16 rounded-full bg-purple-950/50 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Sparkles size={32} className="text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Initialize Amusement Park</h2>
            <p className="text-sm text-slate-300 max-w-sm mx-auto mb-6">
              Boot the discrete event engine, enable live sound synthesis, and open the park gates to visitors.
            </p>
            <button
              className="btn btn-primary px-8 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 mx-auto"
              onClick={sim.startSimulation}
            >
              🚀 Initialize & Start Park
            </button>
          </div>
        </div>
      )}

      {/* TWO COLUMN SPLIT SCREEN LAYOUT */}
      <div className="app-split-layout">
        {/* Left Side: Coaster track visuals and log feeds */}
        <main className="main-simulation-panel">
          <section className="visualization-section">
            <CoasterTrack
              train={sim.train}
              regularQueue={sim.regularQueue}
              vipQueue={sim.vipQueue}
              exitedVisitors={sim.exitedVisitors}
              mechanic={sim.mechanic}
              isBrokenDown={sim.isBrokenDown}
              maintenanceProgress={sim.maintenanceProgress}
              weather={sim.weather}
              stats={sim.stats}
            />
          </section>

          <section className="logs-section mt-4">
            <AnnouncementFeed announcements={sim.announcements} />
          </section>
        </main>

        {/* Right Side: Sidebar with tab controls and stats */}
        <aside className="sidebar-section">
          <SidebarTabs
            stats={sim.stats}
            settings={sim.settings}
            setSettings={sim.setSettings}
            isPaused={sim.isPaused}
            weather={sim.weather}
            isBrokenDown={sim.isBrokenDown}
            maintenanceProgress={sim.maintenanceProgress}
            startSimulation={sim.startSimulation}
            pauseSimulation={sim.pauseSimulation}
            triggerBreakdown={sim.triggerBreakdown}
            repairCoaster={sim.repairCoaster}
            triggerVipRush={sim.triggerVipRush}
            toggleWeather={sim.toggleWeather}
            regularQueueSize={sim.regularQueue.length}
            vipQueueSize={sim.vipQueue.length}
            train={sim.train}
          />
        </aside>
      </div>

      {/* FOOTER */}
      <footer className="main-footer font-mono text-[9px] text-slate-600 text-center py-4 mt-auto border-t border-slate-900/60 flex items-center justify-center gap-3">
        <span className="text-[12px] font-semibold tracking-wide">DEVELOPER: ARPAN ADHIKARI</span>
        <span className="footer-social-links flex items-center gap-2.5">
          <a href="https://github.com/adhikari-arpan" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="GitHub">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
          </a>
          <a href="https://www.linkedin.com/in/adhikari-arpan63/" target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="LinkedIn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667h-3.554v-11.452h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zm-15.106-13.019c-1.144 0-2.07-.926-2.07-2.069 0-1.143.926-2.069 2.07-2.069 1.143 0 2.069.926 2.069 2.069 0 1.143-.926 2.069-2.069 2.069zm1.782 13.019h-3.564v-11.452h3.564v11.452zm14.928-20.451h-19.454c-.982 0-1.777.795-1.777 1.777v19.454c0 .982.795 1.777 1.777 1.777h19.454c.982 0 1.777-.795 1.777-1.777v-19.454c0-.982-.795-1.777-1.777-1.777z" /></svg>
          </a>
          <a href="https://www.arpanadhikari7.com.np/" target="_blank" rel="noopener noreferrer" title="Website" aria-label="Website">
            <Globe size={12} />
          </a>
        </span>
      </footer>
    </div>
  );
}

export default App;
