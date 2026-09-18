# PujoTun 🍻

Ekta chotto dashboard, Pujor mod-chakna-budget hisheb rakhar jonno. Netflix-style profile screen diye shuru — je jar profile e click kore dekhbe pujo'r budget, tar share, ki mod thakbe kobe, chakna, r ekta open-amount UPI "Pay Now" button. Admin (PIN diye protected) shob kichu control kore: budget, members, r protyek diner mod/chakna/special item.

Plain HTML/CSS/JS — kono build step lage na. Khule dile-i chole.

## Local e dekha

`index.html` ta browser e khule felo, ba ekta static server chalao:

```
npx serve .
```

## Structure

- `index.html` — page shell, fonts, scripts
- `styles.css` — sob styling (ekta hi dark theme, festive)
- `data.js` — first-run sample data (budget, members, per-day mod/chakna list)
- `store.js` — storage layer: `localStorage` (GitHub Pages / static hosting) othoba Claude Artifact-er shared `db` capability (multi-user live sync) — jeta available thakbe, automatic detect kore neয়
- `app.js` — UI + sob logic

## Deploy

Kono build lage na — GitHub Pages, Netlify, Vercel, ba jekono static host e direct upload korle-i cholbe. `localStorage` mode e proti browser er data ala-lada thakbe (multi-device sync hobe na) — real-time shared data chaile Firebase/Supabase (ba Claude Artifact) lagbe.

## Important notes

- **Admin PIN real security na** — shudhu UI-level gate, casual friend-group er jonno thik ache. Public e serious data thakle proper auth lagbe.
- **UPI "Pay Now"** link ta `am` (amount) parameter chhara — tai user je kono amount pathate parbe, fix kora nei, jemon chawa hoyeche.
- Admin panel theke Puja settings, members, r protyek diner mod/chakna/special — sob e ditable.
