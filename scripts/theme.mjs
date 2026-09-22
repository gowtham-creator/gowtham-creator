// Shared palette for every generated SVG. Matches GitHub's own dark and light themes
// so the images sit naturally on the profile page in either mode.
export const THEMES = {
  dark: {
    tile: "#161b22", stroke: "#30363d", text: "#e6edf3", muted: "#8b949e",
    accent: "#58a6ff", green: "#3fb950", purple: "#bc8cff", orange: "#f0883e",
    monoIcon: "#e6edf3", window: "#0d1117", track: "#21262d",
  },
  light: {
    tile: "#f6f8fa", stroke: "#d0d7de", text: "#1f2328", muted: "#59636e",
    accent: "#0969da", green: "#1a7f37", purple: "#8250df", orange: "#bc4c00",
    monoIcon: "#1f2328", window: "#ffffff", track: "#eaeef2",
  },
};

export const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif";
export const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

// Animations only ever move an element *from* hidden *to* its resting state, and the
// resting state is the element's base style. If a viewer does not run animations,
// everything is simply visible.
export const MOTION_GUARD = "@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }";

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
