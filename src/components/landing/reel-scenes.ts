import { ROUTE } from "@/lib/tracking";

/*
 * Pure canvas drawing for the landing showreel. Every function is a pure
 * function of time, so a paused frame, a jump and a replay all look the same.
 */

export type ReelFonts = { display: string; body: string; mono: string };

export type Stage = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  fonts: ReelFonts;
};

export const CHAPTER_SECONDS = 2.5;
export const REEL_SECONDS = CHAPTER_SECONDS * 6;
/** Half-width of a chapter change; the cover is fully closed at the boundary. */
const TRANSITION = 0.35;
/** A settled, readable moment inside each chapter (used for paused jumps). */
export const SETTLED_AT = 2.05;

export const NOTE =
  "Hi, our bank changed. Please send today’s invoice payments to our new account: transit 00512, institution 004, account 7781204. Need this before the 3 pm Mississauga pickup or the load waits.";
/** SHA-256 of NOTE (UTF-8). Regenerate with node's crypto if NOTE changes. */
export const NOTE_SHA256 =
  "7ccd92ed8b7298479f7bdb778eb662c8e9a043d82f32e78ea7d63ebd2b96a630";
const NUMBER_ON_FILE = "9055550142";

const C = {
  night: "#0c1b26",
  panel: "#12283a",
  line: "#24445c",
  frost: "#e8f3f8",
  ice: "#9fd3e6",
  paper: "#fbfdfe",
  ink: "#0c1b26",
  muted: "#5d7385",
  amber: "#ffb020",
  red: "#e5484d",
  green: "#2fb67c",
  sign: "#0f6b3f",
};

// ---------- small helpers ----------

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Progress 0..1 of `t` across [a, b]. */
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
/** Deterministic noise in [0, 1). */
const rand = (a: number, b = 0) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function font(ctx: CanvasRenderingContext2D, weight: number, size: number, family: string) {
  ctx.font = `${weight} ${size}px ${family}`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function background(s: Stage, tint = C.night) {
  const { ctx, w, h } = s;
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  // Faint frost grid, like a reefer's insulated wall.
  ctx.strokeStyle = "rgba(159, 211, 230, 0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 40) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = 0; y <= h; y += 40) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();
}

function kicker(s: Stage, text: string, t: number) {
  const { ctx, fonts } = s;
  const a = easeOut(seg(t, 0.05, 0.4));
  ctx.save();
  ctx.globalAlpha = a;
  font(ctx, 600, 15, fonts.mono);
  ctx.fillStyle = C.ice;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(text.toUpperCase(), 28, 24 + (1 - a) * 8);
  ctx.restore();
}

// ---------- chapter a: the rushed email ----------

type CardBox = { x: number; y: number; w: number; h: number };

function emailBox(s: Stage): CardBox {
  const w = Math.min(s.w - 64, 540);
  const h = s.h > s.w ? 240 : 200;
  return { x: (s.w - w) / 2, y: s.h * 0.5 - h / 2 - (s.h > s.w ? 70 : 20), w, h };
}

function drawEmailCard(s: Stage, box: CardBox) {
  const { ctx, fonts } = s;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, box.x, box.y, box.w, box.h, 14);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.restore();

  const pad = 22;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  font(ctx, 500, 13, fonts.mono);
  ctx.fillStyle = C.muted;
  ctx.fillText("From: accounts@lakeontario-coldstorage.co", box.x + pad, box.y + pad);
  font(ctx, 700, 19, fonts.body);
  ctx.fillStyle = C.ink;
  ctx.fillText("URGENT: new bank details today", box.x + pad, box.y + pad + 22);
  ctx.fillStyle = "#dbe6ec";
  ctx.fillRect(box.x + pad, box.y + pad + 54, box.w - pad * 2, 1);
  font(ctx, 400, 15, fonts.body);
  ctx.fillStyle = "#23394a";
  wrap(ctx, NOTE, box.w - pad * 2)
    .slice(0, 7)
    .forEach((line, i) => ctx.fillText(line, box.x + pad, box.y + pad + 68 + i * 22));
}

const FLAGS = [
  { text: "Lookalike domain", color: C.red, at: 0.75 },
  { text: "New bank details", color: C.red, at: 1.05 },
  { text: "Rushed deadline", color: C.amber, at: 1.35 },
];

function chapterEmail(s: Stage, t: number) {
  const { ctx, fonts } = s;
  background(s);
  kicker(s, "01  The request arrives", t);
  const box = emailBox(s);
  const drop = easeOutBack(seg(t, 0.1, 0.6));
  const shown = { ...box, y: lerp(-box.h - 20, box.y, drop) };
  drawEmailCard(s, shown);

  const narrow = s.h > s.w;
  FLAGS.forEach((flag, i) => {
    const p = seg(t, flag.at, flag.at + 0.35);
    if (p <= 0) return;
    const scale = easeOutBack(p);
    font(ctx, 700, 15, fonts.body);
    const label = flag.text;
    const cw = ctx.measureText(label).width + 28;
    const ch = 34;
    const cx = narrow
      ? s.w / 2
      : [box.x + box.w - 30, box.x + box.w + cw / 2 - 14, box.x + box.w - 50][i];
    const cy = narrow
      ? box.y + box.h + 40 + i * 44
      : [box.y - 4, box.y + box.h * 0.48, box.y + box.h + 6][i];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    // Ping ring when the flag lands.
    const ring = seg(t, flag.at + 0.1, flag.at + 0.7);
    if (ring > 0 && ring < 1) {
      ctx.strokeStyle = flag.color;
      ctx.globalAlpha = 1 - ring;
      ctx.lineWidth = 2;
      roundRect(ctx, -cw / 2 - ring * 14, -ch / 2 - ring * 14, cw + ring * 28, ch + ring * 28, 20);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    roundRect(ctx, -cw / 2, -ch / 2, cw, ch, ch / 2);
    ctx.fillStyle = flag.color;
    ctx.fill();
    ctx.fillStyle = flag.color === C.amber ? C.ink : "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 1);
    ctx.restore();
  });
}

// ---------- chapter b: sealed ----------

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

function chapterSeal(s: Stage, t: number) {
  const { ctx, w, h, fonts } = s;
  background(s);
  kicker(s, "02  Sealed note", t);
  const box = emailBox(s);
  const cx = w / 2;
  const cy = h / 2 + 10;
  const r = Math.min(w, h) * 0.34;
  const hex = hexPoints(cx, cy, r);

  // Shatter: the card breaks into shards that fly onto the hexagon's edges.
  const cols = 8;
  const rows = 5;
  const fly = seg(t, 0.05, 0.85);
  if (fly < 1) {
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const sw = box.w / cols;
        const sh = box.h / rows;
        const sx = box.x + i * sw + sw / 2;
        const sy = box.y + j * sh + sh / 2;
        const edge = k % 6;
        const along = rand(k, 3);
        const a = hex[edge];
        const b = hex[(edge + 1) % 6];
        const tx = lerp(a.x, b.x, along);
        const ty = lerp(a.y, b.y, along);
        const local = easeInOut(clamp((fly - rand(k, 7) * 0.25) / 0.75));
        const x = lerp(sx, tx, local);
        const y = lerp(sy, ty, local) - Math.sin(local * Math.PI) * 60 * rand(k, 9);
        const size = lerp(1, 0.25, local);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((rand(k, 5) - 0.5) * 4 * local);
        ctx.globalAlpha = 1 - local * 0.4;
        ctx.fillStyle = local < 0.4 ? C.paper : C.ice;
        ctx.beginPath();
        ctx.moveTo((-sw / 2) * size, (-sh / 2) * size);
        ctx.lineTo((sw / 2) * size, (-sh / 2 + rand(k, 1) * sh) * size);
        ctx.lineTo((-sw / 2 + rand(k, 2) * sw) * size, (sh / 2) * size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // Hexagon outline traces in as the shards land.
  const trace = seg(t, 0.55, 1.0);
  if (trace > 0) {
    ctx.save();
    ctx.strokeStyle = C.ice;
    ctx.lineWidth = 3;
    ctx.shadowColor = C.ice;
    ctx.shadowBlur = 16 * trace;
    ctx.beginPath();
    const total = 6 * trace;
    ctx.moveTo(hex[0].x, hex[0].y);
    for (let i = 1; i <= Math.ceil(total); i++) {
      const a = hex[(i - 1) % 6];
      const b = hex[i % 6];
      const part = Math.min(1, total - (i - 1));
      ctx.lineTo(lerp(a.x, b.x, part), lerp(a.y, b.y, part));
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = `rgba(159, 211, 230, ${0.07 * trace})`;
    ctx.beginPath();
    hex.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.fill();
  }

  // The real SHA-256 of the note resolves, character by character.
  const hashStart = 0.85;
  if (t > hashStart) {
    const size = Math.max(14, Math.min(22, r * 0.085));
    font(ctx, 500, size, fonts.mono);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const lineH = size * 1.45;
    font(ctx, 600, 12, fonts.mono);
    ctx.fillStyle = C.muted;
    ctx.fillText("SHA-256", cx, cy - lineH * 2.6);
    font(ctx, 500, size, fonts.mono);
    const pitch = size * 0.66;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 16; col++) {
        const k = row * 16 + col;
        const lock = hashStart + 0.15 + (k / 64) * 0.7 + rand(k, 11) * 0.1;
        const locked = t >= lock;
        const ch = locked
          ? NOTE_SHA256[k]
          : "0123456789abcdef"[Math.floor(rand(k, Math.floor(t * 30)) * 16)];
        ctx.fillStyle = locked ? C.frost : "rgba(159,211,230,0.45)";
        ctx.fillText(ch, cx + (col - 7.5) * pitch, cy + (row - 1.5) * lineH);
      }
    }
  }

  // Stamp slams down with a small camera shake.
  const stamp = seg(t, 1.7, 1.9);
  if (stamp > 0) {
    const scale = lerp(2.4, 1, easeOut(stamp));
    ctx.save();
    const shake = stamp >= 1 ? Math.max(0, 1 - (t - 1.9) / 0.25) : 0;
    ctx.translate(
      cx + Math.sin(t * 90) * 5 * shake,
      cy + r * 0.62 + Math.cos(t * 70) * 5 * shake,
    );
    ctx.rotate(-0.12);
    ctx.scale(scale, scale);
    ctx.globalAlpha = stamp;
    font(ctx, 800, 40, fonts.display);
    const label = "SEALED";
    const tw = ctx.measureText(label).width + 36;
    ctx.strokeStyle = C.green;
    ctx.lineWidth = 4;
    roundRect(ctx, -tw / 2, -30, tw, 60, 8);
    ctx.fillStyle = "rgba(12, 27, 38, 0.85)";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.green;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 2);
    ctx.restore();
    if (shake > 0) {
      ctx.strokeStyle = `rgba(47, 182, 124, ${shake * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.62, 60 + (1 - shake) * 120, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// ---------- chapter c: call the number on file ----------

function flapTile(
  s: Stage,
  x: number,
  y: number,
  tw: number,
  th: number,
  from: string,
  to: string,
  flip: number,
) {
  const { ctx, fonts } = s;
  const half = th / 2;
  const glyph = (ch: string, clipTop: boolean, squash = 1) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, clipTop ? y : y + half, tw, half);
    ctx.clip();
    ctx.translate(0, y + half);
    ctx.scale(1, squash);
    ctx.translate(0, -(y + half));
    roundRect(ctx, x, y, tw, th, 6);
    ctx.fillStyle = clipTop ? "#1b3446" : "#163042";
    ctx.fill();
    font(ctx, 700, th * 0.62, fonts.display);
    ctx.fillStyle = C.frost;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, x + tw / 2, y + half + th * 0.03);
    ctx.restore();
  };
  // Static halves: new on top, old on bottom until the flap falls.
  glyph(to, true);
  glyph(flip < 0.5 ? from : to, false);
  // Moving flap.
  if (flip < 0.5) glyph(from, true, 1 - flip * 2);
  else if (flip < 1) glyph(to, false, (flip - 0.5) * 2);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y + half - 1, tw, 2);
}

function chapterCall(s: Stage, t: number) {
  const { ctx, w, h, fonts } = s;
  background(s);
  kicker(s, "03  Call the number on file", t);
  const narrow = h > w;
  const tiles = NUMBER_ON_FILE.split("");
  const gap = 6;
  const groupGap = 16;
  const tw = Math.min(58, (Math.min(w - 64, 720) - gap * 9 - groupGap * 2) / 10);
  const th = tw * 1.45;
  const total = tw * 10 + gap * 9 + groupGap * 2;
  const x0 = (w - total) / 2;
  const y0 = narrow ? h * 0.2 : h * 0.24;

  font(ctx, 600, 13, fonts.mono);
  ctx.fillStyle = C.muted;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("ON FILE  ·  LAKE ONTARIO COLD STORAGE AP", x0, y0 - 10);

  tiles.forEach((digit, i) => {
    const x = x0 + i * (tw + gap) + (i >= 3 ? groupGap : 0) + (i >= 6 ? groupGap : 0);
    const start = 0.2 + i * 0.07;
    const spins = 5 + (i % 3);
    const spinT = seg(t, start, start + spins * 0.07);
    const step = Math.min(spins, Math.floor(spinT * spins));
    const flip = spinT >= 1 ? 1 : (spinT * spins) % 1;
    const target = Number(digit);
    const val = (k: number) => (k >= spins ? digit : String((target + 10 - spins + k) % 10));
    flapTile(s, x, y0, tw, th, val(step - 1 < 0 ? 0 : step - 1), val(step), t < start ? 0 : flip);
  });

  // Call waveform.
  const wy = y0 + th + (narrow ? 60 : 50);
  const on = seg(t, 0.9, 1.2);
  if (on > 0) {
    const bars = narrow ? 36 : 56;
    const bw = total / bars;
    ctx.fillStyle = C.green;
    for (let i = 0; i < bars; i++) {
      const amp =
        (0.35 +
          0.65 *
            Math.abs(
              Math.sin(i * 0.55 + t * 9) * Math.sin(i * 0.17 - t * 4.3) +
                0.3 * Math.sin(i * 1.3 + t * 13),
            )) *
        on;
      const bh = Math.max(3, amp * 46);
      roundRect(ctx, x0 + i * bw + bw * 0.2, wy - bh / 2, bw * 0.6, bh, 2);
      ctx.fill();
    }
    font(ctx, 600, 13, fonts.mono);
    ctx.fillStyle = C.green;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const secs = Math.max(0, Math.floor((t - 0.9) * 24));
    ctx.fillText(`● CALL  00:${String(secs).padStart(2, "0")}`, x0, wy + 32);
  }

  // Playbook checklist ticks off.
  const items = [
    { text: "Dialed the number on file", at: 1.2 },
    { text: "Ignored the number in the email", at: 1.5 },
    { text: "Notes saved to the sealed thread", at: 1.8 },
  ];
  const ly = wy + (narrow ? 80 : 70);
  items.forEach((item, i) => {
    const p = easeOut(seg(t, item.at, item.at + 0.25));
    const y = ly + i * 34;
    ctx.globalAlpha = 0.35 + 0.65 * p;
    ctx.strokeStyle = p > 0 ? C.green : C.line;
    ctx.lineWidth = 2;
    roundRect(ctx, x0, y, 22, 22, 5);
    ctx.stroke();
    if (p > 0) {
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0 + 5, y + 11);
      const k = clamp(p * 2);
      ctx.lineTo(lerp(x0 + 5, x0 + 9, k), lerp(y + 11, y + 16, k));
      if (p > 0.5) {
        const k2 = clamp((p - 0.5) * 2);
        ctx.lineTo(lerp(x0 + 9, x0 + 18, k2), lerp(y + 16, y + 6, k2));
      }
      ctx.stroke();
    }
    font(ctx, 500, 17, fonts.body);
    ctx.fillStyle = C.frost;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(item.text, x0 + 36, y + 12);
    ctx.globalAlpha = 1;
  });
}

// ---------- chapter d: two people, one payload ----------

function fingerprint(s: Stage, cx: number, cy: number, r: number, draw: number, color: string) {
  const { ctx } = s;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  const ridges = 9;
  for (let i = 0; i < ridges; i++) {
    const local = clamp(draw * ridges * 0.6 - i * 0.45);
    if (local <= 0) continue;
    const rr = r * (0.18 + (i / ridges) * 0.82);
    const gap = 0.4 + rand(i, 4) * 0.5;
    const start = Math.PI * 0.62 + rand(i, 2) * 0.2;
    const sweep = (Math.PI * 2 - gap - 0.9) * local;
    ctx.beginPath();
    ctx.ellipse(cx, cy + i * 0.8, rr * 0.82, rr, 0, start, start + sweep);
    ctx.stroke();
  }
  ctx.restore();
}

function chapterApprove(s: Stage, t: number) {
  const { ctx, w, h, fonts } = s;
  background(s);
  kicker(s, "04  Two people, one payload", t);
  const narrow = h > w;
  const r = Math.min(w * (narrow ? 0.14 : 0.1), 70);
  const py = narrow ? h * 0.33 : h * 0.4;
  const people = [
    { x: w * (narrow ? 0.27 : 0.25), name: "Amira", role: "Manager", draw: seg(t, 0.1, 0.9) },
    { x: w * (narrow ? 0.73 : 0.75), name: "Colin", role: "Manager", draw: seg(t, 0.7, 1.45) },
  ];
  const pill = { x: w / 2, y: narrow ? h * 0.72 : h * 0.78 };

  // Links from each print to the payload hash.
  people.forEach((p, i) => {
    const link = easeInOut(seg(t, 1.35 + i * 0.15, 1.85 + i * 0.15));
    if (link <= 0) return;
    const sx = p.x;
    const sy = py + r + 66;
    const ex = pill.x + (i ? 40 : -40);
    const ey = pill.y - 22;
    ctx.save();
    ctx.strokeStyle = C.ice;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    const mx = lerp(sx, ex, link);
    const my = lerp(sy, ey, link);
    ctx.quadraticCurveTo(sx, lerp(sy, ey, 0.6 * link), mx, my);
    ctx.stroke();
    ctx.restore();
  });

  people.forEach((p) => {
    const done = p.draw >= 1;
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.75 * Math.min(1, p.draw * 3);
    ctx.strokeStyle = done ? C.green : C.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, py, r + 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    fingerprint(s, p.x, py, r, p.draw, done ? C.green : C.ice);
    font(ctx, 700, 18, fonts.body);
    ctx.fillStyle = C.frost;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.globalAlpha = seg(t, 0.2, 0.5);
    ctx.fillText(p.name, p.x, py + r + 22);
    font(ctx, 500, 13, fonts.mono);
    ctx.fillStyle = done ? C.green : C.muted;
    ctx.fillText(done ? "PASSKEY OK" : p.role.toUpperCase(), p.x, py + r + 44);
    ctx.globalAlpha = 1;
  });

  // "1 of 2" rolls to "2 of 2" like an odometer.
  const roll = easeInOut(seg(t, 1.4, 1.7));
  const show = seg(t, 0.85, 1.05);
  if (show > 0) {
    const size = narrow ? 44 : 56;
    font(ctx, 800, size, fonts.display);
    const cy = narrow ? py - r - 56 : py - 6;
    ctx.save();
    ctx.globalAlpha = show;
    ctx.beginPath();
    ctx.rect(w / 2 - 80, cy - size * 0.6, 160, size * 1.2);
    ctx.clip();
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = roll >= 1 ? C.green : C.amber;
    const digitX = w / 2 - size * 0.55;
    ctx.fillText("1", digitX, cy - roll * size * 1.1);
    ctx.fillText("2", digitX, cy + (1 - roll) * size * 1.1);
    ctx.textAlign = "left";
    ctx.fillStyle = C.frost;
    ctx.fillText("of 2", digitX + 10, cy);
    ctx.restore();
  }

  // Payload hash pill.
  const pillIn = easeOutBack(seg(t, 0.2, 0.55));
  if (pillIn > 0) {
    font(ctx, 600, narrow ? 15 : 17, fonts.mono);
    const label = `payload ${NOTE_SHA256.slice(0, 8)}…${NOTE_SHA256.slice(-6)}`;
    const pw = ctx.measureText(label).width + 40;
    ctx.save();
    ctx.translate(pill.x, pill.y);
    ctx.scale(pillIn, pillIn);
    const lit = seg(t, 1.9, 2.1);
    roundRect(ctx, -pw / 2, -22, pw, 44, 22);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.strokeStyle = lit > 0 ? C.green : C.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = C.frost;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }
}

// ---------- chapter e: the load moves ----------

type Pt = { x: number; y: number };

function projectRoute(box: CardBox): Pt[] {
  const lats = ROUTE.map((p) => p.lat);
  const lngs = ROUTE.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const kx = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = (maxLng - minLng) * kx;
  const spanY = maxLat - minLat;
  const scale = Math.min(box.w / spanX, box.h / spanY);
  const ox = box.x + (box.w - spanX * scale) / 2;
  const oy = box.y + (box.h - spanY * scale) / 2;
  return ROUTE.map((p) => ({
    x: ox + (p.lng - minLng) * kx * scale,
    y: oy + (maxLat - p.lat) * scale,
  }));
}

function pointAlong(pts: Pt[], f: number) {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  let left = clamp(f) * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? clamp(left / lens[i]) : 0;
      return {
        x: lerp(pts[i].x, pts[i + 1].x, k),
        y: lerp(pts[i].y, pts[i + 1].y, k),
        angle: Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x),
        index: i,
        k,
      };
    }
    left -= lens[i];
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, angle: 0, index: pts.length - 2, k: 1 };
}

function shield(s: Stage, x: number, y: number, num: string, pop: number) {
  const { ctx, fonts } = s;
  if (pop <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(easeOutBack(pop), easeOutBack(pop));
  // Ontario King's Highway shield: white, black border, crown on top.
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-22, -18);
  ctx.lineTo(22, -18);
  ctx.lineTo(22, 6);
  ctx.quadraticCurveTo(22, 22, 0, 30);
  ctx.quadraticCurveTo(-22, 22, -22, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.moveTo(-10, -20);
  ctx.lineTo(-10, -30);
  ctx.lineTo(-5, -25);
  ctx.lineTo(0, -32);
  ctx.lineTo(5, -25);
  ctx.lineTo(10, -30);
  ctx.lineTo(10, -20);
  ctx.closePath();
  ctx.fill();
  font(ctx, 800, 20, fonts.display);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(num, 0, 3);
  ctx.restore();
}

// Indices into ROUTE: 403 runs east of Hurontario, 410 is the long run north.
const ROUTE_403 = 9;
const ROUTE_410 = 19;

function chapterRoute(s: Stage, t: number) {
  const { ctx, w, h, fonts } = s;
  background(s, "#0b1822");
  kicker(s, "05  The load moves", t);
  const narrow = h > w;
  const map: CardBox = narrow
    ? { x: 40, y: 80, w: w - 80, h: h * 0.52 }
    : { x: 40, y: 70, w: w * 0.6, h: h - 130 };
  const pts = projectRoute(map);
  const reveal = easeOut(seg(t, 0.0, 0.5));
  const drive = easeInOut(seg(t, 0.35, 2.1));

  // Base road.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = `rgba(36, 68, 92, ${reveal})`;
  ctx.lineWidth = 14;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = `rgba(159, 211, 230, ${0.35 * reveal})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 10]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Travelled portion.
  const here = pointAlong(pts, drive);
  ctx.strokeStyle = C.ice;
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let i = 0; i <= here.index; i++) {
    if (i) ctx.lineTo(pts[i].x, pts[i].y);
    else ctx.moveTo(pts[i].x, pts[i].y);
  }
  ctx.lineTo(here.x, here.y);
  ctx.stroke();

  // End points.
  const endLabel = (p: Pt, text: string, alignRight: boolean) => {
    ctx.fillStyle = C.frost;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    font(ctx, 600, 14, fonts.mono);
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, p.x + (alignRight ? -14 : 14), p.y);
  };
  ctx.globalAlpha = reveal;
  endLabel(pts[0], "MISSISSAUGA DC", false);
  const end = pts[pts.length - 1];
  endLabel(end, "", false);
  // Up and to the right, clear of where the truck parks.
  ctx.fillText("BRAMPTON YARD", end.x + 28, end.y - 30);
  ctx.globalAlpha = 1;

  const s403 = pts[ROUTE_403];
  const s410 = pts[ROUTE_410];
  shield(s, s403.x + 34, s403.y - 8, "403", seg(t, 0.35, 0.65));
  shield(s, s410.x + 36, s410.y + 8, "410", seg(t, 0.7, 1.0));

  // The truck: a reefer trailer pulled by a cab, seen from above.
  ctx.save();
  ctx.translate(here.x, here.y);
  ctx.rotate(here.angle);
  roundRect(ctx, -30, -8, 36, 16, 3);
  ctx.fillStyle = C.paper;
  ctx.fill();
  ctx.fillStyle = C.ice;
  ctx.fillRect(2, -7, 4, 14);
  roundRect(ctx, 8, -7, 13, 14, 3);
  ctx.fillStyle = C.amber;
  ctx.fill();
  ctx.restore();

  // Live reefer temperature readout.
  const panel: CardBox = narrow
    ? { x: 40, y: map.y + map.h + 24, w: w - 80, h: 150 }
    : { x: w * 0.68, y: h * 0.3, w: w * 0.28, h: 170 };
  const pin = easeOut(seg(t, 0.3, 0.7));
  ctx.save();
  ctx.globalAlpha = pin;
  ctx.translate((1 - pin) * 30, 0);
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, 12);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  font(ctx, 600, 12, fonts.mono);
  ctx.fillStyle = C.muted;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("REEFER  ·  SETPOINT 3.0°C", panel.x + 16, panel.y + 14);
  const temp = 2.8 + Math.sin(t * 2.3) * 0.12 + Math.sin(t * 7.1) * 0.04;
  font(ctx, 800, narrow ? 52 : 60, fonts.display);
  ctx.fillStyle = C.frost;
  ctx.fillText(`${temp.toFixed(1)}°C`, panel.x + 16, panel.y + 34);
  // Sparkline of recent readings.
  const sx = panel.x + 16;
  const sw = panel.w - 32;
  const sy = panel.y + panel.h - 38;
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const tt = t - (40 - i) * 0.05;
    const v = Math.sin(tt * 2.3) * 0.12 + Math.sin(tt * 7.1) * 0.04;
    const x = sx + (i / 40) * sw;
    const y = sy - v * 60;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.stroke();
  font(ctx, 600, 12, fonts.mono);
  ctx.fillStyle = C.green;
  ctx.textBaseline = "bottom";
  ctx.fillText(`IN RANGE  ·  ${Math.round(drive * 100)}% OF ROUTE`, sx, panel.y + panel.h - 10);
  ctx.restore();
}

// ---------- chapter f: receipt and wordmark ----------

function chapterReceipt(s: Stage, t: number) {
  const { ctx, w, h, fonts } = s;
  background(s);
  kicker(s, "06  Partner receipt", t);
  const narrow = h > w;
  const rw = Math.min(w - 64, 440);
  const rh = 200;
  const rx = (w - rw) / 2;
  const ry = narrow ? h * 0.16 : h * 0.12;

  // Card flips in around its vertical axis.
  const flip = easeOut(seg(t, 0.05, 0.6));
  const sx = Math.abs(Math.cos((1 - flip) * Math.PI * 0.5 * 0.999)) || 0.001;
  if (flip > 0) {
    ctx.save();
    ctx.translate(w / 2, ry + rh / 2);
    ctx.scale(sx, 1);
    ctx.translate(-w / 2, -(ry + rh / 2));
    roundRect(ctx, rx, ry, rw, rh, 12);
    ctx.fillStyle = C.paper;
    ctx.fill();
    // Tear-off edge.
    ctx.fillStyle = C.night;
    for (let x = rx + 8; x < rx + rw - 4; x += 16) {
      ctx.beginPath();
      ctx.arc(x, ry + rh, 5, Math.PI, 0);
      ctx.fill();
    }
    const rows: [string, string][] = [
      ["Payload", `${NOTE_SHA256.slice(0, 10)}…${NOTE_SHA256.slice(-6)}`],
      ["Signers", "Amira, Colin (passkeys)"],
      ["Signature", "Ed25519, server"],
      ["Status", "Reviewed"],
    ];
    font(ctx, 800, 22, fonts.display);
    ctx.fillStyle = C.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("PARTNER RECEIPT", rx + 22, ry + 18);
    rows.forEach(([k, v], i) => {
      const y = ry + 60 + i * 30;
      ctx.globalAlpha = seg(t, 0.45 + i * 0.12, 0.7 + i * 0.12);
      font(ctx, 500, 13, fonts.mono);
      ctx.fillStyle = C.muted;
      ctx.fillText(k.toUpperCase(), rx + 22, y);
      font(ctx, 500, 14, fonts.mono);
      ctx.fillStyle = C.ink;
      ctx.textAlign = "right";
      ctx.fillText(v, rx + rw - 22, y);
      ctx.textAlign = "left";
    });
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Wordmark assembles letter by letter.
  const word = "SUPPLYCHEK";
  const size = Math.min(narrow ? 76 : 104, (w - 64) / 5.4);
  font(ctx, 800, size, fonts.display);
  const widths = word.split("").map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + (word.length - 1) * 2;
  let x = (w - total) / 2;
  const baseY = ry + rh + (narrow ? 70 : 60) + size * 0.8;
  word.split("").forEach((ch, i) => {
    const start = 0.95 + i * 0.06;
    const p = seg(t, start, start + 0.35);
    if (p > 0) {
      const e = easeOutBack(p);
      ctx.save();
      ctx.globalAlpha = clamp(p * 2);
      ctx.translate(x + widths[i] / 2, baseY - (1 - e) * 80);
      ctx.rotate((1 - e) * (rand(i, 3) - 0.5) * 1.2);
      ctx.fillStyle = i >= 6 ? C.ice : C.frost;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
    x += widths[i] + 2;
  });
  const tag = seg(t, 1.75, 2.05);
  if (tag > 0) {
    font(ctx, 500, narrow ? 15 : 17, fonts.body);
    ctx.globalAlpha = tag;
    ctx.fillStyle = C.ice;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Check the request before the dock moves.", w / 2, baseY + 18);
    ctx.globalAlpha = 1;
  }
}

// ---------- chapter changes ----------

type Cover = (s: Stage, c: number, u: number) => void;

/** Rolling reefer door: comes down, then rolls back up. */
const door: Cover = (s, c) => {
  const { ctx, w, h, fonts } = s;
  const dh = easeInOut(c) * h;
  if (dh <= 0) return;
  ctx.save();
  ctx.fillStyle = "#d7e3ea";
  ctx.fillRect(0, 0, w, dh);
  const slat = 34;
  for (let y = dh; y > -slat; y -= slat) {
    const g = ctx.createLinearGradient(0, y - slat, 0, y);
    g.addColorStop(0, "#eef5f9");
    g.addColorStop(0.7, "#c9d7df");
    g.addColorStop(1, "#9fb1bc");
    ctx.fillStyle = g;
    ctx.fillRect(0, y - slat, w, slat - 2);
  }
  ctx.fillStyle = "#56697a";
  ctx.fillRect(0, dh - 10, w, 10);
  roundRect(ctx, w / 2 - 50, dh - 30, 100, 14, 7);
  ctx.fillStyle = "#2c3e4c";
  ctx.fill();
  if (c > 0.6) {
    ctx.globalAlpha = (c - 0.6) / 0.4;
    font(ctx, 800, Math.min(64, w / 10), fonts.display);
    ctx.fillStyle = "rgba(12,27,38,0.28)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("KEEP DOOR CLOSED", w / 2, dh / 2);
  }
  ctx.restore();
};

/** Horizontal slices sweeping in from alternating sides. */
const slice: Cover = (s, c) => {
  const { ctx, w, h } = s;
  const bands = 8;
  const bh = h / bands;
  ctx.fillStyle = C.ice;
  for (let i = 0; i < bands; i++) {
    const k = easeInOut(clamp(c * 1.4 - (i / bands) * 0.4));
    const bw = k * w;
    ctx.fillStyle = i % 2 ? C.ice : "#d5ecf4";
    ctx.fillRect(i % 2 ? w - bw : 0, i * bh, bw, bh + 1);
  }
};

/** Iris closing to a point, then opening. */
const iris: Cover = (s, c) => {
  const { ctx, w, h } = s;
  const max = Math.hypot(w, h) / 2 + 4;
  const r = (1 - easeInOut(c)) * max;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2, true);
  ctx.fillStyle = "#081219";
  ctx.fill("evenodd");
  ctx.strokeStyle = C.ice;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

/** A full-screen reefer trailer passes left to right. */
const trailer: Cover = (s, _c, u) => {
  const { ctx, w, h, fonts } = s;
  const len = w * 2.2;
  const front = lerp(0, w + len, easeInOut(u));
  const back = front - len;
  if (front <= 0 || back >= w) return;
  ctx.save();
  ctx.fillStyle = "#f4f8fa";
  ctx.fillRect(back, 0, len, h);
  // Ribbed side panels.
  ctx.strokeStyle = "rgba(12,27,38,0.1)";
  ctx.lineWidth = 2;
  for (let x = back + 30; x < front; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, h * 0.08);
    ctx.lineTo(x, h * 0.86);
    ctx.stroke();
  }
  ctx.fillStyle = C.ice;
  ctx.fillRect(back, h * 0.62, len, h * 0.06);
  font(ctx, 800, Math.min(120, h * 0.22), fonts.display);
  ctx.fillStyle = C.night;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SUPPLYCHEK COLD CHAIN", back + len / 2, h * 0.38);
  // Reefer unit on the nose and wheels along the bottom.
  ctx.fillStyle = "#56697a";
  ctx.fillRect(front - 26, h * 0.1, 26, h * 0.34);
  ctx.fillStyle = "#1a2a36";
  for (const wx of [back + 110, back + 230, back + 350]) {
    ctx.beginPath();
    ctx.arc(wx, h * 0.95, h * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = C.red;
  ctx.fillRect(back, h * 0.1, 10, h * 0.1);
  ctx.restore();
};

/** Cover used when entering chapter i (i = 0 is the loop back to the start). */
const COVERS: Cover[] = [door, door, slice, iris, door, trailer];

const CHAPTERS = [
  chapterEmail,
  chapterSeal,
  chapterCall,
  chapterApprove,
  chapterRoute,
  chapterReceipt,
];

export function drawReel(s: Stage, time: number) {
  const t = ((time % REEL_SECONDS) + REEL_SECONDS) % REEL_SECONDS;
  const index = Math.floor(t / CHAPTER_SECONDS) % CHAPTERS.length;
  const local = t - index * CHAPTER_SECONDS;
  s.ctx.save();
  CHAPTERS[index](s, local);
  s.ctx.restore();

  // Cover straddles each boundary: closing before it, opening after.
  let into = -1;
  let u = 0;
  if (local > CHAPTER_SECONDS - TRANSITION) {
    into = (index + 1) % CHAPTERS.length;
    u = (local - (CHAPTER_SECONDS - TRANSITION)) / (TRANSITION * 2);
  } else if (local < TRANSITION) {
    into = index;
    u = 0.5 + local / (TRANSITION * 2);
  }
  if (into >= 0) {
    const c = 1 - Math.abs(u - 0.5) * 2;
    s.ctx.save();
    COVERS[into](s, c, u);
    s.ctx.restore();
  }
}

export const CHAPTER_LABELS = [
  "The request arrives",
  "Sealed note",
  "Call the number on file",
  "Two people, one payload",
  "The load moves",
  "Partner receipt",
];

export const CHAPTER_DESCRIPTIONS = [
  "A rushed bank-change email lands. SupplyChek flags a lookalike domain, new bank details and a rushed deadline.",
  "The note is sealed. Its SHA-256 hash is recorded so nobody can change it afterwards.",
  "Someone calls the number already on file, not the one in the email, and ticks off the playbook.",
  "Two different managers confirm with a passkey. Both approvals point at the same payload hash.",
  "The load runs from Mississauga to Brampton on Hwy 403 and 410 with the reefer temperature in range.",
  "The partner gets a receipt with the payload hash, the signers and a server signature.",
];
