// this is updated
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
    logOutput.textContent = 'Log is empty. Click "Start Logging" to begin.';
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
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  // Log all missed minutes since last log
  while (lastLoggedMinute < elapsedMinutes) {
    const fakeElapsed = (lastLoggedMinute + 1) * 60000;
    appendLog(`Elapsed: ${formatElapsed(fakeElapsed)} (logged at ${now.toLocaleTimeString()})`);
    lastLoggedMinute++;
  }

  status.textContent = `Logging... Elapsed: ${formatElapsed(elapsedMs)}`;
}

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
  intervalId = setInterval(logElapsedTime, 60000);

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
};

resumeBtn.onclick = () => {
  if (!logging || !paused) return;
  const now = new Date();
  totalPauseDuration += now - pauseStart;
  paused = false;
  appendLog(`=== Resumed at ${now.toLocaleTimeString()} ===`);
  pauseBtn.disabled = false;
  resumeBtn.disabled = true;
  status.textContent = 'Logging resumed.';
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
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
  status.textContent = 'Log cleared. Ready to start logging.';
};

window.onload = () => {
  loadLog();
  pauseBtn.disabled = true;
  resumeBtn.disabled = true;
};

// === UPDATED beforeunload handler with auto-pause logic ===
window.addEventListener('beforeunload', () => {
  if (logging && !paused) {
    paused = true;
    pauseStart = new Date();
    appendLog(`=== Auto-paused on shutdown at ${pauseStart.toLocaleTimeString()} ===`);
  }
  saveLog();
});
