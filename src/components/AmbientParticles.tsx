"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  phaseSpeed: number;
}

const PARTICLE_COLORS = {
  dark: { r: 201, g: 169, b: 98 },
  light: { r: 143, g: 115, b: 48 },
} as const;

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.07,
    vy: -(0.015 + Math.random() * 0.05),
    radius: 0.5 + Math.random() * 1.2,
    alpha: 0.1 + Math.random() * 0.22,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.002 + Math.random() * 0.006,
  };
}

function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

function getParticleCount() {
  if (typeof window === "undefined") return 0;
  return isMobileViewport() ? 10 : 24;
}

function getTargetFps() {
  if (typeof window === "undefined") return 30;
  return isMobileViewport() ? 18 : 24;
}

export default function AmbientParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    if (motionQuery.matches || mobileQuery.matches) return;

    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) return;

    const color = PARTICLE_COLORS[theme];
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = 0;
    let lastFrame = 0;
    let frameInterval = 1000 / getTargetFps();
    let running = true;
    let scrolling = false;
    let scrollEndTimer = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = getParticleCount();
      particles = Array.from({ length: count }, () => createParticle(width, height));
      frameInterval = 1000 / getTargetFps();
    };

    const draw = (time: number) => {
      if (!running) return;
      if (scrolling) {
        frameId = requestAnimationFrame(draw);
        return;
      }

      const elapsed = time - lastFrame;
      if (elapsed < frameInterval) {
        frameId = requestAnimationFrame(draw);
        return;
      }
      lastFrame = time - (elapsed % frameInterval);

      ctx.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.phase += particle.phaseSpeed;

        if (particle.y < -6) {
          particle.y = height + 6;
          particle.x = Math.random() * width;
        }
        if (particle.x < -6) particle.x = width + 6;
        if (particle.x > width + 6) particle.x = -6;

        const opacity = particle.alpha * (0.6 + 0.4 * Math.sin(particle.phase));
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${opacity})`;
        ctx.fill();
      }

      frameId = requestAnimationFrame(draw);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frameId);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastFrame = 0;
      frameId = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onScroll = () => {
      scrolling = true;
      window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(() => {
        scrolling = false;
      }, 180);
    };

    resize();
    frameId = requestAnimationFrame(draw);

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      window.clearTimeout(scrollEndTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="ambient-bg__particles"
      aria-hidden="true"
    />
  );
}
