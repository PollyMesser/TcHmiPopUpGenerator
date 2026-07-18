// ── Design-Tokens des Generators (nicht des erzeugten Popups) ──
const T = {
  bg: "#12141a", panel: "#1a1d25", panel2: "#20242e", border: "#2b303c",
  text: "#e7e9ef", muted: "#9298a8", accent: "#22c55e", accentDim: "#15803d",
  danger: "#ef4444", input: "#151821", code: "#0e1016",
};

// ── Farbpaletten des ERZEUGTEN Popups (Dark/Light) ──
const PAL = {
  dark:  { boxBg: "#1a1d2e", border: "#2a2d3a", headerBg: "#161822", titleColor: "#ffffff", closeColor: "#9aa0b4", bodyText: "#e0e0e0", active: "#22c55e", inactive: "#4b5563", shadow: "0 20px 60px rgba(0,0,0,0.5)" },
  light: { boxBg: "#ffffff", border: "#d0d4de", headerBg: "#f2f4f8", titleColor: "#1a1d2e", closeColor: "#6b7280", bodyText: "#333333", active: "#16a34a", inactive: "#9ca3af", shadow: "0 20px 60px rgba(0,0,0,0.2)" },
};

export { T, PAL };
