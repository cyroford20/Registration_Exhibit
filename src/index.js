// Registration elements
const registrationModal = document.querySelector("#registrationModal");
const playerFullnameInput = document.querySelector("#playerFullname");
const playerEmailInput = document.querySelector("#playerEmail");
const playerCollegeInput = document.querySelector("#playerCollege");
const playerGenderSelect = document.querySelector("#playerGender");
const playerCampusSelect = document.querySelector("#playerCampus");
const playerRoleSelect = document.querySelector("#playerRole");
const startBtn = document.querySelector("#startBtn");
const playerRegStatus = document.querySelector("#playerRegStatus");
const adminLink = document.querySelector(".header-action-admin");
const openRegistrationModalBtn = document.querySelector("#openRegistrationModal");
const closeRegistrationModalBtn = document.querySelector("#closeRegistrationModal");
const queueListEl = document.querySelector("#queueList");
const historyListEl = document.querySelector("#historyList");
const spinResultToastEl = document.querySelector("#spinResultToast");

let currentPlayer = null;
let registeredUsers = [];
let queueUsers = [];
let historyUsers = [];
let activeSpinUser = null;
let spinResultToastTimer = null;
const REQUIRE_REGISTRATION = false;
const ADMIN_PASSWORD = "admin123";
const ADMIN_SESSION_KEY = "adminAuthenticated";
const DEFAULT_GUEST_PLAYER = {
  fullname: "Guest",
  email: "guest@local",
  college: "N/A",
  gender: "N/A",
  campus: "N/A",
  role: "Guest",
};
const REGISTER_BUTTON_LABEL = "REGISTER USER";

if (adminLink) {
  adminLink.addEventListener("click", (e) => {
    e.preventDefault();
    const entered = window.prompt("Enter admin password:");
    if (entered === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      window.location.href = "admin.html";
      return;
    }
    if (entered !== null) {
      window.alert("Incorrect password");
    }
  });
}

function isGuestPlayer(player) {
  return !player || String(player.email || "").toLowerCase() === DEFAULT_GUEST_PLAYER.email;
}

function setPlayerRegStatus(message, kind = "") {
  if (!playerRegStatus) return;
  playerRegStatus.textContent = message;
  playerRegStatus.dataset.kind = kind;
  playerRegStatus.style.opacity = message ? "1" : "0";
}

function syncRegistrationForm() {
  if (!currentPlayer || isGuestPlayer(currentPlayer)) {
    return;
  }

  playerFullnameInput.value = currentPlayer.fullname || "";
  playerEmailInput.value = currentPlayer.email || "";
  playerCollegeInput.value = currentPlayer.college || "";
  playerGenderSelect.value = currentPlayer.gender || "";
  playerCampusSelect.value = currentPlayer.campus || "";
  playerRoleSelect.value = currentPlayer.role || "";
}

function openRegistrationModal() {
  if (!registrationModal) return;
  syncRegistrationForm();
  setPlayerRegStatus("");
  registrationModal.classList.remove("hidden");
  registrationModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeRegistrationModal() {
  if (!registrationModal) return;
  if (REQUIRE_REGISTRATION && !currentPlayer) {
    return;
  }

  registrationModal.classList.add("hidden");
  registrationModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function resetRegistrationButton() {
  startBtn.disabled = false;
  startBtn.textContent = REGISTER_BUTTON_LABEL;
}

// Load registered users and check if current player is registered
async function loadRegisteredUsers() {
  try {
    const res = await fetch("api/users.php", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load users");
    const data = await res.json();
    registeredUsers = data.users || [];
  } catch (e) {
    console.error("Error loading users:", e);
  }
}

function formatDate(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString() : "-";
}

function renderQueueAndHistory() {
  if (queueListEl) {
    queueListEl.innerHTML = "";
    const queuePreview = queueUsers.slice(0, 3);
    if (queuePreview.length === 0) {
      queueListEl.innerHTML = '<li class="queue-empty">No users in queue.</li>';
    } else {
      queuePreview.forEach((user, i) => {
        const li = document.createElement("li");
        li.className = "queue-item";
        li.innerHTML = `
          <div class="queue-name">${i + 1}. ${user.fullname || "Unnamed"}</div>
          <div class="queue-meta">Registered: ${formatDate(user.registered_at)}</div>
        `;
        queueListEl.appendChild(li);
      });
    }
  }

  if (historyListEl) {
    historyListEl.innerHTML = "";
    const historyPreview = historyUsers.slice(0, 3);
    if (historyPreview.length === 0) {
      historyListEl.innerHTML = '<li class="queue-empty">No spin history yet.</li>';
    } else {
      historyPreview.forEach((user) => {
        const li = document.createElement("li");
        li.className = "queue-item";
        li.innerHTML = `
          <div class="queue-name">${user.fullname || "Unnamed"}</div>
          <div class="queue-prize">Prize: ${user.prizeGet || "-"}</div>
          <div class="queue-meta">Registered: ${formatDate(user.registered_at)}</div>
        `;
        historyListEl.appendChild(li);
      });
    }
  }
}

async function refreshQueueAndHistory() {
  try {
    const res = await fetch("api/users.php", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load users");
    const data = await res.json();
    const users = Array.isArray(data.users) ? data.users : [];

    const waitingUsers = users
      .filter((u) => (u.spin || "no") !== "yes")
      .sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at));

    const spunUsers = users
      .filter((u) => (u.spin || "no") === "yes")
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.registered_at).getTime();
        const bTime = new Date(b.updated_at || b.registered_at).getTime();
        return bTime - aTime;
      });

    queueUsers = waitingUsers;
    historyUsers = spunUsers;

    renderQueueAndHistory();
  } catch (err) {
    console.error("Queue/History load error:", err);
  }
}

function getActiveSpinUser() {
  if (currentPlayer && currentPlayer.email && currentPlayer.email !== "guest@local") {
    const matched = queueUsers.find(
      (u) => String(u.email || "").toLowerCase() === String(currentPlayer.email).toLowerCase()
    );
    if (matched) return matched;
  }

  return queueUsers.length > 0 ? queueUsers[0] : null;
}

function showSpinResultMessage(message, kind) {
  if (!spinResultToastEl) return;

  if (spinResultToastTimer) {
    clearTimeout(spinResultToastTimer);
  }

  spinResultToastEl.textContent = message;
  spinResultToastEl.classList.remove("win", "lose", "show");
  spinResultToastEl.classList.add(kind === "lose" ? "lose" : "win");
  spinResultToastEl.classList.add("show");

  spinResultToastTimer = setTimeout(() => {
    spinResultToastEl.classList.remove("show", "win", "lose");
  }, 3200);
}

async function saveSpinResult(user, prizeLabel) {
  if (!user || !user.email) return;

  try {
    await fetch("api/users.php", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, spin: "yes", prizeGet: prizeLabel }),
    });
  } catch (err) {
    console.error("Failed to save spin result:", err);
  }
}

async function registerPlayer(player) {
  const res = await fetch("api/users.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(player),
  });

  const data = await res.json().catch(() => ({}));

  // If the player already exists, allow continuing as a returning player.
  if (!res.ok) {
    const msg = (data && data.error ? String(data.error) : "").toLowerCase();
    if (msg.includes("already exists")) {
      return { ok: true, alreadyExists: true };
    }
    return { ok: false, message: data.error || "Registration failed" };
  }

  registeredUsers = data.users || registeredUsers;
  return { ok: true, alreadyExists: false };
}

// Handle player registration/login
async function handlePlayerStart() {
  const fullname = playerFullnameInput.value.trim();
  const email = playerEmailInput.value.trim();
  const college = playerCollegeInput.value.trim();
  const gender = playerGenderSelect.value;
  const campus = playerCampusSelect.value;
  const role = playerRoleSelect.value;

  if (!fullname || !email || !college || !gender || !campus || !role) {
    setPlayerRegStatus("Please fill in all fields", "error");
    return;
  }

  if (!email.includes("@")) {
    setPlayerRegStatus("Invalid email format", "error");
    return;
  }

  startBtn.disabled = true;
  startBtn.textContent = "REGISTERING...";

  const player = { fullname, email, college, gender, campus, role };
  const regResult = await registerPlayer(player);

  if (!regResult.ok) {
    setPlayerRegStatus(regResult.message, "error");
    resetRegistrationButton();
    return;
  }

  // Player is registered or already exists, allow them to play.
  currentPlayer = player;
  sessionStorage.setItem("currentPlayer", JSON.stringify(currentPlayer));

  setPlayerRegStatus(
    regResult.alreadyExists ? "Welcome back! " + fullname : "Registered! Welcome " + fullname,
    "success"
  );

  // Hide modal after a brief delay
  setTimeout(() => {
    closeRegistrationModal();
    resetRegistrationButton();
  }, 500);
}

// Initialize registration
async function initRegistration() {
  await loadRegisteredUsers();

  // Check if player is already in session
  const saved = sessionStorage.getItem("currentPlayer");
  if (saved) {
    try {
      currentPlayer = JSON.parse(saved);
      registrationModal.classList.add("hidden");
    } catch (e) {
      sessionStorage.removeItem("currentPlayer");
      currentPlayer = null;
    }
  }

  if (!currentPlayer && !REQUIRE_REGISTRATION) {
    currentPlayer = { ...DEFAULT_GUEST_PLAYER };
    sessionStorage.setItem("currentPlayer", JSON.stringify(currentPlayer));
  }

  if (REQUIRE_REGISTRATION && !currentPlayer) {
    openRegistrationModal();
  } else {
    closeRegistrationModal();
  }
}

openRegistrationModalBtn?.addEventListener("click", () => {
  openRegistrationModal();
});

closeRegistrationModalBtn?.addEventListener("click", () => {
  closeRegistrationModal();
});

registrationModal?.addEventListener("click", (e) => {
  if (e.target === registrationModal) {
    closeRegistrationModal();
  }
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeRegistrationModal();
  }
});

startBtn?.addEventListener("click", handlePlayerStart);
playerFullnameInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handlePlayerStart();
});
playerEmailInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handlePlayerStart();
});
playerCollegeInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handlePlayerStart();
});

const defaultSectors = [
  { color: "#FFBC03", text: "#333333", label: "Sweets", weight: 1 },
  { color: "#FF5A10", text: "#333333", label: "Prize draw", weight: 1 },
  { color: "#FFBC03", text: "#333333", label: "Sweets", weight: 1 },
  { color: "#FF5A10", text: "#333333", label: "Prize draw", weight: 1 },
  { color: "#FFBC03", text: "#333333", label: "Sweets + Prize draw", weight: 1 },
  { color: "#FF5A10", text: "#333333", label: "You lose", weight: 1 },
  { color: "#FFBC03", text: "#333333", label: "Prize draw", weight: 1 },
  { color: "#FF5A10", text: "#333333", label: "Sweets", weight: 1 },
];

const events = {
  listeners: {},
  addListener: function (eventName, fn) {
    this.listeners[eventName] = this.listeners[eventName] || [];
    this.listeners[eventName].push(fn);
  },
  fire: function (eventName, ...args) {
    if (this.listeners[eventName]) {
      for (let fn of this.listeners[eventName]) {
        fn(...args);
      }
    }
  },
};

const spinEl = document.querySelector("#spin");
const wheelCanvas = document.querySelector("#wheel");
const ctx = wheelCanvas.getContext("2d");

function resizeCanvas() {
  const container = document.querySelector("#spin_the_wheel");
  const size = Math.min(container.clientWidth, container.clientHeight);
  wheelCanvas.width = size;
  wheelCanvas.height = size;
  redraw();
}

const dia = () => wheelCanvas.width;
const rad = () => dia() / 2;
const PI = Math.PI;
const TAU = 2 * PI;
let sectors = [];
let tot = 0;
let arc = 0;

let rotation = 0; // Unbounded rotation value in radians
let isSpinning = false;

const norm = (a) => ((a % TAU) + TAU) % TAU;

const getIndex = () => {
  const a = norm(rotation);
  return ((Math.floor(tot - (a / TAU) * tot) % tot) + tot) % tot;
};

const indexForAngle = (angle) => {
  const a = norm(angle);
  return ((Math.floor(tot - (a / TAU) * tot) % tot) + tot) % tot;
};

function pickWeightedIndex() {
  let total = 0;
  for (const s of sectors) total += Number(s.weight) || 0;
  if (total <= 0) return Math.floor(Math.random() * tot);

  let r = Math.random() * total;
  for (let i = 0; i < sectors.length; i++) {
    r -= Number(sectors[i].weight) || 0;
    if (r <= 0) return i;
  }

  return sectors.length - 1;
}

function wrapLabelLines(label, maxCharsPerLine = 12) {
  const normalized = String(label || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s*\n\s*/g, "\n")
    .trim();

  if (!normalized) return [""];

  const lines = [];
  const sourceLines = normalized.split("\n");

  sourceLines.forEach((sourceLine) => {
    const words = sourceLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      return;
    }

    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = `${currentLine} ${words[i]}`;
      if (next.length <= maxCharsPerLine) {
        currentLine = next;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  });

  return lines;
}

function drawSector(sector, i) {
  const ang = arc * i;
  const r = rad();
  const fontSize = Math.max(12, Math.floor(r / 13));
  ctx.save();

  // COLOR
  ctx.beginPath();
  ctx.fillStyle = sector.color;
  ctx.moveTo(r, r);
  ctx.arc(r, r, r, ang, ang + arc);
  ctx.lineTo(r, r);
  ctx.fill();

  // TEXT
  ctx.translate(r, r);
  ctx.rotate(ang + arc / 2);
  ctx.textAlign = "right";
  ctx.fillStyle = sector.text;
  ctx.font = `bold ${fontSize}px 'Lato', sans-serif`;

  // Handle multiline and long labels on narrow sectors.
  const lines = wrapLabelLines(sector.label, 12);
  const lineHeight = fontSize * 1.2;
  const totalHeight = (lines.length - 1) * lineHeight;
  let y = 10 - totalHeight / 2;

  for (let line of lines) {
    ctx.fillText(line, r - 10, y);
    y += lineHeight;
  }

  ctx.restore();
}

function rotate() {
  const sector = sectors[getIndex()];
  ctx.canvas.style.transform = `rotate(${norm(rotation) - PI / 2}rad)`;

  spinEl.textContent = !isSpinning ? "SPIN" : sector.label.split('\n').join(' ');
  spinEl.style.background = sector.color;
  spinEl.style.color = sector.text;
}

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function angleForIndexRandom(index) {
  // Pick a random angle that still maps to the desired sector index.
  // Range derived from getIndex()/indexForAngle math.
  const start = (TAU * (tot - index - 1)) / tot;
  const end = (TAU * (tot - index)) / tot;

  // Keep away from exact boundaries to avoid floating point edge flips.
  const margin = Math.min(arc * 0.12, arc / 2 - 1e-6);
  const lo = start + margin;
  const hi = end - margin;

  if (!(hi > lo)) {
    return (start + end) / 2;
  }

  // Retry a few times to be extra sure index matches (paranoia for FP).
  for (let tries = 0; tries < 6; tries++) {
    const a = lo + Math.random() * (hi - lo);
    if (indexForAngle(a) === index) return a;
  }

  return (lo + hi) / 2;
}

function spinToIndex(index) {
  if (isSpinning) return;

  isSpinning = true;

  const start = rotation;
  const startNorm = norm(start);
  const targetBase = norm(angleForIndexRandom(index));
  const spins = 4 + Math.floor(Math.random() * 3); // 4..6 full rotations

  let delta = targetBase - startNorm;
  if (delta < 0) delta += TAU;
  const totalDelta = delta + spins * TAU;
  const durationMs = 3800 + Math.floor(Math.random() * 900);
  const startTime = performance.now();

  const tick = (now) => {
    const t = Math.min(1, (now - startTime) / durationMs);
    rotation = start + totalDelta * easeOutCubic(t);
    rotate();
    if (t < 1) {
      requestAnimationFrame(tick);
      return;
    }

    rotation = start + totalDelta;
    rotate();
    isSpinning = false;
    const landed = getIndex();
    events.fire("spinEnd", sectors[landed]);
  };

  requestAnimationFrame(tick);
}

async function loadSectors() {
  try {
    const res = await fetch("api/config.php", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load config");
    const data = await res.json();
    if (data && Array.isArray(data.sectors) && data.sectors.length >= 2) {
      return data.sectors;
    }
  } catch {
    // Ignore and fall back to defaults.
  }
  return defaultSectors;
}

function redraw() {
  if (sectors.length === 0) return;
  const r = rad();
  ctx.clearRect(0, 0, r * 2, r * 2);
  sectors.forEach(drawSector);
  rotate();
}

async function init() {
  sectors = await loadSectors();
  tot = sectors.length;
  arc = TAU / tot;

  // Initialize canvas size
  resizeCanvas();

  spinEl.addEventListener("click", () => {
    if (isSpinning) return;

    // Check if player is registered before allowing spin
    if (REQUIRE_REGISTRATION && !currentPlayer) {
      registrationModal.classList.remove("hidden");
      playerRegStatus.textContent = "Please register first to spin!";
      playerRegStatus.dataset.kind = "error";
      playerRegStatus.style.opacity = "1";
      return;
    }

    activeSpinUser = getActiveSpinUser();
    const idx = pickWeightedIndex();
    spinToIndex(idx);
  });

  // Handle window resize
  window.addEventListener("resize", resizeCanvas);

  // Initialize registration modal
  initRegistration();
  refreshQueueAndHistory();
  setInterval(refreshQueueAndHistory, 10000);
}

// Start initialization when DOM is ready
init();

events.addListener("spinEnd", async (sector) => {
  console.log(`Woop! You won ${sector.label}`);

  const normalized = String(sector.label || "").toLowerCase();
  if (normalized.includes("404")) {
    showSpinResultMessage("404 prize not found, better luck next time", "lose");
  } else {
    showSpinResultMessage(`You win a ${sector.label}!`, "win");
  }

  await saveSpinResult(activeSpinUser, sector.label);
  activeSpinUser = null;
  await refreshQueueAndHistory();
});
