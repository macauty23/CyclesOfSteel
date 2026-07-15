export const VIEWPORT = {
  width: 1280,
  height: 720
} as const;

export const ARENA = {
  x: 120,
  y: 126,
  width: 1040,
  height: 468
} as const;

export const COLORS = {
  background: 0x1e1f22,
  panel: 0x25272b,
  panelSoft: 0x2d3035,
  panelEdge: 0x5f5348,
  disabled: 0x393d43,
  ink: 0xf1e8dc,
  subtext: 0xbbaea0,
  gold: 0xc96a1a,
  danger: 0xd06f66,
  success: 0x89b97d,
  arenaFloor: 0x222429,
  arenaEdge: 0x71573f,
  ghost: 0xe4d2bd
} as const;

export const TEXT = {
  title: {
    fontFamily: "Georgia",
    fontSize: "48px",
    fontStyle: "bold",
    color: "#f1ede6"
  },
  heading: {
    fontFamily: "Georgia",
    fontSize: "26px",
    fontStyle: "bold",
    color: "#f1ede6"
  },
  body: {
    fontFamily: "Trebuchet MS",
    fontSize: "17px",
    color: "#f1ede6"
  },
  small: {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#b2bfcb"
  },
  button: {
    fontFamily: "Trebuchet MS",
    fontSize: "22px",
    fontStyle: "bold",
    color: "#f1ede6"
  },
  caption: {
    fontFamily: "Trebuchet MS",
    fontSize: "14px",
    color: "#b2bfcb"
  }
} as const;

export function colorHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}
