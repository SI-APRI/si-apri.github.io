// Tab 3 · Set the values and run (systeme_page.render(entete=False)): the 48
// variables at their measured level; hold any of them and the gap propagates,
// écart_{t+1} = écart_0 + A · écart_t, round by round until it settles.
import { charger, esc, nettoyer, E } from './commun.js';

export default async function render(el, apri) {
  const { m, T } = await charger(apri);
  nettoyer('regler');
  el.innerHTML = '';
  const D = E.donneesRegler(m);
  const CD = (await apri.donnees('data/boucles/modele.json')).couleurs_dim;
  const VIRG = m.lang === 'fr' ? ',' : '.';
  const L = { lire: T('sy_lire'), pause: T('sy_pause'), stable: T('sy_stable'), repos: T('sy_repos'), non_mesure: T('sy_non_mesure'),
    moy: T('sy_moyenne'), bilan: T('sy_bilan'), bilan0: T('sy_bilan_0'), moins: T('sy_moins'), plus: T('sy_plus') };
  const e_ = k => esc(T(k));
  const r = document.createElement('div'); r.className = 'bcl';
  el.append(r);
  r.innerHTML = `<div class="sy-intro">${T('sy_intro')}</div>
<div class="sy">
<div class="sy-barre">
  <button type="button" class="sy-bt p" data-id="play" disabled>${e_('sy_lire')}</button>
  <button type="button" class="sy-bt" data-id="pas" disabled>${e_('sy_pas')}</button>
  <button type="button" class="sy-bt" data-id="zero">${e_('sy_zero')}</button>
  <div data-id="amorce" class="sy-amorce">${e_('sy_amorce')}</div>
  <div class="sy-cpt">
    <div><b data-id="kk">0</b><span>${e_('sy_tour')}</span></div>
    <div><b data-id="nt">0</b><span>${e_('sy_tenues')}</span></div>
    <div><b data-id="nh" style="color:#1a8a4f">0</b><span>${e_('sy_monte')}</span></div>
    <div><b data-id="nb" style="color:#c33a24">0</b><span>${e_('sy_baisse')}</span></div>
    <div><b data-id="mo">—</b><span data-id="mos">${e_('sy_moyenne')}</span></div>
  </div>
</div>
<div class="sy-cols" data-id="cols"></div>
<div class="sy-lg">
  <span><i style="background:#1a8a4f"></i>${e_('sy_monte')}</span>
  <span><i style="background:#c33a24"></i>${e_('sy_baisse')}</span>
  <span><svg width="14" height="12"><rect x="6" y="0" width="2" height="12" fill="#9aa4b5"/></svg> ${e_('sy_repere')}</span>
  <span>${e_('sy_aide')}</span>
</div>
<div data-id="bilan"></div>
<p class="sy-note" data-id="etat"></p>
</div>
<p class="sx-caption">${e_('sy_avert')}</p>`;
  const $ = id => r.querySelector(`[data-id="${id}"]`);
  const q = (p, i) => r.querySelector(`[data-${p}="${i}"]`);
  const dec = (x, n) => x.toFixed(n).replace('.', VIRG);

  // ================================================================ GABARIT script
  const N = D.noeuds, Ed = D.aretes;
  const IDX = {}; N.forEach((n, i) => { IDX[n.id] = i; });
  const NN = N.length;
  const HAUSSE = '#1a8a4f', BAISSE = '#c33a24';
  const SEUIL = 0.005;
  const base = N.map(n => n.v);
  const MOY0 = (() => { let s = 0, c = 0; N.forEach((n, i) => { if (n.mesure) { s += base[i]; c++; } }); return c ? s / c : 0; })();
  const tenu = {};
  let d = new Float64Array(NN), dprec = new Float64Array(NN), k = 0, minuteur = null;

  function d0() { const v = new Float64Array(NN); for (const id in tenu) v[IDX[id]] = tenu[id] - base[IDX[id]]; return v; }
  function avancer() {
    if (!r.isConnected) { arreter(); return; }
    const z = d0(), nx = new Float64Array(z);
    for (const e of Ed) nx[IDX[e.vers]] += e.w * d[IDX[e.de]];
    dprec = d; d = nx; k++;
    dessiner();
  }
  const borne = x => Math.max(0, Math.min(10, x));
  const niveau = i => borne(base[i] + d[i]);

  function construire() {
    const dims = [...new Set(N.map(n => n.dim))].sort();
    const parCol = [[], [], []];
    dims.forEach((dim, i) => parCol[i % 3].push(dim));
    $('cols').innerHTML = parCol.map(cols => '<div>' + cols.map(dim => {
      const liste = N.map((n, i) => ({ n, i })).filter(x => x.n.dim === dim);
      return `<div class="sy-grp"><h4><i style="background:${CD[dim] || '#9aa4b5'}"></i>${esc(T(dim))}</h4>` +
        liste.map(({ n, i }) => `<div class="sy-li"><div class="sy-nm" data-nm="${i}" title="${esc(n.nom)}${n.mesure ? '' : ' · ' + esc(L.non_mesure)}">${esc(n.nom)}</div>` +
          `<div class="sy-ba" data-ba="${i}" role="slider" aria-label="${esc(n.nom)}" aria-valuemin="0" aria-valuemax="10"><div class="f" data-fi="${i}"></div><div class="r" data-re="${i}"></div></div>` +
          `<div><div class="sy-vl" data-vl="${i}"></div><div class="sy-dl" data-dl="${i}"></div></div>` +
          `<div class="sy-pm"><button type="button" data-i="${i}" data-p="-0.5" title="${esc(L.moins)}">−</button>` +
          `<button type="button" data-i="${i}" data-p="0.5" title="${esc(L.plus)}">+</button></div></div>`).join('') + '</div>';
    }).join('') + '</div>').join('');
    r.querySelectorAll('.sy-ba').forEach(b => {
      b.addEventListener('click', ev => {
        const i = +b.dataset.ba, rc = b.getBoundingClientRect();
        const v = Math.round((ev.clientX - rc.left) / rc.width * 20) / 2;
        const id = N[i].id;
        if (tenu[id] !== undefined && Math.abs(tenu[id] - v) < 0.26) delete tenu[id];
        else tenu[id] = borne(v);
        relancer();
      });
    });
    r.querySelectorAll('.sy-pm button').forEach(b => {
      b.addEventListener('click', () => {
        const i = +b.dataset.i, id = N[i].id;
        const dep = tenu[id] !== undefined ? tenu[id] : base[i];
        const v = borne(Math.round((dep + (+b.dataset.p)) * 2) / 2);
        if (Math.abs(v - base[i]) < 0.001) delete tenu[id]; else tenu[id] = v;
        relancer();
      });
    });
  }
  function relancer() { k = 0; d = d0(); dprec = new Float64Array(NN); dessiner(); arreter(); if (Object.keys(tenu).length) lancer(); }

  function dessiner() {
    let nh = 0, nb = 0, somme = 0, cnt = 0, bouge = 0;
    N.forEach((n, i) => {
      const v = niveau(i), ecart = v - base[i];
      bouge = Math.max(bouge, Math.abs(d[i] - dprec[i]));
      if (ecart > 0.05) nh++; else if (ecart < -0.05) nb++;
      if (n.mesure) { somme += v; cnt++; }
      const coul = Math.abs(ecart) < 0.05 ? '#c8d0dc' : (ecart > 0 ? HAUSSE : BAISSE);
      const fi = q('fi', i); fi.style.width = (v * 10) + '%'; fi.style.background = coul;
      q('re', i).style.left = (base[i] * 10) + '%';
      q('ba', i).setAttribute('aria-valuenow', v.toFixed(1));
      const vl = q('vl', i); vl.textContent = dec(v, 1); vl.style.color = Math.abs(ecart) < 0.05 ? '#3c4761' : coul;
      const dl = q('dl', i);
      dl.textContent = Math.abs(ecart) < 0.05 ? (n.mesure ? '' : '?') : (ecart > 0 ? '+' : '−') + dec(Math.abs(ecart), 2);
      dl.style.color = Math.abs(ecart) < 0.05 ? '#9aa4b5' : coul;
      const t = tenu[N[i].id] !== undefined;
      q('ba', i).classList.toggle('t', t); q('nm', i).classList.toggle('t', t);
    });
    $('kk').textContent = k; $('nt').textContent = Object.keys(tenu).length;
    $('nh').textContent = nh; $('nb').textContent = nb;
    $('mo').textContent = cnt ? dec(somme / cnt, 2) : '—';
    const dm = cnt ? somme / cnt - MOY0 : 0;
    $('mos').innerHTML = esc(L.moy) + (Math.abs(dm) > 0.005
      ? ` · <b style="font-size:11px;color:${dm > 0 ? HAUSSE : BAISSE}">${dm > 0 ? '+' : '−'}${dec(Math.abs(dm), 2)}</b>` : '');
    const bil = $('bilan');
    if (!Object.keys(tenu).length) { bil.innerHTML = ''; bil.className = ''; }
    else {
      const bouges = N.map((n, i) => ({ n, e: niveau(i) - base[i] })).filter(x => tenu[x.n.id] === undefined && Math.abs(x.e) >= 0.05)
        .sort((a, b) => Math.abs(b.e) - Math.abs(a.e)).slice(0, 8);
      bil.className = 'sy-bil';
      bil.innerHTML = '<h5>' + esc(L.bilan) + '</h5>' + (bouges.length
        ? '<div class="rg">' + bouges.map(x => '<span class="it">' + esc(x.n.nom) + '<b style="color:' + (x.e > 0 ? HAUSSE : BAISSE) + '">' +
          (x.e > 0 ? '+' : '−') + dec(Math.abs(x.e), 2) + '</b></span>').join('') + '</div>'
        : '<p>' + esc(L.bilan0) + '</p>');
    }
    const rien = !Object.keys(tenu).length;
    $('play').disabled = rien; $('pas').disabled = rien;
    $('amorce').style.display = rien ? '' : 'none';
    const e = $('etat');
    if (rien) e.textContent = L.repos;
    else if (k > 0 && bouge < SEUIL) { e.textContent = L.stable; arreter(); }
    else e.textContent = '';
  }
  const bp = $('play');
  bp.onclick = () => { if (!Object.keys(tenu).length) return; minuteur ? arreter() : lancer(); };
  $('pas').onclick = () => { if (!Object.keys(tenu).length) return; arreter(); avancer(); };
  $('zero').onclick = () => { arreter(); for (const id in tenu) delete tenu[id]; k = 0; d = new Float64Array(NN); dprec = new Float64Array(NN); dessiner(); };
  function lancer() { if (!Object.keys(tenu).length) return; bp.textContent = L.pause; bp.classList.remove('p'); minuteur = setInterval(avancer, 780); avancer(); }
  function arreter() { if (minuteur) clearInterval(minuteur); minuteur = null; bp.textContent = L.lire; bp.classList.add('p'); }
  construire(); dessiner();
  nettoyer('regler', arreter);
}
