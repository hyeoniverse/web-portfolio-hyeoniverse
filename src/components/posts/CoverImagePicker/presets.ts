export interface CoverPreset {
  id: string;
  name: string;
  render: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

export const presets: CoverPreset[] = [
  // ── Warm ──
  {
    id: "warm-sunset",
    name: "Sunset",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#ff6b35");
      g.addColorStop(0.5, "#f7931e");
      g.addColorStop(1, "#e84393");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "warm-amber",
    name: "Amber",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#f6d365");
      g.addColorStop(1, "#fda085");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "warm-coral",
    name: "Coral",
    render: (ctx, w, h) => {
      const g = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.5, h * 0.5, w * 0.7);
      g.addColorStop(0, "#ff9a9e");
      g.addColorStop(0.5, "#fad0c4");
      g.addColorStop(1, "#fbc2eb");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "warm-peach",
    name: "Peach",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#ffecd2");
      g.addColorStop(1, "#fcb69f");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },

  // ── Cool ──
  {
    id: "cool-ocean",
    name: "Ocean",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#667eea");
      g.addColorStop(1, "#764ba2");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "cool-midnight",
    name: "Midnight",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w * 0.5, h);
      g.addColorStop(0, "#0f0c29");
      g.addColorStop(0.5, "#302b63");
      g.addColorStop(1, "#24243e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "cool-arctic",
    name: "Arctic",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#e0eafc");
      g.addColorStop(1, "#cfdef3");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "cool-teal",
    name: "Teal",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#11998e");
      g.addColorStop(1, "#38ef7d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },

  // ── Neutral ──
  {
    id: "neutral-slate",
    name: "Slate",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#2c3e50");
      g.addColorStop(1, "#4ca1af");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "neutral-ivory",
    name: "Ivory",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#f5f5f0");
      g.addColorStop(1, "#e8e4dd");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "neutral-charcoal",
    name: "Charcoal",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#232526");
      g.addColorStop(1, "#414345");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "neutral-sand",
    name: "Sand",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#d4c5a9");
      g.addColorStop(1, "#c2b091");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },

  // ── Vibrant ──
  {
    id: "vibrant-neon",
    name: "Neon",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#f953c6");
      g.addColorStop(1, "#b91d73");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "vibrant-aurora",
    name: "Aurora",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#00c6ff");
      g.addColorStop(0.5, "#7c3aed");
      g.addColorStop(1, "#0072ff");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "vibrant-tropical",
    name: "Tropical",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#fa709a");
      g.addColorStop(1, "#fee140");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    id: "vibrant-electric",
    name: "Electric",
    render: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#4facfe");
      g.addColorStop(1, "#00f2fe");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
];
