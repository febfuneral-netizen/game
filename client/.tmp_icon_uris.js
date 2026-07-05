const icons = {
  battle: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f97060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/><path d="M5 5L6 6"/><path d="M19 5L18 6"/><path d="M5 19L6 18"/><path d="M19 19L18 18"/></svg>`,
  shop: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a259ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M9 12h6"/></svg>`,
  backpack: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5"/><path d="M12 12v9"/><path d="M12 12L4 7.5"/></svg>`,
  profile: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 21c0-3.5 2.5-6 6-6s6 2.5 6 6"/></svg>`
};

for (const [k, v] of Object.entries(icons)) {
  console.log(`${k}: data:image/svg+xml;base64,${Buffer.from(v).toString('base64')}`);
}
