/* The causal diagram of the first tab, ported from schema_exploration.py and
   schema_interactif.html: causes below the central variable, consequences
   above, feedback on the right, other links on the left; draggable boxes,
   pan by dragging the background, zoom by buttons only (the wheel scrolls the
   page), and the "Inspect a link" panel with source, strength and limitations. */
import { E, esc } from './commun.js';

const NS = 'http://www.w3.org/2000/svg';
const POS = '#28745c', NEG = '#a34242', ENCRE = '#104b3b';

export function dessinerSchema(zone, { m, rang, aretes, centre, posInit, boucle, T }) {
  const lang = m.lang;
  const labels = { ...T.schema };
  const edges = aretes.map(e => ({ ...e, evidence: E.decrire(e, lang, E.correlation(m, e.de, e.vers), T.prov) }));
  const ids = [...posInit.keys()];
  const { pos, groups } = E.causalLayout(ids, edges, centre);
  const data = {
    nodes: ids.map(n => ({ id: n, label: m.noms[n] ?? n, x: pos.get(n)[0], y: pos.get(n)[1], rank: rang.has(n) ? rang.get(n) : 9, central: n === centre })),
    edges, loop: boucle, groups,
  };

  const racine = document.createElement('div');
  racine.className = 'sc';
  racine.innerHTML = `<div class="sc-tete"><small></small>
    <button type="button" class="sc-b" data-z="in" aria-label="Zoom +">+</button>
    <button type="button" class="sc-b" data-z="out" aria-label="Zoom −">−</button>
    <button type="button" class="sc-b" data-z="reset"></button></div>
    <svg class="sc-svg" role="img" aria-label="${esc(lang === 'fr' ? 'Schéma causal interactif' : 'Interactive causal diagram')}" font-family="Inter,system-ui,sans-serif">
    <defs><marker id="sc-pos" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,1 L9,5 L0,9Z" fill="${POS}"/></marker>
    <marker id="sc-neg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,1 L9,5 L0,9Z" fill="${NEG}"/></marker></defs>
    <rect class="sc-fond" x="-100000" y="-100000" width="200000" height="200000" fill="#fff"/>
    <g class="sc-edges"></g><g class="sc-nodes"></g><g class="sc-cycle"></g></svg>
    <section class="sc-panel"><p></p><label class="sc-choix"><span></span> <select></select></label><div class="sc-det" aria-live="polite"></div></section>`;
  zone.append(racine);
  const $ = s => racine.querySelector(s);
  const svg = $('svg');
  $('small').textContent = labels.legend;
  $('[data-z=reset]').textContent = labels.reset;

  // ---- the "Inspect a link" panel
  $('.sc-panel p').textContent = labels.intro;
  $('.sc-choix span').textContent = labels.select;
  const select = $('.sc-panel select'), details = $('.sc-det');
  const nomDe = id => data.nodes.find(n => n.id === id)?.label || id;
  data.edges.forEach((e, i) => { const o = document.createElement('option'); o.value = i; o.textContent = nomDe(e.de) + ' → ' + nomDe(e.vers); select.append(o); });
  function inspect(i) {
    const e = data.edges[i]; if (!e) return;
    select.value = i; details.replaceChildren(); const d = e.evidence || {};
    const row = (label, text) => {
      if (!text) return;
      const p = document.createElement('p'); const b = document.createElement('strong');
      b.textContent = label + ' — '; p.append(b, document.createTextNode(text)); details.append(p);
    };
    row(d.origin, d.geography || '');
    const cl = d.strength != null ? E.classeDe(d.strength) : null;
    row(labels.strength, (cl ? (lang === 'en' ? cl.en : cl.fr) + (lang === 'en' ? ` (class ${cl.k} of 5)` : ` (classe ${cl.k} sur 5)`) : '—') + ' · ' + labels.chosen);
    row(d.association_label, d.association ? 'ρ = ' + d.association.rho.toFixed(2) + ' · n = ' + d.association.n : labels.caution);
    if (d.association) row('', labels.caution);
    row(labels.detail, d.finding); row(labels.limits, d.limits);
    const a = document.createElement(d.url ? 'a' : 'span');
    a.textContent = d.citation || labels.no_source;
    if (d.url) { a.href = d.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    details.append(a);
  }
  select.onchange = () => inspect(Number(select.value));
  inspect(0);

  // ---- drawing
  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.appendChild(e); return e; };
  const headings = el('g', {}, svg);
  for (const [kind, gids] of Object.entries(data.groups)) {
    if (!gids.length) continue;
    const ns = data.nodes.filter(n => gids.includes(n.id));
    const x = ns.reduce((s, n) => s + n.x, 0) / ns.length, y = Math.min(...ns.map(n => n.y)) - 65;
    el('text', { x, y, 'text-anchor': 'middle', 'font-size': 13, fill: '#65766e' }, headings).textContent = labels[kind];
  }
  const nodes = new Map(), cycle = data.loop?.noeuds || [];
  const pairs = new Set(cycle.map((n, i) => n + '|' + cycle[(i + 1) % cycle.length]));
  for (const n of data.nodes) {
    n.initial = [n.x, n.y];
    const lines = [''];
    for (const w of n.label.split(/\s+/)) { const i = lines.length - 1; if ((lines[i] + ' ' + w).trim().length > 20 && lines[i]) lines.push(w); else lines[i] = (lines[i] + ' ' + w).trim(); }
    n.h = 16 + 14 * lines.length; n.w = 152;
    n.g = el('g', { class: 'node', tabindex: 0, role: 'button', 'aria-label': n.label, 'data-node': n.id, opacity: !cycle.length || cycle.includes(n.id) ? 1 : .3 }, $('.sc-nodes'));
    el('title', {}, n.g).textContent = n.label;
    el('rect', { x: -76, y: -n.h / 2, width: 152, height: n.h, rx: 9, fill: n.central ? ENCRE : n.rank === 1 ? '#eef3f0' : '#f4f6f9', stroke: '#dbe3ec' }, n.g);
    lines.forEach((line, i) => { el('text', { x: 0, y: -n.h / 2 + 16 + i * 14, 'text-anchor': 'middle', fill: n.central ? 'white' : ENCRE, 'font-size': 11, 'font-weight': n.central ? 700 : 400 }, n.g).textContent = line; });
    nodes.set(n.id, n);
    n.g.addEventListener('keydown', e => { const d = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key]; if (d) { e.preventDefault(); n.x += d[0]; n.y += d[1]; draw(); } });
  }
  const links = data.edges.filter(e => nodes.has(e.de) && nodes.has(e.vers)).map(e => {
    const color = e.signe > 0 ? POS : NEG, active = pairs.has(e.de + '|' + e.vers);
    const g = el('g', { opacity: !cycle.length || active ? 1 : .16, class: 'sc-lien' }, $('.sc-edges'));
    return { ...e, path: el('path', { fill: 'none', stroke: color, 'stroke-width': active ? 2.6 : 1.3, 'marker-end': e.signe > 0 ? 'url(#sc-pos)' : 'url(#sc-neg)' }, g),
      hit: el('path', { fill: 'none', stroke: 'transparent', 'stroke-width': 10 }, g),
      sign: el('text', { 'text-anchor': 'middle', 'font-size': 13, fill: color }, g) };
  });
  let badge;
  if (cycle.length) {
    badge = el('g', {}, $('.sc-cycle'));
    el('circle', { r: 15, fill: 'white', stroke: '#28745c' }, badge);
    el('text', { y: 5, 'text-anchor': 'middle', 'font-weight': 700 }, badge).textContent = data.loop.type === 'renforcante' ? 'R' : 'B';
  }
  const border = (n, cx, cy) => { const dx = cx - n.x, dy = cy - n.y, t = 1 / Math.max(Math.abs(dx) / (n.w / 2 + 2), Math.abs(dy) / (n.h / 2 + 2), .0001); return [n.x + dx * t, n.y + dy * t]; };
  function draw() {
    for (const n of nodes.values()) n.g.setAttribute('transform', `translate(${n.x},${n.y})`);
    for (const e of links) {
      const a = nodes.get(e.de), b = nodes.get(e.vers), dx = b.x - a.x, dy = b.y - a.y;
      const cx = (a.x + b.x) / 2 - dy * .09, cy = (a.y + b.y) / 2 + dx * .09;
      const [x1, y1] = border(a, cx, cy), [x2, y2] = border(b, cx, cy);
      const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
      e.path.setAttribute('d', d); e.hit.setAttribute('d', d);
      e.sign.setAttribute('x', .25 * x1 + .5 * cx + .25 * x2); e.sign.setAttribute('y', .25 * y1 + .5 * cy + .25 * y2 - 5);
      e.sign.textContent = (e.signe > 0 ? '+' : '−') + ' ' + (e.evidence?.code || 'H');
    }
    if (badge) { const ns = cycle.map(n => nodes.get(n)).filter(Boolean); badge.setAttribute('transform', `translate(${ns.reduce((s, n) => s + n.x, 0) / ns.length},${ns.reduce((s, n) => s + n.y, 0) / ns.length})`); }
  }
  for (const e of links) {
    const i = data.edges.findIndex(a => a.de === e.de && a.vers === e.vers);
    for (const t of [e.hit, e.path, e.sign]) { t.style.cursor = 'pointer'; t.addEventListener('click', () => inspect(i)); }
    el('title', {}, e.hit).textContent = e.evidence?.origin || labels.theory;
  }
  let view;
  const apply = () => svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
  function reset() {
    for (const n of nodes.values()) [n.x, n.y] = n.initial;
    const ns = [...nodes.values()], x = Math.min(...ns.map(n => n.x - 95)), y = Math.min(...ns.map(n => n.y - n.h / 2 - 65));
    view = { x, y, w: Math.max(...ns.map(n => n.x + 95)) - x, h: Math.max(...ns.map(n => n.y + n.h / 2 + 25)) - y };
    apply(); draw();
  }
  const point = e => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  function zoom(f, p = { x: view.x + view.w / 2, y: view.y + view.h / 2 }) {
    if (view.w * f < 150 || view.w * f > 10000) return;
    view.x = p.x + (view.x - p.x) * f; view.y = p.y + (view.y - p.y) * f; view.w *= f; view.h *= f; apply();
  }
  let drag = null;
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    if (e.target.closest('.sc-lien')) return;   // a click on an arrow inspects it
    const n = nodes.get(e.target.closest('.node')?.dataset.node);
    drag = { id: e.pointerId, n, p: point(e) }; svg.setPointerCapture(e.pointerId); e.preventDefault();
  });
  svg.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const p = point(e), dx = p.x - drag.p.x, dy = p.y - drag.p.y;
    if (drag.n) { drag.n.x += dx; drag.n.y += dy; drag.p = p; draw(); } else { view.x -= dx; view.y -= dy; apply(); }
  });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) svg.addEventListener(t, () => { drag = null; });
  // NO WHEEL ZOOM: on this site the wheel always scrolls the page.
  $('[data-z=in]').onclick = () => zoom(.8);
  $('[data-z=out]').onclick = () => zoom(1.25);
  $('[data-z=reset]').onclick = reset;
  reset();
  return { racine, svg };
}
