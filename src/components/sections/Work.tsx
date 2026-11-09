"use client";

import { useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { projects } from "@/data/projects";
import Reveal from "@/components/ui/Reveal";

export default function Work() {
  const [active, setActive] = useState<number | null>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { damping: 20, stiffness: 200, mass: 0.5 });
  const springY = useSpring(mouseY, { damping: 20, stiffness: 200, mass: 0.5 });

  return (
    <section
      id="work"
      onMouseMove={(e) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
      }}
      className="relative border-t border-[var(--border)] px-6 py-28 sm:px-10"
    >
      <Reveal>
        <span className="text-sm uppercase tracking-[0.2em] text-[var(--muted)]">
          Selected Work
        </span>
      </Reveal>

      <div className="mt-12">
        {projects.map((project, i) => (
          <Reveal key={project.title} delay={i * 0.06}>
            <a
              href={project.href}
              data-cursor="hide"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className="group flex items-center justify-between border-b border-[var(--border)] py-8"
            >
              <div className="flex items-baseline gap-6">
                <span className="text-sm text-[var(--muted)]">
                  0{i + 1}
                </span>
                <h3 className="font-[family-name:var(--font-display)] text-3xl transition-transform duration-300 ease-out group-hover:translate-x-3 sm:text-5xl">
                  {project.title}
                </h3>
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-sm text-[var(--muted)]">{project.category}</div>
                <div className="text-sm text-[var(--muted)]">{project.year}</div>
              </div>
            </a>
          </Reveal>
        ))}
      </div>

      {/* Floating preview that trails the cursor while a row is hovered */}
      <AnimatePresence>
        {active !== null && (
          <motion.div
            key={active}
            style={{ left: springX, top: springY, background: projects[active].color }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none fixed z-30 h-64 w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl"
          />
        )}
      </AnimatePresence>
    </section>
  );
}
