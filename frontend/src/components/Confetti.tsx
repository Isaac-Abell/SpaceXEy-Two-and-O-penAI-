import { useEffect, useRef } from "react";

// Self-contained canvas confetti — no external dependency. Fires a celebratory
// burst on mount (used for the two rarest, gold-treatment endings). Purely
// decorative: a fixed, click-through overlay that cleans itself up.
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vrot: number;
}

const COLORS = ["#fdd663", "#f28b82", "#81c995", "#8ab4f8", "#c58af9", "#ff9d4d"];

export default function Confetti({ fire }: { fire: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!fire) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect users who ask for reduced motion.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Two bursts from the lower corners plus a light top rain.
    const particles: Particle[] = [];
    const spawnBurst = (originX: number, originY: number, spread: number) => {
      for (let i = 0; i < 90; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
        const speed = 8 + Math.random() * 9;
        particles.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 5 + Math.random() * 6,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          rot: Math.random() * Math.PI,
          vrot: (Math.random() - 0.5) * 0.3,
        });
      }
    };
    spawnBurst(W() * 0.15, H() * 0.95, 1.1);
    spawnBurst(W() * 0.85, H() * 0.95, 1.1);
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * W(),
        y: -20 - Math.random() * H() * 0.4,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 3,
        size: 5 + Math.random() * 6,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
      });
    }

    const gravity = 0.22;
    const drag = 0.992;
    const start = performance.now();
    const DURATION = 4200;

    const frame = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, W(), H());
      let alive = false;
      for (const p of particles) {
        p.vy += gravity;
        p.vx *= drag;
        p.vy *= drag;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        // Fade out over the last second.
        const fade = elapsed > DURATION - 1000 ? Math.max(0, 1 - (elapsed - (DURATION - 1000)) / 1000) : 1;
        if (p.y < H() + 20 && fade > 0) alive = true;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (alive && elapsed < DURATION) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, W(), H());
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [fire]);

  if (!fire) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 1400,
      }}
    />
  );
}
