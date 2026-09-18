// Seed data — first-run defaults. Admin can edit everything from the Admin Panel.
// This file is only ever READ to bootstrap a brand new board; after that,
// the store (localStorage or the shared db) is the source of truth.

function chaknaSet() {
  return [
    { name: "Jol Jira", price: 5, qty: 5 },
    { name: "Soda", price: 20, qty: 1 },
    { name: "Campa", price: 20, qty: 1 },
    { name: "Chips", price: 50, qty: 1 },
    { name: "Glass", price: 5, qty: 5 },
  ];
}

function bpLiquor(id) {
  return [{ id, name: "BP 750", price: 1050, ml: 750, qty: 2 }];
}

// Bump this whenever the shape/content below changes — the local (GitHub
// Pages) storage layer resets itself to the fresh seed when this differs
// from what a visitor's browser already has saved, so edits actually show up.
const SEED_VERSION = 4;

const SEED_DATA = {
  seedVersion: SEED_VERSION,
  config: {
    title: "PujoTun",
    tagline: "Pujo Vibes Loading... 2026",
    startDate: "2026-10-16",
    totalDays: 5,
    totalPeople: 5,
    upiId: "9733734372@jupiteraxis",
    payeeName: "Swarnadip Chakraborty",
    payNote: "Pujor Mod Fund 2026",
    adminPin: "2026",
  },

  // avatar: numeric index into the generated avatar set (see avatarSvg in app.js)
  members: [
    { id: "m1", name: "Sayan", avatar: 0, share: 0, paid: 0 },
    { id: "m2", name: "Tubai", avatar: 13, share: 0, paid: 0 },
    { id: "m3", name: "Ganesh", avatar: 26, share: 0, paid: 0 },
    { id: "m4", name: "Somesh", avatar: 39, share: 0, paid: 0 },
    { id: "m5", name: "Vogi", avatar: 52, share: 0, paid: 0 },
  ],

  days: [
    {
      id: "day0",
      date: "2026-10-16",
      label: "Shashthi",
      subtitle: "Boron er Din",
      special: { name: "Devir Bodhon Punch" },
      liquor: bpLiquor("d0l1"),
      chakna: chaknaSet(),
    },
    {
      id: "day1",
      date: "2026-10-17",
      label: "Saptami",
      subtitle: "Nabapatrika Snan",
      special: { name: "Kolapata Cooler" },
      liquor: bpLiquor("d1l1"),
      chakna: chaknaSet(),
    },
    {
      id: "day2",
      date: "2026-10-19",
      label: "Ashtami",
      subtitle: "Sandhi Puja Special",
      special: { name: "Sandhi Puja Sindoor Shot" },
      liquor: bpLiquor("d2l1"),
      chakna: chaknaSet(),
    },
    {
      id: "day3",
      date: "2026-10-20",
      label: "Nabami",
      subtitle: "Sheshbelar Adda",
      special: { name: "Nabami Nostalgia Mix" },
      liquor: bpLiquor("d3l1"),
      chakna: chaknaSet(),
    },
    {
      id: "day4",
      date: "2026-10-21",
      label: "Dashami",
      subtitle: "Bijoya + Bisorjon",
      special: { name: "Bijoyar Sindoor Khela Toast" },
      liquor: bpLiquor("d4l1"),
      chakna: chaknaSet(),
    },
  ],
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SEED_DATA };
}
