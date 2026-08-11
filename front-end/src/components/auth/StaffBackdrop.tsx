"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

type StaffBackdropProps = {
  className?: string;
};

/** Decorative 5-line musical staffs + notes behind auth forms. */
export function StaffBackdrop({ className }: StaffBackdropProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 login-atmosphere" />

      {/* Soft paper grain */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(11,26,61,0.04) 0.6px, transparent 0.6px)",
          backgroundSize: "18px 18px",
        }}
      />

      <svg
        className="absolute -left-[6%] top-[4%] h-[42%] w-[78%] opacity-60 sm:opacity-75"
        viewBox="0 0 720 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <StaffSystem y={48} width={690} />
        <g opacity="0.9">
          <TrebleClef x={16} y={32} />
          <QuarterNote x={110} y={96} stemUp />
          <QuarterNote x={158} y={82} stemUp />
          <EighthPair x={210} y={110} />
          <QuarterNote x={292} y={68} stemUp />
          <HalfNote x={352} y={110} />
          <QuarterNote x={420} y={82} stemUp />
          <Sharp x={455} y={70} />
          <QuarterNote x={490} y={54} stemUp />
          <EighthPair x={545} y={96} />
          <WholeNote x={640} y={82} />
        </g>
      </svg>

      <svg
        className="absolute -right-[14%] top-[38%] h-[36%] w-[68%] -scale-x-100 opacity-[0.42] sm:opacity-60"
        viewBox="0 0 600 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <StaffSystem y={40} width={560} />
        <g opacity="0.85">
          <BassClef x={22} y={46} />
          <QuarterNote x={120} y={108} stemUp={false} />
          <QuarterNote x={180} y={90} stemUp={false} />
          <HalfNote x={250} y={124} />
          <EighthPair x={320} y={98} />
          <Flat x={390} y={86} />
          <QuarterNote x={430} y={78} stemUp={false} />
          <WholeNote x={510} y={106} />
        </g>
      </svg>

      <svg
        className="absolute bottom-[-2%] left-[4%] h-[32%] w-[92%] opacity-[0.38] sm:opacity-55"
        viewBox="0 0 980 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <StaffSystem y={36} width={940} />
        <g opacity="0.8">
          <TrebleClef x={18} y={22} scale={0.92} />
          <QuarterNote x={108} y={86} stemUp />
          <QuarterNote x={168} y={70} stemUp />
          <QuarterNote x={228} y={100} stemUp />
          <EighthPair x={290} y={78} />
          <HalfNote x={380} y={92} />
          <QuarterNote x={460} y={60} stemUp />
          <Sharp x={500} y={52} />
          <QuarterNote x={540} y={86} stemUp />
          <QuarterNote x={600} y={114} stemUp />
          <WholeNote x={670} y={78} />
          <QuarterNote x={740} y={92} stemUp />
          <EighthPair x={800} y={66} />
          <QuarterNote x={890} y={100} stemUp />
        </g>
      </svg>

      {!reduceMotion ? (
        <>
          <motion.div
            className="absolute left-[16%] top-[16%] text-brand/30"
            animate={{ y: [0, -12, 0], rotate: [-8, 5, -8] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            <FloatingNote />
          </motion.div>
          <motion.div
            className="absolute right-[18%] top-[24%] text-navy/22"
            animate={{ y: [0, 14, 0], rotate: [10, -5, 10] }}
            transition={{
              duration: 8.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          >
            <FloatingNote beamed />
          </motion.div>
          <motion.div
            className="absolute bottom-[18%] right-[10%] text-brand/22"
            animate={{ y: [0, -9, 0], rotate: [-4, 7, -4] }}
            transition={{
              duration: 6.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.1,
            }}
          >
            <FloatingNote />
          </motion.div>
          <motion.div
            className="absolute bottom-[28%] left-[8%] text-navy/18"
            animate={{ y: [0, 10, 0], opacity: [0.5, 0.9, 0.5] }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          >
            <FloatingRest />
          </motion.div>
        </>
      ) : null}

      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/55" />
    </div>
  );
}

function StaffSystem({
  y,
  width = 600,
}: {
  y: number;
  width?: number;
}) {
  const gap = 15;
  return (
    <g stroke="rgba(11, 26, 61, 0.18)" strokeWidth="1.35" strokeLinecap="round">
      {Array.from({ length: 5 }).map((_, i) => (
        <line
          key={i}
          x1={10}
          x2={width}
          y1={y + i * gap}
          y2={y + i * gap}
        />
      ))}
    </g>
  );
}

function TrebleClef({
  x,
  y,
  scale = 1,
}: {
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <text
      x={x}
      y={y + 82 * scale}
      fill="rgba(0, 71, 255, 0.32)"
      fontSize={76 * scale}
      fontFamily="Georgia, 'Times New Roman', serif"
      style={{ userSelect: "none" }}
    >
      𝄞
    </text>
  );
}

function BassClef({ x, y }: { x: number; y: number }) {
  return (
    <text
      x={x}
      y={y + 60}
      fill="rgba(11, 26, 61, 0.26)"
      fontSize={60}
      fontFamily="Georgia, 'Times New Roman', serif"
      style={{ userSelect: "none" }}
    >
      𝄢
    </text>
  );
}

function Sharp({ x, y }: { x: number; y: number }) {
  return (
    <text
      x={x}
      y={y}
      fill="rgba(0, 71, 255, 0.28)"
      fontSize={22}
      fontFamily="Georgia, 'Times New Roman', serif"
    >
      ♯
    </text>
  );
}

function Flat({ x, y }: { x: number; y: number }) {
  return (
    <text
      x={x}
      y={y}
      fill="rgba(11, 26, 61, 0.26)"
      fontSize={24}
      fontFamily="Georgia, 'Times New Roman', serif"
    >
      ♭
    </text>
  );
}

function QuarterNote({
  x,
  y,
  stemUp = true,
}: {
  x: number;
  y: number;
  stemUp?: boolean;
}) {
  return (
    <g fill="rgba(11, 26, 61, 0.3)" stroke="rgba(11, 26, 61, 0.3)">
      <ellipse cx={x} cy={y} rx={9.5} ry={7} transform={`rotate(-20 ${x} ${y})`} />
      <line
        x1={stemUp ? x + 8.5 : x - 8.5}
        y1={y}
        x2={stemUp ? x + 8.5 : x - 8.5}
        y2={stemUp ? y - 44 : y + 44}
        strokeWidth="2.1"
      />
    </g>
  );
}

function HalfNote({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke="rgba(0, 71, 255, 0.34)" strokeWidth="2.1">
      <ellipse cx={x} cy={y} rx={10.5} ry={7.5} transform={`rotate(-20 ${x} ${y})`} />
      <line x1={x + 9.5} y1={y} x2={x + 9.5} y2={y - 44} strokeWidth="2.1" />
    </g>
  );
}

function WholeNote({ x, y }: { x: number; y: number }) {
  return (
    <ellipse
      cx={x}
      cy={y}
      rx={12}
      ry={8}
      transform={`rotate(-20 ${x} ${y})`}
      fill="none"
      stroke="rgba(11, 26, 61, 0.28)"
      strokeWidth="2.3"
    />
  );
}

function EighthPair({ x, y }: { x: number; y: number }) {
  return (
    <g fill="rgba(0, 71, 255, 0.32)" stroke="rgba(0, 71, 255, 0.32)">
      <ellipse cx={x} cy={y} rx={8.5} ry={6.2} transform={`rotate(-20 ${x} ${y})`} />
      <ellipse
        cx={x + 36}
        cy={y - 10}
        rx={8.5}
        ry={6.2}
        transform={`rotate(-20 ${x + 36} ${y - 10})`}
      />
      <line x1={x + 7.5} y1={y} x2={x + 7.5} y2={y - 42} strokeWidth="2.1" />
      <line x1={x + 43.5} y1={y - 10} x2={x + 43.5} y2={y - 52} strokeWidth="2.1" />
      <path
        d={`M ${x + 7.5} ${y - 42} L ${x + 43.5} ${y - 52} L ${x + 43.5} ${y - 45} L ${x + 7.5} ${y - 35} Z`}
        stroke="none"
      />
    </g>
  );
}

function FloatingNote({ beamed = false }: { beamed?: boolean }) {
  if (beamed) {
    return (
      <svg width="44" height="44" viewBox="0 0 42 42" fill="currentColor">
        <ellipse cx="10" cy="30" rx="7" ry="5" transform="rotate(-20 10 30)" />
        <ellipse cx="28" cy="26" rx="7" ry="5" transform="rotate(-20 28 26)" />
        <rect x="15" y="6" width="2.2" height="24" />
        <rect x="33" y="2" width="2.2" height="24" />
        <path d="M17 6 L35 2 L35 8 L17 12 Z" />
      </svg>
    );
  }
  return (
    <svg width="28" height="40" viewBox="0 0 28 40" fill="currentColor">
      <ellipse cx="11" cy="30" rx="8" ry="5.5" transform="rotate(-22 11 30)" />
      <rect x="17" y="4" width="2.4" height="26" />
      <path d="M19 4 C24 6 26 12 24 16 C21 12 19 8 19 4 Z" />
    </svg>
  );
}

function FloatingRest() {
  return (
    <svg width="22" height="36" viewBox="0 0 22 36" fill="currentColor">
      <path d="M8 4 L16 4 L12 12 L18 12 L10 28 L14 20 L6 20 L12 8 Z" />
    </svg>
  );
}
