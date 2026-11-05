import type { Course, CourseCode, StudyPlan } from "planner";
import { downloadBlob } from "../download.ts";
import { AREAS, areaOf } from "./areas.ts";
import { buildGraph } from "./buildGraph.ts";
import type { GraphLayout, GraphStyle } from "./buildGraph.ts";
import { escape, neighboursOf } from "./planGraph.ts";
import type { GraphRows } from "./planGraph.ts";

const THEME_KEY = "planifier-unrn:view-theme";

/** Page colours per theme; the drawing inside brings its own. */
const STYLES = `
:root{--bg:#fafaf9;--panel:#fff;--border:#e7e5e4;--ink:#1c1917;--muted:#78716c;--accent:#b91c1c;--card:#fff;--cardline:#e7e5e4;color-scheme:light}
:root[data-theme=dark]{--bg:#1c1917;--panel:#1c1917;--border:#44403c;--ink:#fafaf9;--muted:#a8a29e;--accent:#f87171;--card:#2e2926;--cardline:#44403c;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 Poppins,"Segoe UI",system-ui,sans-serif}
header{display:flex;align-items:center;gap:12px;padding:12px 24px;border-bottom:1px solid var(--border)}
.mark{flex:none;width:32px;height:32px}
.brand{margin-right:auto;min-width:0}
.brand strong{display:block;font-size:16px;line-height:1.2}
.brand span{display:block;font-size:12px;color:var(--muted)}
button.theme{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border:1px solid var(--border);border-radius:8px;background:var(--panel);color:inherit;font:inherit;cursor:pointer}
button.theme:hover{border-color:var(--accent)}
button.theme svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
:root:not([data-theme=dark]) .to-light,:root[data-theme=dark] .to-dark{display:none}
main{padding:16px 24px 24px}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;margin-bottom:12px}
.hint{margin:0 auto 0 0;font-size:12px;color:var(--muted)}
.hint .touch{display:none}
.rows,.styles{display:flex;overflow:hidden;border:1px solid var(--border);border-radius:8px}
.rows button,.styles button{padding:6px 12px;border:0;background:var(--panel);color:inherit;font:inherit;font-size:13px;cursor:pointer}
.rows button:hover,.styles button:hover{background:var(--bg)}
.rows button[aria-pressed=true],.styles button[aria-pressed=true]{background:#fee2e2;color:#991b1b;font-weight:600}
:root[data-theme=dark] .rows button[aria-pressed=true],:root[data-theme=dark] .styles button[aria-pressed=true]{background:#450a0a;color:#fecaca}
.frame{overflow:auto;border:1px solid var(--border);border-radius:12px;background:var(--panel)}
#board{margin:0 auto}
#board svg{display:block;width:100%;height:auto}
#board .card{cursor:pointer;outline:none;transition:opacity .15s}
.dim{position:fixed;inset:0;z-index:100;background:rgba(12,10,9,.85);backdrop-filter:blur(4px);opacity:0;transition:opacity .3s}
.dim.show{opacity:1}
.dim .top{position:absolute;inset:0 0 auto 0;display:flex;align-items:flex-start;gap:12px;height:72px;padding:16px 24px;color:#fff;opacity:0;transform:translateY(-12px);transition:opacity .25s,transform .25s}
.dim.show .top{opacity:1;transform:none}
.dim .top div{margin-right:auto}
.dim h2{margin:0;font-size:18px;font-weight:600}
.dim p{margin:0;font-size:14px;color:#d6d3d1}
.dim button{width:36px;height:36px;border:0;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;font-size:18px;line-height:1;cursor:pointer;transition:background .15s}
.dim button:hover{background:rgba(255,255,255,.3)}
.dim img{position:fixed;max-width:none;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);opacity:0;transition:opacity .2s}
.dim img.in{opacity:1}
.fly{position:fixed;left:0;top:0;z-index:101;transform-origin:0 0;pointer-events:none}
.fly .in{display:flex;gap:10px;height:100%;padding:6px 12px 6px 6px;border:1px solid var(--cardline);border-radius:8px;background:var(--card);color:var(--ink);box-shadow:0 10px 15px -3px rgba(0,0,0,.2)}
.fly.root .in{border:2.5px solid var(--accent);box-shadow:0 0 0 5px color-mix(in srgb,var(--accent) 22%,transparent)}
.fly i{flex:none;width:4px;border-radius:2px}
.fly b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;padding-top:4px;font-size:12px;line-height:15px;font-weight:600}
.fly small{display:block;font-size:10px;color:var(--muted)}
.fly .in.oval{align-items:center;justify-content:center;padding:0;border:1.5px solid;border-radius:50%;font-size:11px;font-weight:600}
.fly.root .in.oval{border-width:3px}
#board [data-from]{transition:opacity .15s,stroke-width .15s}
#board .card:focus-visible>rect:first-child,#board .card:focus-visible>ellipse{stroke:var(--accent);stroke-width:2}
#board svg.focusing .card{opacity:.3}
#board svg.focusing .card.rel{opacity:1}
#board svg.focusing .card.pick>rect:first-child{stroke:var(--ink);stroke-width:2}
#board svg.focusing .card.pick>ellipse{stroke-width:3}
#board svg.focusing [data-from]{opacity:.15}
#board svg.focusing [data-from].rel{opacity:1;stroke-width:2.25}
@media (prefers-reduced-motion:reduce){#board *{transition:none!important}}
@media (max-width:767px){.rows{display:none}.hint{flex-basis:100%}.hint .mouse{display:none}.hint .touch{display:inline}.dim .top{padding:12px 16px}}
@media (max-width:640px){header,main{padding-left:16px;padding-right:16px}.brand span{display:none}button.theme span{display:none}button.theme{padding:8px}}
`;

/** Brand mark: the plan as a route to a starred goal, as the app header draws it. */
const MARK =
  '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="mark-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ef4444"/><stop offset="1" stop-color="#991b1b"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#mark-gradient)"/><path d="M8 23.5C12.5 23.5 13 19.5 16.5 19.5S23.5 15 23.5 8.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="8" cy="23.5" r="2.7" fill="#dc2626" stroke="#fff" stroke-width="2"/><circle cx="16.5" cy="19.5" r="2.7" fill="#c42727" stroke="#fff" stroke-width="2"/><circle cx="23.5" cy="8.5" r="4" fill="#fff"/><path d="M23.5 6.3l.65 1.55 1.55.65-1.55.65-.65 1.55-.65-1.55-1.55-.65 1.55-.65z" fill="#b91c1c"/></svg>';

const ICON = (name: string, path: string) =>
  `<svg class="${name}" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
const SUN = ICON(
  "to-light",
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
);
const MOON = ICON("to-dark", '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>');

/**
 * Behaviour of the page: swaps the light and dark drawing, brings forward the course under the
 * cursor, and on a click opens its chain like the app does: everything dims, the cards of the
 * course and of the ones one step away fly from the board into a centred graph of their own.
 * Only classes and transforms change, so the colours come from the page styles.
 */
const SCRIPT = `
(function () {
  var root = document.documentElement;
  var board = document.getElementById("board");
  var toggle = document.getElementById("theme");
  var lineages = JSON.parse(document.getElementById("lineages").textContent);
  var tallLineages = JSON.parse(document.getElementById("lineages-tall").textContent);
  var mapLineages = JSON.parse(document.getElementById("lineages-map").textContent);
  // A narrow screen gets the cuatrimestres stacked; wider ones have them side by side.
  var narrow = matchMedia("(max-width: 767px)");
  // A finger does not hover: a tap opens the chain without first fading the other cards.
  var touch = matchMedia("(pointer: coarse)");
  var calm = matchMedia("(prefers-reduced-motion: reduce)");
  var MARGIN = 24;
  var HEADING_H = 72;
  var rows = document.body.dataset.rows;
  // "cards" or "map"; the map has one drawing only, which a phone scrolls sideways.
  var style = document.body.dataset.style;
  var hovered = null;
  var dialog = null;

  function save(theme) {
    try { localStorage.setItem("${THEME_KEY}", theme); } catch (error) {}
  }

  function focusOn(code) {
    var svg = board.firstElementChild;
    if (!svg) return;
    var related = {};
    svg.classList.toggle("focusing", code !== null);
    if (code !== null) related[code] = true;
    svg.querySelectorAll("[data-from]").forEach(function (edge) {
      var touches = code !== null && (edge.dataset.from === code || edge.dataset.to === code);
      edge.classList.toggle("rel", touches);
      if (touches) { related[edge.dataset.from] = true; related[edge.dataset.to] = true; }
    });
    svg.querySelectorAll(".card").forEach(function (card) {
      card.classList.toggle("rel", code !== null && related[card.dataset.code] === true);
      card.classList.toggle("pick", card.dataset.code === code);
    });
  }

  function refresh() { focusOn(hovered); }

  function show(theme) {
    var mode = style === "map" ? "map" : narrow.matches ? "tall" : rows;
    var template = document.getElementById("svg-" + mode + "-" + theme);
    board.replaceChildren(template.content.firstElementChild.cloneNode(true));
    board.querySelectorAll(".card").forEach(function (card) {
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-haspopup", "dialog");
      card.setAttribute("aria-label", card.textContent);
    });
    root.dataset.theme = theme;
    toggle.setAttribute("aria-label", theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    refresh();
  }

  function setRows(next) {
    rows = next;
    document.querySelectorAll(".rows button").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.rows === rows));
    });
    show(root.dataset.theme === "dark" ? "dark" : "light");
  }

  function setStyle(next) {
    style = next;
    document.body.dataset.style = style;
    document.querySelectorAll(".styles button").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.style === style));
    });
    show(root.dataset.theme === "dark" ? "dark" : "light");
  }

  function transform(place) {
    return "translate(" + place.x + "px," + place.y + "px) scale(" + place.scale + ")";
  }

  /** Moves a card from one place to another; resolves when it has arrived. */
  function move(node, from, to, ms, easing) {
    node.style.transform = transform(to);
    if (ms === 0 || !node.animate) return Promise.resolve();
    return node
      .animate([{ transform: transform(from) }, { transform: transform(to) }], { duration: ms, easing: easing })
      .finished.catch(function () {});
  }

  /** Where a card of the board is on screen: its corner, and how much it is scaled from its drawn size. */
  function placeOf(group, width) {
    if (!group) return null;
    var rect = group.firstElementChild.getBoundingClientRect();
    return { x: rect.left, y: rect.top, scale: rect.width / width };
  }

  var plural = function (count) { return count + (count === 1 ? " materia" : " materias"); };

  function openChain(code, clicked) {
    var data = (style === "map" ? mapLineages : narrow.matches ? tallLineages : lineages)[code];
    if (!data || dialog) return;
    var theme = root.dataset.theme === "dark" ? "dark" : "light";
    var opener = document.activeElement;
    var ms = calm.matches ? 0 : 600;
    hovered = null;
    refresh();

    var dim = document.createElement("div");
    dim.className = "dim";
    dim.setAttribute("role", "dialog");
    dim.setAttribute("aria-modal", "true");
    dim.setAttribute("aria-labelledby", "chain-title");
    var top = document.createElement("div");
    top.className = "top";
    var text = document.createElement("div");
    var title = document.createElement("h2");
    title.id = "chain-title";
    title.textContent = data.name;
    var summary = document.createElement("p");
    summary.textContent = data.needs === 0 && data.unlocks === 0
      ? "No tiene correlativas con otras materias del plan."
      : "Necesita " + plural(data.needs) + " · Habilita " + plural(data.unlocks);
    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Cerrar");
    closeButton.textContent = "\\u00d7";
    text.append(title, summary);
    top.append(text, closeButton);
    dim.append(top);
    document.body.append(dim);
    requestAnimationFrame(function () { dim.classList.add("show"); });

    // Fit the graph in the window below the heading, never enlarged past its drawn size.
    var width = window.innerWidth;
    var height = window.innerHeight;
    var scale = Math.min(1, (width - 2 * MARGIN) / data.width, (height - HEADING_H - 2 * MARGIN) / data.height);
    var left = (width - data.width * scale) / 2;
    var topEdge = HEADING_H + (height - HEADING_H - data.height * scale) / 2;

    var flyers = data.cards.map(function (card) {
      var to = { x: left + card.x * scale, y: topEdge + card.y * scale, scale: scale };
      var group = card.code === code ? clicked : board.querySelector('.card[data-code="' + card.code + '"]');
      var from = placeOf(group, card.width) || to;
      var node = document.createElement("div");
      node.className = "fly" + (card.code === code ? " root" : "");
      node.style.width = card.width + "px";
      node.style.height = card.height + "px";
      var inner = document.createElement("div");
      inner.className = "in";
      if (data.oval) {
        // A map oval: its code in a ring of its colour.
        inner.className = "in oval";
        inner.style.borderColor = theme === "dark" ? card.dark : card.color;
        inner.textContent = card.code;
        node.append(inner);
        dim.append(node);
        return { node: node, from: from, to: to, landing: move(node, from, to, ms, "cubic-bezier(.2,.9,.25,1)") };
      }
      var bar = document.createElement("i");
      bar.style.background = theme === "dark" ? card.dark : card.color;
      var label = document.createElement("span");
      var name = document.createElement("b");
      name.textContent = card.name;
      var meta = document.createElement("small");
      meta.textContent = card.code + " \\u00b7 " + card.hours + " h";
      label.append(name, meta);
      inner.append(bar, label);
      node.append(inner);
      dim.append(node);
      return { node: node, from: from, to: to, landing: move(node, from, to, ms, "cubic-bezier(.2,.9,.25,1)") };
    });

    var picture = null;
    var closing = false;

    // Once the cards have landed, the graph they make up fades in beneath them and builds itself.
    Promise.all(flyers.map(function (flyer) { return flyer.landing; })).then(function () {
      if (closing) return;
      picture = new Image();
      picture.alt = "Correlativas de " + data.name;
      picture.style.left = left + "px";
      picture.style.top = topEdge + "px";
      picture.style.width = data.width * scale + "px";
      picture.style.height = data.height * scale + "px";
      picture.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data[theme]);
      dim.insertBefore(picture, flyers[0].node);
      requestAnimationFrame(function () { picture.classList.add("in"); });
    });

    function onKey(event) {
      if (event.key === "Escape") close();
      if (event.key === "Tab") { event.preventDefault(); closeButton.focus(); }
    }

    function close() {
      if (closing) return;
      closing = true;
      window.removeEventListener("keydown", onKey);
      if (picture) picture.remove();
      dim.classList.remove("show");
      Promise.all(flyers.map(function (flyer) {
        return move(flyer.node, flyer.to, flyer.from, ms === 0 ? 0 : 450, "cubic-bezier(.4,0,.2,1)");
      })).then(function () {
        dim.remove();
        dialog = null;
        if (opener && opener.focus) opener.focus();
      });
    }

    dialog = { close: close };
    window.addEventListener("keydown", onKey);
    closeButton.addEventListener("click", close);
    dim.addEventListener("mousedown", function (event) { if (event.target === dim) close(); });
    closeButton.focus();
  }

  function cardAt(event) {
    return event.target.closest ? event.target.closest(".card") : null;
  }

  board.addEventListener("mouseover", function (event) {
    var card = cardAt(event);
    hovered = card && !touch.matches ? card.dataset.code : null;
    refresh();
  });
  board.addEventListener("mouseleave", function () { hovered = null; refresh(); });
  board.addEventListener("focusin", function (event) {
    var card = cardAt(event);
    hovered = card && !touch.matches ? card.dataset.code : null;
    refresh();
  });
  board.addEventListener("focusout", function () { hovered = null; refresh(); });
  board.addEventListener("click", function (event) {
    var card = cardAt(event);
    if (card) openChain(card.dataset.code, card);
  });
  board.addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    var card = cardAt(event);
    if (!card) return;
    event.preventDefault();
    openChain(card.dataset.code, card);
  });
  document.querySelectorAll(".rows button").forEach(function (button) {
    button.addEventListener("click", function () { setRows(button.dataset.rows); });
  });
  document.querySelectorAll(".styles button").forEach(function (button) {
    button.addEventListener("click", function () { setStyle(button.dataset.style); });
  });
  toggle.addEventListener("click", function () {
    var theme = root.dataset.theme === "dark" ? "light" : "dark";
    save(theme);
    show(theme);
  });

  narrow.addEventListener("change", function () { if (!dialog) show(root.dataset.theme === "dark" ? "dark" : "light"); });
  document.querySelectorAll(".styles button").forEach(function (button) {
    button.setAttribute("aria-pressed", String(button.dataset.style === style));
  });
  setRows(rows);
})();
`;

/** Picks the saved theme, else the system one, before anything paints. */
const PICK_THEME = `
(function () {
  var theme = null;
  try { theme = localStorage.getItem("${THEME_KEY}"); } catch (error) {}
  if (theme !== "light" && theme !== "dark") {
    theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = theme;
})();
`;

/** What the page needs to open the chain of one course: its flying cards and its graph, per theme. */
interface Lineage {
  name: string;
  /** Drawn as map ovals: the cards fly as rings of their colour (`color`/`dark`), not as cards. */
  oval: boolean;
  needs: number;
  unlocks: number;
  width: number;
  height: number;
  cards: {
    code: CourseCode;
    name: string;
    hours: number;
    color: string;
    dark: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  light: string;
  dark: string;
}

/** The chain of every course in the plan: itself plus the ones one step away, on a single board as the app draws it. */
function lineagesOf(
  plan: StudyPlan,
  curriculum: readonly Course[],
  layout: GraphLayout,
  style: GraphStyle = "cards",
): Record<CourseCode, Lineage> {
  const byCode = new Map(curriculum.map((course) => [course.code, course]));
  const result: Record<CourseCode, Lineage> = {};
  for (const code of new Set([...plan.approved, ...plan.terms.flat()])) {
    const { needs, unlocks } = neighboursOf(plan, curriculum, code);
    const name = byCode.get(code)?.name ?? code;
    const options = {
      only: new Set([code, ...needs, ...unlocks]),
      root: code,
      title: name,
      animate: true,
      // Always one board, whichever layout the page shows.
      rows: "single" as const,
      layout,
      style,
    };
    const light = buildGraph(plan, curriculum, { ...options, theme: "light" });
    const dark = buildGraph(plan, curriculum, { ...options, theme: "dark" });
    // A course on several boards flies as one card: the first it is drawn on.
    const seen = new Set<CourseCode>();
    const oval = style === "map";
    const darkColour = new Map(dark.cards.map((card) => [card.code, card.colour]));
    result[code] = {
      name,
      oval,
      needs: needs.size,
      unlocks: unlocks.size,
      width: light.width,
      height: light.height,
      cards: light.cards
        .filter((card) => !seen.has(card.code) && seen.add(card.code))
        .map((card) => ({
          code: card.code,
          name: card.name,
          hours: byCode.get(card.code)?.hours ?? 0,
          // A card's bar shows its area; an oval's ring, its own colour in each theme.
          color: oval ? card.colour! : AREAS[areaOf(card.code)].color,
          dark: oval ? darkColour.get(card.code)! : AREAS[areaOf(card.code)].dark,
          x: card.x,
          y: card.y,
          width: card.width,
          height: card.height,
        })),
      light: light.svg,
      dark: dark.svg,
    };
  }
  return result;
}

const MODES: readonly GraphRows[] = ["split", "single"];
/** Every drawing the page can show: the wide one in both row layouts, and the stacked one. */
const DRAWINGS = [...MODES, "tall"] as const;
const THEMES = ["light", "dark"] as const;
const ROW_LABELS: Record<GraphRows, string> = { split: "Varias filas", single: "Una fila" };
const STYLE_OPTIONS: { value: GraphStyle; label: string }[] = [
  { value: "cards", label: "Tarjetas" },
  { value: "map", label: "Mapa" },
];

/** JSON that is safe inside a <script> element: nothing in it can close the element or open a comment. */
const scriptJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/<\/(script)/gi, "<\\/$1")
    .replace(/<!--/g, "\\u003c!--");

/**
 * A single self-contained HTML page that shows the plan's graph, read-only: light and dark
 * drawings to switch between, cards or the map, the same hover focus as the app, and the animated
 * chain of a course on click. `style` is the one it starts on. It needs no server and loads nothing from outside. Course names reach the page only
 * through escaped SVG, `escape` and `textContent`.
 */
export function buildInteractiveHtml(
  plan: StudyPlan,
  curriculum: readonly Course[],
  rows: GraphRows,
  style: GraphStyle = "cards",
  generated = new Date(),
): string {
  // Every combination is drawn up front: the page has no code to lay out a graph.
  const drawn = DRAWINGS.flatMap((mode) =>
    THEMES.map((theme) => ({
      mode,
      theme,
      graph:
        mode === "tall"
          ? buildGraph(plan, curriculum, { layout: "tall", theme })
          : buildGraph(plan, curriculum, { rows: mode, theme }),
    })),
  );
  const maps = THEMES.map((theme) => ({
    theme,
    graph: buildGraph(plan, curriculum, { style: "map", theme }),
  }));
  const mapWidth = maps[0]!.graph.width;
  const width = drawn[0]!.graph.width;
  const tallWidth = drawn.find((entry) => entry.mode === "tall")!.graph.width;
  const name = escape(plan.name);
  const date = generated.toLocaleDateString("es-AR");
  return [
    "<!doctype html>",
    '<html lang="es">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${name} · Planificador UNRN</title>`,
    `<script>${PICK_THEME}</script>`,
    `<style>${STYLES}@media (min-width:768px){#board{min-width:${width}px;max-width:${Math.round(width * 1.5)}px}}@media (max-width:767px){#board{max-width:${Math.round(tallWidth * 1.5)}px}}body[data-style=map] #board{min-width:${mapWidth}px;max-width:${Math.round(mapWidth * 1.5)}px}body[data-style=map] .rows{display:none}</style>`,
    "</head>",
    `<body data-rows="${rows}" data-style="${style}">`,
    "<header>",
    MARK,
    `<div class="brand"><strong>${name}</strong><span>Planificador de cursada UNRN · vista de solo lectura · ${date}</span></div>`,
    `<button type="button" class="theme" id="theme">${SUN}${MOON}<span class="to-light">Modo claro</span><span class="to-dark">Modo oscuro</span></button>`,
    "</header>",
    "<main>",
    '<div class="bar"><p class="hint"><span class="mouse">Pasá el cursor sobre una materia para ver sus correlativas, o hacé click para verla aparte con las que tiene a un paso.</span><span class="touch">Tocá una materia para verla aparte con las que tiene a un paso.</span></p>',
    `<div class="styles" role="group" aria-label="Estilo del gráfico">${STYLE_OPTIONS.map(
      ({ value, label }) => `<button type="button" data-style="${value}">${label}</button>`,
    ).join("")}</div>`,
    `<div class="rows" role="group" aria-label="Correlativas a distancia">${MODES.map(
      (mode) => `<button type="button" data-rows="${mode}">${ROW_LABELS[mode]}</button>`,
    ).join("")}</div></div>`,
    '<div class="frame"><div id="board"></div></div>',
    "<noscript><p>Esta página necesita JavaScript para mostrar el gráfico.</p></noscript>",
    "</main>",
    ...drawn.map(
      ({ mode, theme, graph }) => `<template id="svg-${mode}-${theme}">${graph.svg}</template>`,
    ),
    ...maps.map(({ theme, graph }) => `<template id="svg-map-${theme}">${graph.svg}</template>`),
    `<script type="application/json" id="lineages">${scriptJson(lineagesOf(plan, curriculum, "wide"))}</script>`,
    `<script type="application/json" id="lineages-tall">${scriptJson(lineagesOf(plan, curriculum, "tall"))}</script>`,
    `<script type="application/json" id="lineages-map">${scriptJson(lineagesOf(plan, curriculum, "wide", "map"))}</script>`,
    `<script>${SCRIPT}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

/** Saves the interactive page as `<baseName>.html`. */
export function exportInteractive(
  plan: StudyPlan,
  curriculum: readonly Course[],
  rows: GraphRows,
  style: GraphStyle,
  baseName: string,
) {
  downloadBlob(
    `${baseName}.html`,
    new Blob([buildInteractiveHtml(plan, curriculum, rows, style)], { type: "text/html" }),
  );
}
