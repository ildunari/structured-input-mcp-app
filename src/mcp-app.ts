import { App, applyDocumentTheme, applyHostFonts, applyHostStyleVariables } from "@modelcontextprotocol/ext-apps";
import type { McpUiHostContext } from "@modelcontextprotocol/ext-apps";

// mcp-app-kit: host theme + style variables + fonts, re-applied on every change.
function applyHostContext(ctx: Partial<McpUiHostContext> | undefined): void {
  if (!ctx) return;
  if (ctx.theme) { applyDocumentTheme(ctx.theme); document.documentElement.setAttribute("data-theme", ctx.theme); }
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

// ===== SVG ICONS =====
const ICONS = {
  check: '<svg viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  drag: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="4" r="1.5"/><circle cx="11" cy="4" r="1.5"/><circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="11" cy="12" r="1.5"/></svg>',
  close: '<svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="8" cy="8" r="6.25"/><path d="M8 7.4v3.7"/><path d="M8 4.9h.01"/></svg>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
};

// ===== STATE =====
const state: Record<string, () => unknown> = {};
let connectedToHost = false;

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

function parseImageAspect(size?: string): string | null {
  const match = size?.match(/^(\d+)x(\d+)$/);
  if (!match) return null;
  return `${match[1]} / ${match[2]}`;
}

function requestHostResize() {
  if (!connectedToHost) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const shell = document.getElementById("formApp");
      const rect = shell?.getBoundingClientRect();
      const width = rect?.width ?? (document.documentElement.scrollWidth || window.innerWidth);
      const height = rect?.height ?? document.documentElement.scrollHeight;
      void app.sendSizeChanged({
        width: Math.ceil(width + 4),
        height: Math.ceil(height + 4),
      });
    });
  });
}

function clearState() {
  Object.keys(state).forEach((key) => delete state[key]);
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
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rankedItems(ul: HTMLElement): HTMLElement[] {
  return [...ul.querySelectorAll<HTMLElement>(".ranked-item")];
}

function captureRankedPositions(ul: HTMLElement): Map<HTMLElement, DOMRect> {
  return new Map(rankedItems(ul).map((item) => [item, item.getBoundingClientRect()]));
}

function animateRankedMove(ul: HTMLElement, first: Map<HTMLElement, DOMRect>, skip?: HTMLElement) {
  if (reduceMotion) return;

  rankedItems(ul).forEach((item) => {
    if (item === skip) return;
    const before = first.get(item);
    if (!before) return;

    const after = item.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (!dx && !dy) return;

    item.classList.add("moving");
    item.style.transition = "none";
    item.style.transform = `translate(${dx}px, ${dy}px)`;

    requestAnimationFrame(() => {
      item.style.transition = "";
      item.style.transform = "";
    });

    item.addEventListener("transitionend", () => item.classList.remove("moving"), { once: true });
  });
}

function unlockedSegmentFor(item: HTMLElement): HTMLElement[] {
  const all = rankedItems(item.parentElement as HTMLElement);
  const index = all.indexOf(item);
  let start = index;
  let end = index + 1;

  while (start > 0 && !all[start - 1].classList.contains("locked")) start--;
  while (end < all.length && !all[end].classList.contains("locked")) end++;

  return all.slice(start, end).filter((candidate) => !candidate.classList.contains("locked"));
}

function notifyRankedChange(ul: HTMLElement) {
  ul.dispatchEvent(new Event("change", { bubbles: true }));
}

function moveRankedItem(item: HTMLElement, direction: -1 | 1): boolean {
  const ul = item.parentElement as HTMLElement;
  const segment = unlockedSegmentFor(item);
  const index = segment.indexOf(item);
  const target = segment[index + direction];
  if (!target) return false;

  const first = captureRankedPositions(ul);
  direction < 0 ? target.before(item) : target.after(item);
  renum(ul);
  animateRankedMove(ul, first, item);
  notifyRankedChange(ul);
  return true;
}

function reorderRankedAtPointer(ul: HTMLElement, dragEl: HTMLElement, centerY: number): boolean {
  const segment = unlockedSegmentFor(dragEl);
  const first = captureRankedPositions(ul);
  const target = segment.find((item) => item !== dragEl && centerY < item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2);

  if (target) {
    if (dragEl.nextElementSibling === target) return false;
    target.before(dragEl);
  } else {
    const last = segment.at(-1);
    if (!last || last === dragEl) return false;
    last.after(dragEl);
  }

  renum(ul);
  animateRankedMove(ul, first, dragEl);
  return true;
}

function initDrag(ul: HTMLElement) {
  rankedItems(ul).forEach((item) => {
    if (item.classList.contains("locked")) return;

    const handle = item.querySelector<HTMLElement>(".drag-handle");
    if (!handle) return;

    let activePointerId: number | null = null;
    let startY = 0;
    let moved = false;
    let raf = 0;
    let lastY = 0;
    let grabOffsetY = 0;
    let dragOffsetY = 0;

    const positionDraggedRow = () => {
      const rect = item.getBoundingClientRect();
      const layoutTop = rect.top - dragOffsetY;
      const desiredTop = lastY - grabOffsetY;
      dragOffsetY = desiredTop - layoutTop;
      item.style.transform = `translateY(${dragOffsetY}px)`;
    };

    const updateDrag = () => {
      raf = 0;
      const rect = item.getBoundingClientRect();
      const desiredCenterY = lastY - grabOffsetY + rect.height / 2;
      if (reorderRankedAtPointer(ul, item, desiredCenterY)) {
        moved = true;
      }
      positionDraggedRow();
    };

    const endDrag = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      activePointerId = null;
      ul.classList.remove("dragging");
      item.classList.remove("dragging");
      item.style.transform = "";
      dragOffsetY = 0;
      renum(ul);
      if (moved) notifyRankedChange(ul);
    };

    handle.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      activePointerId = event.pointerId;
      startY = event.clientY;
      lastY = event.clientY;
      grabOffsetY = event.clientY - item.getBoundingClientRect().top;
      dragOffsetY = 0;
      moved = false;
      item.classList.add("dragging");
      ul.classList.add("dragging");
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    handle.addEventListener("pointermove", (event) => {
      if (activePointerId !== event.pointerId) return;
      lastY = event.clientY;
      if (Math.abs(lastY - startY) <= 3) return;
      moved = true;
      if (raf) return;

      raf = requestAnimationFrame(updateDrag);
      event.preventDefault();
    });

    handle.addEventListener("pointerup", (event) => {
      if (activePointerId !== event.pointerId) return;
      endDrag();
    });

    handle.addEventListener("pointercancel", (event) => {
      if (activePointerId !== event.pointerId) return;
      endDrag();
    });

    handle.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      moveRankedItem(item, event.key === "ArrowUp" ? -1 : 1);
    });
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
      const handle = el("button", { className: "drag-handle", type: "button" }) as HTMLButtonElement;
      handle.innerHTML = ICONS.drag;
      if (it.locked) {
        handle.disabled = true;
        handle.setAttribute("aria-label", "Locked item");
      } else {
        handle.setAttribute("aria-label", `Drag ${it.label}`);
        handle.title = "Drag to reorder";
      }
      const num = el("div", { className: "rank-num", textContent: String(i + 1) });
      const label = el("span", { className: "ranked-label", textContent: it.label });
      li.append(handle, num, label);
      if (f.removable && !it.locked) {
        const rm = el("button", { className: "ranked-rm" }); rm.innerHTML = ICONS.close;
        rm.addEventListener("click", () => { li.remove(); renum(ul); notifyRankedChange(ul); });
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

function renderImageResult(result: any) {
  const body = document.getElementById("formBody")!;
  body.innerHTML = "";
  clearState();
  document.body.classList.add("image-result-view");
  document.getElementById("formApp")?.classList.add("result-shell");

  const wrap = el("div", { className: "image-result" });

  const frame = el("div", { className: "image-frame" });
  const imageAspect = parseImageAspect(result.size);
  if (imageAspect) frame.style.setProperty("--image-aspect", imageAspect);
  const img = el("img", { className: "generated-image", src: result.url, alt: result.prompt || "Generated image" }) as HTMLImageElement;
  img.addEventListener("load", requestHostResize, { once: true });
  frame.appendChild(img);

  const imageDetails = [
    ["Model", result.model],
    ["Size", result.size],
    ["Quality", result.quality],
    ["Format", result.format],
  ].filter(([, value]) => value);

  let promptDialog: HTMLDialogElement | null = null;
  if (result.prompt || imageDetails.length > 0) {
    const info = el("button", { className: "image-info-btn" }) as HTMLButtonElement;
    info.type = "button";
    info.setAttribute("aria-label", "View image details");
    info.innerHTML = ICONS.info;
    frame.appendChild(info);

    promptDialog = el("dialog", { className: "prompt-dialog" }) as HTMLDialogElement;
    const dialogPanel = el("div", { className: "prompt-dialog-panel" });
    const close = el("button", { className: "prompt-dialog-close" }) as HTMLButtonElement;
    const closePrompt = () => {
      if (!promptDialog?.open) return;
      promptDialog.classList.add("closing");
      window.setTimeout(() => {
        promptDialog?.classList.remove("closing");
        promptDialog?.close();
        requestHostResize();
      }, 150);
    };
    close.type = "button";
    close.setAttribute("aria-label", "Close details");
    close.innerHTML = ICONS.close;
    close.addEventListener("click", closePrompt);
    dialogPanel.append(close, el("h2", { className: "prompt-dialog-title", textContent: "Details" }));
    if (result.prompt) {
      dialogPanel.append(
        el("div", { className: "prompt-section-label", textContent: "Prompt" }),
        el("p", { className: "prompt-dialog-text", textContent: result.prompt })
      );
    }
    if (imageDetails.length > 0) {
      const details = el("dl", { className: "image-detail-list" });
      imageDetails.forEach(([key, value]) => {
        details.append(el("dt", { textContent: key }), el("dd", { textContent: String(value) }));
      });
      dialogPanel.appendChild(details);
    }
    promptDialog.appendChild(dialogPanel);
    promptDialog.addEventListener("click", (event) => {
      if (event.target === promptDialog) closePrompt();
    });
    promptDialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closePrompt();
    });
    info.addEventListener("click", () => {
      if (typeof promptDialog?.showModal === "function") {
        promptDialog.showModal();
      } else {
        promptDialog?.setAttribute("open", "");
      }
      requestHostResize();
    });
  }

  const actions = el("div", { className: "image-actions" });
  const download = el("a", { className: "btn btn-primary", href: result.url, download: result.id || "generated-image", textContent: "Save" });
  const open = el("a", { className: "btn btn-ghost", href: result.url, target: "_blank", rel: "noreferrer", textContent: "Open" });
  const copy = el("button", { className: "btn btn-ghost", textContent: "Copy" });
  copy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(result.url);
    toast("Image URL copied");
  });
  actions.append(download, open, copy);
  frame.appendChild(actions);

  wrap.appendChild(frame);
  body.appendChild(wrap);
  if (promptDialog) body.appendChild(promptDialog);
  requestHostResize();
}

// ===== RENDER FORM FROM SCHEMA =====
function renderForm(schema: any) {
  const body = document.getElementById("formBody")!;
  body.innerHTML = "";
  clearState();
  document.body.classList.remove("image-result-view");
  document.getElementById("formApp")?.classList.remove("result-shell");

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

  requestHostResize();
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
  title: "Project setup",
  description: "Choose the essentials.",
  fields: [
    { id: "name", type: "text", label: "Project Name", required: true, placeholder: "e.g. My Cool Project" },
    { id: "desc", type: "longtext", label: "Description", placeholder: "What should this do?" },
    { id: "iterations", type: "number", label: "Max Iterations", default: 10, min: 1, max: 100, unit: "iterations" },
    { id: "temperature", type: "slider", label: "Temperature", min: 0, max: 2, step: 0.1, default: 0.7 },
    { id: "tokens", type: "range", label: "Token Range", min: 0, max: 4096, step: 64, default: [512, 2560] },
    { id: "model", type: "single-select", label: "Model", required: true, options: [{ value: "haiku", label: "Haiku" }, { value: "sonnet", label: "Sonnet" }, { value: "opus", label: "Opus" }], default: "sonnet" },
    { id: "caps", type: "multi-select", label: "Capabilities", options: [{ value: "code", label: "Code" }, { value: "vision", label: "Vision" }, { value: "tools", label: "Tools" }, { value: "search", label: "Search" }, { value: "artifacts", label: "Artifacts" }], default: ["code", "tools"] },
    { id: "files", type: "checklist", label: "Files to Include", showSelectAll: true, items: [
      { id: "main", label: "main.ts", preview: "2.4 KB", group: "Source Files" },
      { id: "config", label: "config.json", preview: "860 B", group: "Source Files" },
      { id: "utils", label: "utils.ts", preview: "1.1 KB", group: "Source Files" },
      { id: "readme", label: "README.md", preview: "3.2 KB", group: "Docs" },
    ], default: ["main", "utils"] },
    { id: "priority", type: "ranked", label: "Priority Order", removable: true, items: [
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

const app = new App({ name: "Structured Input", version: "0.1.0" }, {}, { autoResize: false });

// Receive the tool result with the form schema in structuredContent
app.ontoolresult = (result) => {
  const schema = (result.structuredContent ?? result) as Record<string, unknown>;
  if ((schema as any).kind === "image-result") {
    renderImageResult(schema);
  } else if (schema.fields) {
    renderForm(schema);

    // Watch for value changes and update model context
    // Use a debounced approach — send context update on user interactions
    const body = document.getElementById("formBody")!;
    body.onchange = () => {
      void app.updateModelContext({
        content: [
          { type: "text", text: `Form values updated: ${JSON.stringify(getValues())}` },
        ],
      });
    };
    body.onclick = () => {
      // Debounce click-based changes (chips, toggles, ratings, etc.)
      setTimeout(() => {
        void app.updateModelContext({
          content: [
            { type: "text", text: `Form values updated: ${JSON.stringify(getValues())}` },
          ],
        });
      }, 100);
    };
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
app.onhostcontextchanged = (ctx) => applyHostContext(ctx);

// Connect to host (after all handlers are set). In local standalone mode there
// may be no MCP host, so keep the demo fallback alive instead of crashing.
try {
  await app.connect();
  connectedToHost = true;
} catch (error) {
  // Standalone browser previews do not provide the MCP host RPC surface.
}

// Apply initial theme
if (connectedToHost) {
  applyHostContext(app.getHostContext());
}

// Standalone fallback: if no tool result arrives within 500ms, render demo
setTimeout(() => {
  if (document.getElementById("formBody")!.children.length === 0) {
    renderForm(DEMO_SCHEMA);
  }
}, 500);
