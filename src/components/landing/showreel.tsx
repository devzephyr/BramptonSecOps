"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHAPTER_DESCRIPTIONS,
  CHAPTER_LABELS,
  CHAPTER_SECONDS,
  REEL_SECONDS,
  SETTLED_AT,
  drawReel,
  type ReelFonts,
} from "./reel-scenes";

/** Below this container width the reel switches to a taller, phone layout. */
const NARROW_PX = 640;

export function Showreel({ fonts }: { fonts: ReelFonts }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const drawRef = useRef<() => void>(() => {});
  // Only the user's choice lives in state; offscreen and hidden tab are
  // tracked separately so scrolling back resumes what the user wanted.
  const [playing, setPlaying] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [chapter, setChapter] = useState(0);

  // Autoplay unless the viewer prefers reduced motion.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) timeRef.current = SETTLED_AT;
    else setPlaying(true);
    drawRef.current();
  }, []);

  // Size the canvas to its box and device pixel ratio.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let logical = { w: 1000, h: 562.5 };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const scale = canvas.width / logical.w;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawReel({ ctx, w: logical.w, h: logical.h, fonts }, timeRef.current);
    };
    drawRef.current = draw;

    const resize = () => {
      const width = wrap.clientWidth;
      logical = width < NARROW_PX ? { w: 480, h: 620 } : { w: 1000, h: 562.5 };
      const height = (width * logical.h) / logical.w;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.height = `${height}px`;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    // Canvas text needs the web fonts; redraw once they arrive.
    document.fonts?.ready.then(draw).catch(() => {});
    return () => observer.disconnect();
  }, [fonts]);

  // Pause when scrolled out of view or when the tab is hidden.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0.15 },
    );
    io.observe(wrap);
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const running = playing && onScreen && tabVisible;

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Cap the step so a stalled frame does not skip a chapter.
      timeRef.current =
        (timeRef.current + Math.min(0.1, (now - last) / 1000)) % REEL_SECONDS;
      last = now;
      drawRef.current();
      setChapter(Math.floor(timeRef.current / CHAPTER_SECONDS));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const jump = (index: number) => {
    // While playing, start the chapter from its door opening; while paused,
    // show a settled frame that reads without motion.
    timeRef.current = index * CHAPTER_SECONDS + (playing ? 0 : SETTLED_AT);
    setChapter(index);
    drawRef.current();
  };

  return (
    <figure className="m-0">
      <div
        ref={wrapRef}
        className="relative overflow-hidden rounded-2xl bg-[#0c1b26] shadow-[0_30px_80px_-30px_rgba(12,27,38,0.55)] ring-1 ring-[#0c1b26]/10"
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`SupplyChek showreel, chapter ${chapter + 1} of 6: ${CHAPTER_LABELS[chapter]}. ${CHAPTER_DESCRIPTIONS[chapter]}`}
          className="block w-full"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-pressed={playing}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0c1b26] px-4 text-sm font-semibold text-[#e8f3f8] outline-none transition hover:bg-[#12283a] focus-visible:ring-2 focus-visible:ring-[#1c7fa6] focus-visible:ring-offset-2"
        >
          <span aria-hidden className="inline-block w-3 text-center">
            {playing ? "‖" : "▶"}
          </span>
          {playing ? "Pause" : "Play"}
        </button>
        <ol className="flex flex-wrap gap-1.5" aria-label="Jump to chapter">
          {CHAPTER_LABELS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => jump(i)}
                aria-current={i === chapter ? "step" : undefined}
                className={`h-10 rounded-full border px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#1c7fa6] focus-visible:ring-offset-2 ${
                  i === chapter
                    ? "border-[#0c1b26] bg-white font-semibold text-[#0c1b26]"
                    : "border-[#0c1b26]/15 text-[#3d5566] hover:border-[#0c1b26]/40"
                }`}
              >
                <span className="[font-family:var(--font-reel-mono)] text-xs text-[#1c7fa6]">
                  {String(i + 1).padStart(2, "0")}
                </span>{" "}
                {label}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-3 text-sm text-[#3d5566]">
        {CHAPTER_DESCRIPTIONS[chapter]}
      </figcaption>
    </figure>
  );
}
