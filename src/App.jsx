import { useCoasterSimulation } from './hooks/useCoasterSimulation';
import CoasterTrack from './components/CoasterTrack';
import SidebarTabs from './components/SidebarTabs';
import AnnouncementFeed from './components/AnnouncementFeed';
import { Sparkles, Activity, HelpCircle } from 'lucide-react';
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
      <footer className="main-footer font-mono text-[9px] text-slate-600 text-center py-4 mt-auto border-t border-slate-900/60">
        MADE BY ARPAN ADHIKARI
      </footer>
    </div>
  );
}

export default App;
