/**
 * The dither effect registry. Each entry ships one GLSL field plus its defaults.
 * The engine (mount-ordered-dither.ts) wraps every field with dithering,
 * palette mapping, sizing, and motion.
 */
export interface EffectDefinition {
  /** GLSL source defining `float field(vec2 uv, vec2 res, float t)`. uv is 0..1 with y up, res is the canvas size in cells, t is seconds. May read its params as `uniform float p_<name>` (declared by the engine). */
  field: string;
  /** Numeric knobs with defaults; each becomes `uniform float p_<name>`. */
  params: Record<string, number>;
  /** Time shown when the visitor prefers reduced motion or speed is 0. */
  stillTime: number;
  /** Default palette, paper to ink, 2-8 hex colours. */
  palette: readonly string[];
  /** Default speed. 0 means static. */
  speed: number;
  /** True if the field samples `u_image` (globe). */
  usesImage?: boolean;
}

const GRADIENT_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  vec2 c = vec2((p_cx - 0.5) * aspect, 0.5 - p_cy);
  float s = 0.0;
  if (p_mode < 0.5) {
    float a = radians(p_angle + t * 8.0);
    vec2 dir = vec2(sin(a), cos(a));
    float extent = abs(dir.x) * aspect * 0.5 + abs(dir.y) * 0.5;
    s = dot(p, dir) / (2.0 * max(extent, 0.001)) + 0.5;
  } else if (p_mode < 1.5) {
    vec2 cc = c + vec2(cos(t * 0.3), sin(t * 0.23)) * 0.06;
    vec2 corner = vec2(aspect * 0.5 + abs(cc.x), 0.5 + abs(cc.y));
    s = length(p - cc) / (length(corner) * p_radius);
  } else if (p_mode < 2.5) {
    vec2 d = p - c;
    s = fract((atan(d.x, d.y) - radians(p_angle + t * 8.0)) / (2.0 * PI));
  } else {
    float bands = 0.5 + 0.5 * sin(uv.x * 16.0 + (1.0 - uv.y) * 9.0 + t);
    return smoothstep(0.02, 0.78, 1.0 - uv.y) * mix(0.2, 1.0, bands);
  }
  return mix(p_from, p_to, clamp(s, 0.0, 1.0));
}
`;

const GLOW_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = (uv - vec2(p_cx, p_cy)) * vec2(aspect, 1.0);
  float breathe = 1.0 + 0.15 * sin(t * 0.7);
  float d = length(p) / (p_radius * breathe);
  return pow(max(1.0 - d, 0.0), p_power);
}
`;

const MESH_FIELD = /* glsl */ `
float blob(vec2 p, vec2 c, float r) {
  vec2 d = p - c;
  return exp(-dot(d, d) / (r * r));
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 c0 = vec2(0.25 * aspect + p_sway * sin(t * 0.31), 0.72 + 0.10 * cos(t * 0.27));
  vec2 c1 = vec2(0.75 * aspect + p_sway * cos(t * 0.23 + 2.0), 0.68 + 0.11 * sin(t * 0.29 + 1.0));
  vec2 c2 = vec2(0.45 * aspect + p_sway * sin(t * 0.19 + 4.0), 0.28 + 0.12 * cos(t * 0.35 + 3.0));
  vec2 c3 = vec2(0.82 * aspect + p_sway * sin(t * 0.41 + 1.5), 0.25 + 0.13 * cos(t * 0.21 + 5.0));
  float w = blob(p, c0, p_size) + blob(p, c1, p_size) + blob(p, c2, p_size) + blob(p, c3, p_size);
  float v = blob(p, c0, p_size) * 0.10 + blob(p, c1, p_size) * 0.45 + blob(p, c2, p_size) * 0.70 + blob(p, c3, p_size) * 0.95;
  return clamp(v / max(w, 0.0001), 0.0, 1.0) * smoothstep(0.0, 0.35, w);
}
`;

const AURORA_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  p.y += p.x * tan(radians(p_tilt));
  if (p_direction < 0.0) p.y = 1.0 - p.y;
  float x = p.x * p_scale + t * 0.05 * p_drift;
  float n = clamp(p_curtains, 1.0, 6.0);
  float tone = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float k = fi / max(n - 1.0, 1.0);
    float fold = (fbm(vec2(x * 1.4 + fi * 4.7, t * 0.05 + fi * 1.3)) - 0.5) * 0.7 * p_sway;
    float ripple = (vnoise(vec2(x * 7.0 + fi * 11.0, t * 0.25)) - 0.5) * 0.025 * p_turbulence;
    float edge = p_height + fi * p_spread + fold + ripple;
    float d = p.y - edge;
    float ray = pow(vnoise(vec2(x * p_rays * 5.0 + fold * 18.0 + fi * 17.0, p.y * 1.4 - t * 0.12)), 3.0);
    float rise = step(0.0, d) * exp(-max(d, 0.0) * 2.5 / max(p_length * mix(1.0, 0.6, k), 0.02));
    float line = exp(-abs(d) * 110.0) * p_glow;
    float under = step(0.0, -d) * exp(d * 40.0) * 0.25;
    float shimmer = 1.0 - p_shimmer + p_shimmer * vnoise(vec2(x * 1.5 - t * 0.3, fi * 3.0));
    tone += (rise * (0.15 + 0.85 * ray) * 0.6 + line + under) * shimmer * (1.0 - 0.55 * k);
  }
  tone = 1.0 - exp(-tone * 2.2 * p_intensity);
  float m = 1.0;
  if (p_mask > 0.5 && p_mask < 1.5) m = smoothstep(1.0, 0.6, uv.y);
  else if (p_mask > 1.5 && p_mask < 2.5) m = smoothstep(0.0, 0.4, uv.y);
  else if (p_mask > 2.5) m = smoothstep(0.0, 0.2, uv.x) * smoothstep(1.0, 0.8, uv.x);
  return tone * m;
}
`;

const NOISE_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * p_scale;
  vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05)), fbm(p + vec2(5.2, 1.3) - t * 0.04));
  return clamp(fbm(p + p_warp * q + vec2(0.0, t * 0.03)) * p_gain, 0.0, 1.0);
}
`;

const WAVES_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  float x = uv.x * aspect;
  float glow = exp(-abs(uv.y - p_horizon) * 5.0) * 0.4;
  float tone = glow;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float level = p_horizon - 0.08 - 0.16 * fi;
    float edge = level + 0.04 * sin(x * (3.0 + fi * 2.0) - t * (0.4 + 0.15 * fi)) + 0.05 * (fbm(vec2(x * 3.0 - t * 0.15, fi * 9.0)) - 0.5);
    float band = smoothstep(-0.06, 0.0, uv.y - edge) * (0.5 + 0.15 * fi);
    float crest = smoothstep(0.018, 0.0, abs(uv.y - edge)) * (0.7 + 0.1 * fi);
    tone = max(tone, max(band, crest) * smoothstep(p_horizon + 0.05, p_horizon - 0.1, uv.y));
  }
  return clamp(tone * p_gain, 0.0, 1.0);
}
`;

const PLASMA_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * p_scale;
  float v = sin(p.x * 3.1 + t * 0.4) + sin((p.x + p.y) * 2.1 + t * 0.3) + sin(length(p - vec2(aspect * 0.5, 0.5) * p_scale) * 3.6 - t * 0.5) + sin(p.y * 2.4 + t * 0.35);
  return smoothstep(0.05, 0.95, 0.5 + 0.125 * v);
}
`;

const BEAMS_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 c = vec2(p_cx * aspect, p_cy);
  vec2 d = vec2(uv.x * aspect, uv.y) - c;
  float a = atan(d.x, -d.y);
  float dist = length(d);
  float cone = smoothstep(1.9, 0.7, abs(a));
  float streak = pow(vnoise(vec2(a * 7.0 + t * 0.11, 3.0)), 2.0) * 0.65 + pow(vnoise(vec2(a * 15.0 - t * 0.07, 9.0)), 2.0) * 0.35;
  float core = exp(-abs(d.x) * 6.0) * 0.4;
  return clamp((0.25 + 0.75 * streak) * cone * exp(-dist * p_fade) + core * cone, 0.0, 1.0);
}
`;

const SILK_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float w = fbm(p * 2.2 + vec2(t * 0.05, -t * 0.04));
  float fold = sin(p.x * 3.0 + p.y * 1.4 + w * p_warp + t * 0.2);
  float crest = pow(0.5 + 0.5 * fold, p_sharp);
  return clamp(crest * (0.55 + 0.45 * w) + 0.08 * w, 0.0, 1.0);
}
`;

const SMOKE_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y * 1.3 - t * p_rise);
  float n = fbm(p * p_scale + vec2(fbm(p * 1.7 + t * 0.02) * 0.8, 0.0));
  float density = n * smoothstep(1.05, 0.1, uv.y) * smoothstep(-0.05, 0.15, uv.y + 0.3);
  return clamp(density * p_gain, 0.0, 1.0);
}
`;

const CONTOURS_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) * p_scale;
  float h = fbm(p + vec2(t * 0.04, -t * 0.02));
  float line = 1.0 - smoothstep(0.0, 0.07, abs(fract(h * p_lines + 0.5) - 0.5));
  return clamp(h * 0.35 + line * (0.5 + 0.5 * h), 0.0, 1.0);
}
`;

const RIPPLES_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float v = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 c = vec2(aspect * (0.25 + 0.25 * fi), 0.35 + 0.2 * mod(fi, 2.0));
    float d = length(p - c);
    v += sin(d * p_freq - t * 2.0 + fi * 2.1) * exp(-d * 1.6);
  }
  return clamp(0.5 + 0.38 * v, 0.0, 1.0);
}
`;

const METABALLS_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float s = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 c = vec2(aspect * 0.5 + 0.26 * sin(t * (0.30 + 0.13 * fi) + fi * 2.3), 0.5 + 0.25 * cos(t * (0.23 + 0.11 * fi) + fi * 1.7));
    vec2 d = p - c;
    s += p_size * p_size / (dot(d, d) + 0.0008);
  }
  return clamp(smoothstep(0.9, 1.7, s) + 0.12 * smoothstep(0.4, 0.9, s), 0.0, 1.0);
}
`;

const TUNNEL_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
  float d = length(p);
  float a = atan(p.y, p.x);
  float depth = 1.0 / (d + 0.06);
  float walls = 0.5 + 0.5 * sin(a * p_spokes + depth * p_twist - t * 2.0);
  float rings = 0.5 + 0.5 * sin(depth * 6.0 - t * 2.5);
  float glow = exp(-d * 2.2);
  return clamp((0.25 + 0.5 * walls) * rings * 0.6 + glow, 0.0, 1.0);
}
`;

const RETRO_GRID_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  float horizon = 0.52;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - horizon);
  if (p.y < 0.0) {
    float depth = -p.y + 0.02;
    float dist = 0.30 / depth;
    float gx = p.x * 2.0 / depth;
    float gz = dist + t * 0.5;
    float lx = 1.0 - smoothstep(0.0, 0.1, abs(fract(gx) - 0.5));
    float lz = 1.0 - smoothstep(0.0, 0.1, abs(fract(gz) - 0.5));
    float fade = smoothstep(2.0, 0.3, dist);
    return clamp(max(lx, lz) * fade * 0.9 + exp(-depth * 5.0) * 0.4, 0.0, 1.0);
  }
  vec2 s = vec2(p.x, p.y - 0.16);
  float sun = smoothstep(0.22, 0.20, length(s));
  float stripes = s.y < 0.0 ? step(0.5, fract(s.y * 26.0 + t * 0.04)) : 1.0;
  float sky = exp(-p.y * 3.0) * 0.35;
  return clamp(max(sun * mix(0.45, 1.0, stripes), sky) + exp(-abs(p.y) * 8.0) * 0.5, 0.0, 1.0);
}
`;

const STARFIELD_FIELD = /* glsl */ `
float star(vec2 p, float seed) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 pos = vec2(hash21(cell + seed), hash21(cell + seed + 7.0));
  float d = length(f - pos);
  float size = 0.04 + 0.10 * hash21(cell + seed + 3.0);
  float tw = 0.55 + 0.45 * sin(hash21(cell + seed + 5.0) * 6.28);
  return smoothstep(size, 0.0, d) * tw;
}

float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float v = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 q = p * (10.0 + fi * 5.0) + vec2(-t * (0.15 + fi * 0.12), fi * 37.0);
    vec2 cell = floor(q);
    float twinkle = 0.6 + 0.4 * sin(t * (1.0 + 0.6 * fi) + hash21(cell + fi) * 6.28);
    v = max(v, star(q, fi * 19.0) * twinkle * (0.7 + 0.3 * fi / 2.0));
  }
  return clamp(v * p_gain, 0.0, 1.0);
}
`;

const ECLIPSE_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y) - vec2(aspect * 0.5, 0.55);
  float d = length(p);
  float a = atan(p.y, p.x);
  float rim = exp(-abs(d - p_radius) * 12.0);
  float corona = exp(-max(d - p_radius, 0.0) * 3.5) * (0.5 + 0.3 * sin(t * 0.7)) * (0.5 + 0.5 * vnoise(vec2(a * 4.0 + t * 0.15, 3.0)));
  float disc = smoothstep(p_radius, p_radius - 0.015, d) * 0.04;
  return clamp(disc + rim + corona, 0.0, 1.0);
}
`;

const GLOBE_FIELD = /* glsl */ `
float field(vec2 uv, vec2 res, float t) {
  vec2 p = (uv - 0.5) * 2.0;
  if (dot(p, p) > 1.0) return -1.0;
  float z = sqrt(max(0.0, 1.0 - dot(p, p)));
  float lat0 = radians(p_lat);
  float lon0 = radians(p_lon);
  float lat = asin(clamp(p.y * cos(lat0) + z * sin(lat0), -1.0, 1.0));
  float lon = lon0 + atan(p.x, z * cos(lat0) - p.y * sin(lat0));
  vec2 mapUv = vec2(fract(lon / (2.0 * PI) + 0.5), 0.5 + lat / PI);
  vec3 sampleColor = texture(u_image, mapUv).rgb;
  float land = max(sampleColor.r, max(sampleColor.g, sampleColor.b));
  if (land < 0.12) return 0.0;
  return land * 0.62;
}
`;

export const effects = {
  gradient: {
    field: GRADIENT_FIELD,
    params: { mode: 1, angle: 180, cx: 0.5, cy: 0, radius: 1.05, from: 1, to: 0 },
    stillTime: 0,
    palette: ["#070707", "#e11d24"],
    speed: 0,
  },
  glow: {
    field: GLOW_FIELD,
    params: { cx: 0.5, cy: 0.55, radius: 0.6, power: 2 },
    stillTime: 2,
    palette: ["#040208", "#2a0f4a", "#8f2f8f", "#ffc4a3"],
    speed: 1,
  },
  mesh: {
    field: MESH_FIELD,
    params: { size: 0.42, sway: 0.15 },
    stillTime: 3,
    palette: ["#0a0018", "#3b0ca3", "#0ea5c9", "#7ddb52", "#f7e38b"],
    speed: 1,
  },
  aurora: {
    field: AURORA_FIELD,
    params: {
      curtains: 3,
      height: 0.42,
      spread: 0.05,
      sway: 1,
      turbulence: 0.6,
      rays: 8,
      length: 0.45,
      glow: 0.9,
      intensity: 0.95,
      shimmer: 0.2,
      scale: 1,
      tilt: 0,
      drift: 0,
      direction: 1,
      mask: 0,
    },
    stillTime: 6,
    palette: ["#02060d", "#061a33", "#0b4f99", "#1f8fff", "#d6efff"],
    speed: 1,
  },
  noise: {
    field: NOISE_FIELD,
    params: { scale: 2.5, warp: 1.5, gain: 1.2 },
    stillTime: 4,
    palette: ["#000000", "#101030", "#38406b", "#9fb2d8"],
    speed: 1,
  },
  waves: {
    field: WAVES_FIELD,
    params: { horizon: 0.62, gain: 1 },
    stillTime: 5,
    palette: ["#000208", "#07294d", "#0f6b8f", "#5fd4c9", "#d8fff4"],
    speed: 1,
  },
  plasma: {
    field: PLASMA_FIELD,
    params: { scale: 2 },
    stillTime: 5,
    palette: ["#0b0014", "#4a0d77", "#c72a92", "#ff8c4a", "#ffe6a8"],
    speed: 1,
  },
  beams: {
    field: BEAMS_FIELD,
    params: { cx: 0.5, cy: 1.15, fade: 1.6 },
    stillTime: 4,
    palette: ["#000000", "#0d2138", "#2a6ba0", "#bfe3ff"],
    speed: 1,
  },
  silk: {
    field: SILK_FIELD,
    params: { sharp: 3, warp: 5 },
    stillTime: 4,
    palette: ["#0a0714", "#312a56", "#7d6fb8", "#e8e3ff"],
    speed: 1,
  },
  smoke: {
    field: SMOKE_FIELD,
    params: { scale: 3, rise: 0.15, gain: 1.2 },
    stillTime: 5,
    palette: ["#000000", "#151a1f", "#3c4750", "#8ea4b5", "#dce9f2"],
    speed: 1,
  },
  contours: {
    field: CONTOURS_FIELD,
    params: { scale: 2, lines: 10 },
    stillTime: 5,
    palette: ["#04140b", "#0d3a23", "#1f7a4a", "#5fbf7a", "#d9ffd0"],
    speed: 1,
  },
  ripples: {
    field: RIPPLES_FIELD,
    params: { freq: 28 },
    stillTime: 4,
    palette: ["#001018", "#0b3a4d", "#1d7d96", "#8fd8e8", "#eaffff"],
    speed: 1,
  },
  metaballs: {
    field: METABALLS_FIELD,
    params: { size: 0.14 },
    stillTime: 4,
    palette: ["#000000", "#2b0a3d", "#8e2bd8", "#e0aaff"],
    speed: 1,
  },
  tunnel: {
    field: TUNNEL_FIELD,
    params: { twist: 3, spokes: 4 },
    stillTime: 4,
    palette: ["#020610", "#123a6b", "#2a7fd4", "#9fd8ff"],
    speed: 1,
  },
  "retro-grid": {
    field: RETRO_GRID_FIELD,
    params: {},
    stillTime: 6,
    palette: ["#0b0021", "#3d0a67", "#c71f85", "#ff7a3d", "#ffd23e"],
    speed: 1,
  },
  starfield: {
    field: STARFIELD_FIELD,
    params: { gain: 1.2 },
    stillTime: 4,
    palette: ["#000000", "#101a33", "#3d5a99", "#cdd9ff", "#ffffff"],
    speed: 1,
  },
  eclipse: {
    field: ECLIPSE_FIELD,
    params: { radius: 0.22 },
    stillTime: 4,
    palette: ["#000000", "#1a0f2e", "#6b3fa0", "#ffb36b", "#fff3d6"],
    speed: 1,
  },
  globe: {
    field: GLOBE_FIELD,
    params: { lat: 20, lon: 48 },
    stillTime: 0,
    palette: ["transparent", "#f4f1ea"],
    speed: 0,
    usesImage: true,
  },
} as const satisfies Record<string, EffectDefinition>;

export type EffectName = keyof typeof effects;

/** Per-effect param override: only the keys that effect declares. */
export type EffectParams<E extends EffectName> = Partial<Record<keyof (typeof effects)[E]["params"], number>>;
