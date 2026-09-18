// Seed data — first-run defaults. Admin can edit everything from the Admin Panel.
// This file is only ever READ to bootstrap a brand new board; after that,
// the store (localStorage or the shared db) is the source of truth.

const SEED_DATA = {
  config: {
    title: "PujoTun",
    tagline: "Pujo Vibes Loading... 2026",
    startDate: "2026-10-16",
    totalDays: 5,
    totalPeople: 8,
    upiId: "9733734372@jupiteraxis",
    payeeName: "Swarnadip Chakraborty",
    payNote: "Pujor Mod Fund 2026",
    adminPin: "2026",
  },

  // avatar: numeric index into the generated avatar set (see avatarSvg in app.js)
  members: [
    { id: "m1", name: "Abir", avatar: 0, share: 3000, paid: 3000 },
    { id: "m2", name: "Sourav", avatar: 9, share: 3000, paid: 1500 },
    { id: "m3", name: "Pritam", avatar: 18, share: 3000, paid: 3000 },
    { id: "m4", name: "Debjit", avatar: 27, share: 3000, paid: 0 },
    { id: "m5", name: "Anwesha", avatar: 36, share: 3000, paid: 2000 },
    { id: "m6", name: "Riya", avatar: 45, share: 3000, paid: 3000 },
    { id: "m7", name: "Sagnik", avatar: 54, share: 3000, paid: 1000 },
    { id: "m8", name: "Ishani", avatar: 63, share: 3000, paid: 0 },
  ],

  days: [
    {
      id: "day0",
      date: "2026-10-16",
      label: "Shashthi",
      subtitle: "Boron er Din",
      special: {
        name: "Devir Bodhon Punch",
        desc: "Old Monk + cola + shonar tukro ek chimte adar rosh — first night er signature drink.",
        emoji: "🪔",
      },
      liquor: [
        { id: "d0l1", name: "Old Monk 750", price: 750, ml: 750, qty: 6, emoji: "🥃" },
        { id: "d0l2", name: "Kingfisher Strong", price: 180, ml: 650, qty: 24, emoji: "🍺" },
        { id: "d0l3", name: "Sula Red Wine", price: 950, ml: 750, qty: 4, emoji: "🍷" },
      ],
      chakna: [
        { name: "Muri Makha", emoji: "🥣" },
        { name: "Papad Bhaja", emoji: "🫓" },
        { name: "Peanut Masala", emoji: "🥜" },
        { name: "Chicken Pakora", emoji: "🍗" },
      ],
    },
    {
      id: "day1",
      date: "2026-10-17",
      label: "Saptami",
      subtitle: "Nabapatrika Snan",
      special: {
        name: "Kolapata Cooler",
        desc: "Bacardi + lemon + pudina, ekdom garom theke thanda korar jonne.",
        emoji: "🌿",
      },
      liquor: [
        { id: "d1l1", name: "Bacardi White Rum", price: 900, ml: 750, qty: 5, emoji: "🍾" },
        { id: "d1l2", name: "Budweiser", price: 200, ml: 650, qty: 24, emoji: "🍺" },
        { id: "d1l3", name: "Blenders Pride", price: 1450, ml: 750, qty: 3, emoji: "🥃" },
      ],
      chakna: [
        { name: "Fish Fry", emoji: "🐟" },
        { name: "Alu Bhaja", emoji: "🍟" },
        { name: "Egg Deviled", emoji: "🥚" },
      ],
    },
    {
      id: "day2",
      date: "2026-10-19",
      label: "Ashtami",
      subtitle: "Sandhi Puja Special",
      special: {
        name: "Sandhi Puja Sindoor Shot",
        desc: "108 prodip er bela, ekta grand shot round — sobai mile cheers.",
        emoji: "🔥",
      },
      liquor: [
        { id: "d2l1", name: "Jack Daniel's", price: 3200, ml: 750, qty: 2, emoji: "🥃" },
        { id: "d2l2", name: "Corona", price: 250, ml: 355, qty: 24, emoji: "🍺" },
        { id: "d2l3", name: "Jacob's Creek", price: 1200, ml: 750, qty: 3, emoji: "🍷" },
        { id: "d2l4", name: "Smirnoff Vodka", price: 850, ml: 750, qty: 4, emoji: "🍸" },
      ],
      chakna: [
        { name: "Mutton Kosha", emoji: "🍖" },
        { name: "Luchi", emoji: "🫓" },
        { name: "Chingri Fry", emoji: "🦐" },
        { name: "Paneer Tikka", emoji: "🧀" },
      ],
    },
    {
      id: "day3",
      date: "2026-10-20",
      label: "Nabami",
      subtitle: "Sheshbelar Adda",
      special: {
        name: "Nabami Nostalgia Mix",
        desc: "Rum + thandai twist — last full night, ektu extra hoyei jak.",
        emoji: "🎶",
      },
      liquor: [
        { id: "d3l1", name: "Old Monk 750", price: 750, ml: 750, qty: 6, emoji: "🥃" },
        { id: "d3l2", name: "Tuborg", price: 190, ml: 650, qty: 24, emoji: "🍺" },
        { id: "d3l3", name: "Signature Whisky", price: 1100, ml: 750, qty: 4, emoji: "🥃" },
      ],
      chakna: [
        { name: "Biriyani Bowl", emoji: "🍛" },
        { name: "Chicken Tandoori", emoji: "🍗" },
        { name: "Papad Bhaja", emoji: "🫓" },
      ],
    },
    {
      id: "day4",
      date: "2026-10-21",
      label: "Dashami",
      subtitle: "Bijoya + Bisorjon",
      special: {
        name: "Bijoyar Sindoor Khela Toast",
        desc: "Bisorjon er por final toast — bochor sesh, abar aschhe bochor.",
        emoji: "🙏",
      },
      liquor: [
        { id: "d4l1", name: "Whatever's Left", price: 0, ml: 0, qty: 99, emoji: "🍹" },
        { id: "d4l2", name: "Kingfisher Premium", price: 190, ml: 650, qty: 12, emoji: "🍺" },
      ],
      chakna: [
        { name: "Nolen Gur Sondesh", emoji: "🍬" },
        { name: "Doi", emoji: "🥣" },
        { name: "Mishti Paan", emoji: "🍃" },
      ],
    },
  ],
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SEED_DATA };
}
