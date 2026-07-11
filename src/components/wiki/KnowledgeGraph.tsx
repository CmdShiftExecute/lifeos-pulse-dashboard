"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

interface GraphNode {
  id: string;
  title: string;
  category: string;
  quality?: number;
  backlinkCount: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (slug: string, category: string) => void;
  hiddenCategories?: Set<string>;
  searchQuery?: string;
  // When provided (memory-graph mode), color by this map (category=community id)
  // and lay out cluster centers dynamically on a ring instead of the 5 fixed domains.
  colorMap?: Record<string, string>;
}

type Pos = { x: number; y: number; r: number; category: string; title: string; backlinks: number };
type ThemeColors = {
  byCat: Record<string, string>;
  fallback: string;
  edge: string;
  edgeFocus: string;
  edgeDim: string;
  labelFocus: string;
  labelNeighbor: string;
  labelDim: string;
  nodeStroke: string;
};

// Resolve theme tokens to concrete color strings for canvas painting. Called at
// draw time and again whenever [data-theme] changes, so the graph recolors with
// the active theme (magenta in orchid, gold in solar) instead of staying blue.
function resolveTheme(colorMap?: Record<string, string>): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const hex = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  const hsl = (name: string, fb: string, a = 1) => {
    const raw = cs.getPropertyValue(name).trim() || fb;
    return a === 1 ? `hsl(${raw})` : `hsl(${raw} / ${a})`;
  };
  const MUTED = "215 20% 65%";
  const FG = "210 40% 98%";
  return {
    byCat: colorMap ?? {
      "system-doc": hex("--neon-2", "#22d3ee"),
      person: hex("--dim-relationships", "#b794f4"),
      company: hex("--dim-money", "#e0a458"),
      idea: hex("--dim-freedom", "#4c86ff"),
      research: hex("--neon-3", "#7cc6ff"),
      tool: hex("--neon-2", "#22d3ee"),
      bookmark: hex("--dim-creative", "#f87171"),
    },
    fallback: hsl("--muted-foreground", MUTED),
    edge: hsl("--muted-foreground", MUTED, 0.28),
    edgeFocus: hex("--neon", "#4c86ff"),
    edgeDim: hsl("--muted-foreground", MUTED, 0.06),
    labelFocus: hsl("--foreground", FG),
    labelNeighbor: hsl("--muted-foreground", MUTED),
    labelDim: hsl("--muted-foreground", MUTED, 0.6),
    nodeStroke: hsl("--foreground", FG),
  };
}

export default function KnowledgeGraph({ nodes, edges, onNodeClick, hiddenCategories, searchQuery, colorMap }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    positions: Map<string, Pos>;
    edgeList: Array<{ s: string; t: string }>;
    neighbors: Map<string, Set<string>>;
    transform: { x: number; y: number; k: number };
    focused: string | null;
    width: number;
    height: number;
    colors: ThemeColors;
  } | null>(null);

  const render = useCallback(() => {
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { transform, positions, edgeList, neighbors, focused, width, height, colors } = state;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    const focusNeighbors = focused ? neighbors.get(focused) || new Set() : null;

    // Edges — coordinates read live from positions so dragging a node moves its links.
    for (const e of edgeList) {
      const s = positions.get(e.s);
      const t = positions.get(e.t);
      if (!s || !t) continue;
      const connects = focused && (e.s === focused || e.t === focused);
      if (focused) {
        ctx.strokeStyle = connects ? colors.edgeFocus : colors.edgeDim;
        ctx.lineWidth = (connects ? 1.5 : 0.5) / transform.k;
      } else {
        ctx.strokeStyle = colors.edge;
        ctx.lineWidth = 0.8 / transform.k;
      }
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }

    // Nodes
    for (const [id, pos] of positions) {
      const isFocused = id === focused;
      const isNeighbor = focusNeighbors?.has(id);
      const dimmed = focused && !isFocused && !isNeighbor;
      const color = colors.byCat[pos.category] || colors.fallback;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
      if (dimmed) {
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = color;
        ctx.fill();
        if (isFocused) {
          ctx.strokeStyle = colors.nodeStroke;
          ctx.lineWidth = 2 / transform.k;
          ctx.stroke();
        }
      }
    }

    // Labels at zoom > 1.6x, or for focused + neighbors
    if (transform.k > 1.6 || focused) {
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const fontSize = Math.max(4, 11 / transform.k);
      ctx.font = `${fontSize}px 'concourse-t3', sans-serif`;

      for (const [id, pos] of positions) {
        const isFocused = id === focused;
        const isNeighbor = focusNeighbors?.has(id);
        if (focused && !isFocused && !isNeighbor) continue;
        if (!focused && transform.k <= 1.6) continue;

        ctx.fillStyle = isFocused ? colors.labelFocus : isNeighbor ? colors.labelNeighbor : colors.labelDim;
        const label = pos.title.length > 25 ? pos.title.slice(0, 22) + "..." : pos.title;
        ctx.fillText(label, pos.x, pos.y - pos.r - 2);
      }
    }

    ctx.restore();
  }, []);

  const draw = useCallback(() => {
    if (!canvasRef.current || !containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const canvas = canvasRef.current;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    const visibleNodes = hiddenCategories?.size
      ? nodes.filter((n) => !hiddenCategories.has(n.category))
      : nodes;
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    const visibleEdges = edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));

    const neighbors = new Map<string, Set<string>>();
    for (const e of visibleEdges) {
      if (!neighbors.has(e.source)) neighbors.set(e.source, new Set());
      if (!neighbors.has(e.target)) neighbors.set(e.target, new Set());
      neighbors.get(e.source)!.add(e.target);
      neighbors.get(e.target)!.add(e.source);
    }

    // Category cluster centers laid out on a ring so each domain gets space —
    // avoids the old tight-ball clump when one category dominates (e.g. 56 docs).
    const keys = colorMap
      ? Array.from(new Set(visibleNodes.map((n) => n.category)))
      : ["system-doc", "person", "company", "idea", "research", "tool", "bookmark"].filter((k) =>
          visibleNodes.some((n) => n.category === k),
        );
    const R = Math.min(width, height) * 0.36;
    const cats: Record<string, { x: number; y: number }> = {};
    keys.forEach((k, i) => {
      const a = (i / Math.max(keys.length, 1)) * Math.PI * 2 - Math.PI / 2;
      cats[k] = { x: width / 2 + Math.cos(a) * R, y: height / 2 + Math.sin(a) * R };
    });

    const simNodes = visibleNodes.map((n) => {
      const c = cats[n.category] || { x: width / 2, y: height / 2 };
      return { ...n, x: c.x + (Math.random() - 0.5) * width * 0.25, y: c.y + (Math.random() - 0.5) * height * 0.25 };
    });
    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));
    const simEdges = visibleEdges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({ source: e.source, target: e.target }));

    const pad = 24;
    const radiusFor = (backlinks: number) => Math.max(5, Math.sqrt(backlinks || 1) * 3 + 3);

    const simulation = d3
      .forceSimulation(simNodes as any)
      .force("link", d3.forceLink(simEdges as any).id((d: any) => d.id).distance(60))
      .force("charge", d3.forceManyBody().strength(-140))
      .force("x", d3.forceX((d: any) => cats[d.category]?.x ?? width / 2).strength(0.12))
      .force("y", d3.forceY((d: any) => cats[d.category]?.y ?? height / 2).strength(0.12))
      .force("collision", d3.forceCollide().radius((d: any) => radiusFor(d.backlinkCount) + 4))
      .velocityDecay(0.5)
      .alphaDecay(0.04)
      .stop();

    for (let i = 0; i < 260; i++) {
      simulation.tick();
      for (const d of simNodes as any[]) {
        d.x = Math.max(pad, Math.min(width - pad, d.x));
        d.y = Math.max(pad, Math.min(height - pad, d.y));
      }
    }

    const positions = new Map<string, Pos>();
    for (const n of simNodes as any[]) {
      positions.set(n.id, {
        x: n.x,
        y: n.y,
        r: radiusFor(n.backlinkCount),
        category: n.category,
        title: n.title,
        backlinks: n.backlinkCount,
      });
    }

    const edgeList = simEdges.map((e: any) => ({
      s: typeof e.source === "string" ? e.source : e.source.id,
      t: typeof e.target === "string" ? e.target : e.target.id,
    }));

    stateRef.current = {
      positions,
      edgeList,
      neighbors,
      transform: { x: 0, y: 0, k: 1 },
      focused: null,
      width,
      height,
      colors: resolveTheme(colorMap),
    };

    render();

    if (searchQuery && searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      for (const [id, pos] of positions) {
        if (pos.title.toLowerCase().includes(q)) {
          stateRef.current.focused = id;
          stateRef.current.transform = { x: width / 2 - pos.x * 3, y: height / 2 - pos.y * 3, k: 3 };
          render();
          break;
        }
      }
    }
  }, [nodes, edges, hiddenCategories, searchQuery, colorMap, render]);

  // Recolor (not relayout) when the theme changes.
  useEffect(() => {
    const obs = new MutationObserver(() => {
      if (stateRef.current) {
        stateRef.current.colors = resolveTheme(colorMap);
        render();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [colorMap, render]);

  // Mouse interaction: drag a node to reposition it; drag the background to pan.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let mode: "idle" | "pan" | "node" = "idle";
    let draggedId: string | null = null;
    let lastX = 0;
    let lastY = 0;
    let downX = 0;
    let downY = 0;
    let moved = false;

    function hitTest(mx: number, my: number): string | null {
      const state = stateRef.current;
      if (!state) return null;
      const { transform, positions } = state;
      const wx = (mx - transform.x) / transform.k;
      const wy = (my - transform.y) / transform.k;
      let closest: string | null = null;
      let closestDist = Infinity;
      for (const [id, pos] of positions) {
        const dx = pos.x - wx;
        const dy = pos.y - wy;
        const dist = dx * dx + dy * dy;
        const hitR = Math.max(pos.r + 4, 10 / transform.k);
        if (dist < hitR * hitR && dist < closestDist) {
          closest = id;
          closestDist = dist;
        }
      }
      return closest;
    }

    const tooltipEl = document.createElement("div");
    tooltipEl.className = "graph-tooltip";
    Object.assign(tooltipEl.style, {
      position: "absolute",
      pointerEvents: "none",
      background: "var(--surface-2, rgba(2,6,23,0.95))",
      border: "1px solid var(--hairline, rgba(51,65,85,0.5))",
      borderRadius: "8px",
      padding: "8px 12px",
      opacity: "0",
      zIndex: "100",
      backdropFilter: "blur(8px)",
      fontFamily: "'concourse-t3', sans-serif",
      transition: "opacity 0.15s",
    });
    canvas.parentElement?.appendChild(tooltipEl);

    function showTooltip(id: string, mx: number, my: number) {
      const state = stateRef.current;
      if (!state) return;
      const pos = state.positions.get(id);
      if (!pos) return;
      const color = state.colors.byCat[pos.category] || state.colors.fallback;
      tooltipEl.innerHTML =
        `<div style="font-family: 'advocate-c14', sans-serif; font-size: 10px; letter-spacing: 0.05em; color: ${color}">${pos.category.replace("-", " ").toUpperCase()}</div>` +
        `<div style="font-size: 12px; color: var(--foreground-solid, #f1f5f9); margin-top: 2px">${pos.title}</div>` +
        (pos.backlinks > 0 ? `<div style="font-size: 10px; color: hsl(var(--muted-foreground)); margin-top: 2px">${pos.backlinks} backlinks</div>` : "") +
        `<div style="font-size: 9px; color: hsl(var(--muted-foreground)); margin-top: 3px; opacity: 0.7">drag to move · ${state.focused === id ? "click again to open" : "click to focus"}</div>`;
      tooltipEl.style.opacity = "1";
      tooltipEl.style.left = mx + 12 + "px";
      tooltipEl.style.top = my - 12 + "px";
    }
    const hideTooltip = () => (tooltipEl.style.opacity = "0");

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const state = stateRef.current;
      if (!state) return;
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newK = Math.max(0.3, Math.min(8, state.transform.k * factor));
      state.transform.x = mx - (mx - state.transform.x) * (newK / state.transform.k);
      state.transform.y = my - (my - state.transform.y) * (newK / state.transform.k);
      state.transform.k = newK;
      render();
    }

    function handleMouseDown(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved = false;
      const id = hitTest(mx, my);
      if (id) {
        mode = "node";
        draggedId = id;
        canvas!.style.cursor = "grabbing";
      } else {
        mode = "pan";
        canvas!.style.cursor = "grabbing";
      }
    }

    function handleMouseMove(e: MouseEvent) {
      const state = stateRef.current;
      if (!state) return;
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (mode === "node" && draggedId) {
        const pos = state.positions.get(draggedId);
        if (pos) {
          pos.x += (e.clientX - lastX) / state.transform.k;
          pos.y += (e.clientY - lastY) / state.transform.k;
        }
        lastX = e.clientX;
        lastY = e.clientY;
        if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 3) moved = true;
        hideTooltip();
        render();
        return;
      }
      if (mode === "pan") {
        state.transform.x += e.clientX - lastX;
        state.transform.y += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 3) moved = true;
        hideTooltip();
        render();
        return;
      }

      const id = hitTest(mx, my);
      canvas!.style.cursor = id ? "grab" : "default";
      if (id) showTooltip(id, mx, my);
      else hideTooltip();
    }

    function handleMouseUp(e: MouseEvent) {
      const state = stateRef.current;
      // A press that didn't move is a click → focus / open / unfocus.
      if (!moved && state) {
        const rect = canvas!.getBoundingClientRect();
        const id = hitTest(e.clientX - rect.left, e.clientY - rect.top);
        if (id) {
          if (state.focused === id) {
            const pos = state.positions.get(id);
            if (pos && onNodeClick) onNodeClick(id, pos.category);
          } else {
            state.focused = id;
            render();
          }
        } else if (state.focused) {
          state.focused = null;
          render();
        }
      }
      mode = "idle";
      draggedId = null;
      moved = false;
      canvas!.style.cursor = "default";
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      tooltipEl.remove();
    };
  }, [onNodeClick, render]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ background: "var(--bg-deep)" }}>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
