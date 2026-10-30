// Минимальный набор линейных иконок 24×24 (stroke = currentColor).
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export const ICONS = {
  light: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>'),
  curtain: svg('<path d="M3 3h18M5 3v18M19 3v18M5 3c2 6 2 12 4 18M19 3c-2 6-2 12-4 18"/>'),
  ac: svg('<rect x="3" y="5" width="18" height="8" rx="2"/><path d="M7 17v2M12 17v3M17 17v2M7 10h10"/>'),
  heating: svg('<path d="M4 20h16M7 16c-1-2 1-3 0-5s1-3 0-5M12 16c-1-2 1-3 0-5s1-3 0-5M17 16c-1-2 1-3 0-5s1-3 0-5"/>'),
  leak: svg('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>'),
  smoke: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/>'),
  motion: svg('<circle cx="13" cy="4" r="2"/><path d="M9 20l2-6 3 2v5M7 11l3-3 4 1 3 3M11 14l-1-5"/>'),
  contact: svg('<path d="M5 21V4a1 1 0 0 1 1-1h9v18M15 21h4M3 21h4M12 12h.01"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  unlock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>'),
  valve: svg('<path d="M3 14h4l2-2h6l2 2h4M12 12V6M8 6h8"/>'),
  camera: svg('<path d="M3 8h12v8H3zM15 11l6-3v8l-6-3"/>'),
  tv: svg('<rect x="3" y="5" width="18" height="12" rx="1"/><path d="M8 21h8"/>'),
  washer: svg('<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M8 6h.01M11 6h.01"/>'),
  vacuum: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v2"/>'),
  thermo: svg('<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>'),
};
