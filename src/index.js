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

let currentPlayer = null;
let registeredUsers = [];

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

// Check if email is registered
function isEmailRegistered(email) {
  return registeredUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
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
    playerRegStatus.textContent = "Please fill in all fields";
    playerRegStatus.dataset.kind = "error";
    playerRegStatus.style.opacity = "1";
    return;
  }

  if (!email.includes("@")) {
    playerRegStatus.textContent = "Invalid email format";
    playerRegStatus.dataset.kind = "error";
    playerRegStatus.style.opacity = "1";
    return;
  }

  // Check if email is in registered users list
  if (!isEmailRegistered(email)) {
    playerRegStatus.textContent = "Email not registered. Contact admin to register.";
    playerRegStatus.dataset.kind = "error";
    playerRegStatus.style.opacity = "1";
    return;
  }

  // Player is registered, allow them to play
  currentPlayer = { fullname, email, college, gender, campus, role };
  sessionStorage.setItem("currentPlayer", JSON.stringify(currentPlayer));

  playerRegStatus.textContent = "Welcome! " + fullname;
  playerRegStatus.dataset.kind = "success";
  playerRegStatus.style.opacity = "1";

  // Hide modal after a brief delay
  setTimeout(() => {
    registrationModal.classList.add("hidden");
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
      registrationModal.classList.remove("hidden");
    }
  } else {
    registrationModal.classList.remove("hidden");
  }

  // Event listeners
  startBtn.addEventListener("click", handlePlayerStart);
  playerFullnameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handlePlayerStart();
  });
  playerEmailInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handlePlayerStart();
  });
  playerCollegeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handlePlayerStart();
  });
}

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

  // Handle multiline text
  const lines = sector.label.split('\n');
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
    if (!currentPlayer) {
      registrationModal.classList.remove("hidden");
      playerRegStatus.textContent = "Please register first to spin!";
      playerRegStatus.dataset.kind = "error";
      playerRegStatus.style.opacity = "1";
      return;
    }

    const idx = pickWeightedIndex();
    spinToIndex(idx);
  });

  // Handle window resize
  window.addEventListener("resize", resizeCanvas);

  // Initialize registration modal
  initRegistration();
}

// Start initialization when DOM is ready
init();

events.addListener("spinEnd", (sector) => {
  console.log(`Woop! You won ${sector.label}`);
});
