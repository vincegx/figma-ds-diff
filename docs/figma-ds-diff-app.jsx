import { useState, useEffect, useCallback, useRef } from "react";

/* ════════════════════ DATA ════════════════════ */
const REPORTS = [
  { id: 1, name: "Carbon DS v11.2", fork: "MyFork", date: "2026-02-13", time: "14:32", upstream: 23, local: 8, conflicts: 3, baseline: "v11.0 — Oct 15 2025", total: 34 },
  { id: 2, name: "Material UI 6.4", fork: "BrandFork", date: "2026-02-10", time: "09:15", upstream: 45, local: 12, conflicts: 7, baseline: "v6.2 — Sep 01 2025", total: 64 },
  { id: 3, name: "Polaris 14.0", fork: "ShopifyCustom", date: "2026-02-07", time: "18:44", upstream: 11, local: 31, conflicts: 1, baseline: "v13.5 — Nov 20 2025", total: 43 },
  { id: 4, name: "Atlassian DS 4.1", fork: "InternalLib", date: "2026-02-01", time: "11:08", upstream: 67, local: 5, conflicts: 12, baseline: "v4.0 — Aug 12 2025", total: 84 },
];

const COMPONENTS = [
  { id: "btn", name: "Button", group: "Actions", type: "conflict", diffPct: 18,
    variants: { base: 6, upstream: 7, local: 6 },
    props: [
      { name: "border-radius", base: "8px", upstream: "12px", local: "8px", status: "upstream" },
      { name: "padding-x", base: "16px", upstream: "20px", local: "16px", status: "upstream" },
      { name: "color.primary", base: "#3B82F6", upstream: "#3B82F6", local: "#2563EB", status: "local" },
      { name: "font-weight", base: "600", upstream: "600", local: "700", status: "local" },
      { name: "min-height", base: "36px", upstream: "40px", local: "44px", status: "conflict" },
    ]},
  { id: "tabs", name: "Tabs", group: "Navigation", type: "conflict", diffPct: 22,
    variants: { base: 3, upstream: 3, local: 3 },
    props: [
      { name: "indicator-height", base: "2px", upstream: "3px", local: "2px", status: "upstream" },
      { name: "font-size", base: "14px", upstream: "14px", local: "13px", status: "local" },
      { name: "gap", base: "0px", upstream: "4px", local: "8px", status: "conflict" },
    ]},
  { id: "select", name: "Select", group: "Forms", type: "conflict", diffPct: 14,
    variants: { base: 2, upstream: 3, local: 2 },
    props: [
      { name: "border-radius", base: "6px", upstream: "8px", local: "6px", status: "upstream" },
      { name: "chevron-icon", base: "caret", upstream: "chevron", local: "caret", status: "upstream" },
      { name: "height", base: "40px", upstream: "40px", local: "36px", status: "local" },
      { name: "padding-x", base: "12px", upstream: "16px", local: "14px", status: "conflict" },
    ]},
  { id: "input", name: "Input", group: "Forms", type: "upstream", diffPct: 7,
    variants: { base: 3, upstream: 3, local: 3 },
    props: [
      { name: "border-color", base: "#D1D5DB", upstream: "#E5E7EB", local: "#D1D5DB", status: "upstream" },
      { name: "height", base: "40px", upstream: "44px", local: "40px", status: "upstream" },
      { name: "focus-ring-width", base: "2px", upstream: "3px", local: "2px", status: "upstream" },
    ]},
  { id: "badge", name: "Badge", group: "Data Display", type: "upstream", diffPct: 32,
    variants: { base: 4, upstream: 6, local: 4 },
    props: [
      { name: "variant:destructive", base: "—", upstream: "new", local: "—", status: "upstream" },
      { name: "variant:outline", base: "—", upstream: "new", local: "—", status: "upstream" },
      { name: "border-radius", base: "9999px", upstream: "6px", local: "9999px", status: "upstream" },
    ]},
  { id: "dialog", name: "Dialog", group: "Overlay", type: "upstream", diffPct: 9,
    variants: { base: 2, upstream: 2, local: 2 },
    props: [
      { name: "max-width", base: "480px", upstream: "560px", local: "480px", status: "upstream" },
      { name: "border-radius", base: "12px", upstream: "16px", local: "12px", status: "upstream" },
      { name: "overlay-opacity", base: "0.5", upstream: "0.6", local: "0.5", status: "upstream" },
    ]},
  { id: "avatar", name: "Avatar", group: "Data Display", type: "upstream", diffPct: 5,
    variants: { base: 3, upstream: 4, local: 3 },
    props: [
      { name: "variant:square", base: "—", upstream: "new", local: "—", status: "upstream" },
    ]},
  { id: "tooltip", name: "Tooltip", group: "Overlay", type: "upstream", diffPct: 4,
    variants: { base: 1, upstream: 1, local: 1 },
    props: [
      { name: "delay", base: "200ms", upstream: "300ms", local: "200ms", status: "upstream" },
      { name: "font-size", base: "13px", upstream: "12px", local: "13px", status: "upstream" },
    ]},
  { id: "chip", name: "Chip", group: "Data Display", type: "new_upstream", diffPct: 100,
    variants: { base: 0, upstream: 4, local: 0 },
    props: [
      { name: "Component", base: "—", upstream: "new component", local: "—", status: "upstream" },
    ]},
  { id: "card", name: "Card", group: "Layout", type: "local", diffPct: 12,
    variants: { base: 2, upstream: 2, local: 2 },
    props: [
      { name: "padding", base: "16px", upstream: "16px", local: "24px", status: "local" },
      { name: "box-shadow", base: "sm", upstream: "sm", local: "md", status: "local" },
      { name: "border-radius", base: "8px", upstream: "8px", local: "12px", status: "local" },
    ]},
  { id: "toast", name: "Toast", group: "Feedback", type: "local", diffPct: 15,
    variants: { base: 3, upstream: 3, local: 4 },
    props: [
      { name: "variant:brand", base: "—", upstream: "—", local: "new", status: "local" },
    ]},
  { id: "progress", name: "ProgressBar", group: "Feedback", type: "local", diffPct: 8,
    variants: { base: 1, upstream: 1, local: 1 },
    props: [
      { name: "height", base: "4px", upstream: "4px", local: "6px", status: "local" },
      { name: "border-radius", base: "2px", upstream: "2px", local: "9999px", status: "local" },
    ]},
  { id: "sidebar", name: "Sidebar", group: "Navigation", type: "deleted_upstream", diffPct: 100,
    variants: { base: 3, upstream: 0, local: 3 },
    props: [
      { name: "Component", base: "exists", upstream: "removed", local: "exists", status: "upstream" },
    ]},
];

const STYLES = [
  { name: "primary/500", type: "color", base: "#3B82F6", upstream: "#2563EB", local: "#3B82F6", status: "upstream" },
  { name: "primary/600", type: "color", base: "#2563EB", upstream: "#1D4ED8", local: "#2563EB", status: "upstream" },
  { name: "neutral/100", type: "color", base: "#F3F4F6", upstream: "#F9FAFB", local: "#F3F4F6", status: "upstream" },
  { name: "success/500", type: "color", base: "#10B981", upstream: "#059669", local: "#10B981", status: "upstream" },
  { name: "brand/accent", type: "color", base: "#3B82F6", upstream: "#3B82F6", local: "#8B5CF6", status: "local" },
  { name: "heading/h1", type: "text", base: "32/40 Bold", upstream: "36/44 Bold", local: "32/40 Bold", status: "upstream" },
  { name: "heading/h2", type: "text", base: "24/32 Bold", upstream: "28/36 Semi", local: "24/32 Bold", status: "upstream" },
  { name: "body/default", type: "text", base: "14/20 Reg", upstream: "14/20 Reg", local: "15/22 Reg", status: "local" },
  { name: "shadow/md", type: "effect", base: "0 4px 6px .1", upstream: "0 4px 8px .12", local: "0 4px 6px .1", status: "upstream" },
];

/* ════════════════════ THEME ════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 3px; }
  ::placeholder { color: rgba(255,255,255,0.2); }
  input:focus { outline:none; border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }
  @keyframes scanline { 0%{top:-2px} 100%{top:calc(100% + 2px)} }
  @keyframes progress { from{width:0%} to{width:100%} }
`;

const T = {
  bg: "#06060b", panel: "#0a0a11",
  surface: "rgba(255,255,255,0.025)", surfaceHover: "rgba(255,255,255,0.05)", surfaceActive: "rgba(99,102,241,0.08)",
  border: "rgba(255,255,255,0.06)", borderHover: "rgba(255,255,255,0.12)", borderActive: "rgba(99,102,241,0.3)",
  t1: "#fff", t2: "rgba(255,255,255,0.6)", t3: "rgba(255,255,255,0.35)", t4: "rgba(255,255,255,0.15)",
  blue: "#60A5FA", blueD: "#3B82F6", blueBg: "rgba(59,130,246,0.08)", blueBd: "rgba(59,130,246,0.2)",
  green: "#4ADE80", greenD: "#22C55E", greenBg: "rgba(34,197,94,0.08)", greenBd: "rgba(34,197,94,0.2)",
  orange: "#FB923C", orangeBg: "rgba(249,115,22,0.08)", orangeBd: "rgba(249,115,22,0.2)",
  red: "#F87171", redBg: "rgba(239,68,68,0.08)", redBd: "rgba(239,68,68,0.2)",
  purple: "#C084FC", purpleBg: "rgba(168,85,247,0.08)", purpleBd: "rgba(168,85,247,0.2)",
  yellow: "#FBBF24", pink: "#EC4899",
  accent: "linear-gradient(135deg, #6366F1, #8B5CF6)",
  font: "'Outfit', sans-serif", mono: "'JetBrains Mono', monospace",
};

const typeConfig = {
  conflict:         { label: "Conflict", c: T.orange, bg: T.orangeBg, bd: T.orangeBd, icon: "⚡" },
  upstream:         { label: "Upstream", c: T.blue,   bg: T.blueBg,   bd: T.blueBd,   icon: "↑" },
  new_upstream:     { label: "New",      c: T.purple, bg: T.purpleBg, bd: T.purpleBd, icon: "★" },
  local:            { label: "Local",    c: T.green,  bg: T.greenBg,  bd: T.greenBd,  icon: "↓" },
  deleted_upstream: { label: "Removed",  c: T.red,    bg: T.redBg,    bd: T.redBd,    icon: "✕" },
};

/* ════════════════════ SHARED COMPONENTS ════════════════════ */
function TypeBadge({ type, size = "sm" }) {
  const x = typeConfig[type] || typeConfig.upstream;
  const s = size === "sm";
  return <span style={{ fontSize: s ? 9 : 10, fontWeight: 700, padding: s ? "1.5px 6px" : "2px 8px", borderRadius: 100, background: x.bg, color: x.c, border: `1px solid ${x.bd}`, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap", fontFamily: T.font }}>{x.label}</span>;
}

function StatusDot({ type, size = 8 }) {
  const x = typeConfig[type] || typeConfig.upstream;
  return <div style={{ width: size, height: size, borderRadius: "50%", background: x.c, flexShrink: 0, boxShadow: `0 0 6px ${x.c}40` }} />;
}

function PropStatusBadge({ status }) {
  const cfg = { upstream: { c: T.blue, label: "UP" }, local: { c: T.green, label: "YOU" }, conflict: { c: T.orange, label: "BOTH" } };
  const x = cfg[status] || cfg.upstream;
  return <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: `${x.c}18`, color: x.c, letterSpacing: "0.06em", fontFamily: T.font }}>{x.label}</span>;
}

function Stat({ label, value, color, sub }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 22px", flex: 1, minWidth: 120, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.5 }} />
      <div style={{ fontSize: 12, color: T.t3, marginBottom: 6, fontWeight: 500, letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</span>
        {sub && <span style={{ fontSize: 11, color: T.t4 }}>{sub}</span>}
      </div>
    </div>
  );
}

function Pill({ active, children, onClick }) {
  return <button onClick={onClick} style={{ background: active ? "rgba(255,255,255,0.09)" : "transparent", border: "none", color: active ? "#fff" : T.t3, padding: "7px 15px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font, transition: "all 0.15s" }}>{children}</button>;
}

function NavBar({ page, onNavigate }) {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(6,6,11,0.9)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${T.border}`, height: 52, display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0 }}>
      <div onClick={() => onNavigate("home")} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>Δ</div>
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em" }}>DiffLib</span>
        <span style={{ fontSize: 9, color: T.t4, fontWeight: 600, background: T.surface, padding: "1px 6px", borderRadius: 4, border: `1px solid ${T.border}`, marginLeft: 1 }}>beta</span>
      </div>
      <div style={{ flex: 1 }} />
      {page === "home" && (
        <button onClick={() => onNavigate("new")} style={{ background: T.accent, border: "none", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 650, cursor: "pointer", fontFamily: T.font, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span> New
        </button>
      )}
      {page === "report" && (
        <button style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.t2, padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>↓ Export</button>
      )}
    </nav>
  );
}

/* ════════════════════ HOME PAGE ════════════════════ */
function HomePage({ onNavigate }) {
  const [hovered, setHovered] = useState(null);
  const [search, setSearch] = useState("");
  const filtered = REPORTS.filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.fork.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px" }}>
        {/* Hero */}
        <div style={{ padding: "52px 0 36px", animation: "fadeUp 0.5s ease" }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: 14 }}>
            Design System<br />
            <span style={{ background: T.accent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Diff Reports</span>
          </h1>
          <p style={{ fontSize: 15, color: T.t2, maxWidth: 440, lineHeight: 1.65 }}>
            Track upstream changes, local modifications, and conflicts between your forked design system and its source library.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 36, animation: "fadeUp 0.5s ease 0.08s both" }}>
          <Stat label="Reports" value={REPORTS.length} color={T.t1} sub="total" />
          <Stat label="Latest Changes" value="34" color={T.blue} sub="components" />
          <Stat label="Open Conflicts" value="3" color={T.orange} sub="to resolve" />
          <Stat label="Coverage" value="92%" color={T.green} sub="synced" />
        </div>

        {/* Table header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, animation: "fadeUp 0.5s ease 0.12s both" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.t2 }}>Recent reports</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…"
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", fontSize: 11, color: T.t1, width: 200, fontFamily: T.font, transition: "all 0.2s" }} />
        </div>

        {/* Table */}
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", animation: "fadeUp 0.5s ease 0.15s both" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 70px 70px 70px 40px", padding: "10px 20px", background: T.surface, fontSize: 10, fontWeight: 700, color: T.t4, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>
            <span>Report</span><span>Date</span><span style={{ textAlign: "center" }}>↑ Up</span><span style={{ textAlign: "center" }}>↓ Local</span><span style={{ textAlign: "center" }}>⚡</span><span />
          </div>
          {filtered.map((r, i) => (
            <div key={r.id} onClick={() => onNavigate("report", r)} onMouseEnter={() => setHovered(r.id)} onMouseLeave={() => setHovered(null)}
              style={{ display: "grid", gridTemplateColumns: "1fr 100px 70px 70px 70px 40px", padding: "14px 20px", alignItems: "center", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", cursor: "pointer", transition: "background 0.12s", background: hovered === r.id ? T.surfaceHover : "transparent" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.name} <span style={{ color: T.t3, fontWeight: 400 }}>vs</span> {r.fork}</div>
                <div style={{ fontSize: 10, color: T.t4 }}>Baseline: {r.baseline}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: T.t2 }}>{r.date}</div>
                <div style={{ fontSize: 10, color: T.t4 }}>{r.time}</div>
              </div>
              <span style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: T.blue }}>{r.upstream}</span>
              <span style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: T.green }}>{r.local}</span>
              <span style={{ textAlign: "center", fontSize: 14, fontWeight: 600, color: r.conflicts > 0 ? T.orange : T.t4 }}>{r.conflicts}</span>
              <span style={{ textAlign: "right", fontSize: 13, color: hovered === r.id ? T.t2 : T.t4, transition: "color 0.12s" }}>→</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 13, color: T.t3 }}>No matching reports</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════ NEW COMPARISON PAGE ════════════════════ */
function NewComparisonPage({ onNavigate }) {
  const [step, setStep] = useState(1);
  const [running, setRunning] = useState(false);
  const startCompare = () => { setRunning(true); setTimeout(() => onNavigate("report", REPORTS[0]), 3000); };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 32px", animation: "fadeUp 0.4s ease" }}>
      <div style={{ padding: "44px 0 28px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6 }}>New Comparison</h2>
        <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.6 }}>Paste both Figma library URLs to generate a three-way diff report.</p>
      </div>
      {/* Steps */}
      <div style={{ display: "flex", gap: 2, marginBottom: 28 }}>
        {["Library URLs", "Variables (opt.)", "Generate"].map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ height: 3, borderRadius: 2, background: step > i ? T.accent : T.border, transition: "all 0.3s", marginBottom: 5 }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: step > i ? T.t2 : T.t4, letterSpacing: "0.04em" }}>{s}</span>
          </div>
        ))}
      </div>
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, animation: "fadeUp 0.3s ease" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" }}>Constructor Library URL</label>
            <input defaultValue="https://figma.com/design/abc123/Carbon-DS-v11" style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 12, color: T.t1, fontFamily: T.mono }} />
            <div style={{ fontSize: 10, color: T.t4, marginTop: 5 }}>The upstream source-of-truth</div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.t2, marginBottom: 6, display: "block" }}>Your Fork URL</label>
            <input defaultValue="https://figma.com/design/xyz789/MyFork-Carbon" style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "11px 14px", fontSize: 12, color: T.t1, fontFamily: T.mono }} />
            <div style={{ fontSize: 10, color: T.t4, marginTop: 5 }}>Your forked version</div>
          </div>
          <button onClick={() => setStep(2)} style={{ alignSelf: "flex-end", background: T.accent, border: "none", color: "#fff", padding: "10px 24px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Continue →</button>
        </div>
      )}
      {step === 2 && (
        <div style={{ animation: "fadeUp 0.3s ease" }}>
          <div style={{ border: `2px dashed ${T.border}`, borderRadius: 14, padding: "44px 20px", textAlign: "center", marginBottom: 20 }}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = T.border; }}>
            <div style={{ fontSize: 26, marginBottom: 10, opacity: 0.35 }}>↑</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 3 }}>Drop variable JSON files</div>
            <div style={{ fontSize: 11, color: T.t3 }}>Tokens Studio / DTCG format</div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button onClick={() => setStep(1)} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.t2, padding: "10px 20px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>← Back</button>
            <button onClick={() => setStep(3)} style={{ background: T.accent, border: "none", color: "#fff", padding: "10px 20px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Skip & Generate</button>
          </div>
        </div>
      )}
      {step === 3 && !running && (
        <div style={{ textAlign: "center", padding: "36px 0", animation: "fadeUp 0.3s ease" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Ready to compare</div>
          <p style={{ fontSize: 12, color: T.t3, marginBottom: 20, lineHeight: 1.6 }}>Fetch files, resolve baseline, compare components & styles, render visual diffs.</p>
          <button onClick={startCompare} style={{ background: T.accent, border: "none", color: "#fff", padding: "12px 36px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>Generate Report</button>
        </div>
      )}
      {running && (
        <div style={{ padding: "28px 0", animation: "fadeIn 0.3s ease" }}>
          {["Parsing URLs…", "Fetching version history…", "Resolving baseline (v11.0)…", "Fetching components…", "Rendering images…", "Running pixel diff…", "Generating report…"].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", opacity: i < 4 ? 1 : 0.3 }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
                background: i < 3 ? T.greenBg : i === 3 ? T.purpleBg : T.surface,
                color: i < 3 ? T.green : i === 3 ? T.purple : T.t4 }}>
                {i < 3 ? "✓" : i === 3 ? "…" : "·"}
              </div>
              <span style={{ fontSize: 12, color: i <= 3 ? T.t2 : T.t4, fontWeight: i === 3 ? 600 : 400 }}>{s}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, height: 3, borderRadius: 2, background: T.border, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, background: T.accent, animation: "progress 3s ease forwards" }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════ REPORT: VISUAL COMPONENTS ════════════════════ */
function VisualRender({ label, h = 140 }) {
  const pal = { base: { bg: "#0e0e16", fg: "#3a3a52", ac: "#55557a" }, upstream: { bg: "#0c1020", fg: "#2a4a8a", ac: T.blueD }, local: { bg: "#0c1a10", fg: "#2a6a3a", ac: T.greenD } };
  const c = pal[label] || pal.base;
  return (
    <div style={{ background: c.bg, borderRadius: 10, width: "100%", height: h, position: "relative", overflow: "hidden", border: `1px solid ${c.fg}30` }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 100%, ${c.ac}12, transparent 70%)` }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ width: 80, height: 28, borderRadius: 7, background: `${c.ac}30`, border: `1.5px solid ${c.ac}55` }} />
        <div style={{ display: "flex", gap: 4 }}>
          <div style={{ width: 24, height: 8, borderRadius: 3, background: `${c.fg}40` }} />
          <div style={{ width: 36, height: 8, borderRadius: 3, background: `${c.fg}40` }} />
          <div style={{ width: 18, height: 8, borderRadius: 3, background: `${c.fg}40` }} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, textAlign: "center", fontSize: 9, fontWeight: 700, color: `${c.ac}80`, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: T.font }}>{label}</div>
    </div>
  );
}

function PixelDiffVisual({ diffPct }) {
  return (
    <div style={{ background: "#08080f", borderRadius: 10, height: 140, position: "relative", overflow: "hidden", border: `1px solid ${T.border}` }}>
      <div style={{ position: "absolute", inset: 0, background: "repeating-conic-gradient(rgba(255,255,255,0.02) 0% 25%, transparent 0% 50%) 0 0 / 10px 10px" }} />
      <div style={{ position: "absolute", top: "15%", left: "18%", width: "40%", height: "50%", background: `${T.pink}12`, borderRadius: 6, border: `1.5px solid ${T.pink}30`, animation: "pulse 2.5s ease infinite" }} />
      <div style={{ position: "absolute", top: "50%", left: "65%", width: "22%", height: "30%", background: `${T.pink}08`, borderRadius: 4, border: `1px solid ${T.pink}20`, animation: "pulse 2.5s ease 0.4s infinite" }} />
      <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${T.pink}40, transparent)`, animation: "scanline 3s linear infinite" }} />
      <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, fontFamily: T.mono, fontWeight: 600, color: `${T.pink}70`, display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.pink, animation: "pulse 1.5s ease infinite" }} />
        {diffPct}% pixels changed
      </div>
    </div>
  );
}

function PropDiffRow({ prop, showBase }) {
  const isConflict = prop.status === "conflict";
  const isColor = v => typeof v === "string" && v.startsWith("#") && v.length <= 9;
  const Cell = ({ val, highlight, strike }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {isColor(val) && <div style={{ width: 14, height: 14, borderRadius: 4, background: val, border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }} />}
      <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: highlight ? 600 : 400, color: highlight ? T.t1 : strike ? T.t4 : T.t3, textDecoration: strike ? "line-through" : "none" }}>{val}</span>
    </div>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: showBase ? "1fr 100px 100px 100px 42px" : "1fr 120px 120px 42px", padding: "9px 14px", alignItems: "center", gap: 8, background: isConflict ? `${T.orange}06` : "transparent", borderLeft: isConflict ? `2px solid ${T.orange}40` : "2px solid transparent" }}>
      <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 500, color: T.t2 }}>{prop.name}</span>
      {showBase && <Cell val={prop.base} strike={prop.base !== "—"} />}
      <Cell val={prop.upstream} highlight={prop.status === "upstream" || prop.status === "conflict"} />
      <Cell val={prop.local} highlight={prop.status === "local" || prop.status === "conflict"} />
      <div style={{ display: "flex", justifyContent: "flex-end" }}><PropStatusBadge status={prop.status} /></div>
    </div>
  );
}

/* ════════════════════ REPORT PAGE ════════════════════ */
function ReportPage({ report, onNavigate }) {
  const [selectedId, setSelectedId] = useState("btn");
  const [tab, setTab] = useState("components");
  const [overlayMode, setOverlayMode] = useState("side");
  const [showBase, setShowBase] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const mainRef = useRef(null);
  const r = report || REPORTS[0];

  const selected = COMPONENTS.find(c => c.id === selectedId) || COMPONENTS[0];
  const conflictCount = COMPONENTS.filter(i => i.type === "conflict").length;
  const x = typeConfig[selected.type] || typeConfig.upstream;
  const conflictProps = selected.props.filter(p => p.status === "conflict");
  const upstreamProps = selected.props.filter(p => p.status === "upstream");
  const localProps = selected.props.filter(p => p.status === "local");

  const selectNext = useCallback(() => {
    const idx = COMPONENTS.findIndex(i => i.id === selectedId);
    if (idx < COMPONENTS.length - 1) setSelectedId(COMPONENTS[idx + 1].id);
  }, [selectedId]);

  const selectPrev = useCallback(() => {
    const idx = COMPONENTS.findIndex(i => i.id === selectedId);
    if (idx > 0) setSelectedId(COMPONENTS[idx - 1].id);
  }, [selectedId]);

  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "j") selectNext();
      if (e.key === "k") selectPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectNext, selectPrev]);

  useEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [selectedId]);

  const groups = [
    { key: "conflict", label: "Conflicts", items: COMPONENTS.filter(i => i.type === "conflict") },
    { key: "upstream", label: "Upstream changes", items: COMPONENTS.filter(i => i.type === "upstream" || i.type === "new_upstream") },
    { key: "local", label: "Local changes", items: COMPONENTS.filter(i => i.type === "local") },
    { key: "deleted_upstream", label: "Removed", items: COMPONENTS.filter(i => i.type === "deleted_upstream") },
  ].filter(g => g.items.length > 0);

  const filteredGroups = groups.map(g => ({ ...g, items: g.items.filter(i => !sidebarSearch || i.name.toLowerCase().includes(sidebarSearch.toLowerCase())) })).filter(g => g.items.length > 0);

  const isConflict = selected.type === "conflict";

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <aside style={{ width: 250, flexShrink: 0, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", background: T.panel }}>
        {/* Report info */}
        <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={() => onNavigate("home")} style={{ background: "none", border: "none", color: T.t3, fontSize: 11, cursor: "pointer", fontFamily: T.font, padding: 0, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            ← Back to reports
          </button>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
          <div style={{ fontSize: 11, color: T.t3 }}>vs {r.fork}</div>
          <div style={{ fontSize: 10, color: T.t4, marginTop: 3 }}>Baseline: {r.baseline}</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          {["components", "styles"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "9px 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", border: "none", cursor: "pointer", fontFamily: T.font, background: "transparent", color: tab === t ? T.t1 : T.t4, borderBottom: tab === t ? `2px solid ${T.blueD}` : "2px solid transparent" }}>
              {t} <span style={{ fontSize: 9, opacity: 0.5, marginLeft: 2 }}>{t === "components" ? COMPONENTS.length : STYLES.length}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ padding: "8px 10px 4px", flexShrink: 0 }}>
          <input value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)} placeholder="Filter…"
            style={{ width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, padding: "6px 10px", fontSize: 11, color: T.t1, fontFamily: T.font }} />
        </div>

        {/* Grouped list */}
        <div style={{ flex: 1, overflow: "auto", padding: "2px 6px 14px" }}>
          {tab === "components" && filteredGroups.map((g, gi) => {
            const gc = typeConfig[g.key] || typeConfig.upstream;
            return (
              <div key={g.key} style={{ marginBottom: 2, animation: `fadeUp 0.3s ease ${gi * 0.04}s both` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px 3px", fontSize: 10, fontWeight: 700, color: gc.c, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  <span>{gc.icon}</span> {g.label} <span style={{ fontSize: 9, color: T.t4, fontWeight: 500 }}>({g.items.length})</span>
                </div>
                {g.items.map(comp => (
                  <div key={comp.id} onClick={() => setSelectedId(comp.id)}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, cursor: "pointer", transition: "all 0.1s",
                      background: selectedId === comp.id ? T.surfaceActive : "transparent",
                      borderLeft: selectedId === comp.id ? `2px solid ${typeConfig[comp.type]?.c || T.blue}` : "2px solid transparent",
                    }}
                    onMouseEnter={e => { if (selectedId !== comp.id) e.currentTarget.style.background = T.surfaceHover; }}
                    onMouseLeave={e => { if (selectedId !== comp.id) e.currentTarget.style.background = "transparent"; }}>
                    <StatusDot type={comp.type} size={6} />
                    <span style={{ fontSize: 12, fontWeight: selectedId === comp.id ? 650 : 500, color: selectedId === comp.id ? T.t1 : T.t2, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comp.name}</span>
                    <span style={{ fontSize: 10, color: T.t4, fontFamily: T.mono, fontWeight: 500 }}>{comp.diffPct}%</span>
                  </div>
                ))}
              </div>
            );
          })}
          {tab === "styles" && STYLES.map((s, i) => (
            <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 7, animation: `fadeUp 0.3s ease ${i * 0.02}s both` }}>
              <StatusDot type={s.status} size={5} />
              {s.type === "color" && <div style={{ width: 12, height: 12, borderRadius: 3, background: s.status === "upstream" ? s.upstream : s.local, border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }} />}
              <span style={{ fontSize: 11, fontWeight: 500, color: T.t2, fontFamily: T.mono, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
              <PropStatusBadge status={s.status} />
            </div>
          ))}
        </div>

        {/* Keyboard hints */}
        <div style={{ padding: "7px 10px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 10, flexShrink: 0 }}>
          {[{ k: "J", l: "next" }, { k: "K", l: "prev" }].map(h => (
            <div key={h.k} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: T.t4 }}>
              <span style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 3, padding: "0 4px", fontSize: 9, fontWeight: 600, fontFamily: T.mono }}>{h.k}</span>{h.l}
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main ref={mainRef} style={{ flex: 1, overflow: "auto", background: T.bg }}>
        {tab === "components" && (
          <div key={selectedId} style={{ animation: "fadeUp 0.2s ease" }}>
            {/* Conflict alert */}
            {isConflict && (
              <div style={{ padding: "8px 28px", background: `${T.orange}06`, borderBottom: `1px solid ${T.orangeBd}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13 }}>⚡</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.orange }}>{conflictProps.length} conflicting propert{conflictProps.length > 1 ? "ies" : "y"}</span>
                <span style={{ fontSize: 11, color: T.t3 }}>— changed both upstream and locally</span>
              </div>
            )}

            {/* Header */}
            <div style={{ padding: "18px 28px", borderBottom: `1px solid ${T.border}`, background: `${x.c}03` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{selected.name}</h2>
                <TypeBadge type={selected.type} size="md" />
                <div style={{ flex: 1 }} />
                <button onClick={selectNext} style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.t2, padding: "6px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Next →</button>
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: 11, color: T.t3 }}>
                <span>{selected.group}</span>
                <span style={{ color: T.t4 }}>·</span>
                <span>Variants: {selected.variants.base} base → {selected.variants.upstream} upstream / {selected.variants.local} local</span>
                <span style={{ color: T.t4 }}>·</span>
                <span>{selected.props.length} property changes</span>
              </div>
            </div>

            {/* Change summary chips */}
            <div style={{ display: "flex", gap: 1, padding: "14px 28px 10px" }}>
              {[
                { label: "Upstream", count: upstreamProps.length, c: T.blue },
                { label: "Local", count: localProps.length, c: T.green },
                { label: "Conflicts", count: conflictProps.length, c: T.orange },
              ].filter(s => s.count > 0).map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: `${s.c}08`, border: `1px solid ${s.c}18`, marginRight: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.c }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.c }}>{s.count}</span>
                  <span style={{ fontSize: 11, color: T.t3 }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Visual comparison */}
            <div style={{ padding: "0 28px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: "0.07em", textTransform: "uppercase" }}>Visual Comparison</span>
                <div style={{ display: "flex", gap: 2, background: T.surface, borderRadius: 7, padding: 2, border: `1px solid ${T.border}` }}>
                  {[{ k: "side", l: "Side by side" }, { k: "overlay", l: "Pixel diff" }].map(m => (
                    <button key={m.k} onClick={() => setOverlayMode(m.k)}
                      style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontFamily: T.font,
                        background: overlayMode === m.k ? "rgba(255,255,255,0.08)" : "transparent", color: overlayMode === m.k ? T.t1 : T.t4 }}>
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>
              {overlayMode === "side" ? (
                <div style={{ display: "grid", gridTemplateColumns: isConflict ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, color: T.t4, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Base</div>
                    <VisualRender label="base" />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.blue, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Upstream</div>
                    <VisualRender label="upstream" />
                  </div>
                  {isConflict && (
                    <div>
                      <div style={{ fontSize: 10, color: T.green, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>Local</div>
                      <VisualRender label="local" />
                    </div>
                  )}
                </div>
              ) : (
                <PixelDiffVisual diffPct={selected.diffPct} />
              )}
            </div>

            {/* Property diff table */}
            <div style={{ padding: "0 28px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.t3, letterSpacing: "0.07em", textTransform: "uppercase" }}>Property Changes</span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.t3, cursor: "pointer" }}>
                  <div onClick={() => setShowBase(!showBase)}
                    style={{ width: 28, height: 16, borderRadius: 8, background: showBase ? T.blueD : T.surface, border: `1px solid ${showBase ? T.blueBd : T.border}`, position: "relative", cursor: "pointer", transition: "all 0.2s" }}>
                    <div style={{ width: 12, height: 12, borderRadius: 6, background: "#fff", position: "absolute", top: 1, left: showBase ? 14 : 1, transition: "left 0.2s" }} />
                  </div>
                  Base column
                </label>
              </div>
              <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: showBase ? "1fr 100px 100px 100px 42px" : "1fr 120px 120px 42px", padding: "7px 14px", background: T.surface, fontSize: 10, fontWeight: 700, color: T.t4, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>
                  <span>Property</span>
                  {showBase && <span>Base</span>}
                  <span style={{ color: T.blue }}>Upstream</span>
                  <span style={{ color: T.green }}>Local</span>
                  <span />
                </div>
                {conflictProps.map((p, i) => (
                  <div key={`c-${i}`} style={{ borderBottom: `1px solid ${T.border}` }}><PropDiffRow prop={p} showBase={showBase} /></div>
                ))}
                {upstreamProps.map((p, i) => (
                  <div key={`u-${i}`} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}><PropDiffRow prop={p} showBase={showBase} /></div>
                ))}
                {localProps.map((p, i) => (
                  <div key={`l-${i}`} style={{ borderBottom: i < localProps.length - 1 ? `1px solid rgba(255,255,255,0.03)` : "none" }}><PropDiffRow prop={p} showBase={showBase} /></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "styles" && (
          <div style={{ padding: 28, animation: "fadeUp 0.3s ease" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, letterSpacing: "-0.02em" }}>Style Changes</h2>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "160px 55px 1fr 1fr 1fr 42px", padding: "7px 14px", background: T.surface, fontSize: 10, fontWeight: 700, color: T.t4, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>
                <span>Token</span><span>Type</span><span>Base</span><span style={{ color: T.blue }}>Upstream</span><span style={{ color: T.green }}>Local</span><span />
              </div>
              {STYLES.map((s, i) => {
                const isColor = s.type === "color";
                return (
                  <div key={s.name} style={{ display: "grid", gridTemplateColumns: "160px 55px 1fr 1fr 1fr 42px", padding: "9px 14px", alignItems: "center", borderBottom: i < STYLES.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", animation: `fadeUp 0.3s ease ${i * 0.02}s both` }}>
                    <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.t2 }}>{s.name}</span>
                    <span style={{ fontSize: 9, color: T.t4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.type}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {isColor && <div style={{ width: 13, height: 13, borderRadius: 3, background: s.base, border: "1px solid rgba(255,255,255,0.08)" }} />}
                      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.t4 }}>{s.base}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {isColor && <div style={{ width: 13, height: 13, borderRadius: 3, background: s.upstream, border: "1px solid rgba(255,255,255,0.08)" }} />}
                      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: s.status === "upstream" ? 600 : 400, color: s.status === "upstream" ? T.t1 : T.t4 }}>{s.upstream}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {isColor && <div style={{ width: 13, height: 13, borderRadius: 3, background: s.local, border: "1px solid rgba(255,255,255,0.08)" }} />}
                      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: s.status === "local" ? 600 : 400, color: s.status === "local" ? T.t1 : T.t4 }}>{s.local}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}><PropStatusBadge status={s.status} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ════════════════════ APP SHELL ════════════════════ */
export default function App() {
  const [page, setPage] = useState("home");
  const [report, setReport] = useState(null);
  const navigate = (p, data) => { setPage(p); if (data) setReport(data); };

  return (
    <div style={{ fontFamily: T.font, background: T.bg, color: T.t1, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{CSS}</style>
      <NavBar page={page} onNavigate={navigate} />
      {page === "home" && <div style={{ flex: 1, overflow: "auto" }}><HomePage onNavigate={navigate} /></div>}
      {page === "new" && <div style={{ flex: 1, overflow: "auto" }}><NewComparisonPage onNavigate={navigate} /></div>}
      {page === "report" && <ReportPage report={report} onNavigate={navigate} />}
    </div>
  );
}
