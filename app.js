// PujoTun — app logic. No framework: template strings + full re-render on
// every state change. Simple on purpose; the interesting part is the Store
// abstraction (store.js), which swaps localStorage for the shared Claude db
// capability transparently.

let state = null;
const ui = {
  screen: "profiles", // profiles | user | admin-gate | admin
  currentMemberId: null,
  activeDayId: null,
  adminSection: "overview", // overview | settings | members | menu
  adminActiveDayId: null,
  dayModalOpenId: null,
  qrModalOpen: false,
};

// ---------- boot ----------

async function boot() {
  const app = document.getElementById("app");
  if (app) app.innerHTML = `<div class="loading-screen"><div class="loading-emoji">🍻</div><p>Loading...</p></div>`;
  state = await Store.init(SEED_DATA, (newState) => {
    state = newState;
    render();
  });
  await recalcShares();
  render();
}
document.addEventListener("DOMContentLoaded", boot);

// ---------- avatars (illustrated, not emoji) ----------

const AVATAR_PALETTE = ["#e2483a", "#e8ab37", "#4f9b6e", "#3aa0c9", "#a05fd1", "#d6497a", "#e07b39", "#5b7fe0"];
const AVATAR_FACES = ["wink", "chill", "wide", "shades"];
const AVATAR_TOTAL = AVATAR_PALETTE.length * AVATAR_FACES.length * 2; // * hat on/off

function avatarSvg(index) {
  const n = AVATAR_TOTAL;
  index = (((Number(index) || 0) % n) + n) % n;
  const hat = index % 2 === 1;
  const rest = Math.floor(index / 2);
  const bg = AVATAR_PALETTE[rest % AVATAR_PALETTE.length];
  const face = AVATAR_FACES[Math.floor(rest / AVATAR_PALETTE.length) % AVATAR_FACES.length];
  const ink = "#1a1114";
  const blush = `<ellipse cx="18" cy="38" rx="5" ry="3" fill="#000" opacity="0.12"/><ellipse cx="46" cy="38" rx="5" ry="3" fill="#000" opacity="0.12"/>`;
  let features;
  if (face === "wink") {
    features = `${blush}<path d="M16 27 q6 -5 12 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="42" cy="27" r="3.6" fill="${ink}"/><path d="M18 42 q14 11 28 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  } else if (face === "chill") {
    features = `${blush}<path d="M16 27 q6 -5 12 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M36 27 q6 -5 12 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M18 41 q14 12 28 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  } else if (face === "wide") {
    features = `${blush}<circle cx="21" cy="27" r="5.5" fill="#fff"/><circle cx="22" cy="28" r="3" fill="${ink}"/><circle cx="43" cy="27" r="5.5" fill="#fff"/><circle cx="44" cy="28" r="3" fill="${ink}"/><path d="M20 41 q12 10 24 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  } else {
    features = `<rect x="12" y="22" width="40" height="11" rx="5.5" fill="${ink}"/><rect x="30" y="25.5" width="4" height="4" fill="${ink}"/>${blush}<path d="M18 42 q14 11 28 0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  }
  const hatColor = AVATAR_PALETTE[(rest + 3) % AVATAR_PALETTE.length];
  const hatMarkup = hat
    ? `<path d="M32 3 L23 17 L41 17 Z" fill="#fff" opacity="0.92"/><circle cx="32" cy="3" r="3.4" fill="${hatColor}"/>`
    : "";
  return `<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="avatar"><circle cx="32" cy="32" r="32" fill="${bg}"/>${features}${hatMarkup}</svg>`;
}

// Generated bottle icon per liquor item — no external image fetch (blocked
// in the sandboxed artifact anyway); color guessed from the item's name.
function bottleSvg(name) {
  const n = String(name || "").toLowerCase();
  let liquid = "#caa24a"; // whisky/rum default (amber)
  if (/beer|lager|strong|tuborg|kingfisher|budweiser|corona/.test(n)) liquid = "#e8ab37";
  else if (/wine|shiraz|merlot|red\b/.test(n)) liquid = "#7a1f3d";
  else if (/vodka|gin|white/.test(n)) liquid = "#dfe7ee";
  else if (/rum|monk|bacardi|old monk/.test(n)) liquid = "#8a4a1e";
  const glass = "#2a3a3d";
  return `<svg viewBox="0 0 40 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="bottle">
    <rect x="16" y="2" width="8" height="12" rx="2" fill="${glass}"/>
    <path d="M14 14 h12 l3 8 v34 a3 3 0 0 1 -3 3 h-12 a3 3 0 0 1 -3 -3 v-34 z" fill="${glass}" opacity="0.9"/>
    <path d="M12 30 h16 v25 a3 3 0 0 1 -3 3 h-10 a3 3 0 0 1 -3 -3 z" fill="${liquid}"/>
    <rect x="11" y="38" width="18" height="10" rx="1.5" fill="#f7ece4" opacity="0.9"/>
  </svg>`;
}

// ---------- small utils ----------

function esc(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function money(n) {
  n = Number(n) || 0;
  return "₹" + n.toLocaleString("en-IN");
}

function todayStr() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function fmtDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
}

function fmtDateLong(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", weekday: "long" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date(todayStr() + "T00:00:00");
  if (isNaN(target) || isNaN(now)) return null;
  return Math.round((target - now) / 86400000);
}

function defaultDayId() {
  const t = todayStr();
  const hit = state.days.find((d) => d.date === t);
  return hit ? hit.id : state.days[0] && state.days[0].id;
}

function lineTotal(it) {
  return (Number(it.price) || 0) * (Number(it.qty) || 0);
}

function dayMenuTotal(day) {
  const liquorTotal = day.liquor.reduce((s, it) => s + lineTotal(it), 0);
  const chaknaTotal = (day.chakna || []).reduce((s, it) => s + lineTotal(it), 0);
  return liquorTotal + chaknaTotal;
}

function computeMenuTotal() {
  let total = 0;
  for (const d of state.days) total += dayMenuTotal(d);
  return total;
}

async function recalcShares() {
  const divisor = state.members.length || state.config.totalPeople || 1;
  const perHead = Math.round(computeMenuTotal() / divisor);
  const writes = [];
  for (const m of state.members) {
    if (m.share !== perHead) {
      m.share = perHead;
      writes.push(Store.saveMember(m));
    }
  }
  if (writes.length) await Promise.all(writes);
}

function emptyState(msg) {
  return '<p class="empty-state">' + esc(msg) + "</p>";
}

function buildUpiLink(cfg, scheme) {
  const params = new URLSearchParams();
  params.set("pa", cfg.upiId || "");
  params.set("pn", cfg.payeeName || "");
  if (cfg.payNote) params.set("tn", cfg.payNote);
  params.set("cu", "INR");
  return (scheme || "upi") + "://pay?" + params.toString();
}

function toast(msg) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  root.textContent = msg;
  root.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => root.classList.remove("show"), 2200);
}

let _pendingConfirm = null;
function confirmAction(message, onYes) {
  _pendingConfirm = onYes;
  const root = document.getElementById("confirm-root");
  root.innerHTML = `
    <div class="confirm-overlay" onclick="closeConfirm(event)">
      <div class="confirm-box" onclick="event.stopPropagation()">
        <p>${esc(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" onclick="closeConfirm()">Na Thak</button>
          <button class="btn btn-danger" onclick="runConfirm()">Hae, Koro</button>
        </div>
      </div>
    </div>`;
}
function runConfirm() {
  const cb = _pendingConfirm;
  closeConfirm();
  if (cb) cb();
}
function closeConfirm(e) {
  if (e && e.target !== e.currentTarget) return;
  const root = document.getElementById("confirm-root");
  if (root) root.innerHTML = "";
  _pendingConfirm = null;
}

// ---------- due reminder (nags every 2 min while on the user screen) ----------

let _dueReminderTimer = null;
function stopDueReminder() {
  if (_dueReminderTimer) {
    clearInterval(_dueReminderTimer);
    _dueReminderTimer = null;
  }
}
function startDueReminder() {
  stopDueReminder();
  _dueReminderTimer = setInterval(() => {
    if (ui.screen !== "user") {
      stopDueReminder();
      return;
    }
    const m = state.members.find((x) => x.id === ui.currentMemberId);
    if (!m) {
      stopDueReminder();
      return;
    }
    const due = Math.max(0, m.share - m.paid);
    if (due > 0) toast(`Ei je 👀 ${money(due)} baki ache — Pay Now chap diye de!`);
    else stopDueReminder();
  }, 120000);
}

// ---------- render dispatch ----------

function render() {
  const app = document.getElementById("app");
  if (!app) return;
  let html;
  if (ui.screen === "user") html = renderUser();
  else if (ui.screen === "admin-gate") html = renderAdminGate();
  else if (ui.screen === "admin") html = renderAdmin();
  else html = renderProfiles();
  app.innerHTML = html;
  renderModals();

  if (ui.screen === "admin-gate") {
    const inp = document.getElementById("admin-pin-input");
    if (inp) {
      inp.focus();
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitAdminPin();
      });
    }
  }
}

// ---------- navigation ----------

function selectMember(id) {
  ui.currentMemberId = id;
  ui.screen = "user";
  ui.activeDayId = null;
  render();
  startDueReminder();
}
function goProfiles() {
  stopDueReminder();
  ui.screen = "profiles";
  render();
}
function goAdminGate() {
  ui.screen = "admin-gate";
  render();
}
function setAdminSection(key) {
  ui.adminSection = key;
  render();
}
function setAdminDay(id) {
  ui.adminActiveDayId = id;
  ui.dayModalOpenId = id;
  render();
}
function closeDayEditorModal(e) {
  if (e && e.target !== e.currentTarget) return;
  ui.dayModalOpenId = null;
  render();
}
function openQrModal() {
  ui.qrModalOpen = true;
  render();
}
function closeQrModal(e) {
  if (e && e.target !== e.currentTarget) return;
  ui.qrModalOpen = false;
  render();
}

function renderModals() {
  const root = document.getElementById("modal-root");
  if (!root) return;

  if (ui.qrModalOpen) {
    root.innerHTML = `
      <div class="modal-overlay" onclick="closeQrModal(event)">
        <div class="modal-box qr-modal-box" onclick="event.stopPropagation()">
          <button class="modal-close" onclick="closeQrModal()">✕</button>
          <div class="qr-modal-inner">
            <div id="upi-qr-big"></div>
            <p class="upi-id-text">${state.config ? esc(state.config.upiId) : ""}</p>
            <button class="btn btn-primary" onclick="saveQrImage()">⬇️ Save Image</button>
          </div>
        </div>
      </div>`;
    initUpiQrBig();
    return;
  }

  const day = ui.dayModalOpenId && state.days.find((d) => d.id === ui.dayModalOpenId);
  if (!day) {
    root.innerHTML = "";
    return;
  }
  root.innerHTML = `
    <div class="modal-overlay" onclick="closeDayEditorModal(event)">
      <div class="modal-box" onclick="event.stopPropagation()">
        <button class="modal-close" onclick="closeDayEditorModal()">✕</button>
        ${renderAdminDayEditor(day)}
      </div>
    </div>`;
}
function toggleDay(id) {
  ui.activeDayId = ui.activeDayId === id ? null : id;
  render();
}

function submitAdminPin() {
  const inp = document.getElementById("admin-pin-input");
  const val = inp ? inp.value : "";
  if (val && val === state.config.adminPin) {
    ui.screen = "admin";
    ui.adminSection = "overview";
    render();
  } else {
    const err = document.getElementById("gate-error");
    if (err) err.textContent = "PIN mile ni, abar try koro.";
    if (inp) {
      inp.classList.add("shake");
      setTimeout(() => inp.classList.remove("shake"), 400);
    }
  }
}

// ---------- profiles screen ----------

function renderProfiles() {
  const cfg = state.config;
  const tiles = state.members
    .map(
      (m) => `
      <button class="profile-tile" onclick="selectMember('${m.id}')">
        <span class="avatar-ring"><span class="avatar-emoji">${avatarSvg(m.avatar)}</span></span>
        <span class="profile-name">${esc(m.name)}</span>
      </button>`
    )
    .join("");

  return `
    <div class="profiles-screen">
      <div class="glow glow-a"></div>
      <div class="glow glow-b"></div>
      <div class="profiles-inner">
        <p class="kicker">${esc(cfg.tagline || "")}</p>
        <h1 class="profiles-title">Aaj Ke Ke Malkhor? <span>🍻</span></h1>
        <p class="profiles-sub">Profile bechhe nao — sob hishab-nikash, mod er list, r "koto baki" ekhane pabi.</p>
        <div class="profiles-grid">
          ${tiles}
          <button class="profile-tile admin-tile" onclick="goAdminGate()">
            <span class="avatar-ring admin-ring"><span class="avatar-emoji admin-emoji">👑</span></span>
            <span class="profile-name">Admin</span>
          </button>
        </div>
      </div>
    </div>`;
}

// ---------- user dashboard ----------

function renderUser() {
  const cfg = state.config;
  const member = state.members.find((m) => m.id === ui.currentMemberId);
  if (!member) {
    ui.screen = "profiles";
    return renderProfiles();
  }
  if (!ui.activeDayId || !state.days.find((d) => d.id === ui.activeDayId)) {
    ui.activeDayId = defaultDayId();
  }
  const due = Math.max(0, member.share - member.paid);
  const payLink = buildUpiLink(cfg, "phonepe");
  const daysLeft = daysUntil(cfg.startDate);

  return `
    <div class="user-screen">
      <header class="user-topbar">
        <div class="brand">
          <span class="brand-emoji">🪔</span>
          <div>
            <h1>${esc(cfg.title)}</h1>
            <span>${esc(cfg.tagline || "")}</span>
          </div>
        </div>
        <div class="user-who">
          <span class="who-avatar">${avatarSvg(member.avatar)}</span>
          <span class="who-name">${esc(member.name)}</span>
          <button class="btn btn-ghost small logout-btn" onclick="goProfiles()" title="Profile change koro">🚪</button>
        </div>
      </header>

      <div class="date-strip">
        <span>📅 Aaj: ${fmtDateShort(todayStr())}</span>
        ${
          daysLeft == null
            ? ""
            : daysLeft > 0
            ? `<span class="countdown-badge">⏳ ${daysLeft} Din Baki Pujo Shuru Hote!</span>`
            : daysLeft === 0
            ? `<span class="countdown-badge">🎉 Aaj Pujo Shuru!</span>`
            : `<span class="countdown-badge">🎊 Pujo Cholche / Sesh!</span>`
        }
      </div>

      <section class="due-hero ${due > 0 ? "pending" : "clear"}">
        <span class="due-hero-label">${due > 0 ? "Tor Baki Ache" : "Status"}</span>
        <div class="due-hero-row">
          <span class="due-hero-amount">${due > 0 ? money(due) : "Clear! ✅"}</span>
          <a class="btn btn-primary btn-big" href="${esc(payLink)}">💸 ${due > 0 ? "Taka De" : "Extra Taka De"}</a>
        </div>
      </section>

      ${renderStats(cfg, member)}
      ${renderPayCard(cfg, member)}

      <section class="day-section">
        <h2 class="section-heading">Prottek Din er Hisab 📅</h2>
        <div class="day-accordion">${renderDayAccordion(state.days, ui.activeDayId)}</div>
      </section>

      <footer class="app-footer">Toiri holo adda diye, mod diye na 😉 · ${esc(cfg.title)}</footer>
    </div>`;
}

function renderStats(cfg, member) {
  return `
    <div class="stats-row">
      <div class="stat-tile">
        <span class="stat-label">Menu Budget</span>
        <span class="stat-value">${money(computeMenuTotal())}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">Total Lok</span>
        <span class="stat-value">${state.members.length || cfg.totalPeople}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">Tor Share</span>
        <span class="stat-value">${money(member.share)}</span>
      </div>
    </div>`;
}

function renderPayCard(cfg, member) {
  return `
    <div class="pay-card">
      <button class="qr-open-btn" onclick="openQrModal()">
        <span class="qr-open-icon">📷</span>
        <span>QR Dekho</span>
      </button>
      <div class="pay-info">
        <p class="pay-note">Amount fix na, joto khushi pathiye de. QR scan kora shobcheye safe — sob UPI app e chole.</p>
        <div class="pay-actions">
          <button class="btn btn-ghost" onclick="copyUpi('${esc(cfg.upiId)}')">Copy UPI ID</button>
        </div>
        <p class="upi-id-text">${esc(cfg.upiId)} · ${esc(cfg.payeeName)}</p>
      </div>
    </div>`;
}

function renderDayAccordion(days, activeId) {
  if (!days.length) return emptyState("Kono din set kora nei ekhono. Admin ke bolo.");
  const divisor = state.members.length || state.config.totalPeople || 1;
  const t = todayStr();
  return days
    .map((d) => {
      const open = d.id === activeId;
      const dTotal = dayMenuTotal(d);
      const dShare = Math.round(dTotal / divisor);
      const isToday = d.date === t;
      return `
      <div class="day-acc-item ${open ? "open" : ""}">
        <button class="day-acc-head" onclick="toggleDay('${d.id}')">
          <span class="day-acc-title">
            <span class="day-acc-label">${esc(d.label)}</span>
            <span class="day-acc-date">${fmtDateShort(d.date)}</span>
            ${isToday ? '<span class="today-dot" title="Aaj"></span>' : ""}
          </span>
          <span class="day-acc-hisab">
            <span>Total Korcha: <strong>${money(dTotal)}</strong></span>
            <span>Tor Share: <strong>${money(dShare)}</strong></span>
          </span>
          <span class="day-acc-chevron">${open ? "▲" : "▼"}</span>
        </button>
        ${
          open
            ? `<div class="day-acc-body">
          ${d.subtitle ? `<span class="day-subtitle">${esc(d.subtitle)}</span>` : ""}
          ${renderDayContent(d)}
        </div>`
            : ""
        }
      </div>`;
    })
    .join("");
}

function renderDayContent(day) {
  const liquorCards =
    day.liquor
      .map(
        (item) => `
      <div class="liquor-card">
        <div class="liquor-bottle">${bottleSvg(item.name)}</div>
        <div class="liquor-info">
          <h4>${esc(item.name)}</h4>
          <div class="liquor-meta">
            ${item.ml ? `<span>${item.ml} ml</span>` : ""}
            ${item.qty != null ? `<span>${item.qty} piece</span>` : ""}
          </div>
        </div>
        <div class="liquor-price">${item.price ? money(item.price) : "Free"}</div>
      </div>`
      )
      .join("") || emptyState("Ajke kono mod list kora hoyni. Bore giye chup kore boshe thako 🙃");

  const chaknaRows =
    (day.chakna || [])
      .map(
        (c) =>
          `<div class="chakna-row-item"><span>${esc(c.name)}${c.qty ? ` × ${c.qty}` : ""}</span><span>${c.price ? money(lineTotal(c)) : ""}</span></div>`
      )
      .join("") || emptyState("Chakna decide hoyni ekhono.");

  const special =
    day.special && day.special.name
      ? `
      <div class="special-card">
        <span class="special-badge">✨ Aajker Special</span>
        <h4>${esc(day.special.name)}</h4>
      </div>`
      : "";

  return `
    <div class="day-content">
      <div class="day-main">
        <h3 class="section-heading">Ajker Mod List 🍾</h3>
        <div class="liquor-grid">${liquorCards}</div>
      </div>
      <aside class="day-side">
        ${special}
        <h3 class="section-heading">Chakna 🍟</h3>
        <div class="chakna-list">${chaknaRows}</div>
      </aside>
    </div>`;
}

function initUpiQrBig() {
  const el = document.getElementById("upi-qr-big");
  if (!el) return;
  el.innerHTML = "";
  if (typeof QRCode === "undefined") {
    el.innerHTML = '<span class="qr-fallback">QR load hoyni</span>';
    return;
  }
  try {
    new QRCode(el, {
      text: buildUpiLink(state.config),
      width: 240,
      height: 240,
      colorDark: "#1a1114",
      colorLight: "#f7ece4",
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (e) {
    el.innerHTML = '<span class="qr-fallback">QR load hoyni</span>';
  }
}

function saveQrImage() {
  const container = document.getElementById("upi-qr-big");
  const canvas = container && container.querySelector("canvas");
  if (!canvas) {
    toast("QR pawa jayni, abar try koro.");
    return;
  }
  canvas.toBlob(async (blob) => {
    if (!blob) {
      toast("Save kora gelo na.");
      return;
    }
    if (window.claude) {
      try {
        const downloads = await window.claude.use("downloads");
        if (downloads) {
          await downloads.save({ filename: "pujotun-upi-qr.png", data: blob });
          toast("Save hoye geche! ✅");
          return;
        }
      } catch (e) {
        // fall through to the plain-download path below
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pujotun-upi-qr.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Save hoye geche! ✅");
  }, "image/png");
}

function copyUpi(id) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(id)
      .then(() => toast("UPI ID copy hoye geche!"))
      .catch(() => toast("Copy hoyni, manually koro."));
  } else {
    toast("Copy support nei ei browser e.");
  }
}

// ---------- admin gate ----------

function renderAdminGate() {
  return `
    <div class="gate-screen">
      <div class="glow glow-a"></div>
      <div class="gate-card">
        <div class="gate-emoji">👑</div>
        <h2>Admin Adda</h2>
        <p>PIN dao dekhi, tarpor dhuke por.</p>
        <input id="admin-pin-input" type="password" inputmode="numeric" autocomplete="off" class="pin-input" placeholder="PIN" />
        <div id="gate-error" class="gate-error"></div>
        <div class="gate-actions">
          <button class="btn btn-primary" onclick="submitAdminPin()">Dhoko</button>
          <button class="btn btn-ghost" onclick="goProfiles()">Fire Jaa</button>
        </div>
      </div>
    </div>`;
}

// ---------- admin panel ----------

function renderAdmin() {
  const cfg = state.config;
  const sections = {
    overview: renderAdminOverview,
    settings: renderAdminSettings,
    members: renderAdminMembers,
    menu: renderAdminMenu,
  };
  const navItems = [
    ["overview", "📊", "Overview"],
    ["settings", "⚙️", "Pujo Settings"],
    ["members", "🧑‍🤝‍🧑", "Members"],
    ["menu", "🍾", "Daily Menu"],
  ];
  return `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-brand"><span>👑</span> Admin Adda</div>
        <nav>
          ${navItems
            .map(
              ([key, icon, label]) => `
            <button class="admin-nav-item ${ui.adminSection === key ? "active" : ""}" onclick="setAdminSection('${key}')">
              <span>${icon}</span> ${label}
            </button>`
            )
            .join("")}
        </nav>
        <button class="admin-exit" onclick="goProfiles()">⏏️ Beriye Jaa</button>
      </aside>
      <main class="admin-main">
        ${sections[ui.adminSection](cfg)}
      </main>
    </div>`;
}

function renderAdminOverview(cfg) {
  const totalPaid = state.members.reduce((s, m) => s + m.paid, 0);
  const totalShare = state.members.reduce((s, m) => s + m.share, 0);
  const pct = totalShare ? Math.min(100, Math.round((totalPaid / totalShare) * 100)) : 0;
  const dueMembers = state.members
    .map((m) => ({ ...m, due: Math.max(0, m.share - m.paid) }))
    .filter((m) => m.due > 0)
    .sort((a, b) => b.due - a.due);

  return `
    <div class="admin-card">
      <h2 class="section-heading">Overview 📊</h2>
      <div class="stats-row">
        <div class="stat-tile"><span class="stat-label">Menu Budget</span><span class="stat-value">${money(computeMenuTotal())}</span></div>
        <div class="stat-tile"><span class="stat-label">Joma Hoyeche</span><span class="stat-value">${money(totalPaid)}</span></div>
        <div class="stat-tile"><span class="stat-label">Members</span><span class="stat-value">${state.members.length}</span></div>
        <div class="stat-tile"><span class="stat-label">Din</span><span class="stat-value">${state.days.length}</span></div>
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>Collection Progress</span><span>${pct}%</span></div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <h3 class="section-heading small">Ekhono Baki Ache</h3>
      ${
        dueMembers.length
          ? `<div class="due-list">${dueMembers
              .map(
                (m) =>
                  `<div class="due-row"><span><span class="mini-avatar">${avatarSvg(m.avatar)}</span>${esc(m.name)}</span><span class="due-amt">${money(m.due)}</span></div>`
              )
              .join("")}</div>`
          : emptyState("Sobai clear! Party time 🎉")
      }
    </div>`;
}

function renderAdminSettings(cfg) {
  return `
    <div class="admin-card">
      <h2 class="section-heading">Pujo Settings ⚙️</h2>
      <div class="form-grid">
        <label>Pujo'r Naam
          <input value="${esc(cfg.title)}" onchange="updateConfigField('title', this.value)" />
        </label>
        <label>Tagline
          <input value="${esc(cfg.tagline || "")}" onchange="updateConfigField('tagline', this.value)" />
        </label>
        <label>Shuru'r Date
          <input type="date" value="${esc(cfg.startDate || "")}" onchange="updateConfigField('startDate', this.value)" />
        </label>
        <label>Total Lok
          <input type="number" value="${cfg.totalPeople}" onchange="updateConfigField('totalPeople', Number(this.value)||0)" />
        </label>
      </div>
      <p class="hint">💡 Total Budget ekhon manually dite hoy na — Daily Menu er sob mod-item er (dam × piece) jog kore automatic calculate hoy.</p>

      <h3 class="section-heading small">Payment (UPI)</h3>
      <div class="form-grid">
        <label>UPI ID
          <input value="${esc(cfg.upiId)}" onchange="updateConfigField('upiId', this.value)" />
        </label>
        <label>Payee Naam
          <input value="${esc(cfg.payeeName)}" onchange="updateConfigField('payeeName', this.value)" />
        </label>
        <label>Payment Note
          <input value="${esc(cfg.payNote || "")}" onchange="updateConfigField('payNote', this.value)" />
        </label>
      </div>

      <h3 class="section-heading small">Admin Access</h3>
      <div class="form-grid">
        <label>Admin PIN
          <input value="${esc(cfg.adminPin)}" onchange="updateConfigField('adminPin', this.value)" />
        </label>
      </div>
      <p class="hint">💡 Eta PIN shudhu UI-level gate — real security noy. Live link (Claude Artifact) share korar shomoy jader admin banate chao khali tader-i "Can edit" access dio, baki sobai ke "Can view".</p>
    </div>`;
}

function renderAdminMembers() {
  return `
    <div class="admin-card">
      <h2 class="section-heading">Members 🧑‍🤝‍🧑</h2>
      <div class="member-table">
        <div class="member-row member-row-head">
          <span></span><span>Naam</span><span>Share (Auto)</span><span>Paid</span><span>Baki</span><span></span>
        </div>
        ${state.members
          .map((m) => {
            const due = Math.max(0, m.share - m.paid);
            return `
          <div class="member-row">
            <button class="avatar-btn" title="Avatar change koro" onclick="cycleAvatar('${m.id}')">${avatarSvg(m.avatar)}</button>
            <input value="${esc(m.name)}" onchange="updateMemberField('${m.id}','name', this.value)" />
            <span class="share-auto" title="Daily menu er dam onujayi auto calculate hoy">${money(m.share)}</span>
            <input type="number" value="${m.paid}" onchange="updateMemberField('${m.id}','paid', Number(this.value)||0)" />
            <span class="${due > 0 ? "due-amt" : "clear-amt"}">${due > 0 ? money(due) : "Clear"}</span>
            <span class="row-actions">
              <button class="mini-btn" onclick="markFullyPaid('${m.id}')" title="Fully Paid Mark Koro">✅</button>
              <button class="mini-btn danger" onclick="removeMember('${m.id}')" title="Delete">🗑️</button>
            </span>
          </div>`;
          })
          .join("")}
      </div>
      <div class="add-row">
        <input id="new-member-name" placeholder="Notun member er naam" />
        <button class="btn btn-primary" onclick="addMember()">+ Jog Koro</button>
      </div>
      <p class="hint">💡 Share ekhon auto-calculate hoy: shob din er mod list er (dam × piece) jog kore, total member number diye vag kore dey.</p>
    </div>`;
}

function renderAdminMenu() {
  const days = state.days;
  const divisor = state.members.length || state.config.totalPeople || 1;
  return `
    <div class="admin-menu">
      <div class="admin-card">
        <h2 class="section-heading">Daily Menu 🍾</h2>
        <p class="hint" style="margin-top:-4px;margin-bottom:14px;">Ekta din e click koro — popup e mod/chakna/special sob edit korte parbe.</p>
        <div class="day-list">
          ${
            days
              .map((d) => {
                const dTotal = dayMenuTotal(d);
                const dShare = Math.round(dTotal / divisor);
                return `
            <button class="day-list-row" onclick="setAdminDay('${d.id}')">
              <span class="day-list-main">
                <span class="day-list-label">${esc(d.label)}</span>
                <span class="day-list-date">${fmtDateShort(d.date)}</span>
              </span>
              <span class="day-list-hisab">
                <span>Korcha: <strong>${money(dTotal)}</strong></span>
                <span>Share: <strong>${money(dShare)}</strong></span>
              </span>
              <span class="day-list-arrow">›</span>
            </button>`;
              })
              .join("") || emptyState("Kono din nei ekhono.")
          }
        </div>
        <button class="btn btn-primary" onclick="addDay()">+ Notun Din Jog Koro</button>
      </div>
    </div>`;
}

function renderAdminDayEditor(day) {
  const special = day.special || {};
  return `
    <div class="admin-card">
      <div class="day-editor-head">
        <div class="form-grid">
          <label>Label (jemon Shashthi)
            <input value="${esc(day.label)}" onchange="updateDayField('${day.id}','label', this.value)" />
          </label>
          <label>Subtitle
            <input value="${esc(day.subtitle || "")}" onchange="updateDayField('${day.id}','subtitle', this.value)" />
          </label>
          <label>Date
            <input type="date" value="${esc(day.date || "")}" onchange="updateDayField('${day.id}','date', this.value)" />
          </label>
        </div>
        <button class="mini-btn danger wide" onclick="removeDay('${day.id}')">🗑️ Ei Din Delete Koro</button>
      </div>

      <h3 class="section-heading small">Aajker Special ✨</h3>
      <div class="form-grid">
        <label>Naam
          <input value="${esc(special.name || "")}" onchange="updateSpecialField('${day.id}','name', this.value)" />
        </label>
      </div>

      <h3 class="section-heading small">Mod List 🍾 <span class="hint-inline">(bottle icon naam theke auto boshe)</span></h3>
      <div class="liquor-table">
        <div class="liquor-row liquor-row-head"><span>Naam</span><span>Dam (₹)</span><span>ML</span><span>Piece</span><span></span></div>
        ${day.liquor
          .map(
            (item) => `
          <div class="liquor-row">
            <input value="${esc(item.name)}" onchange="updateLiquorField('${day.id}','${item.id}','name', this.value)" />
            <input type="number" value="${item.price}" onchange="updateLiquorField('${day.id}','${item.id}','price', Number(this.value)||0)" />
            <input type="number" value="${item.ml}" onchange="updateLiquorField('${day.id}','${item.id}','ml', Number(this.value)||0)" />
            <input type="number" value="${item.qty}" onchange="updateLiquorField('${day.id}','${item.id}','qty', Number(this.value)||0)" />
            <button class="mini-btn danger" onclick="removeLiquorItem('${day.id}','${item.id}')">🗑️</button>
          </div>`
          )
          .join("") || emptyState("Ekhono kono mod jog kora hoyni.")}
      </div>
      <div class="add-row liquor-add-row">
        <input id="new-liquor-name-${day.id}" placeholder="Naam" />
        <input id="new-liquor-price-${day.id}" type="number" placeholder="Dam" />
        <input id="new-liquor-ml-${day.id}" type="number" placeholder="ML" />
        <input id="new-liquor-qty-${day.id}" type="number" placeholder="Piece" />
        <button class="btn btn-primary" onclick="addLiquorItem('${day.id}')">+ Jog Koro</button>
      </div>

      <h3 class="section-heading small">Chakna 🍟</h3>
      <div class="liquor-table">
        <div class="liquor-row liquor-row-head chakna-row-head"><span>Naam</span><span>Dam (₹)</span><span>Koyta</span><span></span></div>
        ${(day.chakna || [])
          .map(
            (c, i) => `
          <div class="liquor-row chakna-edit-row">
            <input value="${esc(c.name)}" onchange="updateChaknaField('${day.id}',${i},'name', this.value)" />
            <input type="number" value="${c.price || 0}" onchange="updateChaknaField('${day.id}',${i},'price', Number(this.value)||0)" />
            <input type="number" value="${c.qty || 0}" onchange="updateChaknaField('${day.id}',${i},'qty', Number(this.value)||0)" />
            <button class="mini-btn danger" onclick="removeChaknaItem('${day.id}',${i})">🗑️</button>
          </div>`
          )
          .join("") || emptyState("Chakna list ekhono khali.")}
      </div>
      <div class="add-row chakna-add-row">
        <input id="new-chakna-name-${day.id}" placeholder="Chakna naam" />
        <input id="new-chakna-price-${day.id}" type="number" placeholder="Dam" />
        <input id="new-chakna-qty-${day.id}" type="number" placeholder="Koyta" />
        <button class="btn btn-primary" onclick="addChaknaItem('${day.id}')">+ Jog Koro</button>
      </div>
    </div>`;
}

// ---------- admin mutations ----------

async function updateConfigField(field, value) {
  await Store.saveConfig({ [field]: value });
  if (field === "totalPeople") await recalcShares();
  toast("Save hoye geche! ✅");
  render();
}

async function updateMemberField(id, field, value) {
  const m = state.members.find((x) => x.id === id);
  if (!m) return;
  m[field] = value;
  await Store.saveMember(m);
  toast("Save hoye geche! ✅");
  render();
}

function removeMember(id) {
  confirmAction("Eke delete korle or hisheb-o muche jabe. Pakka?", async () => {
    await Store.deleteMember(id);
    await recalcShares();
    render();
  });
}

async function markFullyPaid(id) {
  const m = state.members.find((x) => x.id === id);
  if (!m) return;
  m.paid = m.share;
  await Store.saveMember(m);
  render();
}

async function cycleAvatar(id) {
  const m = state.members.find((x) => x.id === id);
  if (!m) return;
  m.avatar = ((Number(m.avatar) || 0) + 1) % AVATAR_TOTAL;
  await Store.saveMember(m);
  render();
}

async function addMember() {
  const inp = document.getElementById("new-member-name");
  const name = inp && inp.value ? inp.value.trim() : "";
  if (!name) {
    toast("Naam likho age!");
    return;
  }
  const avatar = (state.members.length * 9) % AVATAR_TOTAL;
  const m = { id: Store.newId("m"), name, avatar, share: 0, paid: 0 };
  await Store.saveMember(m);
  await recalcShares();
  render();
}

async function updateDayField(dayId, field, value) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d) return;
  d[field] = value;
  await Store.saveDay(d);
  toast("Save hoye geche! ✅");
  render();
}

async function updateSpecialField(dayId, field, value) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d) return;
  d.special = Object.assign({}, d.special, { [field]: value });
  await Store.saveDay(d);
  toast("Save hoye geche! ✅");
  render();
}

async function updateLiquorField(dayId, itemId, field, value) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d) return;
  const it = d.liquor.find((x) => x.id === itemId);
  if (!it) return;
  it[field] = value;
  await Store.saveDay(d);
  if (field === "price" || field === "qty") await recalcShares();
  toast("Save hoye geche! ✅");
  render();
}

function removeLiquorItem(dayId, itemId) {
  confirmAction("Ei item ta list theke shore jabe. Thik ache?", async () => {
    const d = state.days.find((x) => x.id === dayId);
    if (!d) return;
    d.liquor = d.liquor.filter((x) => x.id !== itemId);
    await Store.saveDay(d);
    await recalcShares();
    render();
  });
}

async function addLiquorItem(dayId) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d) return;
  const nameInp = document.getElementById("new-liquor-name-" + dayId);
  const name = nameInp && nameInp.value ? nameInp.value.trim() : "";
  if (!name) {
    toast("Mod er naam likho!");
    return;
  }
  const price = Number((document.getElementById("new-liquor-price-" + dayId) || {}).value) || 0;
  const ml = Number((document.getElementById("new-liquor-ml-" + dayId) || {}).value) || 0;
  const qty = Number((document.getElementById("new-liquor-qty-" + dayId) || {}).value) || 0;
  d.liquor.push({ id: Store.newId("l"), name, price, ml, qty });
  await Store.saveDay(d);
  await recalcShares();
  render();
}

async function updateChaknaField(dayId, idx, field, value) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d || !d.chakna[idx]) return;
  d.chakna[idx][field] = value;
  await Store.saveDay(d);
  if (field === "price" || field === "qty") await recalcShares();
  toast("Save hoye geche! ✅");
  render();
}

async function removeChaknaItem(dayId, idx) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d) return;
  d.chakna.splice(idx, 1);
  await Store.saveDay(d);
  await recalcShares();
  render();
}

async function addChaknaItem(dayId) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d) return;
  const nameInp = document.getElementById("new-chakna-name-" + dayId);
  const name = nameInp && nameInp.value ? nameInp.value.trim() : "";
  if (!name) {
    toast("Chakna er naam likho!");
    return;
  }
  const price = Number((document.getElementById("new-chakna-price-" + dayId) || {}).value) || 0;
  const qty = Number((document.getElementById("new-chakna-qty-" + dayId) || {}).value) || 0;
  d.chakna.push({ name, price, qty });
  await Store.saveDay(d);
  await recalcShares();
  render();
}

async function addDay() {
  const days = state.days;
  const last = days[days.length - 1];
  let nextDate = todayStr();
  if (last && last.date) {
    const dt = new Date(last.date + "T00:00:00");
    if (!isNaN(dt)) {
      dt.setDate(dt.getDate() + 1);
      nextDate = dt.toISOString().slice(0, 10);
    }
  }
  const d = {
    id: Store.newId("day"),
    date: nextDate,
    label: "Notun Din",
    subtitle: "",
    special: { name: "" },
    liquor: [],
    chakna: [],
  };
  await Store.saveDay(d);
  ui.adminActiveDayId = d.id;
  render();
}

function removeDay(dayId) {
  confirmAction("Ei pura din ta — mod, chakna, special shoho — delete hoye jabe. Pakka?", async () => {
    await Store.deleteDay(dayId);
    if (ui.adminActiveDayId === dayId) ui.adminActiveDayId = null;
    await recalcShares();
    render();
  });
}
