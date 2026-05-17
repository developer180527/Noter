// src/features/calculator/components/CalculatorPage.tsx
// Fully offline graphing calculator powered by Plotly.js (npm bundled).
// Evaluates math expressions using the Function constructor + Math aliases.

import { useState, useEffect, useRef, useCallback } from "react";
import Plotly from "plotly.js-dist-min";
import { clsx } from "clsx";
import {
  Plus, Trash2, Download, ZoomIn, ZoomOut, Maximize2, Minimize2,
  Eye, EyeOff, ChevronDown, ChevronUp, RefreshCw, X,
} from "lucide-react";

// ── Expression evaluation ─────────────────────────────────────────────────────

/** Converts human math syntax → evaluatable JS, returns a function of x. */
function compileExpression(input: string): (x: number) => number {
  // Strip "y = " or "f(x) = " prefix
  let expr = input
    .replace(/^\s*[yY]\s*=\s*/, "")
    .replace(/^\s*f\s*\(\s*x\s*\)\s*=\s*/i, "")
    .trim();

  // ^ → **
  expr = expr.replace(/\^/g, "**");

  // Implicit multiplication: 2x → 2*x, 2(… → 2*(…
  expr = expr.replace(/(\d)(x)/g, "$1*$2");
  expr = expr.replace(/(\d)\(/g,  "$1*(");

  // Math functions (prefix with Math.)
  for (const fn of [
    "sin","cos","tan","asin","acos","atan","atan2",
    "sinh","cosh","tanh","asinh","acosh","atanh",
    "sqrt","cbrt","abs","log","log2","log10",
    "exp","ceil","floor","round","sign","hypot",
  ]) {
    expr = expr.replace(new RegExp(`\\b${fn}\\b`, "g"), `Math.${fn}`);
  }

  // Constants
  expr = expr.replace(/\bpi\b/gi, "Math.PI");
  expr = expr.replace(/\binf\b/gi, "Infinity");
  // Replace lone "e" not part of "exp" or "Math.E" → Math.E
  expr = expr.replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, "Math.E");

  // eslint-disable-next-line no-new-func
  return new Function("x", `"use strict"; try { return +(${expr}); } catch { return NaN; }`) as (x: number) => number;
}

function generateTrace(
  expr: string,
  color: string,
  xMin: number,
  xMax: number,
  points = 800,
): Partial<Plotly.ScatterData> {
  const fn  = compileExpression(expr);
  const xs: number[]       = [];
  const ys: (number|null)[] = [];

  for (let i = 0; i <= points; i++) {
    const x = xMin + (xMax - xMin) * (i / points);
    const y = fn(x);
    xs.push(x);
    // Insert null for discontinuities — Plotly draws gaps instead of vertical lines
    ys.push(isFinite(y) ? y : null);
  }

  return {
    x:    xs,
    y:    ys as number[],
    type: "scatter",
    mode: "lines",
    line: { color, width: 2.5, shape: "linear" },
    name: expr,
    connectgaps: false,
  };
}

// ── Colors ────────────────────────────────────────────────────────────────────

const PALETTE = [
  "#d4903a",  // amber  — noter's primary
  "#5b9bd5",  // blue
  "#70c478",  // green
  "#e05c5c",  // red
  "#b07be0",  // purple
  "#7be0d5",  // teal
  "#e0b07b",  // orange
  "#e07bb0",  // pink
];

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Sine",         expr: "sin(x)"              },
  { label: "Cosine",       expr: "cos(x)"              },
  { label: "Tangent",      expr: "tan(x)"              },
  { label: "Parabola",     expr: "x^2"                 },
  { label: "Cubic",        expr: "x^3 - 3*x"           },
  { label: "Abs",          expr: "abs(x)"              },
  { label: "Square root",  expr: "sqrt(abs(x))"        },
  { label: "Exponential",  expr: "e^x"                 },
  { label: "Natural log",  expr: "log(abs(x))"         },
  { label: "Gaussian",     expr: "e^(-x^2)"            },
  { label: "Sawtooth",     expr: "x - floor(x)"        },
  { label: "Sinc",         expr: "sin(x)/x"            },
];

// ── Expression record ─────────────────────────────────────────────────────────

interface Expr {
  id:      string;
  raw:     string;
  color:   string;
  visible: boolean;
  error:   string | null;
}

// ── Plotly dark layout ────────────────────────────────────────────────────────

const LAYOUT: Partial<Plotly.Layout> = {
  paper_bgcolor: "#0d0d0d",
  plot_bgcolor:  "#0d0d0d",
  font:          { color: "#9a9390", family: "monospace", size: 11 },
  xaxis: {
    gridcolor:    "#1e1e1e",
    zerolinecolor:"#333",
    zerolinewidth: 1.5,
    color:         "#555",
    showgrid:      true,
    zeroline:      true,
  },
  yaxis: {
    gridcolor:    "#1e1e1e",
    zerolinecolor:"#333",
    zerolinewidth: 1.5,
    color:         "#555",
    showgrid:      true,
    zeroline:      true,
  },
  margin:      { l: 50, r: 20, t: 16, b: 50 },
  showlegend:  true,
  legend: {
    bgcolor:     "rgba(10,10,10,0.8)",
    bordercolor: "#2a2a2a",
    borderwidth: 1,
    font:        { color: "#9a9390", size: 11 },
  },
  hovermode:   "x unified",
  hoverlabel: {
    bgcolor:    "#111",
    bordercolor:"#333",
    font:       { color: "#e8e0d5" },
  },
  dragmode:  "pan",
  modebar:   { remove: ["toImage","sendDataToCloud"] },
};

const CONFIG: Partial<Plotly.Config> = {
  responsive:          true,
  scrollZoom:          true,
  displayModeBar:      false,
  doubleClick:         "reset",
  modeBarButtonsToRemove: ["lasso2d","select2d"],
};

// ── Main component ────────────────────────────────────────────────────────────

export function CalculatorPage() {
  const plotRef             = useRef<HTMLDivElement>(null);
  const plotMounted         = useRef(false);
  const [exprs, setExprs]   = useState<Expr[]>([]);
  const [input, setInput]   = useState("");
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [fullscreen, setFullscreen]   = useState(false);
  const nextColor           = useRef(0);

  // ── Init Plotly ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!plotRef.current || plotMounted.current) return;
    plotMounted.current = true;

    Plotly.newPlot(plotRef.current, [], LAYOUT, CONFIG);

    return () => {
      if (plotRef.current) Plotly.purge(plotRef.current);
      plotMounted.current = false;
    };
  }, []);

  // ── Sync traces whenever expressions change ─────────────────────────────────
  useEffect(() => {
    if (!plotRef.current || !plotMounted.current) return;

    const el     = plotRef.current as any;
    const xRange = el._fullLayout?.xaxis?.range as [number,number] | undefined;
    const xMin   = xRange?.[0] ?? -10;
    const xMax   = xRange?.[1] ?? 10;

    const traces: Partial<Plotly.Data>[] = exprs
      .filter((e) => e.visible && !e.error)
      .map((e) => generateTrace(e.raw, e.color, xMin, xMax));

    Plotly.react(plotRef.current, traces, LAYOUT, CONFIG);
  }, [exprs]);


  // ── Add expression ──────────────────────────────────────────────────────────
  const addExpr = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    let error: string | null = null;
    try { compileExpression(trimmed)(1); }
    catch (e) { error = e instanceof Error ? e.message : "Invalid expression"; }

    const color = PALETTE[nextColor.current % PALETTE.length];
    nextColor.current++;

    setExprs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), raw: trimmed, color, visible: true, error },
    ]);
    setInput("");
    setPresetsOpen(false);
  }, []);

  // ── Remove expression ───────────────────────────────────────────────────────
  const removeExpr = useCallback((id: string) => {
    setExprs((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ── Toggle visibility ───────────────────────────────────────────────────────
  const toggleExpr = useCallback((id: string) => {
    setExprs((prev) => prev.map((e) => e.id === id ? { ...e, visible: !e.visible } : e));
  }, []);

  // ── Clear all ───────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    setExprs([]);
    nextColor.current = 0;
  }, []);

  // ── Reset view ──────────────────────────────────────────────────────────────
  const resetView = useCallback(() => {
    if (!plotRef.current) return;
    Plotly.relayout(plotRef.current, {
      "xaxis.autorange": true,
      "yaxis.autorange": true,
    });
  }, []);

  // ── Zoom ────────────────────────────────────────────────────────────────────
  const zoom = useCallback((factor: number) => {
    const el = plotRef.current as any;
    if (!el) return;
    const xRange = el._fullLayout?.xaxis?.range as [number,number];
    const yRange = el._fullLayout?.yaxis?.range as [number,number];
    if (!xRange || !yRange) return;

    const xMid = (xRange[0] + xRange[1]) / 2;
    const yMid = (yRange[0] + yRange[1]) / 2;
    const xHalf = (xRange[1] - xRange[0]) / 2 * factor;
    const yHalf = (yRange[1] - yRange[0]) / 2 * factor;

    Plotly.relayout(plotRef.current!, {
      "xaxis.range": [xMid - xHalf, xMid + xHalf],
      "yaxis.range": [yMid - yHalf, yMid + yHalf],
    });
  }, []);

  // ── Export PNG ──────────────────────────────────────────────────────────────
  const exportPNG = useCallback(async () => {
    if (!plotRef.current) return;
    const url = await Plotly.toImage(plotRef.current, {
      format: "png", width: 1600, height: 900,
    });
    const a   = document.createElement("a");
    a.href    = url;
    a.download = `noter-graph-${Date.now()}.png`;
    a.click();
  }, []);

  // ── Key handler ─────────────────────────────────────────────────────────────
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")  addExpr(input);
    if (e.key === "Escape") setInput("");
  };

  return (
    <div className={clsx(
      "flex flex-col bg-base overflow-hidden",
      fullscreen ? "fixed inset-0 z-50" : "h-full",
    )}>
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0 border-b border-border flex-wrap"
        style={{ background: "rgba(10,10,10,0.95)" }}
      >
        {/* Expression input */}
        <span className="text-xs font-mono text-subtle shrink-0 select-none">y =</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="sin(x), x^2 + 1, e^(-x^2)…"
          className="flex-1 min-w-40 bg-raised border border-border rounded-lg px-3 py-1.5
                     text-xs font-mono text-ink placeholder:text-subtle/40
                     outline-none focus:border-amber/50 transition-colors"
        />
        <button
          onClick={() => addExpr(input)}
          disabled={!input.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono
                     bg-amber/15 text-amber hover:bg-amber/25 transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Plus size={11} /> Plot
        </button>

        {/* Presets */}
        <div className="relative shrink-0">
          <button
            onClick={() => setPresetsOpen((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono
                       border border-border text-subtle hover:text-ink transition-colors"
          >
            Presets {presetsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </button>
          {presetsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPresetsOpen(false)} />
              <div
                className="absolute top-full left-0 mt-1.5 z-20 w-48 rounded-xl
                           overflow-hidden shadow-2xl"
                style={{
                  background:     "rgba(10,10,10,0.97)",
                  backdropFilter: "blur(24px)",
                  border:         "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <div className="absolute inset-x-0 top-0 h-px"
                     style={{ background: "linear-gradient(90deg,transparent,rgba(212,144,58,0.5),transparent)" }} />
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => addExpr(p.expr)}
                    className="w-full text-left px-4 py-2.5 flex items-center justify-between
                               gap-3 hover:bg-white/5 transition-colors"
                  >
                    <span className="text-xs font-sans text-ink/80">{p.label}</span>
                    <span className="text-[10px] font-mono text-subtle/60">{p.expr}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px h-4 bg-border shrink-0" />

        {/* Zoom */}
        <button onClick={() => zoom(0.6)} title="Zoom in"
          className="p-1.5 rounded text-subtle hover:text-ink hover:bg-raised transition-colors">
          <ZoomIn size={14} />
        </button>
        <button onClick={() => zoom(1.67)} title="Zoom out"
          className="p-1.5 rounded text-subtle hover:text-ink hover:bg-raised transition-colors">
          <ZoomOut size={14} />
        </button>
        <button onClick={resetView} title="Reset view"
          className="p-1.5 rounded text-subtle hover:text-ink hover:bg-raised transition-colors">
          <RefreshCw size={13} />
        </button>

        <div className="w-px h-4 bg-border shrink-0" />

        {/* Export */}
        <button onClick={exportPNG} title="Export PNG"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-mono
                     text-subtle hover:text-ink hover:bg-raised transition-colors">
          <Download size={13} /> Export
        </button>

        {/* Clear */}
        <button onClick={clearAll} title="Clear all"
          className="p-1.5 rounded text-subtle hover:text-danger transition-colors">
          <Trash2 size={13} />
        </button>

        {/* Fullscreen */}
        <button onClick={() => setFullscreen((v) => !v)} title="Toggle fullscreen"
          className="p-1.5 rounded text-subtle hover:text-ink hover:bg-raised transition-colors">
          {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>

      {/* ── Expression chips ─────────────────────────────────────────────────── */}
      {exprs.length > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 shrink-0 flex-wrap border-b border-border"
          style={{ background: "rgba(10,10,10,0.85)" }}
        >
          {exprs.map((e) => (
            <div
              key={e.id}
              className={clsx(
                "flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-mono",
                "border transition-opacity",
                e.error ? "border-danger/40" : "",
                !e.visible && "opacity-40",
              )}
              style={{
                borderColor: e.error ? undefined : e.color + "50",
                background:  e.error ? "rgba(224,92,92,0.08)" : e.color + "12",
                color:       e.error ? "#e05c5c" : e.color,
              }}
            >
              {/* Color dot */}
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: e.error ? "#e05c5c" : e.color }}
              />
              <span className="max-w-40 truncate" title={e.raw}>{e.raw}</span>
              {e.error && <span className="text-[10px] opacity-70 ml-1">err</span>}

              {/* Toggle visibility */}
              <button
                onClick={() => toggleExpr(e.id)}
                className="p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity ml-0.5"
              >
                {e.visible ? <Eye size={10} /> : <EyeOff size={10} />}
              </button>

              {/* Remove */}
              <button
                onClick={() => removeExpr(e.id)}
                className="p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Graph ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {exprs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center space-y-2">
              <p className="text-xs font-mono text-subtle/50">
                Type an expression above and press Enter
              </p>
              <p className="text-[10px] font-mono text-subtle/30">
                Supports: sin, cos, tan, sqrt, abs, log, exp, pi, e, ^ for powers
              </p>
            </div>
          </div>
        )}
        <div ref={plotRef} className="w-full h-full" />
      </div>
    </div>
  );
}