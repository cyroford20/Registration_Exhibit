const rowsEl = document.querySelector("#rows");
const statusEl = document.querySelector("#status");
const addBtn = document.querySelector("#add");
const saveBtn = document.querySelector("#save");
const sectorPanelEl = document.querySelector("#sectorPanel");
const showUserPanelBtn = document.querySelector("#showUserPanel");
const showSectorPanelBtn = document.querySelector("#showSectorPanel");
const showAllPanelsBtn = document.querySelector("#showAllPanels");

const ADMIN_PASSWORD = "admin123";
const ADMIN_SESSION_KEY = "adminAuthenticated";

function ensureAdminAccess() {
  if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "1") {
    return true;
  }

  const entered = window.prompt("Enter admin password:");
  if (entered === ADMIN_PASSWORD) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
    return true;
  }

  if (entered !== null) {
    window.alert("Incorrect password");
  }
  window.location.href = "/";
  return false;
}

if (!ensureAdminAccess()) {
  throw new Error("Unauthorized admin access");
}

function setActivePanelButton(activeBtn) {
  [showUserPanelBtn, showSectorPanelBtn, showAllPanelsBtn].forEach((btn) => {
    if (!btn) return;
    btn.classList.toggle("active", btn === activeBtn);
  });
}

function showPanel(mode) {
  if (!sectorPanelEl) return;

  const userPanelEl = document.querySelector("#userPanel");
  if (!userPanelEl) {
    sectorPanelEl.classList.remove("hidden-panel");
    setActivePanelButton(showSectorPanelBtn || showAllPanelsBtn);
    return;
  }

  if (mode === "user") {
    userPanelEl.classList.remove("hidden-panel");
    sectorPanelEl.classList.add("hidden-panel");
    setActivePanelButton(showUserPanelBtn);
    return;
  }

  if (mode === "sector") {
    userPanelEl.classList.add("hidden-panel");
    sectorPanelEl.classList.remove("hidden-panel");
    setActivePanelButton(showSectorPanelBtn);
    return;
  }

  userPanelEl.classList.remove("hidden-panel");
  sectorPanelEl.classList.remove("hidden-panel");
  setActivePanelButton(showAllPanelsBtn);
}

showUserPanelBtn?.addEventListener("click", () => showPanel("user"));
showSectorPanelBtn?.addEventListener("click", () => showPanel("sector"));
showAllPanelsBtn?.addEventListener("click", () => showPanel("all"));

if (showUserPanelBtn || showSectorPanelBtn || showAllPanelsBtn) {
  showPanel("user");
} else {
  sectorPanelEl?.classList.remove("hidden-panel");
}

const usersRowsEl = document.querySelector("#usersRows");
const regStatusEl = document.querySelector("#regStatus");
const userFullnameInput = document.querySelector("#userFullname");
const userEmailInput = document.querySelector("#userEmail");
const userCollegeInput = document.querySelector("#userCollege");
const userGenderSelect = document.querySelector("#userGender");
const userCampusSelect = document.querySelector("#userCampus");
const userRoleSelect = document.querySelector("#userRole");
const registerBtn = document.querySelector("#registerBtn");
const exportUsersExcelBtn = document.querySelector("#exportUsersExcel");
const exportUsersPdfBtn = document.querySelector("#exportUsersPdf");

let sectors = [];
let users = [];

function setRegStatus(message, kind = "") {
  if (!regStatusEl) return;
  regStatusEl.textContent = message;
  regStatusEl.style.opacity = message ? "1" : "0";
  regStatusEl.dataset.kind = kind;
}

function setUserExportStatus(message, kind = "") {
  if (regStatusEl) {
    setRegStatus(message, kind);
    return;
  }

  setStatus(message, kind);
}

function renderUsers() {
  if (!usersRowsEl) return;
  usersRowsEl.innerHTML = "";

  users.forEach((user) => {
    const tr = document.createElement("tr");

    const fullnameTd = document.createElement("td");
    fullnameTd.textContent = user.fullname;
    fullnameTd.style.color = "#ffffff";

    const emailTd = document.createElement("td");
    emailTd.textContent = user.email;
    emailTd.style.color = "#ffffff";

    const genderTd = document.createElement("td");
    genderTd.textContent = user.gender;
    genderTd.style.color = "rgba(200, 210, 255, 0.8)";

    const collegeTd = document.createElement("td");
    collegeTd.textContent = user.college;
    collegeTd.style.color = "rgba(200, 210, 255, 0.8)";

    const campusTd = document.createElement("td");
    campusTd.textContent = user.campus;
    campusTd.style.color = "rgba(200, 210, 255, 0.8)";
    campusTd.style.fontWeight = "700";

    const roleTd = document.createElement("td");
    roleTd.textContent = user.role;
    roleTd.style.color = "rgba(200, 210, 255, 0.8)";

    const dateTd = document.createElement("td");
    dateTd.textContent = new Date(user.registered_at).toLocaleString();
    dateTd.style.color = "rgba(200, 210, 255, 0.7)";
    dateTd.style.fontSize = "0.8rem";

    const deleteTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "iconBtn";
    delBtn.textContent = "Remove";
    delBtn.addEventListener("click", () => deleteUser(user.id));
    deleteTd.appendChild(delBtn);

    tr.appendChild(fullnameTd);
    tr.appendChild(emailTd);
    tr.appendChild(genderTd);
    tr.appendChild(collegeTd);
    tr.appendChild(campusTd);
    tr.appendChild(roleTd);
    tr.appendChild(dateTd);
    tr.appendChild(deleteTd);

    usersRowsEl.appendChild(tr);
  });
}

async function loadUsers() {
  if (!usersRowsEl) return;
  try {
    const res = await fetch("api/users.php", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load users");
    const data = await res.json();
    users = data.users || [];
    renderUsers();
  } catch (e) {
    setRegStatus("Error loading users: " + e.message, "error");
  }
}

async function registerUser() {
  const fullname = userFullnameInput.value.trim();
  const email = userEmailInput.value.trim();
  const college = userCollegeInput.value.trim();
  const gender = userGenderSelect.value;
  const campus = userCampusSelect.value;
  const role = userRoleSelect.value;

  if (!fullname || !email || !college || !gender || !campus || !role) {
    setRegStatus("Please fill in all fields", "error");
    return;
  }

  try {
    setRegStatus("Registering…");
    const res = await fetch("api/users.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullname, email, college, gender, campus, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Registration failed");
    }

    users = data.users || [];
    renderUsers();
    setRegStatus("User registered successfully", "success");
    userFullnameInput.value = "";
    userEmailInput.value = "";
    userCollegeInput.value = "";
    userGenderSelect.value = "";
    userCampusSelect.value = "";
    userRoleSelect.value = "";

    // Clear success message after 3 seconds
    setTimeout(() => setRegStatus(""), 3000);
  } catch (e) {
    setRegStatus(e.message, "error");
  }
}

async function deleteUser(userId) {
  if (!confirm("Are you sure you want to remove this user?")) {
    return;
  }

  try {
    setRegStatus("Removing…");
    const res = await fetch(`api/users.php?id=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Delete failed");
    }

    users = data.users || [];
    renderUsers();
    setRegStatus("User removed successfully!", "success");

    setTimeout(() => setRegStatus(""), 3000);
  } catch (e) {
    setRegStatus(e.message, "error");
  }
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function buildUsersCsv(usersList) {
  const headers = [
    "Full Name",
    "Email",
    "Gender",
    "College",
    "Campus",
    "Role",
    "Spin",
    "Prize",
    "Registered At",
    "Updated At",
  ];

  const lines = [headers.map(escapeCsvValue).join(",")];

  usersList.forEach((user) => {
    lines.push(
      [
        user.fullname,
        user.email,
        user.gender,
        user.college,
        user.campus,
        user.role,
        user.spin,
        user.prizeGet,
        user.registered_at,
        user.updated_at,
      ]
        .map(escapeCsvValue)
        .join(",")
    );
  });

  return lines.join("\r\n");
}

async function exportUsersToExcel() {
  try {
    setUserExportStatus("Preparing Excel export...");
    const res = await fetch("api/users.php", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load users");
    }

    const data = await res.json();
    const usersList = Array.isArray(data.users) ? data.users : [];

    if (!usersList.length) {
      setUserExportStatus("No users to export", "error");
      return;
    }

    const date = new Date().toISOString().slice(0, 10);

    if (window.XLSX && typeof window.XLSX.utils?.book_new === "function") {
      const exportRows = usersList.map((user) => ({
        "Full Name": user.fullname || "",
        Email: user.email || "",
        Gender: user.gender || "",
        College: user.college || "",
        Campus: user.campus || "",
        Role: user.role || "",
        Spin: user.spin || "",
        Prize: user.prizeGet || "",
        "Registered At": user.registered_at || "",
        "Updated At": user.updated_at || "",
      }));

      const workbook = window.XLSX.utils.book_new();
      const worksheet = window.XLSX.utils.json_to_sheet(exportRows);
      window.XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
      window.XLSX.writeFile(workbook, `registered-users-${date}.xlsx`);
    } else {
      const csv = buildUsersCsv(usersList);
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `registered-users-${date}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    setUserExportStatus("Excel export ready", "success");
    setTimeout(() => setUserExportStatus(""), 3000);
  } catch (e) {
    setUserExportStatus("Export failed: " + e.message, "error");
  }
}

async function exportUsersToPdf() {
  try {
    setUserExportStatus("Preparing PDF export...");
    const res = await fetch("api/users.php", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Failed to load users");
    }

    const data = await res.json();
    const usersList = Array.isArray(data.users) ? data.users : [];

    if (!usersList.length) {
      setUserExportStatus("No users to export", "error");
      return;
    }

    if (!window.jspdf || typeof window.jspdf.jsPDF !== "function") {
      throw new Error("PDF library failed to load");
    }

    const doc = new window.jspdf.jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const now = new Date();
    const dateLabel = now.toLocaleString();

    const columns = [
      "Full Name",
      "Email",
      "Gender",
      "College",
      "Campus",
      "Role",
      "Spin",
      "Prize",
      "Registered At",
    ];

    const rows = usersList.map((user) => [
      user.fullname || "",
      user.email || "",
      user.gender || "",
      user.college || "",
      user.campus || "",
      user.role || "",
      user.spin || "",
      user.prizeGet || "",
      user.registered_at ? new Date(user.registered_at).toLocaleString() : "",
    ]);

    doc.autoTable({
      head: [columns],
      body: rows,
      startY: 110,
      margin: { left: 24, right: 24, top: 88, bottom: 36 },
      styles: { fontSize: 8, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [12, 54, 94], textColor: [235, 248, 255], fontStyle: "bold" },
      didDrawPage: (hookData) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageNumber = doc.internal.getNumberOfPages();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(12, 54, 94);
        doc.text("Cyber Spin Wheel - Registered Users", 24, 36);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(80, 92, 108);
        doc.text(`Generated: ${dateLabel}`, 24, 56);
        doc.text(`Total users: ${usersList.length}`, 24, 72);

        doc.setDrawColor(210, 218, 226);
        doc.line(24, 82, pageWidth - 24, 82);

        doc.setFontSize(9);
        doc.setTextColor(95, 106, 119);
        doc.text("Cyber Spin Wheel Admin Report", 24, pageHeight - 16);
        doc.text(`Page ${pageNumber}`, pageWidth - 70, pageHeight - 16);
      },
    });

    const fileDate = now.toISOString().slice(0, 10);
    doc.save(`registered-users-${fileDate}.pdf`);

    setUserExportStatus("PDF export ready", "success");
    setTimeout(() => setUserExportStatus(""), 3000);
  } catch (e) {
    setUserExportStatus("PDF export failed: " + e.message, "error");
  }
}

function updateProbabilities() {
  const totalWeight = sectors.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
  const rows = Array.from(rowsEl.children);

  for (let i = 0; i < rows.length; i++) {
    const tr = rows[i];
    const sector = sectors[i];
    if (!sector) continue;

    // Columns: Label, Color, Text, Weight, Probability, Delete
    const probCell = tr.children[4];
    if (!probCell) continue;

    const w = Number(sector.weight) || 0;
    const p = totalWeight > 0 ? (w / totalWeight) * 100 : NaN;
    probCell.textContent = Number.isFinite(p) ? `${p.toFixed(2)}%` : "—";
  }
}

function setStatus(message, kind = "") {
  statusEl.textContent = message;
  statusEl.style.opacity = message ? "1" : "0";
  statusEl.dataset.kind = kind;
}

function createInput(value, type = "text", placeholder = "") {
  const input = document.createElement("input");
  input.type = type;
  input.value = value ?? "";
  if (placeholder) {
    input.placeholder = placeholder;
  }
  return input;
}

function createTextArea(value, placeholder = "") {
  const textarea = document.createElement("textarea");
  textarea.value = value ?? "";
  textarea.rows = 2;
  if (placeholder) {
    textarea.placeholder = placeholder;
  }
  return textarea;
}

function render() {
  rowsEl.innerHTML = "";

  sectors.forEach((sector, index) => {
    const tr = document.createElement("tr");

    const labelTd = document.createElement("td");
    const labelInput = createTextArea(sector.label, "Sector label");
    labelInput.className = "labelEditor";
    labelInput.addEventListener("input", () => (sectors[index].label = labelInput.value));
    labelTd.appendChild(labelInput);

    const colorTd = document.createElement("td");
    const colorInput = createInput(sector.color, "text", "#RRGGBB");
    colorInput.addEventListener("input", () => (sectors[index].color = colorInput.value));
    colorTd.appendChild(colorInput);

    const textTd = document.createElement("td");
    const textInput = createInput(sector.text, "text", "#RRGGBB");
    textInput.addEventListener("input", () => (sectors[index].text = textInput.value));
    textTd.appendChild(textInput);

    const weightTd = document.createElement("td");
    const weightInput = createInput(String(sector.weight ?? 1), "number");
    weightInput.min = "0";
    weightInput.step = "0.1";
    weightInput.addEventListener(
      "input",
      () => {
        sectors[index].weight = Number(weightInput.value || 0);
        updateProbabilities();
      }
    );
    weightTd.appendChild(weightInput);

    const probTd = document.createElement("td");
    probTd.textContent = "—";

    const deleteTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.className = "iconBtn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => {
      sectors.splice(index, 1);
      render();
    });
    deleteTd.appendChild(delBtn);

    tr.appendChild(labelTd);
    tr.appendChild(colorTd);
    tr.appendChild(textTd);
    tr.appendChild(weightTd);
    tr.appendChild(probTd);
    tr.appendChild(deleteTd);

    rowsEl.appendChild(tr);
  });

  updateProbabilities();
}

async function load() {
  setStatus("Loading…");
  const res = await fetch("api/config.php", { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Failed to load config");
  }
  if (!data || !Array.isArray(data.sectors)) throw new Error("Invalid config format");
  sectors = data.sectors;
  render();
  setStatus("");
}

async function save() {
  setStatus("Saving…");

  const payload = {
    version: 1,
    sectors,
  };

  const res = await fetch("api/config.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.error ? data.error : "Save failed";
    setStatus(msg);
    return;
  }

  sectors = data.config?.sectors || sectors;
  render();
  setStatus("Saved.");
}

addBtn.addEventListener("click", () => {
  sectors.push({
    label: "New sector",
    color: "#FFBC03",
    text: "#FFFFFF",
    weight: 1,
  });
  render();
});

saveBtn.addEventListener("click", () => {
  save().catch((e) => setStatus(e.message || String(e)));
});

registerBtn?.addEventListener("click", () => {
  registerUser();
});

exportUsersExcelBtn?.addEventListener("click", () => {
  exportUsersToExcel();
});

exportUsersPdfBtn?.addEventListener("click", () => {
  exportUsersToPdf();
});

userFullnameInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") registerUser();
});

userEmailInput?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") registerUser();
});

// Load wheel config on page load
load().catch((e) => setStatus(e.message || String(e)));
