const logOutput = document.getElementById('logOutput');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const clearBtn = document.getElementById('clearBtn');
const status = document.getElementById('status');

const STORAGE_KEY = 'BatteryLoggerElapsedLog';

let logging = false;
let paused = false;
let startTime = null;
let pauseStart = null;
let totalPauseDuration = 0;
let intervalId = null;

// NEW: track last logged full minute to avoid duplicates
let lastLoggedMinute = 0;

function loadLog() {
  const savedLog = localStorage.getItem(STORAGE_KEY);
  if (savedLog) {
    logOutput.textContent = savedLog;
    status.textContent = 'Previous log loaded.';
  } else {
    logOutput.textContent = ''; // Removed the annoying placeholder
    status.textContent = 'Ready to start logging.';
  }
}

function saveLog() {
  localStorage.setItem(STORAGE_KEY, logOutput.textContent);
}

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function appendLog(text) {
  logOutput.textContent += text + '\n';
  logOutput.scrollTop = logOutput.scrollHeight;
  saveLog();
}

function logElapsedTime() {
  if (!logging || paused) return;

  const now = new Date();
  const elapsedMs = now - startTime - totalPauseDuration;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  // Log all missed minutes since last log
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (lastLoggedMinute < elapsedMinutes) {
    const fakeElapsed = (lastLoggedMinute + 1) * 60000;
    appendLog(`Elapsed: ${formatElapsed(fakeElapsed)} (logged at ${now.toLocaleTimeString()})`);
    lastLoggedMinute++;
  }

  // Update the status with the exact elapsed time in HH:MM:SS format
  status.textContent = `Elapsed Time: ${formatElapsed(elapsedMs)}`;
}

// === Updated part: change interval to 1 second ===
startBtn.onclick = () => {
  if (logging) return;
  logging = true;
  paused = false;
  startTime = new Date();
  pauseStart = null;
  totalPauseDuration = 0;
  lastLoggedMinute = 0; // Reset last logged minute on start

  appendLog(`=== Session started at ${startTime.toLocaleString()} ===`);
  logElapsedTime();
  intervalId = setInterval(logElapsedTime, 1000);  // Update every second

  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  status.textContent = 'Logging started.';
};

pauseBtn.onclick = () => {
  if (!logging || paused) return;
  paused = true;
  pauseStart = new Date();
  appendLog(`=== Paused at ${pauseStart.toLocaleTimeString()} ===`);
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
  status.textContent = 'Logging paused.';
  setPausedBackground(true);
  saveState();
};

resumeBtn.onclick = () => {
  if (!logging || !paused) return;
  const now = new Date();
  totalPauseDuration += now - pauseStart;
  paused = false;
  appendLog(`=== Resumed at ${now.toLocaleTimeString()} ===`);
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  logElapsedTime();
  if (!intervalId) {
    intervalId = setInterval(logElapsedTime, 1000);
  }
  setPausedBackground(false);
  saveState();
};

clearBtn.onclick = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  logging = false;
  paused = false;
  startTime = null;
  pauseStart = null;
  totalPauseDuration = 0;
  lastLoggedMinute = 0;
  logOutput.textContent = '';
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('BatteryLoggerWasLogging');
  localStorage.removeItem('BatteryLoggerWasPaused');
  localStorage.removeItem('BatteryLoggerStartTime');
  localStorage.removeItem('BatteryLoggerPauseStart');
  localStorage.removeItem('BatteryLoggerTotalPause');
  localStorage.removeItem('BatteryLoggerLastMinute');
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
  status.textContent = 'Log cleared. Ready to start logging.';
  setPausedBackground(false); // Ensure background returns to white
};

function setPausedBackground(paused) {
  document.body.style.transition = "background 1s cubic-bezier(0.4,0,0.2,1)";
  document.body.style.background = paused
    ? "linear-gradient(135deg, #ff3a3a 0%, #3a7bff 100%)"
    : "#fff";
}

// Restore background on reload
window.onload = () => {
  loadLog();
  const wasLogging = localStorage.getItem('BatteryLoggerWasLogging');
  const wasPaused = localStorage.getItem('BatteryLoggerWasPaused');
  const savedStartTime = localStorage.getItem('BatteryLoggerStartTime');
  const savedPauseStart = localStorage.getItem('BatteryLoggerPauseStart');
  const savedTotalPause = localStorage.getItem('BatteryLoggerTotalPause');
  const savedLastMinute = localStorage.getItem('BatteryLoggerLastMinute');

  if (wasLogging === 'true' && savedStartTime) {
    logging = true;
    paused = wasPaused === 'true';
    startTime = new Date(savedStartTime);
    totalPauseDuration = Number(savedTotalPause) || 0;
    lastLoggedMinute = Number(savedLastMinute) || 0;
    if (paused && savedPauseStart) {
      pauseStart = new Date(savedPauseStart);
      pauseBtn.disabled = true;
      resumeBtn.disabled = false;
      status.textContent = 'Logging paused.';
      setPausedBackground(true);
    } else {
      pauseBtn.disabled = false;
      resumeBtn.disabled = true;
      status.textContent = 'Logging resumed after reload.';
      intervalId = setInterval(logElapsedTime, 1000);
      setPausedBackground(false);
    }
    startBtn.disabled = true;
  } else {
    pauseBtn.disabled = true;
    resumeBtn.disabled = true;
    setPausedBackground(false);
  }
};

// Save state on every relevant change
function saveState() {
  localStorage.setItem('BatteryLoggerWasLogging', logging);
  localStorage.setItem('BatteryLoggerWasPaused', paused);
  localStorage.setItem('BatteryLoggerStartTime', startTime ? startTime.toISOString() : '');
  localStorage.setItem('BatteryLoggerPauseStart', pauseStart ? pauseStart.toISOString() : '');
  localStorage.setItem('BatteryLoggerTotalPause', totalPauseDuration);
  localStorage.setItem('BatteryLoggerLastMinute', lastLoggedMinute);
}

// Add saveState calls to relevant places:
startBtn.onclick = () => {
  if (logging) return;
  logging = true;
  paused = false;
  startTime = new Date();
  pauseStart = null;
  totalPauseDuration = 0;
  lastLoggedMinute = 0;
  appendLog(`=== Session started at ${startTime.toLocaleString()} ===`);
  logElapsedTime();
  intervalId = setInterval(logElapsedTime, 1000);
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  status.textContent = 'Logging started.';
  saveState();
};

pauseBtn.onclick = () => {
  if (!logging || paused) return;
  paused = true;
  pauseStart = new Date();
  appendLog(`=== Paused at ${pauseStart.toLocaleTimeString()} ===`);
  pauseBtn.disabled = true;
  resumeBtn.disabled = false;
  status.textContent = 'Logging paused.';
  setPausedBackground(true);
  saveState();
};

resumeBtn.onclick = () => {
  if (!logging || !paused) return;
  const now = new Date();
  totalPauseDuration += now - pauseStart;
  paused = false;
  appendLog(`=== Resumed at ${now.toLocaleTimeString()} ===`);
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  // Immediately update the timer
  logElapsedTime();
  // FIX: Restart interval if not already running
  if (!intervalId) {
    intervalId = setInterval(logElapsedTime, 1000);
  }
  setPausedBackground(false);
  saveState();
};

clearBtn.onclick = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  logging = false;
  paused = false;
  startTime = null;
  pauseStart = null;
  totalPauseDuration = 0;
  lastLoggedMinute = 0;
  logOutput.textContent = '';
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('BatteryLoggerWasLogging');
  localStorage.removeItem('BatteryLoggerWasPaused');
  localStorage.removeItem('BatteryLoggerStartTime');
  localStorage.removeItem('BatteryLoggerPauseStart');
  localStorage.removeItem('BatteryLoggerTotalPause');
  localStorage.removeItem('BatteryLoggerLastMinute');
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
  status.textContent = 'Log cleared. Ready to start logging.';
  setPausedBackground(false); // Ensure background returns to white
};

window.addEventListener('beforeunload', () => {
  if (logging && !paused) {
    paused = true;
    pauseStart = new Date();
    appendLog(`=== Auto-paused on shutdown at ${pauseStart.toLocaleTimeString()} ===`);
  }
  saveLog();
  saveState();
});
