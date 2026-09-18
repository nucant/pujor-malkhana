// Pujor Malkhana — app logic. No framework: template strings + full re-render
// on every state change. Simple on purpose; the interesting part is the
// Store abstraction (store.js), which swaps localStorage for the shared
// Claude db capability transparently.

let state = null;
const ui = {
  screen: "profiles", // profiles | user | admin-gate | admin
  currentMemberId: null,
  activeDayId: null,
  adminSection: "overview", // overview | settings | members | menu
  adminActiveDayId: null,
};

// ---------- boot ----------

async function boot() {
  state = await Store.init(SEED_DATA, (newState) => {
    state = newState;
    render();
  });
  render();
}
document.addEventListener("DOMContentLoaded", boot);

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

function defaultDayId() {
  const t = todayStr();
  const hit = state.days.find((d) => d.date === t);
  return hit ? hit.id : state.days[0] && state.days[0].id;
}

function emptyState(msg) {
  return '<p class="empty-state">' + esc(msg) + "</p>";
}

function buildUpiLink(cfg) {
  const params = new URLSearchParams();
  params.set("pa", cfg.upiId || "");
  params.set("pn", cfg.payeeName || "");
  if (cfg.payNote) params.set("tn", cfg.payNote);
  params.set("cu", "INR");
  return "upi://pay?" + params.toString();
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

  if (ui.screen === "user") initUpiQr();
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
}
function goProfiles() {
  ui.screen = "profiles";
  render();
}
function goAdminGate() {
  ui.screen = "admin-gate";
  render();
}
function setActiveDay(id) {
  ui.activeDayId = id;
  render();
}
function setAdminSection(key) {
  ui.adminSection = key;
  render();
}
function setAdminDay(id) {
  ui.adminActiveDayId = id;
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
        <span class="avatar-ring"><span class="avatar-emoji">${m.avatar}</span></span>
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
            <span class="avatar-ring admin-ring"><span class="avatar-emoji">👑</span></span>
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
  const day = state.days.find((d) => d.id === ui.activeDayId) || state.days[0];

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
          <span class="who-avatar">${member.avatar}</span>
          <span class="who-name">${esc(member.name)}</span>
          <button class="btn btn-ghost small" onclick="goProfiles()">Switch</button>
        </div>
      </header>

      <section class="calendar-strip">${renderDayTabs(state.days, ui.activeDayId, "setActiveDay")}</section>

      ${renderStats(cfg, member)}
      ${renderPayCard(cfg, member)}

      ${day ? `
      <section class="day-section">
        <div class="day-section-head">
          <h2>${esc(day.label)} <span class="day-section-date">${fmtDateLong(day.date)}</span></h2>
          ${day.subtitle ? `<span class="day-subtitle">${esc(day.subtitle)}</span>` : ""}
        </div>
        ${renderDayContent(day)}
      </section>` : emptyState("Kono din set kora nei ekhono. Admin ke bolo.")}

      <footer class="app-footer">Toiri holo adda diye, mod diye na 😉 · Pujor Malkhana</footer>
    </div>`;
}

function renderDayTabs(days, activeId, fnName) {
  const t = todayStr();
  return days
    .map((d) => {
      const isToday = d.date === t;
      const active = d.id === activeId;
      return `
      <button class="day-pill ${active ? "active" : ""}" onclick="${fnName}('${d.id}')">
        <span class="day-pill-label">${esc(d.label)}</span>
        <span class="day-pill-date">${fmtDateShort(d.date)}</span>
        ${isToday ? '<span class="today-dot" title="Aaj"></span>' : ""}
      </button>`;
    })
    .join("");
}

function renderStats(cfg, member) {
  const due = Math.max(0, member.share - member.paid);
  return `
    <div class="stats-row">
      <div class="stat-tile">
        <span class="stat-label">Total Budget</span>
        <span class="stat-value">${money(cfg.totalBudget)}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">Total Lok</span>
        <span class="stat-value">${cfg.totalPeople}</span>
      </div>
      <div class="stat-tile">
        <span class="stat-label">Tor Share</span>
        <span class="stat-value">${money(member.share)}</span>
      </div>
      <div class="stat-tile ${due > 0 ? "stat-due" : "stat-clear"}">
        <span class="stat-label">${due > 0 ? "Tor Baki" : "Status"}</span>
        <span class="stat-value">${due > 0 ? money(due) : "Clear! ✅"}</span>
      </div>
    </div>`;
}

function renderPayCard(cfg, member) {
  const due = Math.max(0, member.share - member.paid);
  const upiLink = buildUpiLink(cfg);
  return `
    <div class="pay-card">
      <div class="pay-info">
        <h3>Pay Now 💸</h3>
        <p>Amount fix na — joto khushi, tor moner moto pathiye de.</p>
        ${
          due > 0
            ? `<p class="pay-suggested">Suggested: <strong>${money(due)}</strong> (tor baki ache)</p>`
            : `<p class="pay-suggested">Tumi already clear! Chao to extra o pathate paro 😄</p>`
        }
        <div class="pay-actions">
          <a class="btn btn-primary" href="${esc(upiLink)}">UPI App e Pay Koro</a>
          <button class="btn btn-ghost" onclick="copyUpi('${esc(cfg.upiId)}')">Copy UPI ID</button>
        </div>
        <p class="upi-id-text">${esc(cfg.upiId)} · ${esc(cfg.payeeName)}</p>
      </div>
      <div class="pay-qr">
        <div id="upi-qr"></div>
        <span>Scan Koro</span>
      </div>
    </div>`;
}

function renderDayContent(day) {
  const liquorCards =
    day.liquor
      .map(
        (item) => `
      <div class="liquor-card">
        <div class="liquor-emoji">${item.emoji || "🍶"}</div>
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

  const chaknaChips =
    day.chakna
      .map((c) => `<span class="chakna-chip"><span>${c.emoji || "🍽️"}</span> ${esc(c.name)}</span>`)
      .join("") || emptyState("Chakna decide hoyni ekhono.");

  const special =
    day.special && day.special.name
      ? `
      <div class="special-card">
        <span class="special-badge">Aajker Special</span>
        <div class="special-emoji">${day.special.emoji || "✨"}</div>
        <h4>${esc(day.special.name)}</h4>
        <p>${esc(day.special.desc || "")}</p>
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
        <div class="chakna-row">${chaknaChips}</div>
      </aside>
    </div>`;
}

function initUpiQr() {
  const el = document.getElementById("upi-qr");
  if (!el) return;
  el.innerHTML = "";
  if (typeof QRCode === "undefined") {
    el.innerHTML = '<span class="qr-fallback">QR load hoyni</span>';
    return;
  }
  try {
    new QRCode(el, {
      text: buildUpiLink(state.config),
      width: 128,
      height: 128,
      colorDark: "#1a1114",
      colorLight: "#f7ece4",
      correctLevel: QRCode.CorrectLevel.M,
    });
  } catch (e) {
    el.innerHTML = '<span class="qr-fallback">QR load hoyni</span>';
  }
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
        <div class="stat-tile"><span class="stat-label">Total Budget</span><span class="stat-value">${money(cfg.totalBudget)}</span></div>
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
              .map((m) => `<div class="due-row"><span>${m.avatar} ${esc(m.name)}</span><span class="due-amt">${money(m.due)}</span></div>`)
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
        <label>Total Budget (₹)
          <input type="number" value="${cfg.totalBudget}" onchange="updateConfigField('totalBudget', Number(this.value)||0)" />
        </label>
        <label>Total Lok
          <input type="number" value="${cfg.totalPeople}" onchange="updateConfigField('totalPeople', Number(this.value)||0)" />
        </label>
      </div>

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
          <span></span><span>Naam</span><span>Share</span><span>Paid</span><span>Baki</span><span></span>
        </div>
        ${state.members
          .map((m) => {
            const due = Math.max(0, m.share - m.paid);
            return `
          <div class="member-row">
            <button class="avatar-btn" title="Avatar change koro" onclick="cycleAvatar('${m.id}')">${m.avatar}</button>
            <input value="${esc(m.name)}" onchange="updateMemberField('${m.id}','name', this.value)" />
            <input type="number" value="${m.share}" onchange="updateMemberField('${m.id}','share', Number(this.value)||0)" />
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
    </div>`;
}

function renderAdminMenu() {
  const days = state.days;
  const activeId = ui.adminActiveDayId && days.find((d) => d.id === ui.adminActiveDayId) ? ui.adminActiveDayId : days[0] && days[0].id;
  const day = days.find((d) => d.id === activeId);

  return `
    <div class="admin-menu">
      <div class="admin-menu-daybar">
        ${days
          .map(
            (d) => `
          <button class="day-pill ${d.id === activeId ? "active" : ""}" onclick="setAdminDay('${d.id}')">
            <span class="day-pill-label">${esc(d.label)}</span>
            <span class="day-pill-date">${fmtDateShort(d.date)}</span>
          </button>`
          )
          .join("")}
        <button class="day-pill add-day" onclick="addDay()">+ Din Jog Koro</button>
      </div>
      ${day ? renderAdminDayEditor(day) : emptyState("Kono din nei. Upore theke ekta din jog koro.")}
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
        <label class="narrow">Emoji
          <input class="emoji-input" value="${esc(special.emoji || "")}" maxlength="4" onchange="updateSpecialField('${day.id}','emoji', this.value)" />
        </label>
        <label>Naam
          <input value="${esc(special.name || "")}" onchange="updateSpecialField('${day.id}','name', this.value)" />
        </label>
        <label class="span-2">Description
          <input value="${esc(special.desc || "")}" onchange="updateSpecialField('${day.id}','desc', this.value)" />
        </label>
      </div>

      <h3 class="section-heading small">Mod List 🍾</h3>
      <div class="liquor-table">
        <div class="liquor-row liquor-row-head"><span></span><span>Naam</span><span>Dam (₹)</span><span>ML</span><span>Piece</span><span></span></div>
        ${day.liquor
          .map(
            (item) => `
          <div class="liquor-row">
            <input class="emoji-input" value="${esc(item.emoji || "")}" maxlength="4" onchange="updateLiquorField('${day.id}','${item.id}','emoji', this.value)" />
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
        <input id="new-liquor-emoji-${day.id}" class="emoji-input" placeholder="🍾" maxlength="4" />
        <input id="new-liquor-name-${day.id}" placeholder="Naam" />
        <input id="new-liquor-price-${day.id}" type="number" placeholder="Dam" />
        <input id="new-liquor-ml-${day.id}" type="number" placeholder="ML" />
        <input id="new-liquor-qty-${day.id}" type="number" placeholder="Piece" />
        <button class="btn btn-primary" onclick="addLiquorItem('${day.id}')">+ Jog Koro</button>
      </div>

      <h3 class="section-heading small">Chakna 🍟</h3>
      <div class="chakna-admin-row">
        ${day.chakna
          .map(
            (c, i) => `
          <span class="chakna-chip editable">
            <input class="emoji-input tiny" value="${esc(c.emoji || "")}" maxlength="4" onchange="updateChaknaField('${day.id}',${i},'emoji', this.value)" />
            <input class="chakna-name-input" value="${esc(c.name)}" onchange="updateChaknaField('${day.id}',${i},'name', this.value)" />
            <button class="mini-btn danger tiny" onclick="removeChaknaItem('${day.id}',${i})">✕</button>
          </span>`
          )
          .join("") || emptyState("Chakna list ekhono khali.")}
      </div>
      <div class="add-row">
        <input id="new-chakna-emoji-${day.id}" class="emoji-input" placeholder="🍟" maxlength="4" />
        <input id="new-chakna-name-${day.id}" placeholder="Chakna naam" />
        <button class="btn btn-primary" onclick="addChaknaItem('${day.id}')">+ Jog Koro</button>
      </div>
    </div>`;
}

// ---------- admin mutations ----------

async function updateConfigField(field, value) {
  await Store.saveConfig({ [field]: value });
  render();
}

async function updateMemberField(id, field, value) {
  const m = state.members.find((x) => x.id === id);
  if (!m) return;
  m[field] = value;
  await Store.saveMember(m);
  render();
}

function removeMember(id) {
  confirmAction("Eke delete korle or hisheb-o muche jabe. Pakka?", async () => {
    await Store.deleteMember(id);
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
  const idx = AVATAR_POOL.indexOf(m.avatar);
  m.avatar = AVATAR_POOL[(idx + 1) % AVATAR_POOL.length];
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
  const share = state.config.totalPeople ? Math.round(state.config.totalBudget / state.config.totalPeople) : 0;
  const avatar = AVATAR_POOL[state.members.length % AVATAR_POOL.length];
  const m = { id: Store.newId("m"), name, avatar, share, paid: 0 };
  await Store.saveMember(m);
  render();
}

async function updateDayField(dayId, field, value) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d) return;
  d[field] = value;
  await Store.saveDay(d);
  render();
}

async function updateSpecialField(dayId, field, value) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d) return;
  d.special = Object.assign({}, d.special, { [field]: value });
  await Store.saveDay(d);
  render();
}

async function updateLiquorField(dayId, itemId, field, value) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d) return;
  const it = d.liquor.find((x) => x.id === itemId);
  if (!it) return;
  it[field] = value;
  await Store.saveDay(d);
  render();
}

function removeLiquorItem(dayId, itemId) {
  confirmAction("Ei item ta list theke shore jabe. Thik ache?", async () => {
    const d = state.days.find((x) => x.id === dayId);
    if (!d) return;
    d.liquor = d.liquor.filter((x) => x.id !== itemId);
    await Store.saveDay(d);
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
  const emoji = (document.getElementById("new-liquor-emoji-" + dayId) || {}).value || "🍶";
  const price = Number((document.getElementById("new-liquor-price-" + dayId) || {}).value) || 0;
  const ml = Number((document.getElementById("new-liquor-ml-" + dayId) || {}).value) || 0;
  const qty = Number((document.getElementById("new-liquor-qty-" + dayId) || {}).value) || 0;
  d.liquor.push({ id: Store.newId("l"), name, emoji, price, ml, qty });
  await Store.saveDay(d);
  render();
}

async function updateChaknaField(dayId, idx, field, value) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d || !d.chakna[idx]) return;
  d.chakna[idx][field] = value;
  await Store.saveDay(d);
  render();
}

async function removeChaknaItem(dayId, idx) {
  const d = state.days.find((x) => x.id === dayId);
  if (!d) return;
  d.chakna.splice(idx, 1);
  await Store.saveDay(d);
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
  const emoji = (document.getElementById("new-chakna-emoji-" + dayId) || {}).value || "🍽️";
  d.chakna.push({ name, emoji });
  await Store.saveDay(d);
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
    special: { name: "", desc: "", emoji: "✨" },
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
    render();
  });
}
