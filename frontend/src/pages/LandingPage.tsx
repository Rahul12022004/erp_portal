import { useState, useEffect } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import heroImg from "../images/de2c29d2-68c5-4091-8f47-340c4be97e38.webp";
import featureImg1 from "../images/57f45015-63d7-4c86-b3e7-ccc8ac154581.png";
import featureImg2 from "../images/a8c98699-a6c6-4e87-abc5-9f332b2f6d84.webp";
import featureImg3 from "../images/7e3bd6f3-f7d8-4d1a-9a14-dd54d60e868c.png";
import featureImg4 from "../images/23fa195b-9acf-4e55-b7bd-bab904e4d8c9.png";
import {
  ArrowRight,
  BookOpen,
  Bus,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  IdCard,
  Menu,
  Moon,
  School2,
  ShieldCheck,
  Star,
  Sun,
  Users,
  Wallet,
  X,
  Clock,
  CheckCircle,
  BarChart3,
  FileText,
  Settings,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react";

// ── Theme ───────────────────────────────────────────────────────────────────
const brand = "#2AA889";
const brandDeep = "#1d7a68";

// ── Clay shadow helpers ────────────────────────────────────────────────────
const clayCard = "bg-white/90 rounded-[22px] shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff]";
const clayCardDark = "dark:bg-slate-900/90 dark:shadow-[8px_8px_16px_rgba(0,0,0,0.18),-8px_-8px_16px_rgba(255,255,255,0.06)]";
const clayBtn = "rounded-[20px] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] hover:shadow-[4px_4px_8px_#c8ccd1,-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#c8ccd1,inset_-4px_-4px_8px_#ffffff] transition-all duration-200 cursor-pointer";

// ── Glassmorphism card helpers ────────────────────────────────────────────
const glassCard = "backdrop-blur-[5px] bg-white rounded-[20px] shadow-[-35px_35px_68px_0px_rgba(42,168,137,0.5),inset_5px_-5px_16px_0px_rgba(42,168,137,0.6),inset_0px_11px_28px_0px_rgb(255,255,255)]";
const glassCardDark = "dark:backdrop-blur-[5px] dark:bg-slate-900 dark:rounded-[20px] dark:shadow-[-35px_35px_68px_0px_rgba(42,168,137,0.3),inset_5px_-5px_16px_0px_rgba(42,168,137,0.4),inset_0px_11px_28px_0px_rgba(255,255,255,0.05)]";

// ── Reveal on scroll ────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, x = 0, y = 0 }: { children: React.ReactNode; delay?: number; x?: number; y?: number }) {
  const canObserveInView =
    typeof window !== "undefined" && typeof window.IntersectionObserver !== "undefined";

  return (
    <motion.div
      initial={{ opacity: 0, y: y || 32, x }}
      animate={!canObserveInView ? { opacity: 1, y: 0, x: 0 } : undefined}
      whileInView={canObserveInView ? { opacity: 1, y: 0, x: 0 } : undefined}
      viewport={canObserveInView ? { once: true, amount: 0.15 } : undefined}
      transition={{ duration: 0.7, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

// ── 3D Claymorphism Hero Character ──────────────────────────────────────────
function HeroCharacter() {
  return (
    <motion.div
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      className="relative mx-auto w-full max-w-[480px]"
    >
      <div className={`${glassCard} ${glassCardDark} rounded-[36px] p-6`}>
        <svg viewBox="0 0 420 340" className="w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <filter id="heroShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.12)" />
            </filter>
          </defs>

          {/* Ground shadow */}
          <ellipse cx="210" cy="320" rx="90" ry="10" fill="rgba(0,0,0,0.08)" />

          {/* Chair back */}
          <rect x="165" y="160" width="90" height="80" rx="16" fill="#b3e0d4" />
          <rect x="172" y="167" width="76" height="66" rx="12" fill="#5dd4b8" opacity="0.4" />

          {/* Body / torso */}
          <ellipse cx="210" cy="200" rx="55" ry="65" fill="#2AA889" />
          <ellipse cx="200" cy="185" rx="35" ry="40" fill="#5dd4b8" opacity="0.3" />
          <ellipse cx="225" cy="220" rx="20" ry="25" fill="#1d7a68" opacity="0.3" />

          {/* Left arm reaching to laptop */}
          <ellipse cx="155" cy="230" rx="18" ry="45" fill="#E8B89A" transform="rotate(-20 155 230)" />
          <ellipse cx="148" cy="238" rx="14" ry="38" fill="#F4C4A0" opacity="0.5" transform="rotate(-20 148 238)" />

          {/* Right arm reaching to laptop */}
          <ellipse cx="265" cy="230" rx="18" ry="45" fill="#E8B89A" transform="rotate(20 265 230)" />
          <ellipse cx="272" cy="238" rx="14" ry="38" fill="#F4C4A0" opacity="0.5" transform="rotate(20 272 238)" />

          {/* Laptop base */}
          <rect x="110" y="240" width="200" height="12" rx="6" fill="#b3e0d4" />
          <rect x="110" y="240" width="200" height="6" rx="3" fill="#5dd4b8" opacity="0.5" />
          <rect x="130" y="220" width="160" height="90" rx="10" fill="#2AA889" />
          <rect x="136" y="226" width="148" height="78" rx="6" fill="#e6f6f2" />
          {/* Screen content lines */}
          <rect x="146" y="240" width="80" height="6" rx="3" fill="#2AA889" opacity="0.4" />
          <rect x="146" y="252" width="50" height="6" rx="3" fill="#2AA889" opacity="0.3" />
          <rect x="146" y="264" width="65" height="6" rx="3" fill="#2AA889" opacity="0.3" />
          <rect x="146" y="276" width="40" height="6" rx="3" fill="#2AA889" opacity="0.2" />

          {/* Neck */}
          <rect x="195" y="130" width="30" height="25" rx="10" fill="#E8B89A" />

          {/* Head */}
          <ellipse cx="210" cy="95" rx="65" ry="60" fill="#E8B89A" />
          <ellipse cx="195" cy="75" rx="40" ry="32" fill="#F4C4A0" opacity="0.5" />
          <ellipse cx="225" cy="115" rx="25" ry="20" fill="#D4957A" opacity="0.3" />

          {/* Hair */}
          <ellipse cx="210" cy="58" rx="60" ry="38" fill="#4A3728" />
          <ellipse cx="195" cy="50" rx="35" ry="22" fill="#6B4A38" opacity="0.6" />

          {/* Eyes */}
          <ellipse cx="188" cy="92" rx="9" ry="10" fill="#4A3728" />
          <ellipse cx="232" cy="92" rx="9" ry="10" fill="#4A3728" />
          <circle cx="191" cy="89" r="3" fill="white" opacity="0.9" />
          <circle cx="235" cy="89" r="3" fill="white" opacity="0.9" />

          {/* Eyebrows */}
          <rect x="178" y="78" width="20" height="4" rx="2" fill="#4A3728" opacity="0.7" />
          <rect x="222" y="78" width="20" height="4" rx="2" fill="#4A3728" opacity="0.7" />

          {/* Blush cheeks */}
          <ellipse cx="172" cy="105" rx="14" ry="9" fill="#F4A0A0" opacity="0.45" />
          <ellipse cx="248" cy="105" rx="14" ry="9" fill="#F4A0A0" opacity="0.45" />

          {/* Smile */}
          <path d="M198 115 Q210 125 222 115" stroke="#C47A60" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* Floating notification bubble */}
          <g filter="url(#heroShadow)">
            <rect x="280" y="40" width="80" height="36" rx="14" fill="white" />
            <polygon points="282,70 290,76 282,76" fill="white" />
            <circle cx="296" cy="58" r="10" fill="#2AA889" opacity="0.2" />
            <rect x="312" y="52" width="38" height="5" rx="2.5" fill="#2AA889" opacity="0.4" />
            <rect x="312" y="60" width="25" height="5" rx="2.5" fill="#2AA889" opacity="0.25" />
          </g>
        </svg>

        {/* Stats below character */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Live Dashboard", color: brand },
            { label: "Real-time Data", color: "#8b5cf6" },
            { label: "Auto Reports", color: "#f59e0b" },
          ].map((item) => (
            <div key={item.label} className="rounded-[14px] bg-[#f0faf7] p-3 text-center dark:bg-slate-800">
              <p className="text-xs font-semibold" style={{ color: item.color }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating mini card top-right */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className={`${glassCard} ${glassCardDark} absolute -top-4 -right-4 rounded-2xl px-4 py-3`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2AA889]/15">
            <CheckCircle className="h-4 w-4 text-[#2AA889]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-white">Visitor Scanned</p>
            <p className="text-xs text-[#2AA889] font-semibold">+1 just now</p>
          </div>
        </div>
      </motion.div>

      {/* Floating mini card bottom-left */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className={`${glassCard} ${glassCardDark} absolute -bottom-3 -left-4 rounded-2xl px-4 py-3`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10b981]/15">
            <CheckCircle className="h-4 w-4 text-[#10b981]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-white">Fee Collected</p>
            <p className="text-xs text-[#10b981] font-semibold">₹12,400 today</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── 3D Feature Head (small bust) ───────────────────────────────────────────
type HeadType = "student" | "visitor" | "teacher" | "admin" | "parent";

function FeatureHead({ type }: { type: HeadType }) {
  const configs: Record<HeadType, { hairFill: string; accentFill: string; expression: string; hat: string | null }> = {
    student: { hairFill: "#4A3728", accentFill: brand, expression: "happy", hat: null },
    visitor: { hairFill: "#6B4A38", accentFill: "#8b5cf6", expression: "curious", hat: null },
    teacher: { hairFill: "#2A1A0A", accentFill: "#f59e0b", expression: "proud", hat: "gradCap" },
    admin: { hairFill: "#4A3728", accentFill: "#3b82f6", expression: "focused", hat: "glasses" },
    parent: { hairFill: "#6B4A38", accentFill: "#ec4899", expression: "kind", hat: null },
  };
  const c = configs[type];

  return (
    <svg viewBox="0 0 80 90" className="w-16 h-16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Neck */}
      <rect x="30" y="58" width="20" height="18" rx="8" fill="#E8B89A" />
      <rect x="33" y="60" width="14" height="14" rx="6" fill="#F4C4A0" opacity="0.4" />

      {/* Shoulders */}
      <ellipse cx="40" cy="82" rx="30" ry="14" fill={c.accentFill} opacity="0.3" />
      <ellipse cx="40" cy="82" rx="22" ry="10" fill={c.accentFill} opacity="0.4" />

      {/* Head */}
      <ellipse cx="40" cy="38" rx="28" ry="26" fill="#E8B89A" />
      <ellipse cx="33" cy="28" rx="16" ry="12" fill="#F4C4A0" opacity="0.55" />
      <ellipse cx="50" cy="48" rx="10" ry="8" fill="#D4957A" opacity="0.3" />

      {/* Hair */}
      <ellipse cx="40" cy="22" rx="26" ry="18" fill={c.hairFill} />
      <ellipse cx="32" cy="18" rx="14" ry="10" fill={c.hairFill} opacity="0.6" />

      {/* Graduate cap */}
      {c.hat === "gradCap" && (
        <>
          <rect x="18" y="12" width="44" height="6" rx="2" fill="#1d7a68" />
          <rect x="26" y="6" width="28" height="8" rx="2" fill="#2AA889" />
          <rect x="37" y="14" width="6" height="8" rx="1" fill="#1d7a68" />
          <ellipse cx="40" cy="6" rx="4" ry="3" fill="#f59e0b" />
        </>
      )}

      {/* Glasses */}
      {c.hat === "glasses" && (
        <>
          <rect x="22" y="34" width="16" height="12" rx="5" fill="none" stroke="#4A3728" strokeWidth="2" />
          <rect x="42" y="34" width="16" height="12" rx="5" fill="none" stroke="#4A3728" strokeWidth="2" />
          <line x1="38" y1="40" x2="42" y2="40" stroke="#4A3728" strokeWidth="2" />
        </>
      )}

      {/* Eyes */}
      <ellipse cx="30" cy="38" rx="4" ry="4.5" fill="#4A3728" />
      <ellipse cx="50" cy="38" rx="4" ry="4.5" fill="#4A3728" />
      <circle cx="31.5" cy="36.5" r="1.5" fill="white" opacity="0.9" />
      <circle cx="51.5" cy="36.5" r="1.5" fill="white" opacity="0.9" />

      {/* Eyebrows */}
      <rect x="25" y="30" width="10" height="2.5" rx="1.25" fill={c.hairFill} opacity="0.6" />
      <rect x="45" y="30" width="10" height="2.5" rx="1.25" fill={c.hairFill} opacity="0.6" />

      {/* Blush */}
      <ellipse cx="22" cy="44" rx="6" ry="4" fill="#F4A0A0" opacity="0.4" />
      <ellipse cx="58" cy="44" rx="6" ry="4" fill="#F4A0A0" opacity="0.4" />

      {/* Mouth */}
      {c.expression === "happy" && <path d="M34 48 Q40 54 46 48" stroke="#C47A60" strokeWidth="2" strokeLinecap="round" fill="none" />}
      {c.expression === "curious" && <ellipse cx="40" cy="50" rx="5" ry="3.5" fill="#C47A60" />}
      {c.expression === "proud" && <path d="M33 48 Q40 53 47 48" stroke="#C47A60" strokeWidth="2" strokeLinecap="round" fill="none" />}
      {c.expression === "focused" && <rect x="36" y="48" width="8" height="3" rx="1.5" fill="#C47A60" />}
      {c.expression === "kind" && <path d="M35 49 Q40 53 45 49" stroke="#C47A60" strokeWidth="2" strokeLinecap="round" fill="none" />}
    </svg>
  );
}

// ── Split Section 3D Character ──────────────────────────────────────────────
function SplitCharacter({ reverse = false }: { reverse?: boolean }) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={`${glassCard} ${glassCardDark} rounded-[30px] p-6 ${reverse ? "order-2" : ""}`}
    >
      <div className="rounded-[24px] bg-gradient-to-br from-[#f0faf7] to-[#e6f6f2] p-4 dark:from-slate-800 dark:to-slate-900">
        <svg viewBox="0 0 340 260" className="w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <filter id="splitShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="rgba(0,0,0,0.12)" />
            </filter>
          </defs>

          {/* Ground shadow */}
          <ellipse cx="170" cy="248" rx="80" ry="9" fill="rgba(0,0,0,0.07)" />

          {/* Desk */}
          <rect x="60" y="195" width="220" height="10" rx="5" fill="#b3e0d4" />
          <rect x="60" y="195" width="220" height="5" rx="2.5" fill="#5dd4b8" opacity="0.4" />
          {/* Plant */}
          <rect x="230" y="175" width="30" height="20" rx="6" fill="#FDE68A" />
          <rect x="233" y="172" width="24" height="5" rx="2" fill="#f59e0b" opacity="0.5" />

          {/* Character body */}
          <ellipse cx="130" cy="170" rx="42" ry="50" fill="#2AA889" />
          <ellipse cx="122" cy="158" rx="26" ry="32" fill="#5dd4b8" opacity="0.3" />
          {/* Neck */}
          <rect x="118" y="115" width="24" height="22" rx="9" fill="#E8B89A" />
          {/* Head */}
          <ellipse cx="130" cy="85" rx="50" ry="46" fill="#E8B89A" />
          <ellipse cx="118" cy="68" rx="30" ry="24" fill="#F4C4A0" opacity="0.5" />
          <ellipse cx="145" cy="102" rx="18" ry="14" fill="#D4957A" opacity="0.25" />
          {/* Hair — bob cut */}
          <ellipse cx="130" cy="55" rx="46" ry="32" fill="#4A3728" />
          <ellipse cx="115" cy="48" rx="26" ry="18" fill="#6B4A38" opacity="0.6" />
          {/* Eyes */}
          <ellipse cx="112" cy="82" rx="7" ry="8" fill="#4A3728" />
          <ellipse cx="148" cy="82" rx="7" ry="8" fill="#4A3728" />
          <circle cx="114.5" cy="79.5" r="2.5" fill="white" opacity="0.9" />
          <circle cx="150.5" cy="79.5" r="2.5" fill="white" opacity="0.9" />
          {/* Blush */}
          <ellipse cx="98" cy="94" rx="11" ry="7" fill="#F4A0A0" opacity="0.4" />
          <ellipse cx="162" cy="94" rx="11" ry="7" fill="#F4A0A0" opacity="0.4" />
          {/* Smile */}
          <path d="M120 100 Q130 110 140 100" stroke="#C47A60" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Arm with pencil */}
          <ellipse cx="172" cy="165" rx="14" ry="38" fill="#E8B89A" transform="rotate(15 172 165)" />
          <rect x="168" y="140" width="6" height="30" rx="2" fill="#f59e0b" transform="rotate(20 171 155)" />
          <polygon points="171,130 168,140 174,140" fill="#f59e0b" transform="rotate(20 171 135)" />

          {/* Floating book */}
          <g>
            <rect x="70" y="148" width="36" height="26" rx="4" fill="#C4B5FD" />
            <rect x="70" y="148" width="36" height="5" rx="2" fill="#a78bfa" />
            <line x1="88" y1="148" x2="88" y2="174" stroke="#a78bfa" strokeWidth="1" />
          </g>

          {/* Floating ID badge */}
          <g filter="url(#splitShadow)">
            <rect x="200" y="130" width="36" height="48" rx="8" fill="white" />
            <rect x="208" y="140" width="20" height="20" rx="5" fill="#2AA889" opacity="0.3" />
            <rect x="208" y="166" width="28" height="4" rx="2" fill="#2AA889" opacity="0.3" />
            <rect x="208" y="172" width="20" height="4" rx="2" fill="#2AA889" opacity="0.2" />
          </g>

          {/* Floating coffee cup */}
          <g>
            <rect x="250" y="140" width="22" height="30" rx="6" fill="#FDE68A" />
            <rect x="250" y="140" width="22" height="6" rx="3" fill="#f59e0b" opacity="0.35" />
            <ellipse cx="261" cy="142" rx="8" ry="3" fill="#FDE68A" />
            <ellipse cx="261" cy="142" rx="6" ry="2" fill="#f59e0b" opacity="0.3" />
            <path d="M272 150 Q280 155 272 160" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Steam */}
            <path d="M254 134 Q256 128 254 122" stroke="#b3e0d4" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
            <path d="M261 132 Q263 126 261 120" stroke="#b3e0d4" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
            <path d="M268 134 Q270 128 268 122" stroke="#b3e0d4" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
          </g>
        </svg>
      </div>
    </motion.div>
  );
}

// ── Floating Background Elements ────────────────────────────────────────────
function FloatingHandLeft() {
  return (
    <motion.div
      animate={{ y: [0, -8, 0], rotate: [0, 3, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="absolute left-8 top-16 z-0 hidden lg:block"
      style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.08))" }}
    >
      <svg width="70" height="70" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="40" cy="60" rx="20" ry="16" fill="#E8B89A" />
        <ellipse cx="40" cy="60" rx="14" ry="11" fill="#F4C4A0" opacity="0.4" />
        <ellipse cx="40" cy="72" rx="14" ry="8" fill="#E8B89A" />
        <ellipse cx="28" cy="42" rx="7" ry="18" fill="#E8B89A" transform="rotate(-10 28 42)" />
        <ellipse cx="36" cy="36" rx="7" ry="22" fill="#E8B89A" />
        <ellipse cx="44" cy="38" rx="7" ry="20" fill="#E8B89A" />
        <ellipse cx="52" cy="44" rx="7" ry="16" fill="#E8B89A" transform="rotate(10 52 44)" />
        <ellipse cx="22" cy="52" rx="6" ry="12" fill="#E8B89A" transform="rotate(-30 22 52)" />
        <ellipse cx="34" cy="30" rx="3" ry="8" fill="#F4C4A0" opacity="0.5" />
        <ellipse cx="42" cy="28" rx="3" ry="8" fill="#F4C4A0" opacity="0.5" />
      </svg>
    </motion.div>
  );
}

function FloatingCupRight() {
  return (
    <motion.div
      animate={{ y: [0, -10, 0], rotate: [0, -4, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute right-12 top-20 z-0 hidden lg:block"
      style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.08))" }}
    >
      <svg width="60" height="70" viewBox="0 0 60 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="8" y="18" width="36" height="44" rx="10" fill="#FDE68A" />
        <rect x="8" y="18" width="36" height="8" rx="4" fill="#f59e0b" opacity="0.35" />
        <ellipse cx="26" cy="20" rx="14" ry="5" fill="#FDE68A" />
        <ellipse cx="26" cy="20" rx="11" ry="4" fill="#f59e0b" opacity="0.3" />
        <path d="M44 30 Q56 36 44 44" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M18 10 Q20 4 18 -2" stroke="#b3e0d4" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M26 8 Q28 2 26 -4" stroke="#b3e0d4" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
        <path d="M34 10 Q36 4 34 -2" stroke="#b3e0d4" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
      </svg>
    </motion.div>
  );
}

function FloatingBadge() {
  return (
    <motion.div
      animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
      transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      className="absolute left-1/2 top-1/2 z-0 hidden xl:block"
      style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.08))" }}
    >
      <svg width="80" height="90" viewBox="0 0 80 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <filter id="badgeShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.15)" />
          </filter>
        </defs>
        <polygon points="15,30 5,80 20,70 20,30" fill="#1d7a68" />
        <polygon points="15,30 10,75 20,68 20,30" fill="#2AA889" opacity="0.5" />
        <polygon points="65,30 75,80 60,70 60,30" fill="#1d7a68" />
        <polygon points="65,30 70,75 60,68 60,30" fill="#2AA889" opacity="0.5" />
        <circle cx="40" cy="38" r="30" fill="#2AA889" filter="url(#badgeShadow)" />
        <circle cx="40" cy="38" r="24" fill="#5dd4b8" opacity="0.3" />
        <circle cx="40" cy="38" r="18" fill="#2AA889" />
        <polygon points="40,22 43,32 54,32 46,39 49,50 40,43 31,50 34,39 26,32 37,32" fill="#FDE68A" />
        <ellipse cx="30" cy="25" rx="8" ry="5" fill="white" opacity="0.2" />
      </svg>
    </motion.div>
  );
}

// ── Visitor 3D ID Card (overflow effect) ───────────────────────────────────
function VisitorCard3D() {
  return (
    <motion.div
      animate={{ y: [0, -8, 0], rotate: [0, 2, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -right-8 top-1/2 z-20 hidden lg:block"
      style={{ filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.25))" }}
    >
      <svg width="120" height="160" viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="4" dy="6" stdDeviation="6" floodColor="rgba(0,0,0,0.2)" />
          </filter>
        </defs>
        <rect x="5" y="5" width="110" height="150" rx="16" fill="white" filter="url(#cardShadow)" />
        <rect x="5" y="5" width="110" height="45" rx="16" fill="#2AA889" />
        <rect x="5" y="32" width="110" height="18" fill="#2AA889" />
        <rect x="12" y="10" width="40" height="6" rx="3" fill="#5dd4b8" opacity="0.4" />
        <circle cx="60" cy="55" r="22" fill="#E8B89A" />
        <ellipse cx="52" cy="45" rx="12" ry="9" fill="#F4C4A0" opacity="0.5" />
        <ellipse cx="60" cy="28" rx="20" ry="14" fill="#4A3728" />
        <ellipse cx="52" cy="54" rx="3.5" ry="4" fill="#4A3728" />
        <ellipse cx="68" cy="54" rx="3.5" ry="4" fill="#4A3728" />
        <circle cx="53" cy="52.5" r="1.2" fill="white" opacity="0.9" />
        <circle cx="69" cy="52.5" r="1.2" fill="white" opacity="0.9" />
        <ellipse cx="44" cy="60" rx="6" ry="3.5" fill="#F4A0A0" opacity="0.4" />
        <ellipse cx="76" cy="60" rx="6" ry="3.5" fill="#F4A0A0" opacity="0.4" />
        <path d="M54 64 Q60 69 66 64" stroke="#C47A60" strokeWidth="2" strokeLinecap="round" fill="none" />
        <rect x="20" y="88" width="80" height="6" rx="3" fill="#2AA889" opacity="0.5" />
        <rect x="30" y="98" width="60" height="5" rx="2.5" fill="#94a3b8" opacity="0.4" />
        <rect x="35" y="106" width="50" height="5" rx="2.5" fill="#94a3b8" opacity="0.3" />
        <rect x="30" y="118" width="60" height="30" rx="6" fill="#f0faf7" />
        <rect x="35" y="123" width="8" height="8" rx="1" fill="#2AA889" opacity="0.6" />
        <rect x="45" y="123" width="8" height="8" rx="1" fill="#2AA889" opacity="0.6" />
        <rect x="55" y="123" width="8" height="8" rx="1" fill="#2AA889" opacity="0.6" />
        <rect x="65" y="123" width="8" height="8" rx="1" fill="#2AA889" opacity="0.6" />
        <rect x="35" y="133" width="8" height="8" rx="1" fill="#2AA889" opacity="0.4" />
        <rect x="45" y="133" width="8" height="8" rx="1" fill="#2AA889" opacity="0.8" />
        <rect x="55" y="133" width="8" height="8" rx="1" fill="#2AA889" opacity="0.4" />
        <rect x="65" y="133" width="8" height="8" rx="1" fill="#2AA889" opacity="0.6" />
        <rect x="35" y="143" width="8" height="8" rx="1" fill="#2AA889" opacity="0.6" />
        <rect x="45" y="143" width="8" height="8" rx="1" fill="#2AA889" opacity="0.4" />
        <rect x="55" y="143" width="8" height="8" rx="1" fill="#2AA889" opacity="0.6" />
        <rect x="65" y="143" width="8" height="8" rx="1" fill="#2AA889" opacity="0.4" />
      </svg>
    </motion.div>
  );
}

// ── 3D Clay-Style Visitor Character (Pixar-like / Claymorphism) ─────────────
function VisitorCharacter() {
  return (
    <motion.div
      animate={{ y: [0, -10, 0], rotate: [0, 1.5, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      className="relative mx-auto"
      style={{ filter: "drop-shadow(0 12px 28px rgba(0,0,0,0.3))" }}
    >
      <svg viewBox="0 0 480 520" className="w-full max-w-[460px]" xmlns="http://www.w3.org/2000/svg" aria-label="3D clay-style student visitor character">
        <defs>
          {/* Clay/soft glow filter */}
          <filter id="claySoftGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
            <feFlood floodColor="rgba(255,255,255,0.25)" result="glowColor" />
            <feComposite in="glowColor" in2="blur" operator="in" result="softGlow" />
            <feMerge>
              <feMergeNode in="softGlow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Deep soft shadow */}
          <filter id="clayDeepShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="4" dy="8" stdDeviation="8" floodColor="rgba(0,0,0,0.18)" />
          </filter>

          {/* Character drop shadow */}
          <filter id="charShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="6" dy="10" stdDeviation="10" floodColor="rgba(0,0,0,0.22)" />
          </filter>

          {/* Classroom depth blur */}
          <filter id="bgBlur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" />
          </filter>

          {/* ID Card glow */}
          <filter id="idGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="2" dy="4" stdDeviation="5" floodColor="rgba(42,168,137,0.5)" />
          </filter>

          {/* Warm ambient gradient for background */}
          <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#f0e6d3" />
            <stop offset="100%" stopColor="#e8d5b7" />
          </radialGradient>

          {/* Skin clay gradient */}
          <radialGradient id="skinGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#F5C9A8" />
            <stop offset="60%" stopColor="#E8B89A" />
            <stop offset="100%" stopColor="#D4957A" />
          </radialGradient>

          {/* Hair clay gradient */}
          <radialGradient id="hairGrad" cx="45%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#6B4A38" />
            <stop offset="70%" stopColor="#4A3728" />
            <stop offset="100%" stopColor="#3A2A1A" />
          </radialGradient>

          {/* Blue jacket gradient */}
          <radialGradient id="jacketGrad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#5B9BD5" />
            <stop offset="60%" stopColor="#3B7BB9" />
            <stop offset="100%" stopColor="#2A5F8A" />
          </radialGradient>

          {/* White shirt gradient */}
          <radialGradient id="shirtGrad" cx="45%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F0F4F8" />
            <stop offset="100%" stopColor="#D8E2EC" />
          </radialGradient>

          {/* Chalkboard green */}
          <radialGradient id="chalkGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2D5A3D" />
            <stop offset="100%" stopColor="#1A3A28" />
          </radialGradient>

          {/* Eye white */}
          <radialGradient id="eyeWhite" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E8EEF4" />
          </radialGradient>

          {/* Iris */}
          <radialGradient id="irisGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#4A3728" />
            <stop offset="100%" stopColor="#2A1A0A" />
          </radialGradient>

          {/* Card body gradient */}
          <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F4F8FB" />
          </linearGradient>

          {/* Card accent */}
          <linearGradient id="cardAccent" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2AA889" />
            <stop offset="100%" stopColor="#1d7a68" />
          </linearGradient>

          {/* Desk gradient */}
          <linearGradient id="deskGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C9A87C" />
            <stop offset="100%" stopColor="#A08050" />
          </linearGradient>
        </defs>

        {/* ── Background: Classroom Scene ── */}
        <rect x="0" y="0" width="480" height="520" rx="28" fill="url(#bgGlow)" />

        {/* Chalkboard (blurred background) */}
        <rect x="30" y="30" width="280" height="160" rx="12" fill="url(#chalkGrad)" filter="url(#bgBlur)" />
        {/* Chalkboard frame */}
        <rect x="28" y="28" width="284" height="164" rx="14" fill="none" stroke="#8B6914" strokeWidth="6" filter="url(#bgBlur)" />
        {/* Chalkboard chalk tray */}
        <rect x="28" y="192" width="284" height="10" rx="3" fill="#8B6914" filter="url(#bgBlur)" />
        {/* Chalk writing on board (blurred) */}
        <rect x="60" y="60" width="120" height="8" rx="4" fill="rgba(255,255,255,0.3)" filter="url(#bgBlur)" />
        <rect x="60" y="80" width="80" height="8" rx="4" fill="rgba(255,255,255,0.2)" filter="url(#bgBlur)" />
        <rect x="60" y="100" width="100" height="8" rx="4" fill="rgba(255,255,255,0.15)" filter="url(#bgBlur)" />
        <rect x="60" y="120" width="60" height="8" rx="4" fill="rgba(255,255,255,0.1)" filter="url(#bgBlur)" />
        {/* Triangle on board */}
        <polygon points="220,70 250,130 190,130" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" filter="url(#bgBlur)" />

        {/* Classroom desk (left, blurred) */}
        <rect x="20" y="380" width="140" height="12" rx="5" fill="url(#deskGrad)" filter="url(#bgBlur)" opacity="0.7" />
        <rect x="30" y="392" width="10" height="50" rx="4" fill="#8B6914" filter="url(#bgBlur)" opacity="0.5" />
        <rect x="130" y="392" width="10" height="50" rx="4" fill="#8B6914" filter="url(#bgBlur)" opacity="0.5" />

        {/* Classroom window (right blurred) */}
        <rect x="360" y="50" width="90" height="120" rx="8" fill="#B8D4E8" filter="url(#bgBlur)" opacity="0.5" />
        <rect x="360" y="50" width="90" height="120" rx="8" fill="none" stroke="#C9A87C" strokeWidth="5" filter="url(#bgBlur)" opacity="0.4" />
        <line x1="405" y1="50" x2="405" y2="170" stroke="#C9A87C" strokeWidth="3" filter="url(#bgBlur)" opacity="0.4" />
        <line x1="360" y1="110" x2="450" y2="110" stroke="#C9A87C" strokeWidth="3" filter="url(#bgBlur)" opacity="0.4" />
        {/* Window light */}
        <rect x="360" y="50" width="90" height="120" rx="8" fill="rgba(255,255,220,0.15)" filter="url(#bgBlur)" opacity="0.3" />

        {/* Warm light rays from window */}
        <polygon points="360,50 480,520 200,520" fill="rgba(255,245,200,0.08)" filter="url(#bgBlur)" />

        {/* Floor */}
        <rect x="0" y="440" width="480" height="80" rx="0" fill="#D4B896" opacity="0.4" />
        <rect x="0" y="440" width="480" height="4" fill="#C4A07A" opacity="0.5" />

        {/* ── Character Ground Shadow ── */}
        <ellipse cx="240" cy="488" rx="100" ry="14" fill="rgba(0,0,0,0.12)" />
        <ellipse cx="240" cy="486" rx="70" ry="8" fill="rgba(0,0,0,0.08)" />

        {/* ── Character Body ── */}
        {/* Torso - blue jacket */}
        <ellipse cx="240" cy="360" rx="72" ry="88" fill="url(#jacketGrad)" filter="url(#charShadow)" />
        {/* Jacket highlight */}
        <ellipse cx="225" cy="330" rx="45" ry="55" fill="#7AB8E0" opacity="0.35" />
        {/* Jacket shadow area */}
        <ellipse cx="260" cy="390" rx="28" ry="35" fill="#2A5F8A" opacity="0.35" />

        {/* White shirt collar */}
        <ellipse cx="240" cy="280" rx="30" ry="20" fill="url(#shirtGrad)" />
        {/* Shirt collar left */}
        <ellipse cx="220" cy="282" rx="14" ry="10" fill="#FFFFFF" />
        {/* Shirt collar right */}
        <ellipse cx="260" cy="282" rx="14" ry="10" fill="#FFFFFF" />

        {/* ── Right Arm (holding ID card) ── */}
        {/* Upper arm */}
        <ellipse cx="312" cy="340" rx="26" ry="55" fill="url(#jacketGrad)" transform="rotate(18 312 340)" filter="url(#charShadow)" />
        <ellipse cx="318" cy="330" rx="16" ry="38" fill="#7AB8E0" opacity="0.3" transform="rotate(18 318 330)" />
        {/* Forearm skin */}
        <ellipse cx="328" cy="395" rx="22" ry="50" fill="url(#skinGrad)" transform="rotate(25 328 395)" filter="url(#claySoftGlow)" />
        <ellipse cx="332" cy="385" rx="14" ry="35" fill="#F5C9A8" opacity="0.45" transform="rotate(25 332 385)" />
        {/* Hand */}
        <ellipse cx="340" cy="440" rx="20" ry="24" fill="url(#skinGrad)" transform="rotate(15 340 440)" filter="url(#claySoftGlow)" />
        <ellipse cx="340" cy="436" rx="12" ry="15" fill="#F5C9A8" opacity="0.4" transform="rotate(15 340 436)" />

        {/* ── ID Card in hand ── */}
        <g filter="url(#idGlow)" transform="rotate(-12 360 440)">
          {/* Card body */}
          <rect x="330" y="408" width="72" height="96" rx="12" fill="url(#cardGrad)" />
          {/* Card top accent band */}
          <rect x="330" y="408" width="72" height="30" rx="12" fill="url(#cardAccent)" />
          <rect x="330" y="428" width="72" height="10" fill="url(#cardAccent)" />
          {/* School name on card */}
          <rect x="338" y="414" width="36" height="5" rx="2.5" fill="rgba(255,255,255,0.5)" />
          {/* Visitor portrait area */}
          <rect x="342" y="446" width="32" height="32" rx="6" fill="#E8F4F0" />
          {/* Mini character portrait */}
          <ellipse cx="358" cy="460" rx="10" ry="9" fill="#E8B89A" />
          <ellipse cx="358" cy="453" rx="9" ry="7" fill="#6B4A38" />
          <ellipse cx="355" cy="459" rx="2" ry="2.5" fill="#4A3728" />
          <ellipse cx="361" cy="459" rx="2" ry="2.5" fill="#4A3728" />
          <circle cx="355.5" cy="458" r="0.8" fill="white" opacity="0.9" />
          <circle cx="361.5" cy="458" r="0.8" fill="white" opacity="0.9" />
          <path d="M355 466 Q358 469 361 466" stroke="#C47A60" strokeWidth="1" strokeLinecap="round" fill="none" />
          {/* VISITOR text */}
          <rect x="340" y="484" width="50" height="5" rx="2.5" fill="#2AA889" opacity="0.8" />
          <text x="366" y="507" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#2AA889" textAnchor="middle">Visitor</text>
          {/* Lanyard strap */}
          <rect x="363" y="405" width="6" height="20" rx="2" fill="#2AA889" />
          <circle cx="366" cy="408" r="4" fill="#1d7a68" />
        </g>

        {/* ── Left Arm ── */}
        {/* Upper arm */}
        <ellipse cx="168" cy="340" rx="26" ry="55" fill="url(#jacketGrad)" transform="rotate(-18 168 340)" filter="url(#charShadow)" />
        <ellipse cx="162" cy="330" rx="16" ry="38" fill="#7AB8E0" opacity="0.3" transform="rotate(-18 162 330)" />
        {/* Forearm skin */}
        <ellipse cx="155" cy="395" rx="22" ry="50" fill="url(#skinGrad)" transform="rotate(-25 155 395)" filter="url(#claySoftGlow)" />
        <ellipse cx="150" cy="385" rx="14" ry="35" fill="#F5C9A8" opacity="0.45" transform="rotate(-25 150 385)" />
        {/* Hand */}
        <ellipse cx="148" cy="438" rx="20" ry="24" fill="url(#skinGrad)" transform="rotate(-15 148 438)" filter="url(#claySoftGlow)" />
        <ellipse cx="148" cy="434" rx="12" ry="15" fill="#F5C9A8" opacity="0.4" transform="rotate(-15 148 434)" />

        {/* ── Neck ── */}
        <rect x="220" y="258" width="40" height="35" rx="16" fill="url(#skinGrad)" filter="url(#claySoftGlow)" />
        <rect x="225" y="262" width="28" height="28" rx="12" fill="#F5C9A8" opacity="0.4" />

        {/* ── Head ── */}
        <ellipse cx="240" cy="205" rx="78" ry="74" fill="url(#skinGrad)" filter="url(#charShadow)" />
        {/* Forehead highlight */}
        <ellipse cx="225" cy="172" rx="48" ry="36" fill="#F5C9A8" opacity="0.55" />
        {/* Cheek blushes */}
        <ellipse cx="188" cy="220" rx="22" ry="14" fill="#F4A0A0" opacity="0.38" />
        <ellipse cx="292" cy="220" rx="22" ry="14" fill="#F4A0A0" opacity="0.38" />
        {/* Chin shadow */}
        <ellipse cx="240" cy="265" rx="30" ry="18" fill="#D4957A" opacity="0.28" />

        {/* ── Hair ── */}
        {/* Main hair */}
        <ellipse cx="240" cy="150" rx="72" ry="48" fill="url(#hairGrad)" filter="url(#charShadow)" />
        {/* Hair top volume */}
        <ellipse cx="240" cy="138" rx="65" ry="40" fill="#5A3A28" />
        {/* Hair highlight */}
        <ellipse cx="225" cy="125" rx="38" ry="24" fill="#7A5A42" opacity="0.55" />
        {/* Hair strands detail */}
        <ellipse cx="240" cy="118" rx="50" ry="28" fill="#4A3728" opacity="0.4" />
        {/* Side hair left */}
        <ellipse cx="172" cy="175" rx="18" ry="32" fill="#4A3728" />
        {/* Side hair right */}
        <ellipse cx="308" cy="175" rx="18" ry="32" fill="#4A3728" />
        {/* Hair shine */}
        <ellipse cx="218" cy="130" rx="20" ry="12" fill="rgba(255,255,255,0.12)" />

        {/* ── Eyes ── */}
        {/* Left eye white */}
        <ellipse cx="212" cy="200" rx="20" ry="22" fill="url(#eyeWhite)" filter="url(#claySoftGlow)" />
        {/* Right eye white */}
        <ellipse cx="268" cy="200" rx="20" ry="22" fill="url(#eyeWhite)" filter="url(#claySoftGlow)" />

        {/* Left iris */}
        <ellipse cx="214" cy="202" rx="13" ry="14" fill="url(#irisGrad)" />
        {/* Right iris */}
        <ellipse cx="270" cy="202" rx="13" ry="14" fill="url(#irisGrad)" />

        {/* Left eye pupil */}
        <ellipse cx="215" cy="203" rx="7" ry="8" fill="#1A0A00" />
        {/* Right eye pupil */}
        <ellipse cx="271" cy="203" rx="7" ry="8" fill="#1A0A00" />

        {/* Left eye highlights */}
        <circle cx="219" cy="197" r="5" fill="white" opacity="0.95" />
        <circle cx="211" cy="207" r="2.5" fill="white" opacity="0.6" />
        {/* Right eye highlights */}
        <circle cx="275" cy="197" r="5" fill="white" opacity="0.95" />
        <circle cx="267" cy="207" r="2.5" fill="white" opacity="0.6" />

        {/* Left eyelid top */}
        <path d="M194 192 Q212 180 230 192" fill="#D4957A" opacity="0.5" />
        {/* Right eyelid top */}
        <path d="M250 192 Q268 180 286 192" fill="#D4957A" opacity="0.5" />

        {/* ── Eyebrows ── */}
        <rect x="196" y="172" width="32" height="6" rx="3" fill="#4A3728" opacity="0.75" />
        <rect x="198" y="173" width="28" height="4" rx="2" fill="#6B4A38" opacity="0.4" />
        <rect x="252" y="172" width="32" height="6" rx="3" fill="#4A3728" opacity="0.75" />
        <rect x="254" y="173" width="28" height="4" rx="2" fill="#6B4A38" opacity="0.4" />

        {/* ── Nose ── */}
        <ellipse cx="240" cy="228" rx="8" ry="6" fill="#D4957A" opacity="0.45" />
        <ellipse cx="240" cy="226" rx="5" ry="4" fill="#E8B89A" opacity="0.3" />

        {/* ── Smile ── */}
        <path d="M220 244 Q240 260 260 244" stroke="#C47A60" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* Teeth hint */}
        <path d="M225 245 Q240 256 255 245" fill="white" opacity="0.3" />

        {/* ── Ears ── */}
        <ellipse cx="163" cy="208" rx="12" ry="18" fill="#E8B89A" filter="url(#claySoftGlow)" />
        <ellipse cx="163" cy="208" rx="7" ry="11" fill="#D4957A" opacity="0.4" />
        <ellipse cx="317" cy="208" rx="12" ry="18" fill="#E8B89A" filter="url(#claySoftGlow)" />
        <ellipse cx="317" cy="208" rx="7" ry="11" fill="#D4957A" opacity="0.4" />

        {/* ── Floating Elements ── */}
        {/* Sparkle 1 */}
        <g>
          <polygon points="400,100 403,108 412,108 405,114 408,122 400,116 392,122 395,114 388,108 397,108" fill="#FDE68A" opacity="0.8" />
        </g>
        {/* Sparkle 2 */}
        <g>
          <polygon points="430,150 432,155 438,155 433,159 435,165 430,161 425,165 427,159 422,155 428,155" fill="#FDE68A" opacity="0.6" />
        </g>
        {/* Sparkle 3 */}
        <g>
          <polygon points="80,120 82,125 88,125 83,129 85,135 80,131 75,135 77,129 72,125 78,125" fill="#FDE68A" opacity="0.65" />
        </g>

        {/* ── Warm ambient overlay ── */}
        <rect x="0" y="0" width="480" height="520" rx="28" fill="url(#bgGlow)" opacity="0.12" />
      </svg>
    </motion.div>
  );
}

// ── CTA Celebration Character ───────────────────────────────────────────────
function CTACharacter() {
  return (
    <motion.div
      animate={{ y: [0, -8, 0], rotate: [0, -3, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      className="hidden lg:block"
      style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.1))" }}
    >
      <svg width="160" height="140" viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="80" cy="134" rx="50" ry="6" fill="rgba(0,0,0,0.07)" />
        <ellipse cx="80" cy="105" rx="35" ry="42" fill="#2AA889" />
        <ellipse cx="73" cy="95" rx="22" ry="28" fill="#5dd4b8" opacity="0.3" />
        <ellipse cx="40" cy="80" rx="13" ry="35" fill="#E8B89A" transform="rotate(-30 40 80)" />
        <ellipse cx="35" cy="72" rx="9" ry="26" fill="#F4C4A0" opacity="0.4" transform="rotate(-30 35 72)" />
        <ellipse cx="120" cy="80" rx="13" ry="35" fill="#E8B89A" transform="rotate(30 120 80)" />
        <ellipse cx="125" cy="72" rx="9" ry="26" fill="#F4C4A0" opacity="0.4" transform="rotate(30 125 72)" />
        <circle cx="28" cy="58" r="12" fill="#E8B89A" />
        <circle cx="30" cy="52" r="5" fill="#E8B89A" />
        <circle cx="36" cy="50" r="5" fill="#E8B89A" />
        <circle cx="42" cy="52" r="5" fill="#E8B89A" />
        <circle cx="132" cy="58" r="12" fill="#E8B89A" />
        <circle cx="130" cy="52" r="5" fill="#E8B89A" />
        <circle cx="124" cy="50" r="5" fill="#E8B89A" />
        <circle cx="118" cy="52" r="5" fill="#E8B89A" />
        <rect x="70" y="60" width="20" height="18" rx="8" fill="#E8B89A" />
        <ellipse cx="80" cy="40" rx="40" ry="37" fill="#E8B89A" />
        <ellipse cx="68" cy="26" rx="24" ry="18" fill="#F4C4A0" opacity="0.5" />
        <ellipse cx="96" cy="54" rx="14" ry="11" fill="#D4957A" opacity="0.25" />
        <ellipse cx="80" cy="18" rx="36" ry="22" fill="#4A3728" />
        <ellipse cx="65" cy="12" rx="16" ry="12" fill="#6B4A38" opacity="0.6" />
        <ellipse cx="95" cy="12" rx="16" ry="12" fill="#6B4A38" opacity="0.6" />
        <ellipse cx="72" cy="10" rx="12" ry="7" fill="#7A5A42" opacity="0.4" />
        <ellipse cx="65" cy="40" rx="8" ry="9" fill="#4A3728" />
        <ellipse cx="95" cy="40" rx="8" ry="9" fill="#4A3728" />
        <circle cx="67.5" cy="37.5" r="3" fill="white" opacity="0.9" />
        <circle cx="97.5" cy="37.5" r="3" fill="white" opacity="0.9" />
        <circle cx="61" cy="35" r="1.5" fill="white" opacity="0.6" />
        <circle cx="91" cy="35" r="1.5" fill="white" opacity="0.6" />
        <path d="M57 28 Q65 24 73 28" stroke="#4A3728" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M87 28 Q95 24 103 28" stroke="#4A3728" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse cx="52" cy="48" rx="10" ry="6" fill="#F4A0A0" opacity="0.45" />
        <ellipse cx="108" cy="48" rx="10" ry="6" fill="#F4A0A0" opacity="0.45" />
        <path d="M64 52 Q80 66 96 52" stroke="#C47A60" strokeWidth="3" strokeLinecap="round" fill="none" />
        <polygon points="20,30 23,40 33,40 25,47 28,57 20,50 12,57 15,47 7,40 17,40" fill="#FDE68A" opacity="0.8" />
        <polygon points="140,25 142,32 150,32 144,37 146,44 140,39 134,44 136,37 130,32 138,32" fill="#FDE68A" opacity="0.7" />
        <circle cx="148" cy="55" r="4" fill="#C4B5FD" opacity="0.7" />
        <circle cx="12" cy="65" r="3" fill="#93C5FD" opacity="0.6" />
      </svg>
    </motion.div>
  );
}

// ── 3D Feature Card ────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, text, delay = 0, headType }: { icon: React.ElementType; title: string; text: string; delay?: number; headType?: HeadType }) {
  return (
    <Reveal delay={delay}>
      <motion.div
        whileHover={{ y: -8, scale: 1.03 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={`${clayCard} ${clayCardDark} group cursor-pointer rounded-[24px] p-7`}
      >
        {/* 3D head floating above icon */}
        {headType && (
          <div className="relative -mt-2 mb-2 flex justify-center overflow-visible">
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3 + (delay || 0) * 1.5, repeat: Infinity, ease: "easeInOut", delay: (delay || 0) * 2 }}
              className="overflow-visible"
            >
              <FeatureHead type={headType} />
            </motion.div>
          </div>
        )}

        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#e6f6f2] to-[#b3e0d4] shadow-[inset_6px_6px_12px_rgba(255,255,255,0.8),inset_-6px_-6px_12px_rgba(179,224,212,0.4)] group-hover:shadow-[inset_8px_8px_16px_rgba(255,255,255,0.9),inset_-8px_-8px_16px_rgba(179,224,212,0.5)] transition-all duration-300">
          <Icon className="h-7 w-7 text-[#2AA889]" />
        </div>
        <h3 className="mt-6 text-xl font-semibold text-slate-800 dark:text-white">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
      </motion.div>
    </Reveal>
  );
}

// ── Floating Illustration Left/Right ───────────────────────────────────────
function SplitIllustration({ reverse = false }: { reverse?: boolean }) {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={`${clayCard} ${clayCardDark} rounded-[30px] p-6 ${reverse ? "order-2" : ""}`}
    >
      <div className="rounded-[24px] bg-gradient-to-br from-[#f0faf7] to-[#e6f6f2] p-6 dark:from-slate-800 dark:to-slate-900">
        <div className="space-y-4">
          {[
            { icon: Users, label: "Students", value: "1,248", color: brand },
            { icon: BookOpen, label: "Classes", value: "42", color: "#8b5cf6" },
            { icon: Bus, label: "Routes", value: "12", color: "#f59e0b" },
            { icon: Wallet, label: "Revenue", value: "₹5.6L", color: "#10b981" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4 rounded-[18px] bg-white/80 p-4 shadow-[4px_4px_8px_#c8ccd1,-4px_-4px_8px_#ffffff] dark:bg-slate-800/80 dark:shadow-[4px_4px_8px_rgba(0,0,0,0.15),-4px_-4px_8px_rgba(255,255,255,0.05)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${item.color}20` }}>
                <item.icon className="h-5 w-5" style={{ color: item.color }} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── FAQ Accordion ───────────────────────────────────────────────────────────
const faqs = [
  { q: "How long does it take to set up?", a: "Most schools are up and running within 2–3 hours. Our onboarding wizard guides you through every step — from school registration to importing your first student records." },
  { q: "Is my school data secure?", a: "Absolutely. All data is encrypted at rest and in transit using industry-standard protocols. We also maintain daily backups and follow GDPR-level privacy practices." },
  { q: "Can I try it before buying?", a: "Yes. Sign up for a free 14-day trial with no credit card required. You'll get full access to all modules so you can evaluate everything before committing." },
  { q: "What support do you provide?", a: "We offer email, live chat, and phone support. Standard plans get priority email support, while Premium plans include a dedicated account manager and phone access." },
  { q: "Can I switch plans later?", a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle." },
  { q: "Do you offer custom packages for large institutions?", a: "For schools with 500+ students or multiple campuses, we offer custom Enterprise packages. Contact our sales team for a tailored quote." },
];

const testimonials = [
  {
    name: "Ritu Sharma",
    role: "School Administrator",
    school: "Delhi Public School",
    text: "This ERP helped us organize admissions, fees, and campus operations in one beautiful workflow. Our staff adoption rate was incredible.",
    avatar: "RS",
    color: "#2AA889",
  },
  {
    name: "Ajay Thomas",
    role: "Principal",
    school: "St. Mary's Convent",
    text: "The interface feels premium, and our teachers started using it without any training sessions. The attendance module alone saves us 2 hours daily.",
    avatar: "AT",
    color: "#8b5cf6",
  },
  {
    name: "Pooja Menon",
    role: "Operations Head",
    school: "Greenfield International",
    text: "Our data is now connected across finance, transport, and attendance without any manual effort. The visitor pass system is a game-changer for campus security.",
    avatar: "PM",
    color: "#f59e0b",
  },
];

const trustedBy = ["Delhi Public School", "St. Mary's Convent", "Greenfield Academy", "Oxford International", "Cambridge High"];

function FAQItem({ q, a, isOpen, onClick }: { q: string; a: string; isOpen: boolean; onClick: () => void }) {
  return (
    <motion.div
      layout
      className={`${clayCard} ${clayCardDark} rounded-[20px] overflow-hidden`}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between p-6 text-left cursor-pointer"
      >
        <span className="pr-4 text-base font-semibold text-slate-800 dark:text-white">{q}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-[#2AA889]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Dashboard Preview Section ───────────────────────────────────────────────
function DashboardPreview() {
  return (
    <Reveal>
      <div className={`${clayCard} ${clayCardDark} rounded-[36px] p-8`}>
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Left: Profile card */}
          <div className="rounded-[28px] bg-gradient-to-br from-[#f0faf7] to-[#e6f6f2] p-6 dark:from-slate-800 dark:to-slate-900">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2AA889] to-[#1d7a68] shadow-[4px_4px_8px_#c8ccd1,-4px_-4px_8px_#ffffff]">
                <School2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-800 dark:text-white">Greenfield Academy</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Established 2005</p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: "Admin", value: "Rajesh Kumar" },
                { label: "Plan", value: "Premium" },
                { label: "Students", value: "1,248" },
                { label: "Staff", value: "86" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-[16px] bg-white/70 p-3 px-4 shadow-[3px_3px_6px_#c8ccd1,-3px_-3px_6px_#ffffff] dark:bg-slate-800/70 dark:shadow-[3px_3px_6px_rgba(0,0,0,0.12),-3px_-3px_6px_rgba(255,255,255,0.04)]">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Module grid */}
          <div className="rounded-[28px] bg-gradient-to-br from-[#f5f7fa] to-[#eef1f5] p-6 dark:from-slate-800 dark:to-slate-900">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">All Modules</p>
              <span className="rounded-full bg-[#2AA889]/15 px-3 py-1 text-xs font-medium text-[#2AA889]">6 Active</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Students", icon: Users, active: true, color: "#2AA889" },
                { label: "Finance", icon: Wallet, active: true, color: "#f59e0b" },
                { label: "Transport", icon: Bus, active: true, color: "#8b5cf6" },
                { label: "Library", icon: BookOpen, active: true, color: "#10b981" },
                { label: "Attendance", icon: Clock, active: true, color: "#3b82f6" },
                { label: "Hostel", icon: School2, active: false, color: "#94a3b8" },
                { label: "Staff", icon: GraduationCap, active: true, color: "#ec4899" },
                { label: "Exams", icon: FileText, active: false, color: "#94a3b8" },
                { label: "Reports", icon: BarChart3, active: true, color: "#f97316" },
              ].map((mod) => (
                <div
                  key={mod.label}
                  className={`flex flex-col items-center gap-2 rounded-[18px] p-4 transition-all ${mod.active ? "bg-white/80 shadow-[3px_3px_6px_#c8ccd1,-3px_-3px_6px_#ffffff] dark:bg-slate-800/80 dark:shadow-[3px_3px_6px_rgba(0,0,0,0.12),-3px_-3px_6px_rgba(255,255,255,0.04)]" : "bg-slate-200/70 dark:bg-slate-700/50"}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${mod.active ? "shadow-sm" : ""}`} style={{ background: `${mod.color}20` }}>
                    <mod.icon className="h-5 w-5" style={{ color: mod.active ? mod.color : "#94a3b8" }} />
                  </div>
                  <span className={`text-xs font-medium ${mod.active ? "text-slate-700 dark:text-white" : "text-slate-400"}`}>{mod.label}</span>
                </div>
              ))}
            </div>

            {/* Quick stats row */}
            <div className="mt-5 flex gap-3">
              {[
                { label: "Revenue", value: "₹5.6L", color: "#10b981" },
                { label: "Attendance", value: "94%", color: "#3b82f6" },
                { label: "Pending", value: "8", color: "#f59e0b" },
              ].map((stat) => (
                <div key={stat.label} className="flex-1 rounded-[14px] bg-white/80 p-3 text-center shadow-[2px_2px_4px_#c8ccd1,-2px_-2px_4px_#ffffff] dark:bg-slate-800/80 dark:shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.04)]">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className="text-sm font-semibold" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// ── Step Card ───────────────────────────────────────────────────────────────
function StepCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <Reveal>
      <motion.div
        whileHover={{ y: -6 }}
        className={`${clayCard} ${clayCardDark} rounded-[26px] p-7 text-center`}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#2AA889] to-[#1d7a68] text-xl font-bold text-white shadow-[4px_4px_8px_#c8ccd1,-4px_-4px_8px_#ffffff]">
          {num}
        </div>
        <h3 className="mt-5 text-lg font-semibold text-slate-800 dark:text-white">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{desc}</p>
      </motion.div>
    </Reveal>
  );
}

// ── Scroll Progress ─────────────────────────────────────────────────────────
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[100] h-1 origin-left bg-gradient-to-r from-[#2AA889] to-[#1d7a68] shadow-[0_0_10px_rgba(42,168,137,0.5)]"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
const navItems = [
  { label: "Features", id: "features" },
  { label: "Modules", id: "modules" },
  { label: "How It Works", id: "how-it-works" },
  { label: "Pricing", id: "pricing" },
  { label: "FAQ", id: "faq" },
  { label: "Contact", id: "cta" },
];

const features = [
  { title: "Student Management", icon: Users, text: "Complete student profiles, academic records, attendance tracking, and class management in one seamless system.", headType: "student" as HeadType },
  { title: "Admission System", icon: GraduationCap, text: "Digitize student onboarding, document uploads, approval workflows, and admission forms.", headType: "parent" as HeadType },
  { title: "Fee Management", icon: Wallet, text: "Track class-wise fees, transport charges, generate receipts, and monitor payment due dates.", headType: "admin" as HeadType },
  { title: "Transport Management", icon: Bus, text: "Plan bus routes, manage stops, assign students to vehicles, and track daily travel operations.", headType: "teacher" as HeadType },
  { title: "Visitor Management", icon: IdCard, text: "Generate digital visitor passes, scan arrivals, track check-in/check-out, and keep campus secure.", headType: "visitor" as HeadType },
  { title: "Staff & Payroll", icon: Settings, text: "Manage staff records, payroll processing, role-based permissions, and leave approvals.", headType: "teacher" as HeadType },
];

const steps = [
  { num: "01", title: "Add Your School", desc: "Register your school in minutes with basic info, admin details, and choose your subscription plan." },
  { num: "02", title: "Centralize Data", desc: "Import or add students, staff, classes, and fee structures. Everything syncs across modules." },
  { num: "03", title: "Automate Tasks", desc: "Enable auto-attendance, fee reminders, announcements, and visitor pass generation." },
  { num: "04", title: "Monitor & Grow", desc: "Track performance with live dashboards, generate reports, and make data-driven decisions." },
];

const pricing = [
  {
    name: "Basic",
    price: "₹2,999",
    period: "per month",
    note: "For small institutions getting started",
    color: "#94a3b8",
    badge: "Best for Small Schools",
    highlight: "Essential tools",
    points: [
      { text: "Unlimited student records", included: true },
      { text: "Attendance tracking", included: true },
      { text: "School announcements", included: true },
      { text: "Basic fee tracking", included: true },
      { text: "Up to 3 admin users", included: true },
      { text: "Finance & payroll", included: false },
      { text: "Transport management", included: false },
      { text: "Visitor pass system", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Standard",
    price: "₹6,999",
    period: "per month",
    note: "Most popular for growing schools",
    color: brand,
    badge: "Most Popular",
    highlight: "Everything in Basic +",
    featured: true,
    points: [
      { text: "Unlimited student records", included: true },
      { text: "Attendance + leave management", included: true },
      { text: "Admissions & approvals", included: true },
      { text: "Complete finance & fee tracking", included: true },
      { text: "Up to 10 admin users", included: true },
      { text: "Staff payroll & role management", included: true },
      { text: "Class & exam management", included: true },
      { text: "Transport & hostel", included: false },
      { text: "Priority support (4hr response)", included: true },
    ],
  },
  {
    name: "Premium",
    price: "₹11,999",
    period: "per month",
    note: "Complete campus control",
    color: "#8b5cf6",
    badge: "Complete Suite",
    highlight: "Everything in Standard +",
    points: [
      { text: "Unlimited students & staff", included: true },
      { text: "Advanced attendance + leave", included: true },
      { text: "Admissions with auto-approval", included: true },
      { text: "Full finance, payroll & receipts", included: true },
      { text: "Unlimited admin users", included: true },
      { text: "Transport route management", included: true },
      { text: "Visitor pass + QR scanning", included: true },
      { text: "Inventory & library management", included: true },
      { text: "Dedicated account manager", included: true },
    ],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();
  const heroFloat = useTransform(scrollYProgress, [0, 0.3], [0, -20]);

  useEffect(() => {
    const stored = localStorage.getItem("school-erp-theme");
    if (stored) setDarkMode(stored === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("school-erp-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#eef1f5] text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-x-hidden">
      <ScrollProgress />

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/80 bg-white/80 backdrop-blur-xl shadow-sm dark:border-slate-800/60 dark:bg-slate-950/90">
        <div className="container mx-auto max-w-[1600px] flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => scrollTo("hero")} className="flex items-center gap-3 cursor-pointer">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-3xl text-white shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.08)]"
              style={{ background: `linear-gradient(135deg, ${brand}, ${brandDeep})` }}
            >
              <School2 className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900 dark:text-white">School ERP</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Smart campus operations</p>
            </div>
          </button>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <button key={item.id} type="button" onClick={() => scrollTo(item.id)} className="text-sm font-medium text-slate-600 transition hover:text-[#2AA889] cursor-pointer dark:text-slate-300 dark:hover:text-white">
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => navigate("/school-admin-login")}
              className={`${clayBtn} border border-white/80 bg-white/90 px-5 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200`}
            >
              Login
            </button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97, boxShadow: `inset 4px 4px 8px rgba(0,0,0,0.2), inset -4px -4px 8px rgba(255,255,255,0.1)` }}
              type="button"
              onClick={() => navigate("/school-signup")}
              className="rounded-[20px] bg-gradient-to-br from-[#2AA889] to-[#1d7a68] px-6 py-2.5 text-sm font-semibold text-white shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff]"
            >
              Get Started
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setDarkMode((c) => !c)}
              className={`${clayBtn} border border-white/80 bg-white/90 p-2.5 dark:border-slate-700 dark:bg-slate-900/90`}
            >
              {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-600" />}
            </motion.button>
          </div>

          <button
            type="button"
            className={`${clayBtn} border border-white/80 bg-white/90 p-2 dark:border-slate-700 dark:bg-slate-900/90 md:hidden`}
            onClick={() => setMobileMenuOpen((c) => !c)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-slate-600 dark:text-slate-200" /> : <Menu className="h-5 w-5 text-slate-600 dark:text-slate-200" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-4 dark:border-slate-700 dark:bg-slate-950/95 md:hidden"
            >
              <div className="flex flex-col gap-3">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollTo(item.id)}
                    className="rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/school-admin-login")}
                    className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/school-signup")}
                    className="flex-1 rounded-full bg-gradient-to-br from-[#2AA889] to-[#1d7a68] px-4 py-3 text-sm font-semibold text-white"
                  >
                    Start
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10">
        {/* ── 1. HERO ── */}
        <section id="hero" className="relative overflow-hidden">
          {/* Background blobs */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#2AA889]/10 blur-3xl" />
            <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#8b5cf6]/10 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f59e0b]/8 blur-3xl" />
          </div>

          {/* Hero image overlay */}
          <div className="absolute inset-0 z-0 opacity-5">
            <img src={heroImg} alt="" className="h-full w-full object-cover" />
          </div>

          {/* Floating 3D elements */}
          <FloatingHandLeft />
          <FloatingCupRight />

          <div className="container relative z-10 mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:grid lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-28">
            <Reveal>
              <div className="max-w-2xl">
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90 dark:text-[#2AA889]"
                >
                  <Star className="h-3 w-3 fill-current" />
                  All-in-one school ERP
                </motion.span>
                <h1 className="mt-8 text-5xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
                  All-in-One
                  <br />
                  <span className="bg-gradient-to-r from-[#2AA889] to-[#1d7a68] bg-clip-text text-transparent">
                    School ERP
                  </span>
                  <br />
                  System
                </h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                  Manage students, fees, transport, visitors, and more — all from one beautiful, modern platform built for every school workflow.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: `8px 8px 16px #c8ccd1, -8px -8px 16px #ffffff` }}
                    whileTap={{ scale: 0.97, boxShadow: `inset 4px 4px 8px rgba(0,0,0,0.15), inset -4px -4px 8px rgba(255,255,255,0.1)` }}
                    type="button"
                    onClick={() => navigate("/school-signup")}
                    className="inline-flex items-center gap-2 rounded-[22px] bg-gradient-to-br from-[#2AA889] to-[#1d7a68] px-7 py-4 text-sm font-semibold text-white shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff]"
                  >
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => scrollTo("pricing")}
                    className={`${clayBtn} inline-flex items-center gap-2 border border-white/80 bg-white/90 px-7 py-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200`}
                  >
                    Book Demo
                  </motion.button>
                </div>

                <div className="mt-12 grid gap-4 sm:grid-cols-3">
                  {[
                    { value: "35+", label: "ERP modules" },
                    { value: "500+", label: "Schools" },
                    { value: "99%", label: "Uptime" },
                  ].map((item) => (
                    <div key={item.label} className={`${clayCard} ${clayCardDark} rounded-[24px] bg-white/90 px-5 py-5 text-center`}>
                      <p className="text-3xl font-semibold text-[#2AA889]">{item.value}</p>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal x={32}>
              <motion.div style={{ y: heroFloat }}>
                <HeroCharacter />
              </motion.div>
            </Reveal>
          </div>
        </section>

        {/* ── 2. DASHBOARD PREVIEW ── */}
        <section id="modules" className="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90 dark:text-[#2AA889]">
                Dashboard Preview
              </span>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
                A premium interface your team will love
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
                Soft shadows, rounded cards, and clear hierarchy — designed to feel modern without sacrificing clarity.
              </p>
            </div>
          </Reveal>
          <div className="mt-12">
            <DashboardPreview />
          </div>
        </section>

        {/* ── 3. FEATURES GRID ── */}
        <section id="features" className="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90 dark:text-[#2AA889]">
                Features
              </span>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
                Everything your school needs, in one place
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
                From student profiles to transport and payroll — all modules work together seamlessly.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {features.map((f, i) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} text={f.text} delay={i * 0.05} headType={f.headType} />
            ))}
          </div>
        </section>

        {/* ── 4. SPLIT SECTION ── */}
        <section className="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24 relative">
          <FloatingBadge />
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className={`${glassCard} ${glassCardDark} rounded-[30px] p-6 overflow-hidden`}>
                <img src={featureImg1} alt="School management dashboard" className="w-full h-auto rounded-[24px] object-cover" />
              </div>
            </Reveal>
            <Reveal x={32}>
              <div>
                <span className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90 dark:text-[#2AA889]">
                  Simple & Powerful
                </span>
                <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
                  Manage everything<br />easily
                </h2>
                <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">
                  Stop juggling multiple disconnected tools. Our ERP connects admissions, academics, finance, transport, and more — so your team spends less time on paperwork and more time on what matters.
                </p>
                <div className="mt-8 space-y-3">
                  {[
                    "Auto-attendance with smart notifications",
                    "Fee reminders and payment tracking",
                    "Visitor pass QR scanning",
                    "Staff payroll with leave sync",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#2AA889]/15">
                        <CheckCircle className="h-4 w-4 text-[#2AA889]" />
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => navigate("/school-signup")}
                  className="mt-8 inline-flex items-center gap-2 rounded-[20px] bg-gradient-to-br from-[#2AA889] to-[#1d7a68] px-7 py-4 text-sm font-semibold text-white shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff]"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 5. FEATURE HIGHLIGHT (Visitor Management) ── */}
        <section className="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <motion.div
              whileHover={{ scale: 1.01, y: -4 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative overflow-hidden rounded-[36px] border border-[#2AA889]/20 bg-gradient-to-br from-[#0e3d32] to-[#1a2e28] p-10 shadow-[12px_12px_24px_rgba(0,0,0,0.25),-12px_-12px_24px_rgba(255,255,255,0.05)]"
            >
              {/* Glow orb */}
              <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#2AA889]/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#2AA889]/10 blur-3xl" />

              <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#2AA889]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2AA889]">
                    <IdCard className="h-3 w-3" />
                    Featured Module
                  </div>
                  <h2 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                    Visitor Management System
                  </h2>
                  <p className="mt-5 text-base leading-8 text-slate-300">
                    Generate digital visitor passes, scan arrivals with QR codes, track check-in/check-out times, and maintain a full visitor log — all to keep your campus safe and organized.
                  </p>
                  <div className="mt-8 space-y-3">
                    {[
                      "Instant digital visitor pass generation",
                      "QR code check-in & check-out",
                      "Full visitor history & reports",
                      "Auto-notify host staff on arrival",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3">
                        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#2AA889]/25">
                          <CheckCircle className="h-4 w-4 text-[#2AA889]" />
                        </div>
                        <span className="text-sm text-slate-200">{item}</span>
                      </div>
                    ))}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => navigate("/school-signup")}
                    className="mt-8 inline-flex items-center gap-2 rounded-[20px] bg-gradient-to-br from-[#2AA889] to-[#239C7F] px-7 py-4 text-sm font-semibold text-white shadow-[6px_6px_12px_rgba(0,0,0,0.3),-6px_-6px_12px_rgba(255,255,255,0.05)]"
                  >
                    Try It Free
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>

                {/* Visitor Management Image */}
                <div className="flex items-center justify-center">
                  <img src={featureImg2} alt="Visitor management system" className="max-w-full h-auto rounded-[24px] object-cover shadow-xl" />
                </div>
              </div>
            </motion.div>
          </Reveal>
        </section>

        {/* ── 6. HOW IT WORKS ── */}
        <section id="how-it-works" className="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90 dark:text-[#2AA889]">
                How It Works
              </span>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
                From setup to automation in 4 steps
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
                A simple rollout path that helps schools centralize data and automate operations progressively.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((s) => (
              <StepCard key={s.num} num={s.num} title={s.title} desc={s.desc} />
            ))}
          </div>
        </section>

        {/* ── 7. TESTIMONIALS ── */}
        <section className="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90 dark:text-[#2AA889]">
                Testimonials
              </span>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
                Trusted by school leaders
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
                See what administrators and principals say about our ERP system.
              </p>
            </div>
          </Reveal>

          {/* Trusted by ribbon */}
          <Reveal delay={0.1}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs text-slate-400 font-medium">Trusted by:</span>
              {trustedBy.map((school) => (
                <span key={school} className={`${clayCard} ${clayCardDark} rounded-full px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300`}>
                  {school}
                </span>
              ))}
            </div>
          </Reveal>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  className={`${clayCard} ${clayCardDark} rounded-[26px] p-7`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-bold text-sm"
                      style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}88)` }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{t.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.role} • {t.school}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-current text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">"{t.text}"</p>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── 8. FAQ ── */}
        <section id="faq" className="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90 dark:text-[#2AA889]">
                FAQ
              </span>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
                Got questions? We've got answers.
              </h2>
            </div>
          </Reveal>
          <div className="mx-auto mt-12 max-w-3xl space-y-3">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} isOpen={openFaq === i} onClick={() => setOpenFaq(openFaq === i ? null : i)} />
            ))}
          </div>
        </section>

        {/* ── 8. PRICING ── */}
        <section id="pricing" className="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90 dark:text-[#2AA889]">
                Pricing
              </span>
              <h2 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
                Transparent pricing, no hidden fees
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
                Choose the plan that fits your school. Upgrade or cancel anytime.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {pricing.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 0.06}>
                <motion.div
                  whileHover={{ y: -8, scale: 1.01 }}
                  className={`relative overflow-hidden rounded-[30px] p-8 ${plan.featured ? "bg-gradient-to-br from-[#2AA889] to-[#1d7a68] text-white shadow-[12px_12px_24px_rgba(42,168,137,0.35),-12px_-12px_24px_rgba(255,255,255,0.1)]" : `${clayCard} ${clayCardDark}`}`}
                >
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                      Most Popular
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-semibold uppercase tracking-[0.16em] ${plan.featured ? "text-white/75" : "text-slate-500 dark:text-slate-400"}`}>
                        {plan.name}
                      </p>
                      <p className={`mt-5 text-4xl font-semibold tracking-[-0.05em] ${plan.featured ? "text-white" : "text-slate-950 dark:text-white"}`}>
                        {plan.price}
                      </p>
                      <p className={`text-sm ${plan.featured ? "text-white/70" : "text-slate-400"}`}>{plan.period}</p>
                    </div>
                    <div className={`rounded-2xl px-3 py-1.5 text-xs font-semibold ${plan.featured ? "bg-white/20 text-white" : "bg-[#2AA889]/10 text-[#2AA889]"}`}>
                      {plan.badge}
                    </div>
                  </div>

                  <p className={`mt-3 text-sm ${plan.featured ? "text-white/85" : "text-slate-600 dark:text-slate-400"}`}>{plan.note}</p>

                  <div className={`my-5 h-px ${plan.featured ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"}`} />

                  <p className={`text-xs font-semibold uppercase tracking-[0.12em] mb-3 ${plan.featured ? "text-white/60" : "text-slate-500 dark:text-slate-400"}`}>
                    {plan.highlight}
                  </p>
                  <div className="space-y-2.5">
                    {plan.points.map((point) => (
                      <div key={point.text} className="flex items-center gap-3">
                        <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${point.included ? (plan.featured ? "bg-white/20" : "bg-[#2AA889]/15") : "bg-slate-100 dark:bg-slate-800"}`}>
                          {point.included ? (
                            <ShieldCheck className="h-3.5 w-3.5" style={{ color: plan.featured ? "white" : brand }} />
                          ) : (
                            <X className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                          )}
                        </div>
                        <span className={`text-sm ${point.included ? (plan.featured ? "text-white/90" : "text-slate-700 dark:text-slate-300") : (plan.featured ? "text-white/40" : "text-slate-400")}`}>{point.text}</span>
                      </div>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: plan.featured ? 1.04 : 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => navigate("/school-signup")}
                    className={`mt-8 w-full rounded-full py-3.5 text-sm font-semibold transition-all ${plan.featured ? "bg-white text-[#2AA889] shadow-[4px_4px_8px_rgba(0,0,0,0.15)]" : `bg-gradient-to-br from-[#2AA889] to-[#1d7a68] text-white`}`}
                  >
                    Choose {plan.name}
                  </motion.button>

                  <p className={`mt-3 text-center text-xs ${plan.featured ? "text-white/60" : "text-slate-400"}`}>14-day free trial • No credit card</p>
                </motion.div>
              </Reveal>
            ))}
          </div>

          {/* Pricing note */}
          <Reveal delay={0.2}>
            <div className="mt-10 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                All prices are in Indian Rupees (INR) and exclude GST. Need a custom quote for 500+ students?{" "}
                <button type="button" onClick={() => scrollTo("cta")} className="text-[#2AA889] font-medium hover:underline">
                  Contact sales
                </button>
              </p>
            </div>
          </Reveal>
        </section>

        {/* ── 9. CTA ── */}
        <section id="cta" className="container mx-auto max-w-[1600px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-28">
          <Reveal>
            <div className={`${glassCard} ${glassCardDark} relative overflow-hidden rounded-[36px] border border-[#2AA889]/10 p-14`}>
              {/* Glow */}
              <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[#2AA889]/20 blur-3xl" />
              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-8">
                <div className="flex-1 text-center lg:text-left">
                  <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
                    Start Managing Your School Smarter
                  </h2>
                  <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 lg:mx-0">
                    Replace scattered tools with one premium ERP designed for school leaders, admin staff, and educators.
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: `10px 10px 20px #c8ccd1, -10px -10px 20px #ffffff` }}
                    whileTap={{ scale: 0.97, boxShadow: `inset 4px 4px 8px rgba(0,0,0,0.15), inset -4px -4px 8px rgba(255,255,255,0.1)` }}
                    type="button"
                    onClick={() => navigate("/school-signup")}
                    className="inline-flex items-center gap-2 rounded-[22px] bg-gradient-to-br from-[#2AA889] to-[#1d7a68] px-10 py-5 text-base font-semibold text-white shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff]"
                  >
                    Get Started Free
                    <ArrowRight className="h-5 w-5" />
                  </motion.button>
                  <img src={featureImg4} alt="CTA illustration" className="h-32 w-auto object-contain" />
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── 11. FOOTER ── */}
        <footer className="border-t border-white/80 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90">
          <div className="container mx-auto max-w-[1600px] px-4 py-14 sm:px-6 lg:px-8">
            {/* Main footer grid */}
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
              {/* Brand column */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[4px_4px_8px_#c8ccd1,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.2),-4px_-4px_8px_rgba(255,255,255,0.08)]"
                    style={{ background: `linear-gradient(135deg, ${brand}, ${brandDeep})` }}
                  >
                    <School2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">School ERP</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Smart campus operations</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                  The all-in-one platform trusted by 500+ schools across India for managing admissions, fees, transport, visitors, and more.
                </p>
                {/* Social icons */}
                <div className="flex items-center gap-3 mt-5">
                  {[
                    { icon: Globe, label: "Website", href: "#" },
                    { icon: Twitter, label: "Twitter", href: "#" },
                    { icon: Linkedin, label: "LinkedIn", href: "#" },
                    { icon: Youtube, label: "YouTube", href: "#" },
                  ].map(({ icon: Icon, label, href }) => (
                    <motion.a
                      key={label}
                      whileHover={{ y: -2 }}
                      href={href}
                      aria-label={label}
                      className={`${clayBtn} flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-white/90 text-slate-500 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300`}
                    >
                      <Icon className="h-4 w-4" />
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* Product links */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-[0.12em]">Product</h4>
                <ul className="space-y-3">
                  {["Features", "Modules", "Pricing", "Updates", "Roadmap"].map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => scrollTo(item === "Features" ? "features" : item === "Modules" ? "modules" : item === "Pricing" ? "pricing" : "#")}
                        className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#2AA889] transition-colors cursor-pointer"
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company links */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-[0.12em]">Company</h4>
                <ul className="space-y-3">
                  {["About Us", "Blog", "Careers", "Press Kit", "Partners"].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#2AA889] transition-colors">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support & Contact */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-[0.12em]">Support</h4>
                <ul className="space-y-3 mb-6">
                  {["Help Center", "Documentation", "API Reference", "Status Page", "Community"].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-[#2AA889] transition-colors">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-[0.12em]">Contact</h4>
                <ul className="space-y-2.5">
                  {[
                    { icon: Mail, text: "hello@schoolerp.in" },
                    { icon: Phone, text: "+91 98765 43210" },
                    { icon: MapPin, text: "Bangalore, India" },
                  ].map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-[#2AA889] flex-shrink-0" />
                      <span className="text-sm text-slate-500 dark:text-slate-400">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-12 border-t border-slate-200/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
                <span>© 2026 School ERP. All rights reserved.</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                {["Privacy Policy", "Terms of Service", "Cookie Policy", "Sitemap"].map((item) => (
                  <a key={item} href="#" className="hover:text-[#2AA889] transition-colors">{item}</a>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-slate-400">All systems operational</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
