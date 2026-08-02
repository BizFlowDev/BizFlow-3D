"use client";

import { useEffect, useRef } from "react";

// ── Animated Blobs ────────────────────────────────────────────────────────────

function AnimatedBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Primary blue blob - top left */}
      <div
        className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.4) 0%, rgba(37,99,235,0) 70%)",
          animation: "blob-float-1 8s ease-in-out infinite",
        }}
      />
      {/* Cyan accent blob - bottom right */}
      <div
        className="absolute -bottom-40 -right-40 h-[600px] w-[600px] rounded-full opacity-25"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.35) 0%, rgba(6,182,212,0) 70%)",
          animation: "blob-float-2 10s ease-in-out infinite",
        }}
      />
      {/* Indigo blob - center */}
      <div
        className="absolute left-1/3 top-1/3 h-[400px] w-[400px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0) 70%)",
          animation: "blob-float-3 12s ease-in-out infinite",
        }}
      />
      {/* Small accent blob - top right */}
      <div
        className="absolute -right-20 top-1/4 h-[300px] w-[300px] rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0) 70%)",
          animation: "blob-float-1 9s ease-in-out infinite reverse",
        }}
      />
    </div>
  );
}

// ── Animated Particles ────────────────────────────────────────────────────────

function AnimatedParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      opacity: number;
      opacityDirection: number;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const count = Math.min(Math.floor(window.innerWidth / 20), 60);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.5 + 0.1,
        opacityDirection: Math.random() > 0.5 ? 1 : -1,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Pulse opacity
        p.opacity += p.opacityDirection * 0.003;
        if (p.opacity >= 0.6) p.opacityDirection = -1;
        if (p.opacity <= 0.1) p.opacityDirection = 1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148, 163, 184, ${p.opacity})`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(148, 163, 184, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    createParticles();
    draw();

    window.addEventListener("resize", () => {
      resize();
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    />
  );
}

// ── Main Background Component ─────────────────────────────────────────────────

export function AnimatedBackground() {
  return (
    <>
      {/* Base gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950/90 to-slate-900" />

      {/* Soft blue lighting overlay */}
      <div
        className="fixed inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(37,99,235,0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(6,182,212,0.1) 0%, transparent 50%)",
        }}
      />

      {/* Animated elements */}
      <AnimatedBlobs />
      <AnimatedParticles />

      {/* CSS Keyframes */}
      <style jsx global>{`
        @keyframes blob-float-1 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        @keyframes blob-float-2 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-40px, 30px) scale(1.15);
          }
          66% {
            transform: translate(30px, -40px) scale(0.95);
          }
        }
        @keyframes blob-float-3 {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(50px, 30px) scale(1.1);
          }
        }
      `}</style>
    </>
  );
}
