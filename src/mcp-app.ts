import { App } from "@modelcontextprotocol/ext-apps";

// ===== SVG ICONS =====
const ICONS = {
  check: '<svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  drag: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="4" r="1.5"/><circle cx="11" cy="4" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="11" cy="12" r="1.5"/></svg>',
  close: '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/></svg>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
};

// ===== STATE =====
const state: Record<string, () => unknown> = {};

// ===== HELPERS =====
function el(tag: string, props: Record<string, unknown> = {}): HTMLElement {
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (v !== "" && v !== undefined) (e as any)[k] = v;
  });
  return e;
}

function toast(msg: string) {
  const t = document.getElementById("toast")!;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

// ===== SLIDER INIT =====
function initSlider(wrap: HTMLElement) {
  const tr = wrap.querySelector(".slider-track") as HTMLElement;
  const fl = wrap.querySelector(".slider-fill") as HTMLElement;
  const th = wrap.querySelector(".slider-thumb") as HTMLElement;
  const vi = wrap.querySelector(".slider-val") as HTMLInputElement;
  const mn = +tr.dataset.min!, mx = +tr.dataset.max!, st = +tr.dataset.step!;
  function set(p: number) {
    p = Math.max(0, Math.min(1, p));
    let v = Math.round((mn + p * (mx - mn)) / st) * st;
    p = (v - mn) / (mx - mn);
    fl.style.width = p * 100 + "%";
    th.style.left = p * 100 + "%";
    vi.value = v.toFixed(st < 1 ? 1 : 0);
  }
  function ptr(e: MouseEvent | TouchEvent) {
    const r = tr.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches?.[0]?.clientX : (e as MouseEvent).clientX;
    set(((clientX ?? 0) - r.left) / r.width);
  }
  let d = false;
  th.addEventListener("pointerdown", (e) => { d = true; e.preventDefault(); th.setPointerCapture(e.pointerId); });
  th.addEventListener("pointermove", (e) => { if (d) ptr(e); });
  th.addEventListener("pointerup", () => (d = false));
  tr.addEventListener("click", ptr as EventListener);
  vi.addEventListener("change", () => { const v = Math.max(mn, Math.min(mx, +vi.value)); set((v - mn) / (mx - mn)); });
}

function initRange(wrap: HTMLElement, defs: number[], lMin: HTMLElement, lMax: HTMLElement) {
  const tr = wrap.querySelector(".slider-track") as HTMLElement;
  const fl = wrap.querySelector(".slider-fill") as HTMLElement;
  const ths = wrap.querySelectorAll(".slider-thumb") as NodeListOf<HTMLElement>;
  const mn = +tr.dataset.min!, mx = +tr.dataset.max!, st = +tr.dataset.step!;
  const vals = [...defs];
  function upd() {
    const p0 = ((vals[0] - mn) / (mx - mn)) * 100;
    const p1 = ((vals[1] - mn) / (mx - mn)) * 100;
    fl.style.left = p0 + "%"; fl.style.width = (p1 - p0) + "%";
    ths[0].style.left = p0 + "%"; ths[1].style.left = p1 + "%";
    lMin.textContent = String(Math.round(vals[0]));
    lMax.textContent = String(Math.round(vals[1]));
  }
  ths.forEach((th, i) => {
    let d = false;
    th.addEventListener("pointerdown", (e) => { d = true; e.preventDefault(); th.setPointerCapture(e.pointerId); });
    th.addEventListener("pointermove", (e) => {
      if (!d) return;
      const r = tr.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      let v = Math.round((mn + p * (mx - mn)) / st) * st;
      if (i === 0) v = Math.min(v, vals[1] - st); else v = Math.max(v, vals[0] + st);
      vals[i] = v; upd();
    });
    th.addEventListener("pointerup", () => (d = false));
  });
}

// ===== DRAG INIT =====
function initDrag(ul: HTMLElement) {
  let dragEl: HTMLElement | null = null;
  ul.querySelectorAll(".ranked-item:not(.locked)").forEach((item) => {
    const htmlItem = item as HTMLElement;
    htmlItem.addEventListener("dragstart", (e) => { dragEl = htmlItem; htmlItem.style.opacity = "0.4"; (e as DragEvent).dataTransfer!.effectAllowed = "move"; });
    htmlItem.addEventListener("dragend", () => { htmlItem.style.opacity = "1"; dragEl = null; renum(ul); });
    htmlItem.addEventListener("dragover", (e) => { e.preventDefault(); (e as DragEvent).dataTransfer!.dropEffect = "move"; });
    htmlItem.addEventListener("drop", (e) => {
      e.preventDefault();
      if (dragEl && dragEl !== htmlItem) {
        const items = [...ul.children];
        const fi = items.indexOf(dragEl), ti = items.indexOf(htmlItem);
        fi < ti ? htmlItem.after(dragEl) : htmlItem.before(dragEl);
      }
      renum(ul);
    });
    htmlItem.addEventListener("touchstart", () => { dragEl = htmlItem; }, { passive: true });
    htmlItem.addEventListener("touchmove", (e) => {
      if (!dragEl) return; e.preventDefault();
      const t = (e as TouchEvent).touches[0];
      for (const o of [...ul.children]) {
        if (o === dragEl) continue;
        const r = (o as HTMLElement).getBoundingClientRect();
        const m = r.top + r.height / 2;
        if (t.clientY < m && o.compareDocumentPosition(dragEl) & 4) { o.before(dragEl); break; }
        if (t.clientY > m && o.compareDocumentPosition(dragEl) & 2) { o.after(dragEl); break; }
      }
    }, { passive: false });
    htmlItem.addEventListener("touchend", () => { dragEl = null; renum(ul); });
  });
}
function renum(ul: HTMLElement) { ul.querySelectorAll(".rank-num").forEach((n, i) => (n.textContent = String(i + 1))); }

// ===== FIELD RENDERERS =====
const R: Record<string, (f: any) => HTMLElement | DocumentFragment> = {
  text(f) {
    const inp = el("input", { type: "text", className: "text-input", id: "f-" + f.id, placeholder: f.placeholder || "", maxLength: f.maxLength || "" }) as HTMLInputElement;
    if (f.default) inp.value = f.default;
    state[f.id] = () => inp.value;
    return inp;
  },

  longtext(f) {
    const ta = el("textarea", { className: "text-input", id: "f-" + f.id, placeholder: f.placeholder || "", rows: f.rows || 3 }) as HTMLTextAreaElement;
    if (f.default) ta.value = f.default;
    state[f.id] = () => ta.value;
    return ta;
  },

  number(f) {
    const wrap = el("div", { className: "num-row" });
    const inp = el("input", { type: "number", className: "num-input", id: "f-" + f.id, min: f.min ?? "", max: f.max ?? "", step: f.step ?? 1, value: f.default ?? "" }) as HTMLInputElement;
    wrap.appendChild(inp);
    if (f.unit) wrap.appendChild(el("span", { className: "num-unit", textContent: f.unit }));
    state[f.id] = () => inp.value === "" ? null : +inp.value;
    return wrap;
  },

  slider(f) {
    const mn = f.min, mx = f.max, st = f.step || 1;
    const def = f.default ?? mn;
    const pct = ((def - mn) / (mx - mn)) * 100;
    const wrap = el("div", { className: "slider-wrap" });
    const track = el("div", { className: "slider-track" });
    track.dataset.min = mn; track.dataset.max = mx; track.dataset.step = st;
    const fill = el("div", { className: "slider-fill" }); fill.style.width = pct + "%";
    const thumb = el("div", { className: "slider-thumb" }); thumb.style.left = pct + "%";
    track.append(fill, thumb);
    const vi = el("input", { type: "number", className: "slider-val", min: mn, max: mx, step: st, value: def.toFixed(st < 1 ? 1 : 0) }) as HTMLInputElement;
    wrap.append(track, vi);
    initSlider(wrap);
    state[f.id] = () => +vi.value;
    return wrap;
  },

  range(f) {
    const mn = f.min, mx = f.max, st = f.step || 1;
    const defs = f.default || [mn + (mx - mn) * 0.25, mn + (mx - mn) * 0.75];
    const p0 = ((defs[0] - mn) / (mx - mn)) * 100, p1 = ((defs[1] - mn) / (mx - mn)) * 100;
    const wrap = el("div", { className: "range-wrap" });
    const track = el("div", { className: "slider-track" });
    track.dataset.min = mn; track.dataset.max = mx; track.dataset.step = st;
    const fill = el("div", { className: "slider-fill" }); fill.style.left = p0 + "%"; fill.style.width = (p1 - p0) + "%";
    const t0 = el("div", { className: "slider-thumb" }); t0.style.left = p0 + "%"; t0.dataset.role = "min";
    const t1 = el("div", { className: "slider-thumb" }); t1.style.left = p1 + "%"; t1.dataset.role = "max";
    track.append(fill, t0, t1);
    const labels = el("div", { className: "range-labels" });
    const lMin = el("span", { textContent: String(Math.round(defs[0])) });
    const lMax = el("span", { textContent: String(Math.round(defs[1])) });
    labels.append(lMin, lMax);
    wrap.append(track, labels);
    initRange(wrap, defs, lMin, lMax);
    state[f.id] = () => ({ min: +lMin.textContent!, max: +lMax.textContent! });
    return wrap;
  },

  "single-select"(f) {
    const wrap = el("div", { className: "chips" }); (wrap as HTMLElement).dataset.mode = "single";
    f.options.forEach((o: any) => {
      const c = el("div", { className: "chip" + (f.default === o.value ? " sel" : ""), textContent: o.label });
      c.dataset.value = o.value;
      c.addEventListener("click", () => { wrap.querySelectorAll(".chip").forEach((x) => x.classList.remove("sel")); c.classList.add("sel"); });
      wrap.appendChild(c);
    });
    state[f.id] = () => (wrap.querySelector(".sel") as HTMLElement)?.dataset.value ?? null;
    return wrap;
  },

  "multi-select"(f) {
    const defs = f.default || [];
    const wrap = el("div", { className: "chips" }); (wrap as HTMLElement).dataset.mode = "multi";
    f.options.forEach((o: any) => {
      const c = el("div", { className: "chip" + (defs.includes(o.value) ? " sel" : ""), textContent: o.label });
      c.dataset.value = o.value;
      c.addEventListener("click", () => c.classList.toggle("sel"));
      wrap.appendChild(c);
    });
    state[f.id] = () => [...wrap.querySelectorAll(".sel")].map((c) => (c as HTMLElement).dataset.value);
    return wrap;
  },

  checklist(f) {
    const defs = f.default || [];
    const plate = el("div", { className: "plate" });
    const groups: Record<string, any[]> = {};
    f.items.forEach((it: any) => { const g = it.group || ""; (groups[g] = groups[g] || []).push(it); });
    Object.entries(groups).forEach(([gName, items]) => {
      if (gName || f.showSelectAll) {
        const hdr = el("div", { className: "cl-header" });
        hdr.appendChild(el("span", { textContent: gName || "Items" }));
        if (f.showSelectAll) {
          const btn = el("button", { className: "cl-action", textContent: "Select all" });
          btn.addEventListener("click", () => {
            const lis = plate.querySelectorAll(".cl-item");
            const allOn = [...lis].every((l) => l.classList.contains("on"));
            lis.forEach((l) => (allOn ? l.classList.remove("on") : l.classList.add("on")));
            btn.textContent = allOn ? "Select all" : "Deselect all";
          });
          hdr.appendChild(btn);
        }
        plate.appendChild(hdr);
      }
      const ul = el("ul", { className: "checklist" });
      items.forEach((it: any) => {
        const li = el("li", { className: "cl-item" + (defs.includes(it.id) ? " on" : "") });
        li.dataset.id = it.id;
        li.addEventListener("click", () => li.classList.toggle("on"));
        const box = el("div", { className: "cl-box" }); box.innerHTML = ICONS.check;
        li.appendChild(box);
        li.appendChild(el("span", { className: "cl-label", textContent: it.label }));
        if (it.preview) li.appendChild(el("span", { className: "cl-meta", textContent: it.preview }));
        ul.appendChild(li);
      });
      plate.appendChild(ul);
    });
    state[f.id] = () => [...plate.querySelectorAll(".cl-item.on")].map((l) => (l as HTMLElement).dataset.id);
    return plate;
  },

  ranked(f) {
    const ul = el("ul", { className: "ranked" });
    f.items.forEach((it: any, i: number) => {
      const li = el("li", { className: "ranked-item" + (it.locked ? " locked" : "") });
      li.dataset.id = it.id;
      if (!it.locked) (li as HTMLElement).draggable = true;
      const handle = el("div", { className: "drag-handle" }); handle.innerHTML = ICONS.drag;
      const num = el("div", { className: "rank-num", textContent: String(i + 1) });
      const label = el("span", { className: "ranked-label", textContent: it.label });
      li.append(handle, num, label);
      if (f.removable && !it.locked) {
        const rm = el("button", { className: "ranked-rm" }); rm.innerHTML = ICONS.close;
        rm.addEventListener("click", () => { li.remove(); renum(ul); });
        li.appendChild(rm);
      }
      ul.appendChild(li);
    });
    initDrag(ul);
    state[f.id] = () => [...ul.querySelectorAll(".ranked-item")].map((l) => (l as HTMLElement).dataset.id);
    return ul;
  },

  rating(f) {
    const max = f.max || 5;
    const def = f.default || 0;
    const wrap = el("div", { className: "rating" });
    const lbl = el("span", { className: "rating-lbl", textContent: def + "/" + max });
    for (let i = 1; i <= max; i++) {
      const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      s.setAttribute("viewBox", "0 0 24 24");
      s.classList.add("star");
      if (i <= def) s.classList.add("on");
      s.dataset.v = String(i);
      s.innerHTML = ICONS.star;
      s.addEventListener("click", () => {
        const v = +s.dataset.v!;
        wrap.querySelectorAll(".star").forEach((x) => x.classList.toggle("on", +((x as SVGElement).dataset.v!) <= v));
        lbl.textContent = v + "/" + max;
      });
      s.addEventListener("mouseenter", () => {
        const v = +s.dataset.v!;
        wrap.querySelectorAll(".star").forEach((x) => x.classList.toggle("hover", +((x as SVGElement).dataset.v!) <= v));
      });
      wrap.appendChild(s);
    }
    wrap.addEventListener("mouseleave", () => wrap.querySelectorAll(".star").forEach((x) => x.classList.remove("hover")));
    wrap.appendChild(lbl);
    state[f.id] = () => wrap.querySelectorAll(".star.on").length;
    return wrap;
  },

  color(f) {
    const frag = document.createDocumentFragment();
    f.roles.forEach((role: any) => {
      const group = el("div", { className: "color-group" });
      group.appendChild(el("div", { className: "color-role", textContent: role.label }));
      const sw = el("div", { className: "swatches" }); sw.dataset.role = role.role;
      role.swatches.forEach((hex: string, i: number) => {
        const s = el("div", { className: "swatch" + (i === 0 ? " sel" : "") });
        s.style.background = hex; s.dataset.c = hex;
        s.addEventListener("click", () => {
          sw.querySelectorAll(".swatch").forEach((x) => x.classList.remove("sel"));
          s.classList.add("sel");
          const hi = group.querySelector(".hex-in") as HTMLInputElement | null;
          if (hi) hi.value = hex;
        });
        sw.appendChild(s);
      });
      group.appendChild(sw);
      if (role.allowCustom) {
        const hi = el("input", { type: "text", className: "hex-in", value: role.swatches[0] || "", placeholder: "#hex" });
        group.appendChild(hi);
      }
      frag.appendChild(group);
      state[f.id + "." + role.role] = () => (sw.querySelector(".sel") as HTMLElement)?.dataset.c || (group.querySelector(".hex-in") as HTMLInputElement)?.value || null;
    });
    state[f.id] = () => {
      const out: Record<string, unknown> = {};
      f.roles.forEach((r: any) => { out[r.role] = state[f.id + "." + r.role](); });
      return out;
    };
    return frag as unknown as HTMLElement;
  },

  date(f) {
    const inp = el("input", { type: "date", className: "date-input", id: "f-" + f.id, value: f.default || "" }) as HTMLInputElement;
    state[f.id] = () => inp.value || null;
    return inp;
  },

  "date-range"(f) {
    const defs = f.default || {};
    const wrap = el("div", { className: "date-range" });
    const ds = el("input", { type: "date", className: "date-input", value: defs.start || "" }) as HTMLInputElement;
    const sep = el("span", { className: "date-sep", textContent: "to" });
    const de = el("input", { type: "date", className: "date-input", value: defs.end || "" }) as HTMLInputElement;
    wrap.append(ds, sep, de);
    state[f.id] = () => ({ start: ds.value || null, end: de.value || null });
    return wrap;
  },

  boolean(f) {
    const wrap = el("div", { className: "toggle-row" });
    const tog = el("div", { className: "toggle" + (f.default ? " on" : "") });
    tog.appendChild(el("div", { className: "toggle-knob" }));
    tog.addEventListener("click", () => tog.classList.toggle("on"));
    wrap.append(tog, el("span", { className: "toggle-text", textContent: f.label }));
    state[f.id] = () => tog.classList.contains("on");
    return wrap;
  },

  confirm(f) {
    const panel = el("div", { className: "confirm" });
    panel.appendChild(el("div", { className: "confirm-title", textContent: f.title }));
    const preview = el("div", { className: "confirm-preview" });
    (f.preview || []).forEach((p: any) => {
      const row = el("div", { className: "cp-row" });
      row.append(el("span", { className: "cp-key", textContent: p.key }), el("span", { className: "cp-val", textContent: p.value }));
      preview.appendChild(row);
    });
    panel.appendChild(preview);
    const btns = el("div", { className: "confirm-btns" });
    let confirmed: boolean | null = null;
    const bConfirm = el("button", { className: "btn btn-danger", textContent: f.confirmLabel || "Confirm" });
    const bCancel = el("button", { className: "btn btn-ghost", textContent: f.cancelLabel || "Cancel" });
    bConfirm.addEventListener("click", () => { confirmed = true; toast(f.confirmLabel || "Confirmed"); });
    bCancel.addEventListener("click", () => { confirmed = false; toast(f.cancelLabel || "Cancelled"); });
    btns.append(bConfirm, bCancel);
    panel.appendChild(btns);
    state[f.id] = () => confirmed;
    return panel;
  },
};

// ===== RENDER FORM FROM SCHEMA =====
function renderForm(schema: any) {
  const body = document.getElementById("formBody")!;
  body.innerHTML = "";

  if (schema.title || schema.description) {
    const hdr = el("div", { className: "form-header" });
    if (schema.title) hdr.appendChild(el("h1", { className: "form-title", textContent: schema.title }));
    if (schema.description) hdr.appendChild(el("p", { className: "form-description", textContent: schema.description }));
    body.appendChild(hdr);
  }

  schema.fields.forEach((f: any) => {
    const renderer = R[f.type];
    if (!renderer) { console.warn("Unknown field type:", f.type); return; }

    if (f.type === "boolean") {
      const group = el("div", { className: "field-group" });
      group.appendChild(renderer(f));
      body.appendChild(group);
      return;
    }

    const group = el("div", { className: "field-group" });
    if (f.label && f.type !== "confirm") {
      const lbl = el("label", { className: "field-label" });
      lbl.textContent = f.label;
      if (f.required) { const req = el("span", { className: "req", textContent: " *" }); lbl.appendChild(req); }
      group.appendChild(lbl);
    }
    if (f.description && f.type !== "confirm") group.appendChild(el("p", { className: "field-desc", textContent: f.description }));
    group.appendChild(renderer(f));
    body.appendChild(group);
  });
}

// ===== GET ALL VALUES =====
function getValues(): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  Object.entries(state).forEach(([k, getter]) => {
    if (!k.includes(".")) values[k] = getter();
  });
  return values;
}

// ===== DEMO SCHEMA (standalone / fallback) =====
const DEMO_SCHEMA = {
  title: "Configure Your Project",
  description: "Set up parameters for your project.",
  fields: [
    { id: "name", type: "text", label: "Project Name", required: true, placeholder: "e.g. My Cool Project" },
    { id: "desc", type: "longtext", label: "Description", description: "A brief overview of what this project does.", placeholder: "Tell us about your project..." },
    { id: "iterations", type: "number", label: "Max Iterations", default: 10, min: 1, max: 100, unit: "iterations" },
    { id: "temperature", type: "slider", label: "Temperature", description: "Lower is focused, higher is creative.", min: 0, max: 2, step: 0.1, default: 0.7 },
    { id: "tokens", type: "range", label: "Token Range", description: "Min and max output tokens.", min: 0, max: 4096, step: 64, default: [512, 2560] },
    { id: "model", type: "single-select", label: "Model", required: true, options: [{ value: "haiku", label: "Haiku" }, { value: "sonnet", label: "Sonnet" }, { value: "opus", label: "Opus" }], default: "sonnet" },
    { id: "caps", type: "multi-select", label: "Capabilities", description: "Select all that apply.", options: [{ value: "code", label: "Code" }, { value: "vision", label: "Vision" }, { value: "tools", label: "Tools" }, { value: "search", label: "Search" }, { value: "artifacts", label: "Artifacts" }], default: ["code", "tools"] },
    { id: "files", type: "checklist", label: "Files to Include", showSelectAll: true, items: [
      { id: "main", label: "main.ts", preview: "2.4 KB", group: "Source Files" },
      { id: "config", label: "config.json", preview: "860 B", group: "Source Files" },
      { id: "utils", label: "utils.ts", preview: "1.1 KB", group: "Source Files" },
      { id: "readme", label: "README.md", preview: "3.2 KB", group: "Docs" },
    ], default: ["main", "utils"] },
    { id: "priority", type: "ranked", label: "Priority Order", description: "Drag to reorder.", removable: true, items: [
      { id: "perf", label: "Performance" }, { id: "safety", label: "Safety" }, { id: "cost", label: "Cost Efficiency" }, { id: "latency", label: "Latency" },
    ] },
    { id: "importance", type: "rating", label: "Importance", max: 5, default: 3 },
    { id: "colors", type: "color", label: "Theme Colors", roles: [
      { role: "primary", label: "Primary", swatches: ["#c96442", "#3898ec", "#5e5d59", "#27ae60", "#7c3aed"], allowCustom: true },
      { role: "background", label: "Background", swatches: ["#f5f4ed", "#ffffff", "#141413", "#1e293b"] },
    ] },
    { id: "startDate", type: "date", label: "Start Date", default: "2026-04-07" },
    { id: "period", type: "date-range", label: "Active Period", default: { start: "2026-04-07", end: "2026-05-07" } },
    { id: "streaming", type: "boolean", label: "Enable streaming", default: true },
    { id: "cache", type: "boolean", label: "Use prompt cache", default: false },
    { id: "deploy", type: "confirm", label: "Confirm Deployment", title: "Deploy to Production?", preview: [
      { key: "Environment", value: "production" }, { key: "Model", value: "Sonnet" }, { key: "Region", value: "us-east-1" }, { key: "Replicas", value: "3" },
    ], confirmLabel: "Confirm Deploy" },
  ],
};

// ===== MCP APP LIFECYCLE =====
// CRITICAL: Register ALL handlers BEFORE calling app.connect().
// If you register after connect(), you will miss the initial tool result.

const app = new App({ name: "Structured Input", version: "0.1.0" });

// Receive the tool result with the form schema in structuredContent
app.ontoolresult = (result) => {
  const schema = (result.structuredContent ?? result) as Record<string, unknown>;
  if (schema.fields) {
    renderForm(schema);

    // Watch for value changes and update model context
    // Use a debounced approach — send context update on user interactions
    const body = document.getElementById("formBody")!;
    body.addEventListener("change", () => {
      void app.updateModelContext({
        content: [
          { type: "text", text: `Form values updated: ${JSON.stringify(getValues())}` },
        ],
      });
    });
    body.addEventListener("click", () => {
      // Debounce click-based changes (chips, toggles, ratings, etc.)
      setTimeout(() => {
        void app.updateModelContext({
          content: [
            { type: "text", text: `Form values updated: ${JSON.stringify(getValues())}` },
          ],
        });
      }, 100);
    });
  }
};

// Preview tool input as it streams in
app.ontoolinputpartial = (params) => {
  const schema = (params.arguments as any)?.schema;
  if (schema?.title) {
    const body = document.getElementById("formBody")!;
    if (body.children.length === 0) {
      body.innerHTML = `<div class="form-header"><h1 class="form-title">${schema.title}</h1></div>`;
    }
  }
};

// Adapt to host theme changes
app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) {
    document.documentElement.setAttribute("data-theme", ctx.theme);
  }
};

// Connect to host (after all handlers are set)
await app.connect();

// Apply initial theme
const ctx = app.getHostContext();
if (ctx?.theme) {
  document.documentElement.setAttribute("data-theme", ctx.theme);
}

// Standalone fallback: if no tool result arrives within 500ms, render demo
setTimeout(() => {
  if (document.getElementById("formBody")!.children.length === 0) {
    renderForm(DEMO_SCHEMA);
  }
}, 500);
