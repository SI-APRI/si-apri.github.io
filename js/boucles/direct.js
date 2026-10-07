// Tab 2 · Run the system live (systeme_direct.render): the diagram of the
// first tab, with the shock wave travelling along the arrows relay by relay.
// The page script of systeme_direct.GABARIT is ported almost line for line;
// the sub-graph it receives (systeme_direct._donnees) is computed by moteur.js.
import { charger, esc, barreExport, nettoyer, E } from './commun.js';

export default async function render(zone, apri) {
  const { m, s, T } = await charger(apri);
  nettoyer('direct');
  zone.innerHTML = '';
  const D = E.donneesDirect(m, s.centre, s.n);
  const r = document.createElement('div'); r.className = 'bcl';
  zone.append(r);
  if (!D.liens.length) { r.append(apri.h(`<div class="bcl-info">${esc(T('sd_court'))}</div>`)); return; }
  const VIRG = m.lang === 'fr' ? ',' : '.';
  const L = {
    lire: T('sd_lire'), pause: T('sd_pause'), fin: T('sd_fin'), ret: T('sd_retour'), nm: T('sd_non_mesure'),
    dis: T('sd_distrib'), mois: T('sd_mois'), ans: T('sd_ans'), liens: T('sd_liens_n'), vagues: T('sd_vagues_n'),
    con: T('sd_connect'), pas: T('sd_passages'), bcl_r: T('sd_bcl_r'), bcl_b: T('sd_bcl_b'), bcl_vide: T('sd_bcl_vide'),
    basc: T('sd_basc'), basc_r: T('sd_basc_r'), basc_b: T('sd_basc_b'), moins: T('sd_moins'), plus: T('sd_plus'),
    ess: T('sd_ess'), ess_non: T('sd_ess_non'), ess_t: T('sd_ess_t'),
  };
  const e_ = k => esc(T(k));
  const racine = apri.h(`<div class="sd">
<div class="sd-barre">
  <div class="sd-ch"><label>${e_('sd_var')}</label><select data-id="src"></select></div>
  <div class="sd-ch"><label>${e_('sd_ampleur')} · <span data-id="ampv">+1,0</span></label>
    <input data-id="amp" type="range" min="-10" max="10" step="0.5" value="1"></div>
  <button type="button" data-id="lire" class="p">${e_('sd_lire')}</button>
  <button type="button" data-id="pas">${e_('sd_pas')}</button>
  <button type="button" data-id="raz">${e_('sd_raz')}</button>
  <button type="button" data-id="ess" hidden>${e_('sd_ess')}</button>
  <div class="sd-ch"><label>${e_('sd_vitesse')}</label>
    <select data-id="vit"><option value="1.7">0${VIRG}5×</option><option value="1" selected>1×</option>
      <option value="0.55">2×</option><option value="0.3">4×</option></select></div>
  <div class="sd-ch"><label>${e_('sd_nb')}</label>
    <select data-id="nv"><option value="0" selected>${e_('sd_nb_auto')}</option><option value="3">3</option>
      <option value="5">5</option><option value="10">10</option><option value="20">20</option><option value="40">40</option></select></div>
  <div class="sd-ch"><label>${e_('sd_delai')}</label>
    <select data-id="dl" title="${e_('sd_temps_x')}"><option value="0" selected>${e_('sd_delai_non')}</option>
      <option value="1">1 ${e_('sd_mois')}</option><option value="3">3 ${e_('sd_mois')}</option>
      <option value="6">6 ${e_('sd_mois')}</option><option value="12">12 ${e_('sd_mois')}</option></select></div>
  <div class="sd-compteur"><div class="sd-kl">${e_('sd_vague')}</div>
    <div data-id="kv" class="sd-kv">0</div><div data-id="kd" class="sd-kd">0 % ${e_('sd_distrib')}</div>
    <div data-id="kt" class="sd-kt"></div></div>
</div>
<div class="sd-aire">
  <div class="sd-scene"><svg data-id="g" preserveAspectRatio="xMidYMid meet" font-family="Inter,system-ui,sans-serif"></svg></div>
  <aside class="sd-regl"><div class="sd-rh">${e_('sd_regl')}</div><div data-id="rl"></div>
    <div class="sd-rx">${e_('sd_regl_x')}</div></aside>
</div>
<div data-id="mot" class="sd-mot"></div>
<div data-id="bascule" class="sd-bascule" hidden></div>
<div data-id="fin" class="sd-fin" hidden>
  <div class="sd-fb"><div class="sd-fh" data-id="hc">${e_('sd_connect')}</div><div data-id="fc"></div><div class="sd-fx">${e_('sd_connect_x')}</div></div>
  <div class="sd-fb"><div class="sd-fh" data-id="hp">${e_('sd_passages')}</div><div data-id="fp"></div><div class="sd-fx">${e_('sd_passages_x')}</div></div>
  <div class="sd-fb"><div class="sd-fh">${e_('sd_mul')}</div><div data-id="fm"></div><div class="sd-fx">${e_('sd_mul_x')}</div></div>
  <div class="sd-fb"><div class="sd-fh">${e_('sd_bcl')}</div><div data-id="fb"></div><div class="sd-fx">${e_('sd_bcl_x')}</div></div>
  <div class="sd-fb"><div class="sd-fh">${e_('sd_vag_t')}</div><div data-id="fvg"></div><div class="sd-fx">${e_('sd_vag_x')}</div></div>
</div>
<div class="sd-bas">
  <span class="sd-lg"><span class="sd-pt" style="background:#1a8a4f"></span> ${e_('sd_leg_h')}</span>
  <span class="sd-lg"><span class="sd-pt" style="background:#c33a24"></span> ${e_('sd_leg_b')}</span>
  <span class="sd-lg"><span style="display:inline-block;width:26px;height:5px;border-radius:3px;background:#cfe0d6"></span> ${e_('sd_leg_e')}</span>
  <span class="sd-lg" data-id="lgj" hidden><span class="sd-pt sd-lum" style="background:#f0b73f"></span> ${e_('sd_leg_j')}</span>
  <span class="sd-lg"><span class="sd-pt sd-cli" style="background:#2a6b3f"></span> ${e_('sd_leg_c')}</span>
</div></div>`);
  r.append(racine);
  // the scene keeps the proportions of the drawn perimeter
  racine.querySelector('.sd-scene').style.aspectRatio = `${D.vb[2]} / ${D.vb[3]}`;
  const $ = id => racine.querySelector(`[data-id="${id}"]`);
  const vivant = () => racine.isConnected;
  const minuteries = new Set();
  const plusTard = (f, ms) => { const t = setTimeout(() => { minuteries.delete(t); if (vivant()) f(); }, ms); minuteries.add(t); };
  const rAF = f => requestAnimationFrame(t => { if (vivant()) f(t); });

  // ================================================================ GABARIT script
  const NO = D.noeuds, LI = D.liens;
  const IX = {}; NO.forEach((n, i) => { IX[n.id] = i; });
  const SEUIL = 0.002, KMAX = 80;
  const VERT = '#1a8a4f', ROUGE = '#c33a24', APRI = '#2a6b3f';
  function bords(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    const rx = 40 / d, ry = 22 / d;
    const x1 = a.x + dx * rx, y1 = a.y + dy * ry, x2 = b.x - dx * rx, y2 = b.y - dy * ry;
    return { x1, y1, x2, y2, mx: (x1 + x2) / 2 - dy * 0.09, my: (y1 + y2) / 2 + dx * 0.09 };
  }
  const NS = 'http://www.w3.org/2000/svg';
  function el(n, at) { const e = document.createElementNS(NS, n); for (const k in at) e.setAttribute(k, at[k]); return e; }

  const svg = $('g');
  svg.setAttribute('viewBox', D.vb.join(' '));
  const defs = el('defs');
  for (const [id, c] of [['sd-fv', VERT], ['sd-fr', ROUGE]]) {
    const mk = el('marker', { id, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '5', markerHeight: '5', orient: 'auto-start-reverse' });
    mk.appendChild(el('path', { d: 'M0,1 L9,5 L0,9 z', fill: c })); defs.appendChild(mk);
  }
  svg.appendChild(defs);
  const gLiens = el('g'), gBilles = el('g'), gNoeuds = el('g');
  gLiens.setAttribute('class', 'sd-gl');
  svg.appendChild(gLiens); svg.appendChild(gNoeuds); svg.appendChild(gBilles);
  const ttl = el('text', { x: D.vb[0] + 52, y: D.vb[1] + 34, 'font-size': '12', 'font-weight': '700', 'letter-spacing': '1.4', fill: '#6b7590', opacity: '0' });
  ttl.textContent = (L.ess_t || '').toUpperCase();
  svg.appendChild(ttl);

  const VB_PLEIN = D.vb.slice();
  let vbAnim = null;
  function cadrer(cible, ms) {
    const dep = (svg.getAttribute('viewBox') || VB_PLEIN.join(' ')).trim().split(/\s+/).map(Number);
    if (vbAnim) cancelAnimationFrame(vbAnim);
    const t0 = performance.now();
    const pas = t => {
      const u = Math.min(1, (t - t0) / ms);
      const e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
      svg.setAttribute('viewBox', dep.map((v, i) => (v + (cible[i] - v) * e).toFixed(2)).join(' '));
      if (u < 1) vbAnim = rAF(pas);
    };
    pas(t0);
  }

  const traits = LI.map(l => {
    const a = NO[IX[l.de]], b = NO[IX[l.vers]], g = bords(a, b);
    const p = el('path', { d: `M${g.x1},${g.y1} Q${g.mx},${g.my} ${g.x2},${g.y2}`, fill: 'none', stroke: l.sg > 0 ? VERT : ROUGE,
      'stroke-width': '1.5', opacity: '0.34', 'marker-end': `url(#${l.sg > 0 ? 'sd-fv' : 'sd-fr'})` });
    gLiens.appendChild(p);
    const t = el('text', { x: g.mx, y: g.my, 'font-size': '12', 'font-weight': '700', fill: l.sg > 0 ? VERT : ROUGE, opacity: '0.34', 'text-anchor': 'middle' });
    t.textContent = l.sg > 0 ? '+' : '−';
    gLiens.appendChild(t);
    return p;
  });

  const vues = NO.map(n => {
    const h = 15 + 13 * n.lig.length + 19;
    const g = el('g', { class: 'sd-nd' });
    const rc = el('rect', { x: n.x - 76, y: n.y - h / 2, width: 152, height: h, rx: 9, fill: n.c ? APRI : (n.r === 1 ? '#eef3f0' : '#f6f8fb'), stroke: n.c ? APRI : '#dbe3ec', 'stroke-width': '1' });
    g.appendChild(rc);
    const an = el('rect', { x: n.x - 79, y: n.y - h / 2 - 3, width: 158, height: h + 6, rx: 11, fill: 'none', stroke: '#2a6b3f', 'stroke-width': '2.4', opacity: '0' });
    const y0 = n.y - h / 2 + 14;
    n.lig.forEach((t, i) => {
      const e = el('text', { x: n.x, y: y0 + i * 13, 'font-size': '10.5', 'text-anchor': 'middle', fill: n.c ? '#fff' : '#101728', 'font-weight': n.c ? 700 : 400 });
      e.textContent = t; g.appendChild(e);
    });
    const yb = n.y - h / 2 + 15 + 13 * n.lig.length;
    const jf = el('rect', { x: n.x - 56, y: yb, width: 112, height: 5, rx: 2.5, fill: n.c ? 'rgba(255,255,255,.28)' : '#e6ebf2' });
    const jv = el('rect', { x: n.x - 56, y: yb, width: 0, height: 5, rx: 2.5, fill: n.c ? '#cfe8d8' : '#b9d3c2' });
    g.appendChild(jf); g.appendChild(jv);
    const val = el('text', { x: n.x, y: yb + 15, 'font-size': '10.5', 'text-anchor': 'middle', 'font-weight': '700', fill: n.c ? '#fff' : '#3c4761' });
    g.appendChild(val);
    const dt = el('text', { x: n.x + 88, y: n.y + 4, 'font-size': '11.5', 'text-anchor': 'start', fill: '#3c4761', opacity: '0', class: 'sd-det' });
    g.appendChild(dt);
    g.appendChild(an);
    gNoeuds.appendChild(g);
    return { n, rect: rc, jauge: jv, val, anneau: an, det: dt, grp: g, h, yb };
  });

  function poserHalo(on) {
    const cles = new Set(on ? amont.slice(0, 3).map(x => x.i) : []);
    vues.forEach((u, i) => { u.rect.classList.toggle('sd-lum', cles.has(i)); });
    $('lgj').hidden = !cles.size;
  }

  function influenceVers(cible) {
    const j0 = IX[cible]; const out = [];
    for (let j = 0; j < NO.length; j++) {
      if (j === j0) continue;
      let v = new Float64Array(NO.length); const c = new Float64Array(NO.length);
      v[j] = 1;
      for (let t = 0; t < KMAX; t++) {
        const nx = new Float64Array(NO.length); let bouge = 0;
        for (const l of LI) nx[IX[l.vers]] += l.w * v[IX[l.de]];
        for (let q = 0; q < NO.length; q++) { c[q] += nx[q]; bouge += Math.abs(nx[q]); }
        v = nx;
        if (bouge < SEUIL) break;
      }
      let p = 0;
      for (let q = 0; q < NO.length; q++) if (q !== j) p += Math.abs(c[q]);
      out.push({ n: NO[j], i: j, v: c[j0], p });
    }
    return out;
  }
  const classeVers = t => t.filter(x => Math.abs(x.v) > 0.004).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  const classeSysteme = t => t.filter(x => x.p > 0.004).sort((a, b) => b.p - a.p);

  let regroupe = false, amont = [];
  function _elus() {
    const j0 = IX[src];
    const av = NO.map((n, i) => ({ i, v: Math.abs(cum[i]) })).filter(x => x.i !== j0 && x.v > 0.004)
      .sort((a, b) => b.v - a.v).slice(0, 3).map(x => x.i);
    const am = amont.slice(0, 3).map(x => x.i);
    const vus = new Set(), out = [];
    for (const i of [...am, ...av]) if (!vus.has(i)) { vus.add(i); out.push(i); }
    return out;
  }
  function rassembler(on) {
    regroupe = !!on;
    const elus = on ? _elus() : [];
    const dedans = new Set(elus);
    const x0 = D.vb[0], y0 = D.vb[1], h = D.vb[3];
    const pas = 74, haut = Math.max(1, elus.length) * pas;
    const depart = y0 + Math.max(30, (h - haut) / 2);
    vues.forEach((u, i) => {
      const g = u.grp;
      if (!on) { g.style.transform = ''; g.style.opacity = ''; u.det.setAttribute('opacity', '0'); return; }
      if (!dedans.has(i)) { g.style.opacity = '0'; return; }
      const rg = elus.indexOf(i);
      const cx = x0 + 128, cy = depart + rg * pas + pas / 2;
      g.style.opacity = '1';
      g.style.transform = `translate(${(cx - u.n.x).toFixed(1)}px,${(cy - u.n.y).toFixed(1)}px)`;
      const e = cum[i];
      const vers = (amont.find(x => x.i === i) || {}).v;
      const bouts = [];
      if (vers !== undefined) bouts.push('→ ' + fmt(vers, 2));
      if (passages[i] > 0) bouts.push(passages[i] + ' ' + L.vagues);
      if (Math.abs(e) > 0.005) bouts.push(fmt(e, 2));
      u.det.textContent = bouts.join('  ·  ');
      u.det.setAttribute('opacity', '1');
    });
    gLiens.style.opacity = on ? '0' : '1';
    const CG = x0 + 34, CL = 470, MB = 26;
    ttl.setAttribute('opacity', on ? '1' : '0');
    ttl.setAttribute('x', on ? CG + 20 : D.vb[0] + 52);
    ttl.setAttribute('y', on ? depart - MB + 20 : D.vb[1] + 34);
    cadrer(on ? [CG, depart - MB, CL, haut + MB * 2] : VB_PLEIN, 420);
    $('ess').textContent = on ? L.ess_non : L.ess;
  }

  let src = D.centre, amp = 1, vitesse = 1, delai = 0, vmax = 0;
  let vague = new Float64Array(NO.length), cum = new Float64Array(NO.length);
  let total = 1, k = 0, joue = false, anim = null, retour = 0;
  let passages = new Int32Array(NO.length), soutien = new Float64Array(NO.length);
  let signePrec = new Int8Array(NO.length), bougePrec = 0, phase = 0;

  function totalAbsolu(depart, a) {
    let v = new Float64Array(NO.length); const c = new Float64Array(NO.length);
    v[IX[depart]] = a;
    for (let i = 0; i < 200; i++) {
      const nv = new Float64Array(NO.length);
      for (const l of LI) nv[IX[l.vers]] += l.w * v[IX[l.de]];
      let s2 = 0;
      for (let j = 0; j < NO.length; j++) { c[j] += nv[j]; s2 += Math.abs(nv[j]); }
      v = nv;
      if (s2 < 1e-9) break;
    }
    let t = 0; for (let j = 0; j < NO.length; j++) t += Math.abs(c[j]);
    return t;
  }
  function fmt(v, d) { const s2 = (v >= 0 && d ? '+' : '') + v.toFixed(d ? 2 : 1); return s2.replace('.', VIRG); }

  function niveauDe(i) { const n = NO[i], b = n.s === null ? 5 : n.s; return Math.max(0, Math.min(10, b + cum[i] + (n.id === src ? amp : 0))); }
  function regler(i, pas) {
    const avant = niveauDe(i), apres = Math.max(0, Math.min(10, avant + pas));
    const d = apres - avant;
    if (Math.abs(d) < 0.001) return;
    soutien[i] += d; cum[i] += d; vague[i] += d;
    if (regroupe) rassembler(false);
    majReglage(); peindre();
    if (!joue && !anim) demarrer();
  }
  function majReglage() {
    for (let i = 0; i < NO.length; i++) {
      const rr = racine.querySelector('[data-rr="' + i + '"]'); if (!rr) continue;
      const v = rr.querySelector('.sd-rv');
      v.textContent = NO[i].s === null && Math.abs(cum[i]) < SEUIL && Math.abs(soutien[i]) < 0.001 ? '—' : fmt(niveauDe(i), 0);
      const on = Math.abs(soutien[i]) > 0.001;
      rr.classList.toggle('on', on);
      v.style.color = on ? '#2a6b3f' : '#3c4761';
    }
  }
  function construireReglage() {
    const l = $('rl');
    l.innerHTML = NO.map((n, i) => `<div class="sd-rr" data-rr="${i}"><div class="sd-rn" title="${esc(n.nom)}">${esc(n.nom)}</div>
      <div class="sd-rv"></div><div class="sd-rb"><button type="button" data-i="${i}" data-p="-0.5" title="${esc(L.moins)}">−</button>
      <button type="button" data-i="${i}" data-p="0.5" title="${esc(L.plus)}">+</button></div></div>`).join('');
    l.querySelectorAll('button').forEach(b => { b.onclick = () => regler(+b.dataset.i, +b.dataset.p); });
    majReglage();
  }
  function horizon() {
    const e = $('kt');
    if (!delai || !k) { e.textContent = ''; return; }
    const mois = k * delai;
    e.textContent = mois < 24 ? '≈ ' + mois + ' ' + L.mois : '≈ ' + (mois / 12).toFixed(1).replace('.', VIRG) + ' ' + L.ans;
  }
  function peindre() {
    for (const u of vues) {
      const i = IX[u.n.id];
      const bouge = cum[i] + (u.n.id === src ? amp : 0);
      const base = u.n.s;
      if (base === null) { u.val.textContent = Math.abs(bouge) < SEUIL ? L.nm : fmt(bouge, 1); u.jauge.setAttribute('width', 0); }
      else {
        const v = Math.max(0, Math.min(10, base + bouge));
        u.jauge.setAttribute('width', 112 * v / 10);
        u.val.textContent = fmt(v, 0) + (Math.abs(bouge) < SEUIL ? '' : '  ' + fmt(bouge, 1));
      }
      const c = Math.abs(bouge) < SEUIL ? null : (bouge > 0 ? VERT : ROUGE);
      u.val.setAttribute('fill', c ? (u.n.c ? '#fff' : c) : (u.n.c ? '#fff' : '#3c4761'));
      u.jauge.setAttribute('fill', c ? c : (u.n.c ? '#cfe8d8' : '#b9d3c2'));
      u.rect.setAttribute('stroke', c && !u.n.c ? c : (u.n.c ? APRI : '#dbe3ec'));
      u.rect.setAttribute('stroke-width', c && !u.n.c ? 1.8 : 1);
    }
    let d = 0; for (let j = 0; j < NO.length; j++) d += Math.abs(cum[j]);
    $('kv').textContent = vmax ? (k + ' / ' + vmax) : k;
    $('kd').textContent = Math.round(100 * Math.min(1, total ? d / total : 0)) + ' % ' + L.dis;
    majReglage(); horizon();
  }
  function bilan(montrer) {
    const e = $('fin');
    if (!montrer || !k) {
      e.hidden = true; poserHalo(false);
      vues.forEach(u => { u.anneau.setAttribute('opacity', 0); u.anneau.classList.remove('sd-cli'); });
      return;
    }
    const nom = (NO[IX[src]] || {}).nom || '';
    const table = influenceVers(src);
    amont = classeVers(table).slice(0, 5);
    const aval = NO.map((n, i) => ({ n, i, v: cum[i] })).filter(x => x.n.id !== src && Math.abs(x.v) > 0.004)
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 5);
    poserHalo(true);
    const ligne = x => '<div class="sd-fl"><span>' + esc(x.n.nom) + '</span><b style="color:' + (x.v > 0 ? VERT : ROUGE) + '">' + fmt(x.v, 2) + '</b></div>';
    const lignen = (n, txt) => '<div class="sd-fl"><span>' + esc(n.nom) + '</span><b>' + txt + '</b></div>';
    const chef = new Set(aval.slice(0, 3).map(x => x.n.id));
    vues.forEach(u => { const on = chef.has(u.n.id); u.anneau.setAttribute('opacity', on ? 1 : 0); u.anneau.classList.toggle('sd-cli', on); });
    $('hc').textContent = L.con.replace('{v}', nom);
    $('hp').textContent = L.pas.replace('{v}', nom);
    $('fc').innerHTML = amont.map(ligne).join('');
    $('fp').innerHTML = aval.map(ligne).join('');
    const mul = classeSysteme(table).slice(0, 5);
    const mag = v => v.toFixed(2).replace('.', VIRG);
    $('fm').innerHTML = mul.map(x => lignen(x.n, mag(x.p))).join('');
    const bcl = NO.map((n, i) => ({ n, i, r: n.br || 0, b: n.bb || 0 })).filter(x => x.r + x.b > 0)
      .sort((a, b) => (b.r + b.b) - (a.r + a.b) || (b.r * b.b) - (a.r * a.b)).slice(0, 5);
    $('fb').innerHTML = bcl.length ? bcl.map(x => lignen(x.n, x.r + ' ' + L.bcl_r + ' · ' + x.b + ' ' + L.bcl_b)).join('')
      : '<div class="sd-fl"><span>' + esc(L.bcl_vide) + '</span><b></b></div>';
    const vg = NO.map((n, i) => ({ n, i, p: passages[i] })).filter(x => x.n.id !== src && x.p > 0).sort((a, b) => b.p - a.p).slice(0, 5);
    $('fvg').innerHTML = vg.map(x => lignen(x.n, x.p + ' ' + L.vagues)).join('');
    e.hidden = false;
  }
  function remise() {
    arret();
    k = 0; retour = 0;
    cum = new Float64Array(NO.length); vague = new Float64Array(NO.length);
    passages = new Int32Array(NO.length); soutien = new Float64Array(NO.length);
    signePrec = new Int8Array(NO.length); bougePrec = 0; phase = 0;
    const eb = $('bascule'); eb.hidden = true; eb.textContent = '';
    vague[IX[src]] = amp;
    total = totalAbsolu(src, amp) || 1;
    gBilles.innerHTML = '';
    traits.forEach(p => { p.setAttribute('opacity', .34); p.setAttribute('stroke-width', 1.5); });
    $('mot').textContent = '';
    rassembler(false);
    $('ess').hidden = true;
    bilan(false);
    peindre();
  }
  function vaguesuivante(apres) {
    const flux = LI.map(l => l.w * vague[IX[l.de]]);
    const suivante = new Float64Array(NO.length);
    LI.forEach((l, i) => { suivante[IX[l.vers]] += flux[i]; });
    let bouge = 0;
    for (let j = 0; j < NO.length; j++) bouge += Math.abs(suivante[j]);
    if (bouge < SEUIL) { $('mot').textContent = L.fin; arret(); fini(); if (apres) apres(false); return; }
    k += 1;
    for (let j = 0; j < NO.length; j++) if (Math.abs(suivante[j]) > SEUIL) passages[j] += 1;
    const bascules = [];
    for (let j = 0; j < NO.length; j++) {
      const sg = Math.abs(suivante[j]) > 0.008 ? (suivante[j] > 0 ? 1 : -1) : 0;
      if (sg && signePrec[j] && sg !== signePrec[j]) bascules.push(NO[j].nom);
      if (sg) signePrec[j] = sg;
    }
    let msg = '';
    if (k >= 2 && bougePrec > SEUIL) {
      if (bouge > bougePrec * 1.02 && phase !== 1) { phase = 1; msg = L.basc_r.replace('{k}', k); }
      else if (bouge < bougePrec * 0.98 && phase !== -1) { phase = -1; msg = L.basc_b.replace('{k}', k); }
    }
    bougePrec = bouge;
    if (bascules.length) msg = (msg ? msg + ' ' : '') + L.basc.replace('{k}', k).replace('{v}', bascules.slice(0, 4).join(', '));
    const eb = $('bascule');
    if (msg) { eb.hidden = false; eb.textContent = msg; }
    const duree = 950 * vitesse, part = 0.82;
    const actifs = [];
    LI.forEach((l, i) => {
      if (Math.abs(flux[i]) < SEUIL / 3) return;
      const p = traits[i];
      p.setAttribute('opacity', 1);
      p.setAttribute('stroke-width', 1.5 + 3.2 * Math.min(1, Math.abs(flux[i]) / 1.2));
      const b = el('circle', { r: 3.2 + 4.4 * Math.min(1, Math.abs(flux[i]) / 1.2), fill: flux[i] > 0 ? VERT : ROUGE, opacity: '0.95' });
      gBilles.appendChild(b);
      actifs.push({ i, p, b, l: p.getTotalLength() });
    });
    const t0 = performance.now();
    const avant = cum.slice();
    function pas(t) {
      const u = Math.min(1, (t - t0) / duree);
      const uv = Math.min(1, u / part);
      for (const a of actifs) {
        const pt = a.p.getPointAtLength(a.l * uv);
        a.b.setAttribute('cx', pt.x); a.b.setAttribute('cy', pt.y);
        a.b.setAttribute('opacity', uv > 0.97 ? 0 : 0.95);
      }
      const ua = u <= part ? 0 : (u - part) / (1 - part);
      for (let j = 0; j < NO.length; j++) cum[j] = avant[j] + suivante[j] * ua;
      peindre();
      if (u < 1) { anim = rAF(pas); return; }
      gBilles.innerHTML = '';
      traits.forEach(p => { p.setAttribute('opacity', .34); p.setAttribute('stroke-width', 1.5); });
      if (!retour && k >= 2 && Math.abs(suivante[IX[src]]) > SEUIL) { retour = k; $('mot').textContent = L.ret.replace('{k}', k); }
      vague = suivante;
      anim = null;
      if (apres) apres(true);
    }
    anim = rAF(pas);
  }
  function fini() {
    bilan(true);
    $('ess').hidden = false;
    plusTard(() => { if (!regroupe && !joue) rassembler(true); }, 900);
  }
  function arret() {
    joue = false;
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    $('lire').textContent = L.lire; $('lire').classList.add('p');
  }
  function boucler(ok) {
    if (!joue) return;
    if (!ok || k >= KMAX || (vmax && k >= vmax)) { arret(); fini(); return; }
    plusTard(() => { if (joue) vaguesuivante(boucler); }, 120 * vitesse);
  }

  const sel = $('src');
  NO.slice().sort((a, b) => a.nom.localeCompare(b.nom)).forEach(n => {
    const o = document.createElement('option'); o.value = n.id; o.textContent = n.nom; sel.appendChild(o);
  });
  sel.value = src;
  sel.onchange = () => { src = sel.value; remise(); };
  const ia = $('amp');
  ia.oninput = () => { amp = parseFloat(ia.value) || 0; $('ampv').textContent = fmt(amp, 1); remise(); };
  $('vit').onchange = e => { vitesse = parseFloat(e.target.value); };
  $('nv').onchange = e => { vmax = parseInt(e.target.value, 10) || 0; peindre(); };
  $('dl').onchange = e => { delai = parseFloat(e.target.value) || 0; horizon(); };
  $('raz').onclick = remise;
  $('ess').onclick = () => { rassembler(!regroupe); };
  $('pas').onclick = () => { if (regroupe) rassembler(false); arret(); bilan(false); vaguesuivante(() => bilan(true)); };
  function demarrer() {
    if (anim || joue) return;
    if (regroupe) rassembler(false);
    joue = true;
    $('lire').textContent = L.pause; $('lire').classList.remove('p');
    vaguesuivante(boucler);
  }
  $('lire').onclick = () => { if (joue) { arret(); return; } demarrer(); };
  $('ampv').textContent = fmt(amp, 1);
  construireReglage();
  remise();

  nettoyer('direct', () => { joue = false; if (anim) cancelAnimationFrame(anim); if (vbAnim) cancelAnimationFrame(vbAnim); minuteries.forEach(clearTimeout); });
  barreExport(apri, racine, svg);
  r.append(apri.h(`<p class="sx-caption">${esc(T('sd_perim'))}</p>`));
}
