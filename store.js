// Storage abstraction. Two backends behind one API:
//  - "db"    : window.claude db capability (shared, live, multi-user) — used
//              automatically when the page runs as a published Claude Artifact.
//  - "local" : localStorage — used when opened as a plain static site
//              (e.g. GitHub Pages). Single-browser only; no live sync between
//              devices. Swap in a real backend (Firebase/Supabase) here if you
//              deploy this standalone and want multi-device sync.

const Store = (function () {
  const LS_KEY = "pujorMalkhana_v1";
  let mode = "local";
  let db = null;
  let onChange = null;
  let state = null;
  const unsubs = [];

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Local save failed", e);
    }
  }

  function sortByOrder(arr) {
    return arr.slice().sort((a, b) => (a.id > b.id ? 1 : -1));
  }

  async function initLocal(seed) {
    mode = "local";
    const existing = readLocal();
    state = existing || clone(seed);
    if (!existing) writeLocal();
    window.addEventListener("storage", (e) => {
      if (e.key === LS_KEY && e.newValue) {
        try {
          state = JSON.parse(e.newValue);
          onChange && onChange(state);
        } catch (err) {}
      }
    });
    return state;
  }

  async function initDb(seed, claudeDb) {
    mode = "db";
    db = claudeDb;
    state = { config: clone(seed.config), members: [], days: [] };

    const configRef = db.doc("config/main");
    const configSnap = await configRef.get().catch(() => null);
    if (!configSnap || !configSnap.exists) {
      await configRef.set(clone(seed.config)).catch(() => {});
      state.config = clone(seed.config);
    } else {
      state.config = configSnap.data();
    }

    const membersCol = db.collection("members");
    const membersSnap = await membersCol.get().catch(() => null);
    if (!membersSnap || membersSnap.empty) {
      for (const m of seed.members) {
        await membersCol.doc(m.id).set(clone(m)).catch(() => {});
      }
      state.members = clone(seed.members);
    } else {
      state.members = sortByOrder(membersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }

    const daysCol = db.collection("days");
    const daysSnap = await daysCol.get().catch(() => null);
    if (!daysSnap || daysSnap.empty) {
      for (const d of seed.days) {
        await daysCol.doc(d.id).set(clone(d)).catch(() => {});
      }
      state.days = clone(seed.days);
    } else {
      state.days = sortByOrder(daysSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }

    unsubs.push(
      configRef.onSnapshot((snap) => {
        if (snap.exists) {
          state.config = snap.data();
          onChange && onChange(state);
        }
      }, () => {})
    );
    unsubs.push(
      membersCol.onSnapshot((snap) => {
        state.members = sortByOrder(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        onChange && onChange(state);
      }, () => {})
    );
    unsubs.push(
      daysCol.onSnapshot((snap) => {
        state.days = sortByOrder(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        onChange && onChange(state);
      }, () => {})
    );

    return state;
  }

  return {
    /** kind: "local" | "db" — read after init() resolves. */
    get mode() {
      return mode;
    },
    get state() {
      return state;
    },

    async init(seed, changeCallback) {
      onChange = changeCallback || null;
      let claudeDb = null;
      if (window.claude) {
        try {
          claudeDb = await window.claude.use("db");
        } catch (e) {
          claudeDb = null;
        }
      }
      if (claudeDb) {
        try {
          return await initDb(seed, claudeDb);
        } catch (e) {
          console.warn("db init failed, falling back to local", e);
          return await initLocal(seed);
        }
      }
      return await initLocal(seed);
    },

    async saveConfig(patch) {
      state.config = Object.assign({}, state.config, patch);
      if (mode === "db") {
        await db.doc("config/main").set(clone(state.config)).catch((e) => console.warn(e));
      } else {
        writeLocal();
      }
    },

    async saveMember(member) {
      const idx = state.members.findIndex((m) => m.id === member.id);
      if (idx === -1) state.members.push(member);
      else state.members[idx] = member;
      if (mode === "db") {
        const { id, ...body } = member;
        await db.collection("members").doc(id).set(clone(body)).catch((e) => console.warn(e));
      } else {
        writeLocal();
      }
    },

    async deleteMember(id) {
      state.members = state.members.filter((m) => m.id !== id);
      if (mode === "db") {
        await db.collection("members").doc(id).delete().catch((e) => console.warn(e));
      } else {
        writeLocal();
      }
    },

    async saveDay(day) {
      const idx = state.days.findIndex((d) => d.id === day.id);
      if (idx === -1) state.days.push(day);
      else state.days[idx] = day;
      if (mode === "db") {
        const { id, ...body } = day;
        await db.collection("days").doc(id).set(clone(body)).catch((e) => console.warn(e));
      } else {
        writeLocal();
      }
    },

    async deleteDay(id) {
      state.days = state.days.filter((d) => d.id !== id);
      if (mode === "db") {
        await db.collection("days").doc(id).delete().catch((e) => console.warn(e));
      } else {
        writeLocal();
      }
    },

    newId(prefix) {
      return prefix + "_" + Math.random().toString(36).slice(2, 9);
    },
  };
})();
