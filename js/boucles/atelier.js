/* Tab "Calibrer ensemble / Calibrate together".
   A participatory calibration of the link strengths, in the spirit of fuzzy
   cognitive mapping (Özesmi and Özesmi 2004), with an optional Delphi second
   round. Everything runs in the browser: no server. Participants keep their
   answers in their own browser (localStorage) and send a CSV file; the
   facilitator imports the files, aggregates them, prepares the round-2
   summary and tries the calibrated model (moteur.js, imported read-only). */
import * as E from './moteur.js';
import { CLASSES, classeNum, forceDeClasse, nomClasse } from './methode.js';

// ------------------------------------------------------------------ storage
const CLE_P = 'apri_atelier_participant_v1', CLE_A = 'apri_atelier_animateur_v1', CLE_M = 'apri_atelier_mode';
function lire(cle, defaut) { try { const v = localStorage.getItem(cle); return v ? JSON.parse(v) : defaut; } catch (e) { return defaut; } }
function ecrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { /* private window: memory only */ } }
function effacer(cle) { try { localStorage.removeItem(cle); } catch (e) {} }

const P0 = () => ({ code: '', rep: {}, prop: [], sel: null, seulSel: true, theme: '', idx: 0, resume: null });
const A0 = () => ({ sel: [], fichiers: [], tour: 'dernier', filtre: 'tous', theme: '', retirer: true, ajouter: true });
let P = null, A = null, mode = null;
const charge = () => {
  if (!P) P = Object.assign(P0(), lire(CLE_P, {}));
  if (!A) A = Object.assign(A0(), lire(CLE_A, {}));
  if (!mode) { try { mode = localStorage.getItem(CLE_M) || 'participant'; } catch (e) { mode = 'participant'; } }
};
const sauverP = () => ecrire(CLE_P, P), sauverA = () => ecrire(CLE_A, A);

// ------------------------------------------------------------------ small helpers
function css() {
  if (!document.querySelector('link[href="css/boucles.css"]'))
    document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'css/boucles.css' }));
}
function telecharger(texte, nom, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([texte], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const q = s => { s = String(s ?? ''); return /[";\r\n,]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s; };
const csvTexte = lignes => '﻿' + lignes.map(r => r.map(q).join(';')).join('\r\n');
/** CSV parser: ; or , separator, quotes, BOM; returns array of objects (header row lowercased) */
export function lireCSV(texte) {
  texte = texte.replace(/^﻿/, '');
  const prem = texte.split(/\r?\n/)[0] || '';
  const sep = (prem.match(/;/g) || []).length >= (prem.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = [], champ = '', guil = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guil) {
      if (c === '"') { if (texte[i + 1] === '"') { champ += '"'; i++; } else guil = false; }
      else champ += c;
    } else if (c === '"') guil = true;
    else if (c === sep) { row.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texte[i + 1] === '\n') i++; row.push(champ); rows.push(row); row = []; champ = ''; }
    else champ += c;
  }
  if (champ !== '' || row.length) { row.push(champ); rows.push(row); }
  const tete = (rows.shift() || []).map(h => h.trim().toLowerCase());
  return rows.filter(r => r.some(x => x.trim() !== '')).map(r => Object.fromEntries(tete.map((h, i) => [h, (r[i] ?? '').trim()])));
}
const normE = v => { v = String(v || '').toLowerCase(); return ['oui', 'yes', 'o', 'y', '1'].includes(v) ? 'o' : ['non', 'no', 'n', '0'].includes(v) ? 'n' : v ? '?' : undefined; };
const normS = v => { v = String(v || '').trim(); return v === '+' ? '+' : (v === '-' || v === '−') ? '-' : v ? '?' : undefined; };
const normC = v => { const n = parseInt(v, 10); return n >= 1 && n <= 5 ? n : (v ? '?' : undefined); };

/** quantile (type 7, as in R and numpy) of a sorted array */
function quantile(s, p) {
  if (!s.length) return null;
  const h = (s.length - 1) * p, lo = Math.floor(h);
  return s[lo] + (h - lo) * ((s[Math.min(lo + 1, s.length - 1)]) - s[lo]);
}
const ACCORDS = {
  fort: { fr: 'accord fort', en: 'strong agreement' },
  partage: { fr: 'accord partagé', en: 'partial agreement' },
  faible: { fr: 'accord faible', en: 'weak agreement' },
  peu: { fr: 'trop peu de réponses', en: 'too few answers' },
};
/** agreement from the interquartile range of the classes (1 to 5) */
export function accordDe(classes) {
  if (classes.length < 3) return 'peu';
  const s = [...classes].sort((a, b) => a - b);
  const iqr = quantile(s, 0.75) - quantile(s, 0.25);
  return iqr <= 1 ? 'fort' : iqr <= 2 ? 'partage' : 'faible';
}

/** the selection code shared by the facilitator: indices of the links in base 36 */
const coder = (cles, liens) => cles.map(k => liens.findIndex(l => l.k === k)).filter(i => i >= 0).sort((a, b) => a - b).map(i => i.toString(36)).join('-');
const decoder = (code, liens) => String(code || '').split(/[-.,\s]+/).map(s => parseInt(s, 36)).filter(i => i >= 0 && i < liens.length).map(i => liens[i].k);

function pastille(k, apri, avecNom = true) {
  if (k == null) return '<span class="at-vide">–</span>';
  const kk = Math.round(k * 2) / 2;
  const pts = [1, 2, 3, 4, 5].map(i => `<i class="${i <= kk ? 'on' : i - 0.5 === kk ? 'mi' : ''}"></i>`).join('');
  return `<span class="me-cl"><span class="me-pts">${pts}</span>${avecNom ? `<span>${apri.esc(nomClasse(Math.round(kk), apri.lang))}</span>` : ''}</span>`;
}

// ------------------------------------------------------------------ aggregation
/** latest answers of each participant (or those of one round), then per link */
export function agreger(fichiers, liens, tour = 'dernier') {
  const parPart = new Map();
  for (const f of fichiers) {
    if (tour !== 'dernier' && String(f.tour) !== String(tour)) continue;
    const prec = parPart.get(f.participant);
    if (!prec || Number(f.tour) > Number(prec.tour)) parPart.set(f.participant, f);
  }
  const res = new Map();
  for (const l of liens) res.set(l.k, { k: l.k, n: 0, oui: 0, non: 0, plus: 0, moins: 0, classes: [], comm: [] });
  const props = new Map();
  for (const f of parPart.values()) {
    for (const r of f.lignes) {
      if (r.type === 'propose') {
        const k = r.de + '|' + r.vers;
        if (!props.has(k)) props.set(k, { de: r.de, vers: r.vers, n: 0, plus: 0, moins: 0, classes: [], raisons: [] });
        const p = props.get(k); p.n++;
        if (r.s === '+') p.plus++; else if (r.s === '-') p.moins++;
        if (typeof r.c === 'number') p.classes.push(r.c);
        if (r.m) p.raisons.push(r.m);
        continue;
      }
      const a = res.get(r.de + '|' + r.vers); if (!a || r.e === undefined) continue;
      a.n++;
      if (r.e === 'o') a.oui++; else if (r.e === 'n') a.non++;
      if (r.e !== 'n') {
        if (r.s === '+') a.plus++; else if (r.s === '-') a.moins++;
        if (typeof r.c === 'number') a.classes.push(r.c);
      }
      if (r.m) a.comm.push(r.m);
    }
  }
  for (const a of res.values()) {
    const s = [...a.classes].sort((x, y) => x - y);
    a.med = s.length ? quantile(s, 0.5) : null;
    a.min = s[0] ?? null; a.max = s[s.length - 1] ?? null;
    a.q1 = quantile(s, 0.25); a.q3 = quantile(s, 0.75);
    a.accord = accordDe(s);
    a.pExiste = a.oui + a.non ? a.oui / (a.oui + a.non) : null;
    a.signe = a.plus > a.moins ? 1 : a.moins > a.plus ? -1 : 0;
  }
  for (const p of props.values()) {
    const s = [...p.classes].sort((x, y) => x - y);
    p.med = s.length ? quantile(s, 0.5) : null;
    p.signe = p.moins > p.plus ? -1 : 1;
  }
  return { res, props, participants: [...parPart.values()] };
}

/** the model with the workshop strengths */
export function modeleCalibre(donnees, agg, lang, { retirer = true, ajouter = true } = {}) {
  const g = donnees.graphe;
  const changes = { classe: 0, signe: 0, retires: [], ajoutes: [] };
  const aretes = [];
  for (const e of g.aretes) {
    const a = agg.res.get(e.de + '|' + e.vers);
    if (!a || !a.n) { aretes.push(e); continue; }
    if (retirer && a.oui + a.non >= 3 && a.pExiste < 0.5) { changes.retires.push(e); continue; }
    const n = { ...e };
    if (a.med != null) { const f = forceDeClasse(a.med); if (classeNum(f) !== classeNum(e.force)) changes.classe++; n.force = f; }
    if (a.signe && a.signe !== e.signe) { n.signe = a.signe; changes.signe++; }
    aretes.push(n);
  }
  if (ajouter) {
    const ids = new Set(g.noeuds.map(x => x.id));
    for (const p of agg.props.values()) {
      if (p.n < 2 || !ids.has(p.de) || !ids.has(p.vers) || p.de === p.vers) continue;
      if (aretes.some(e => e.de === p.de && e.vers === p.vers)) continue;
      const n = { de: p.de, vers: p.vers, signe: p.signe, force: forceDeClasse(p.med ?? 2), just: 'atelier', src: {} };
      aretes.push(n); changes.ajoutes.push(n);
    }
  }
  const d2 = { ...donnees, graphe: { ...g, aretes } };
  return { m: E.creerModele(d2, lang), changes };
}
/** reach of a +1 push on every variable: total movement elsewhere */
export function portees(m) {
  return m.ids.map(id => {
    const eff = E.propager(m, { [id]: 1 });
    let s = 0; for (const [k, v] of Object.entries(eff)) if (k !== id) s += Math.abs(v);
    return { id, p: s };
  }).sort((a, b) => b.p - a.p);
}

/** made-up answers to try the tool (clearly labelled as an example) */
function exemple(liens) {
  const rng = (E.aleatoire || (s => () => Math.random()))(7);
  const noms = ['Exemple A', 'Exemple B', 'Exemple C', 'Exemple D', 'Exemple E', 'Exemple F'];
  return noms.map((nom, j) => {
    const lignes = [];
    for (const l of liens) {
      const u = rng();
      if (u < 0.08) { lignes.push({ type: 'lien', de: l.de, vers: l.vers, e: '?' }); continue; }
      const nonEx = l.k.length % 7 === j % 7 && rng() < 0.7;     // a few links the group doubts
      if (u < 0.13 || nonEx) { lignes.push({ type: 'lien', de: l.de, vers: l.vers, e: 'n' }); continue; }
      const base = classeNum(l.a.force) + (l.k.length % 3 === 0 ? -1 : 0);
      const bruit = [-2, -1, -1, 0, 0, 0, 0, 1, 1, 2][Math.floor(rng() * 10)];
      const c = Math.max(1, Math.min(5, base + bruit));
      lignes.push({ type: 'lien', de: l.de, vers: l.vers, e: 'o', s: rng() < 0.94 ? (l.a.signe > 0 ? '+' : '-') : (l.a.signe > 0 ? '-' : '+'), c: rng() < 0.1 ? '?' : c });
    }
    if (j < 3) lignes.push({ type: 'propose', de: 'securite', vers: 'prepa', s: '+', c: 2, m: j === 0 ? 'Les gens qui se sentent en sécurité participent plus.' : '' });
    return { participant: nom, tour: 1, fichier: nom + '.csv', exemple: true, lignes };
  });
}

// ------------------------------------------------------------------ the guide
function guideHTML(apri) {
  const t = apri.t.bind(apri);
  return `<div class="at-guide-corps">
  <h2>${t('Guide de l\'animateur : calibrer les liens ensemble', 'Facilitator guide: calibrating the links together')}</h2>
  <p class="at-g-lead">${t('Un atelier de 2 à 3 heures pour que des experts et des membres des communautés disent, lien par lien, si le lien existe, dans quel sens il agit et avec quelle force. Méthode : cartographie cognitive floue (Özesmi et Özesmi 2004), avec un deuxième tour de type Delphi.', 'A 2 to 3 hour workshop where experts and community members say, link by link, whether the link exists, which way it acts and how strongly. Method: fuzzy cognitive mapping (Özesmi and Özesmi 2004), with a Delphi-style second round.')}</p>
  <div class="at-g-cols">
  <div><h3>${t('Qui inviter', 'Who to invite')}</h3><ul>
    <li>${t('8 à 15 personnes, pas plus : chacun doit pouvoir parler.', '8 to 15 people, no more: everyone must be able to speak.')}</li>
    <li>${t('Des techniciens (environnement, agriculture, santé, protection civile), des élus locaux (CASEC, mairie).', 'Technical staff (environment, agriculture, health, civil protection), local officials (CASEC, town hall).')}</li>
    <li>${t('Des voix des communautés : agricultrices et agriculteurs, pêcheurs, femmes, jeunes, organisations de base.', 'Community voices: farmers, fishers, women, young people, grassroots organisations.')}</li>
    <li>${t('Un équilibre entre littoral et montagne, femmes et hommes.', 'A balance between coast and mountain, women and men.')}</li>
  </ul>
  <h3>${t('Avant l\'atelier', 'Before the workshop')}</h3><ul>
    <li>${t('Choisir 15 à 30 liens (un thème suffit) dans « J\'anime », étape 1, et partager le lien de l\'atelier.', 'Choose 15 to 30 links (one theme is enough) in "I facilitate", step 1, and share the workshop link.')}</li>
    <li>${t('Prévoir un téléphone ou un ordinateur par personne, ou des fiches papier.', 'Plan one phone or computer per person, or paper cards.')}</li>
    <li>${t('Donner à chacun un code (P01, P02…) : les noms ne sont pas nécessaires.', 'Give each person a code (P01, P02…): names are not needed.')}</li>
  </ul></div>
  <div><h3>${t('Déroulé', 'Steps')}</h3><ol>
    <li><b>15 min</b> ${t('Accueil : à quoi sert le modèle, ce qu\'il ne fait pas.', 'Welcome: what the model is for, what it does not do.')}</li>
    <li><b>15 min</b> ${t('Un exemple ensemble (eau → santé) et les 5 classes de force.', 'One example together (water → health) and the 5 strength classes.')}</li>
    <li><b>45 min</b> ${t('Réponses individuelles, en silence, sans discuter : c\'est ce qui évite que la voix la plus forte l\'emporte.', 'Individual answers, in silence, without discussion: this keeps the loudest voice from winning.')}</li>
    <li><b>15 min</b> ${t('Pause. L\'animateur importe les fichiers et ouvre les résultats.', 'Break. The facilitator imports the files and opens the results.')}</li>
    <li><b>40 min</b> ${t('Discussion des liens où l\'accord est faible : on échange des raisons, on ne vote pas.', 'Discussion of the links with weak agreement: people share reasons, they do not vote.')}</li>
    <li><b>20 min</b> ${t('Deuxième tour : chacun revoit ses réponses seul, en voyant la médiane du groupe.', 'Second round: each person reviews their answers alone, seeing the group median.')}</li>
    <li><b>10 min</b> ${t('Clôture : premiers résultats, modèle calibré, suite.', 'Close: first results, calibrated model, next steps.')}</li>
  </ol></div></div>
  <h3>${t('Comment enregistrer', 'How to record')}</h3><ul>
    <li>${t('Chaque participant clique sur « Télécharger mes réponses » et envoie le fichier CSV (clé USB, messagerie, courriel).', 'Each participant clicks "Download my answers" and sends the CSV file (USB stick, messaging, email).')}</li>
    <li>${t('Sur papier : l\'animateur saisit ensuite chaque fiche en mode participant, avec le code de la personne.', 'On paper: the facilitator then enters each card in participant mode, with the person\'s code.')}</li>
    <li>${t('Un preneur de notes relève les raisons données pendant la discussion, lien par lien.', 'A note-taker writes down the reasons given during the discussion, link by link.')}</li>
    <li>${t('Rien n\'est envoyé sur internet : les réponses restent sur les appareils et dans les fichiers.', 'Nothing is sent over the internet: answers stay on the devices and in the files.')}</li>
  </ul>
  <p class="at-g-pied">${t('APRI · Boucles de rétroaction · Calibrer ensemble', 'APRI · Feedback loops · Calibrate together')}</p></div>`;
}
function imprimerGuide(apri) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.append(f);
  const d = f.contentDocument;
  d.open();
  d.write(`<!doctype html><html lang="${apri.lang}"><head><meta charset="utf-8"><title>APRI</title><style>
    @page{size:A4;margin:12mm}
    body{font:10.5pt/1.4 Inter,system-ui,sans-serif;color:#1f3a4a;margin:0}
    h2{font-size:16pt;margin:0 0 4pt;color:#1f3a4a} h3{font-size:11.5pt;margin:9pt 0 3pt;color:#2f7a5b}
    ul,ol{margin:0;padding-left:15pt} li{margin:1.5pt 0}
    .at-g-lead{margin:0 0 4pt;color:#3c5566}.at-g-cols{display:grid;grid-template-columns:1fr 1fr;gap:16pt}
    .at-g-pied{margin-top:10pt;font-size:8.5pt;color:#7a8c99;border-top:1px solid #dbe6ee;padding-top:4pt}
  </style></head><body>${guideHTML(apri)}</body></html>`);
  d.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(() => f.remove(), 60000); }, 250);
}

// ------------------------------------------------------------------ render
export default async function render(el, apri) {
  css(); charge();
  const donnees = await apri.donnees('data/boucles/modele.json');
  const t = apri.t.bind(apri), esc = apri.esc, L = apri.lang;
  const g = E.relationsValides(donnees.graphe);
  const parId = Object.fromEntries(g.noeuds.map(n => [n.id, n]));
  const nom = id => parId[id] ? (parId[id][L] || parId[id].fr) : id;
  const liens = g.aretes.map(a => ({ k: a.de + '|' + a.vers, de: a.de, vers: a.vers, a, dims: [parId[a.de]?.dim, parId[a.vers]?.dim] }));
  const parCle = new Map(liens.map(l => [l.k, l]));
  const themes = Object.keys(donnees.couleurs_dim || {});
  const textes = await apri.donnees('data/boucles/textes.json').catch(() => ({}));
  const nomTheme = d => textes[d] ? apri.tt(textes[d]) : d;
  const echelons = (g.bareme && g.bareme.echelons) || [];

  // a selection shared through the address (?atelier=...)
  try {
    const code = new URLSearchParams(location.search).get('atelier');
    if (code) { const sel = decoder(code, liens); if (sel.length) { P.sel = sel; P.seulSel = true; sauverP(); } }
  } catch (e) {}

  el.innerHTML = '';
  const r = document.createElement('div'); r.className = 'at';
  el.append(r);
  r.append(apri.h(`<div class="at-tete">
    <p class="lead">${esc(t('Un atelier pour fixer ensemble la force des liens du modèle, avec les experts et les communautés.', 'A workshop to set the strength of the model\'s links together, with experts and communities.'))}</p>
    <p class="note">${esc(t('Chaque participant répond lien par lien sur son téléphone ou son ordinateur, puis envoie son fichier ; l\'animateur rassemble les fichiers et voit où le groupe est d\'accord. Rien ne quitte les appareils.', 'Each participant answers link by link on their phone or computer, then sends their file; the facilitator gathers the files and sees where the group agrees. Nothing leaves the devices.'))}</p></div>`));
  const bascule = apri.h(`<div class="at-modes" role="tablist">
    <button type="button" role="tab" data-m="participant"><span class="at-ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg></span><b>${esc(t('Je participe', 'I take part'))}</b><small>${esc(t('je donne mon avis sur les liens', 'I give my view on the links'))}</small></button>
    <button type="button" role="tab" data-m="animateur"><span class="at-ico"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="9" r="3"/><path d="M2.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M11 19c.8-3 3-4.5 5.5-4.5S21.2 16 22 19"/></svg></span><b>${esc(t('J\'anime', 'I facilitate'))}</b><small>${esc(t('je prépare, je rassemble, je compare', 'I prepare, gather and compare'))}</small></button></div>`);
  r.append(bascule);
  const zone = document.createElement('div'); r.append(zone);
  const majModes = () => bascule.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.m === mode)));
  bascule.querySelectorAll('button').forEach(b => b.onclick = () => {
    mode = b.dataset.m; try { localStorage.setItem(CLE_M, mode); } catch (e) {}
    majModes(); dessiner();
  });
  majModes();

  const dessiner = () => { zone.innerHTML = ''; (mode === 'animateur' ? animateur : participant)(); };

  // ============================================================ participant
  function listeP() {
    let ls = liens;
    if (P.sel && P.sel.length && P.seulSel) { const s = new Set(P.sel); ls = ls.filter(l => s.has(l.k)); }
    if (P.theme) ls = ls.filter(l => l.dims.includes(P.theme));
    return ls;
  }
  function participant() {
    const z = document.createElement('div'); z.className = 'at-part'; zone.append(z);
    const themeOpts = `<option value="">${esc(t('Tous les thèmes', 'All themes'))}</option>` + themes.map(d => `<option value="${d}">${esc(nomTheme(d))}</option>`).join('');
    const haut = apri.h(`<div class="at-reglages">
      <label class="at-ch"><span class="libelle">${esc(t('Votre nom ou code (facultatif)', 'Your name or code (optional)'))}</span>
        <input class="champ" type="text" maxlength="40" placeholder="${esc(t('ex. P07', 'e.g. P07'))}" value="${esc(P.code)}"></label>
      <label class="at-ch"><span class="libelle">${esc(t('Thème', 'Theme'))}</span><select class="champ">${themeOpts}</select></label>
      <div class="at-ch at-sel"></div>
    </div>`);
    z.append(haut);
    const [inCode] = haut.querySelectorAll('input'), selTheme = haut.querySelector('select');
    inCode.oninput = () => { P.code = inCode.value.trim(); sauverP(); };
    selTheme.value = P.theme || '';
    selTheme.onchange = () => { P.theme = selTheme.value; P.idx = 0; sauverP(); dessiner(); };
    const zsel = haut.querySelector('.at-sel');
    if (P.sel && P.sel.length) {
      zsel.innerHTML = `<span class="libelle">${esc(t('Liens choisis par l\'animateur', 'Links chosen by the facilitator'))}</span>
        <label class="at-coche"><input type="checkbox" ${P.seulSel ? 'checked' : ''}> ${esc(t(`Seulement ces ${P.sel.length} liens`, `Only these ${P.sel.length} links`))}</label>`;
      zsel.querySelector('input').onchange = e => { P.seulSel = e.target.checked; P.idx = 0; sauverP(); dessiner(); };
    } else {
      zsel.innerHTML = `<span class="libelle">${esc(t('Code de l\'atelier (si on vous en a donné un)', 'Workshop code (if you were given one)'))}</span>
        <div class="at-ligne"><input class="champ" type="text" placeholder="0-4-1a…"><button type="button" class="bouton">OK</button></div>`;
      const [i, b] = [zsel.querySelector('input'), zsel.querySelector('button')];
      b.onclick = () => { const s = decoder(i.value, liens); if (s.length) { P.sel = s; P.seulSel = true; P.idx = 0; sauverP(); dessiner(); } else i.classList.add('at-err'); };
    }

    // round 2 band
    const tour = P.resume ? 2 : 1;
    const t2 = apri.h(`<div class="at-tour"><span class="at-tour-n">${esc(t('Tour', 'Round'))} ${tour}</span>
      <span>${esc(tour === 2 ? t('Vous voyez la réponse du groupe au premier tour. Gardez ou changez vos réponses, librement.', 'You see the group\'s answer from the first round. Keep or change your answers, freely.')
        : t('Répondez seul, sans en parler aux autres. Si l\'animateur vous envoie le résumé du groupe, chargez-le ici pour le 2e tour.', 'Answer on your own, without talking to others. If the facilitator sends you the group summary, load it here for round 2.'))}</span>
      <label class="bouton at-fichier">${esc(tour === 2 ? t('Changer de résumé', 'Change summary') : t('Charger le résumé du groupe', 'Load the group summary'))}<input type="file" accept=".csv,text/csv" hidden></label>
      ${tour === 2 ? `<button type="button" class="bouton at-sans">${esc(t('Revenir au 1er tour', 'Back to round 1'))}</button>` : ''}</div>`);
    z.append(t2);
    t2.querySelector('input').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      const rows = lireCSV(await f.text());
      const res = {};
      for (const x of rows) if (x.de && x.vers && 'mediane' in x) res[x.de + '|' + x.vers] = { n: +x.n || 0, med: x.mediane === '' ? null : parseFloat(String(x.mediane).replace(',', '.')), acc: x.accord, ex: x.existe_pct === '' ? null : parseFloat(String(x.existe_pct).replace(',', '.')), sg: x.signe };
      if (!Object.keys(res).length) { alert(t('Ce fichier n\'est pas un résumé de groupe.', 'This file is not a group summary.')); return; }
      P.resume = res; sauverP(); dessiner();
    };
    const sans = t2.querySelector('.at-sans'); if (sans) sans.onclick = () => { P.resume = null; sauverP(); dessiner(); };

    const ls = listeP();
    const faits = ls.filter(l => P.rep[l.k] && P.rep[l.k].e).length;
    const prog = apri.h(`<div class="at-prog"><div class="at-prog-b"><i style="width:${ls.length ? 100 * faits / ls.length : 0}%"></i></div>
      <span><b>${faits}</b> / ${ls.length} ${esc(t('liens répondus', 'links answered'))}</span></div>`);
    z.append(prog);
    if (!ls.length) { z.append(apri.h(`<div class="vide">${esc(t('Aucun lien pour ce choix.', 'No link for this choice.'))}</div>`)); }
    else {
      P.idx = Math.max(0, Math.min(P.idx || 0, ls.length - 1));
      z.append(carteLien(ls, P.idx));
    }
    z.append(propositions());
    const fin = apri.h(`<div class="at-fin">
      <button type="button" class="bouton primaire at-dl">⬇ ${esc(t('Télécharger mes réponses (CSV)', 'Download my answers (CSV)'))}</button>
      <button type="button" class="bouton at-raz">${esc(t('Tout effacer et recommencer', 'Clear everything and start again'))}</button>
      <p class="note">${esc(t('Vos réponses restent dans ce navigateur : vous pouvez fermer la page et reprendre plus tard. Envoyez le fichier à l\'animateur à la fin.', 'Your answers stay in this browser: you can close the page and resume later. Send the file to the facilitator at the end.'))}</p></div>`);
    z.append(fin);
    fin.querySelector('.at-dl').onclick = () => exporterP(tour);
    fin.querySelector('.at-raz').onclick = () => {
      if (!confirm(t('Effacer toutes vos réponses de ce navigateur ?', 'Clear all your answers from this browser?'))) return;
      P = P0(); effacer(CLE_P); dessiner();
    };
  }

  function carteLien(ls, i) {
    const l = ls[i], a = l.a, src = a.src || {};
    const rep = P.rep[l.k] || (P.rep[l.k] = {});
    const url = /^https?:\/\//i.test(src.url || '') ? src.url : '';
    const cite = a['cite_' + L] || a.cite_fr || src.titre || '';
    const ref = a['ref_' + L] || a.ref_fr || '';
    const geo = L === 'en' ? (src.geo_en || src.geo) : src.geo;
    const typ = L === 'en' ? (src.type_en || src.type) : src.type;
    const rs = P.resume && P.resume[l.k];
    const btn = (grp, v, html, extra = '') => `<button type="button" class="at-choix ${extra}" data-g="${grp}" data-v="${v}" aria-pressed="${String(rep[grp] === v || (grp === 'c' && rep.c === +v))}">${html}</button>`;
    const classes = CLASSES.map((c, j) => btn('c', String(c.k), `${pastille(c.k, apri, false)}<b>${esc(L === 'en' ? c.en : c.fr)}</b><small>${esc(echelons[j] ? apri.tt(echelons[j]) : '')}</small>`, 'at-cl')).join('');
    const opts = ls.map((x, j) => `<option value="${j}">${j + 1}. ${esc(nom(x.de))} → ${esc(nom(x.vers))}${P.rep[x.k]?.e ? ' ✓' : ''}</option>`).join('');
    const c = apri.h(`<div class="at-carte">
      <div class="at-nav"><button type="button" class="bouton at-prec" ${i === 0 ? 'disabled' : ''}>← ${esc(t('Précédent', 'Previous'))}</button>
        <select class="champ at-saut" aria-label="${esc(t('Aller au lien', 'Go to link'))}">${opts}</select>
        <button type="button" class="bouton at-suiv" ${i === ls.length - 1 ? 'disabled' : ''}>${esc(t('Suivant', 'Next'))} →</button></div>
      <div class="at-titre"><span class="at-num">${esc(t('Lien', 'Link'))} ${i + 1} / ${ls.length}</span>
        <div class="at-fleche"><span>${esc(nom(l.de))}</span><b>→</b><span>${esc(nom(l.vers))}</span></div></div>
      <div class="at-source"><p>${esc(ref)}</p>
        <p class="note">${esc(cite)}${typ ? ' · ' + esc(typ) : ''}${geo ? ' · ' + esc(geo) : ''} ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(t('Ouvrir la source', 'Open the source'))} ↗</a>` : ''}</p></div>
      ${rs ? `<div class="at-groupe">${esc(t('Le groupe au 1er tour', 'The group in round 1'))} : ${rs.med != null ? pastille(rs.med, apri) : '–'}
        <span class="at-badge ${esc(rs.acc || '')}">${esc(ACCORDS[rs.acc] ? apri.tt(ACCORDS[rs.acc]) : '')}</span>
        <span class="note">${rs.n} ${esc(t('réponses', 'answers'))}${rs.ex != null ? ' · ' + esc(t('existe pour', 'exists for')) + ' ' + Math.round(rs.ex) + (L === 'en' ? '%' : ' %') : ''}${rs.sg === '-' ? ' · ' + esc(t('sens majoritaire : −', 'majority direction: −')) : ''}</span></div>` : ''}
      <div class="at-q"><h4><span>1</span>${esc(t('Ce lien existe-t-il ?', 'Does this link exist?'))}</h4><div class="at-btns">
        ${btn('e', 'o', esc(t('Oui', 'Yes')))}${btn('e', 'n', esc(t('Non', 'No')))}${btn('e', '?', esc(t('Je ne sais pas', 'I don\'t know')), 'nsp')}</div></div>
      <div class="at-q at-q2"><h4><span>2</span>${esc(t('Dans quel sens ?', 'Which way?'))}</h4><div class="at-btns">
        ${btn('s', '+', `<b class="pos">+</b> ${esc(t(`Quand « ${nom(l.de)} » augmente, « ${nom(l.vers)} » augmente`, `When "${nom(l.de)}" goes up, "${nom(l.vers)}" goes up`))}`, 'large')}
        ${btn('s', '-', `<b class="neg">−</b> ${esc(t(`Quand « ${nom(l.de)} » augmente, « ${nom(l.vers)} » baisse`, `When "${nom(l.de)}" goes up, "${nom(l.vers)}" goes down`))}`, 'large')}
        ${btn('s', '?', esc(t('Je ne sais pas', 'I don\'t know')), 'nsp')}</div></div>
      <div class="at-q at-q3"><h4><span>3</span>${esc(t('Avec quelle force ?', 'How strong?'))}</h4><div class="at-classes">${classes}
        ${btn('c', '?', esc(t('Je ne sais pas', 'I don\'t know')), 'nsp')}</div></div>
      <label class="at-comm"><span class="libelle">${esc(t('Une remarque ? (facultatif)', 'A remark? (optional)'))}</span>
        <input class="champ" type="text" maxlength="200" value="${esc(rep.m || '')}"></label>
      <div class="at-bas"><button type="button" class="bouton primaire at-suiv2">${esc(i === ls.length - 1 ? t('Terminé', 'Done') : t('Lien suivant', 'Next link'))} →</button></div>
    </div>`);
    const etat = () => {
      const non = rep.e === 'n';
      c.querySelectorAll('.at-q2, .at-q3').forEach(x => x.classList.toggle('at-off', non));
      c.querySelectorAll('.at-choix').forEach(b => {
        const g2 = b.dataset.g, v = b.dataset.v;
        b.setAttribute('aria-pressed', String(g2 === 'c' ? (String(rep.c) === v) : rep[g2] === v));
      });
    };
    c.querySelectorAll('.at-choix').forEach(b => b.onclick = () => {
      const g2 = b.dataset.g, v = b.dataset.v;
      rep[g2] = g2 === 'c' ? (v === '?' ? '?' : +v) : v;
      if (g2 !== 'e' && !rep.e) rep.e = 'o';
      if (g2 === 'e' && v === 'n') { delete rep.s; delete rep.c; }
      sauverP(); etat(); majProg();
    });
    c.querySelector('.at-comm input').oninput = e => { rep.m = e.target.value; sauverP(); };
    const aller = j => { P.idx = j; sauverP(); dessiner(); zone.querySelector('.at-carte')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    c.querySelector('.at-prec').onclick = () => aller(i - 1);
    c.querySelector('.at-suiv').onclick = () => aller(i + 1);
    c.querySelector('.at-suiv2').onclick = () => {
      if (i < ls.length - 1) { aller(i + 1); return; }
      zone.querySelector('.at-fin')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    const saut = c.querySelector('.at-saut'); saut.value = String(i); saut.onchange = () => aller(+saut.value);
    etat();
    return c;
  }
  function majProg() {
    const ls = listeP(), faits = ls.filter(l => P.rep[l.k] && P.rep[l.k].e).length;
    const p = zone.querySelector('.at-prog'); if (!p) return;
    p.querySelector('i').style.width = (ls.length ? 100 * faits / ls.length : 0) + '%';
    p.querySelector('b').textContent = faits;
  }

  function propositions() {
    const opts = [...g.noeuds].sort((x, y) => nom(x.id).localeCompare(nom(y.id), L)).map(n => `<option value="${n.id}">${esc(nom(n.id))}</option>`).join('');
    const clOpts = CLASSES.map(c => `<option value="${c.k}">${c.k} · ${esc(L === 'en' ? c.en : c.fr)}</option>`).join('');
    const d = apri.h(`<details class="pli at-prop"><summary>+ ${esc(t('Proposer un lien qui manque', 'Suggest a missing link'))} ${P.prop.length ? `(${P.prop.length})` : ''}</summary>
      <p class="note">${esc(t('Une cause et un effet que le modèle oublie, selon votre expérience.', 'A cause and effect the model leaves out, from your experience.'))}</p>
      <div class="at-pform">
        <label><span class="libelle">${esc(t('Cause', 'Cause'))}</span><select class="champ" data-k="de">${opts}</select></label>
        <label><span class="libelle">${esc(t('Effet', 'Effect'))}</span><select class="champ" data-k="vers">${opts}</select></label>
        <label><span class="libelle">${esc(t('Sens', 'Direction'))}</span><select class="champ" data-k="s"><option value="+">+ ${esc(t('augmente', 'goes up'))}</option><option value="-">− ${esc(t('baisse', 'goes down'))}</option></select></label>
        <label><span class="libelle">${esc(t('Force', 'Strength'))}</span><select class="champ" data-k="c">${clOpts}</select></label>
        <label class="large"><span class="libelle">${esc(t('Pourquoi ?', 'Why?'))}</span><input class="champ" data-k="m" maxlength="200" type="text"></label>
        <button type="button" class="bouton primaire">${esc(t('Ajouter', 'Add'))}</button>
      </div><ul class="at-plist"></ul></details>`);
    if (P._propOuvert) d.open = true;
    d.ontoggle = () => { P._propOuvert = d.open; };
    const champs = k => d.querySelector(`[data-k="${k}"]`);
    champs('c').value = '2'; champs('vers').selectedIndex = 1;
    const liste = () => {
      d.querySelector('.at-plist').innerHTML = P.prop.map((p, j) => `<li><span>${esc(nom(p.de))} <b class="${p.s === '-' ? 'neg' : 'pos'}">${p.s === '-' ? '⊣' : '→'}</b> ${esc(nom(p.vers))} · ${esc(nomClasse(p.c, L))}${p.m ? ` · <i>${esc(p.m)}</i>` : ''}</span><button type="button" data-j="${j}" aria-label="${esc(t('Retirer', 'Remove'))}">×</button></li>`).join('');
      d.querySelectorAll('.at-plist button').forEach(b => b.onclick = () => { P.prop.splice(+b.dataset.j, 1); sauverP(); liste(); });
    };
    d.querySelector('.at-pform>button').onclick = () => {
      const p = { de: champs('de').value, vers: champs('vers').value, s: champs('s').value, c: +champs('c').value, m: champs('m').value.trim() };
      if (p.de === p.vers) { champs('vers').classList.add('at-err'); return; }
      champs('vers').classList.remove('at-err');
      P.prop.push(p); champs('m').value = ''; sauverP(); liste();
    };
    liste();
    return d;
  }

  function exporterP(tour) {
    const tete = ['participant', 'tour', 'type', 'de', 'vers', 'de_nom', 'vers_nom', 'existe', 'signe', 'classe', 'commentaire', 'date'];
    const date = new Date().toISOString().slice(0, 10);
    const code = P.code || t('anonyme', 'anonymous');
    const E2 = { o: 'oui', n: 'non', '?': 'nsp' };
    const rows = [];
    for (const l of liens) {
      const r2 = P.rep[l.k]; if (!r2 || !r2.e) continue;
      rows.push([code, tour, 'lien', l.de, l.vers, nom(l.de), nom(l.vers), E2[r2.e] || '', r2.e === 'n' ? '' : (r2.s === '?' ? 'nsp' : r2.s || ''), r2.e === 'n' ? '' : (r2.c === '?' ? 'nsp' : r2.c ?? ''), r2.m || '', date]);
    }
    for (const p of P.prop) rows.push([code, tour, 'propose', p.de, p.vers, nom(p.de), nom(p.vers), 'oui', p.s, p.c, p.m || '', date]);
    if (!rows.length) { alert(t('Vous n\'avez encore répondu à aucun lien.', 'You have not answered any link yet.')); return; }
    const sur = String(code).replace(/[^\w-]+/g, '_').slice(0, 30);
    telecharger(csvTexte([tete, ...rows]), `APRI-atelier-${sur}-tour${tour}.csv`);
  }

  // ============================================================ facilitator
  function animateur() {
    const z = document.createElement('div'); z.className = 'at-anim'; zone.append(z);

    // guide
    const gd = apri.h(`<details class="pli at-guide"><summary>${esc(t('Guide de l\'animateur (une page, à imprimer)', 'Facilitator guide (one page, printable)'))}</summary>
      <div class="at-guide-in">${guideHTML(apri)}</div>
      <p><button type="button" class="bouton primaire">${esc(t('Imprimer le guide', 'Print the guide'))}</button></p></details>`);
    gd.querySelector('button').onclick = () => imprimerGuide(apri);
    z.append(gd);

    // step 1: prepare
    const s1 = apri.h(`<div class="at-etape"><h3><span>1</span>${esc(t('Préparer : choisir les liens', 'Prepare: choose the links'))}</h3>
      <p class="note">${esc(t('15 à 30 liens suffisent pour un atelier. Choisissez un thème, cochez, puis partagez le lien ou le code.', '15 to 30 links are enough for one workshop. Pick a theme, tick, then share the link or the code.'))}</p>
      <div class="pastilles at-th"></div>
      <details class="pli"><summary><span>${esc(t('Liste des liens', 'List of links'))} (<span class="at-nsel"></span>)</span></summary><div class="at-cases"></div></details>
      <div class="at-partage"></div></div>`);
    z.append(s1);
    const th = s1.querySelector('.at-th');
    const boutonsTheme = [['tous', t('Tous les liens', 'All links')], ...themes.map(d => [d, nomTheme(d)]), ['aucun', t('Aucun', 'None')]];
    th.innerHTML = boutonsTheme.map(([k, txt]) => `<button type="button" class="bouton" data-k="${k}">${esc(txt)}</button>`).join('');
    th.querySelectorAll('button').forEach(b => b.onclick = () => {
      const k = b.dataset.k;
      A.sel = k === 'tous' ? liens.map(l => l.k) : k === 'aucun' ? [] : liens.filter(l => l.dims.includes(k)).map(l => l.k);
      sauverA(); majSel(true);
    });
    const cases = s1.querySelector('.at-cases');
    const majSel = (cocher) => {
      const s = new Set(A.sel);
      if (cocher || !cases.childElementCount) {
        cases.innerHTML = themes.map(d => {
          const ls = liens.filter(l => parId[l.de]?.dim === d);
          return `<div class="at-grp"><h5><i style="background:${donnees.couleurs_dim[d]}"></i>${esc(nomTheme(d))}</h5>${ls.map(l => `<label><input type="checkbox" value="${l.k}" ${s.has(l.k) ? 'checked' : ''}> ${esc(nom(l.de))} → ${esc(nom(l.vers))}</label>`).join('')}</div>`;
        }).join('');
        cases.querySelectorAll('input').forEach(i => i.onchange = () => {
          A.sel = [...cases.querySelectorAll('input:checked')].map(x => x.value); sauverA(); majSel(false);
        });
      }
      s1.querySelector('.at-nsel').textContent = t(`${A.sel.length} choisis`, `${A.sel.length} chosen`);
      const p = s1.querySelector('.at-partage');
      if (!A.sel.length) { p.innerHTML = `<p class="note">${esc(t('Aucun lien choisi : les participants verront tous les liens.', 'No link chosen: participants will see every link.'))}</p>`; return; }
      const code = coder(A.sel, liens);
      const url = location.origin + location.pathname + '?atelier=' + code + '#boucles/atelier';
      p.innerHTML = `<label class="libelle">${esc(t('Lien à partager avec les participants', 'Link to share with participants'))}</label>
        <div class="at-ligne"><input class="champ" readonly value="${esc(url)}"><button type="button" class="bouton primaire">${esc(t('Copier', 'Copy'))}</button></div>
        <p class="note">${esc(t('Ou le code à taper en mode participant :', 'Or the code to type in participant mode:'))} <code>${esc(code)}</code></p>`;
      const [inp, b] = [p.querySelector('input'), p.querySelector('button')];
      b.onclick = async () => {
        try { await navigator.clipboard.writeText(url); } catch (e) { inp.select(); try { document.execCommand('copy'); } catch (e2) {} }
        b.textContent = t('Copié ✓', 'Copied ✓'); setTimeout(() => { b.textContent = t('Copier', 'Copy'); }, 1800);
      };
    };
    majSel(true);

    // step 2: gather
    const s2 = apri.h(`<div class="at-etape"><h3><span>2</span>${esc(t('Rassembler les réponses', 'Gather the answers'))}</h3>
      <label class="at-depot"><input type="file" accept=".csv,text/csv" multiple hidden>
        <b>${esc(t('Déposez ici les fichiers CSV des participants', 'Drop the participants\' CSV files here'))}</b>
        <span>${esc(t('ou cliquez pour les choisir (plusieurs à la fois)', 'or click to choose them (several at once)'))}</span></label>
      <div class="at-chips"></div>
      <div class="at-ligne2"><button type="button" class="bouton at-ex">${esc(t('Essayer avec des réponses d\'exemple', 'Try with example answers'))}</button>
        <button type="button" class="bouton at-vider">${esc(t('Tout retirer', 'Remove all'))}</button></div></div>`);
    z.append(s2);
    const depot = s2.querySelector('.at-depot'), fin = s2.querySelector('input');
    const importer = async files => {
      let ok = 0, ko = [];
      for (const f of files) {
        try {
          const rows = lireCSV(await f.text());
          if (!rows.length || !('participant' in rows[0]) || !('de' in rows[0])) { ko.push(f.name); continue; }
          const part = rows[0].participant || f.name.replace(/\.csv$/i, '');
          const tour = parseInt(rows[0].tour, 10) || 1;
          const lignes = rows.map(x => ({ type: x.type === 'propose' ? 'propose' : 'lien', de: x.de, vers: x.vers, e: normE(x.existe), s: normS(x.signe), c: normC(x.classe), m: x.commentaire || '' }));
          A.fichiers = A.fichiers.filter(x => !(x.participant === part && String(x.tour) === String(tour)));
          A.fichiers.push({ participant: part, tour, fichier: f.name, lignes });
          ok++;
        } catch (e) { ko.push(f.name); }
      }
      sauverA(); dessiner();
      if (ko.length) alert(t('Fichiers non reconnus : ', 'Files not recognised: ') + ko.join(', '));
    };
    fin.onchange = () => importer([...fin.files]);
    depot.ondragover = e => { e.preventDefault(); depot.classList.add('sur'); };
    depot.ondragleave = () => depot.classList.remove('sur');
    depot.ondrop = e => { e.preventDefault(); depot.classList.remove('sur'); importer([...e.dataTransfer.files].filter(f => /\.csv$/i.test(f.name))); };
    s2.querySelector('.at-ex').onclick = () => { A.fichiers = A.fichiers.filter(f => !f.exemple).concat(exemple(liens)); sauverA(); dessiner(); };
    s2.querySelector('.at-vider').onclick = () => { if (!A.fichiers.length || confirm(t('Retirer tous les fichiers importés ?', 'Remove every imported file?'))) { A.fichiers = []; sauverA(); dessiner(); } };
    const chips = s2.querySelector('.at-chips');
    chips.innerHTML = A.fichiers.length ? A.fichiers.map((f, j) => `<span class="at-chip${f.exemple ? ' ex' : ''}">${esc(f.participant)} · ${esc(t('tour', 'round'))} ${f.tour} · ${f.lignes.filter(x => x.type === 'lien' && x.e).length} ${esc(t('réponses', 'answers'))}<button type="button" data-j="${j}" aria-label="${esc(t('Retirer', 'Remove'))}">×</button></span>`).join('')
      : `<span class="note">${esc(t('Aucun fichier pour l\'instant.', 'No file yet.'))}</span>`;
    chips.querySelectorAll('button').forEach(b => b.onclick = () => { A.fichiers.splice(+b.dataset.j, 1); sauverA(); dessiner(); });

    if (!A.fichiers.length) return;

    // step 3: results
    const tours = [...new Set(A.fichiers.map(f => String(f.tour)))].sort();
    if (A.tour !== 'dernier' && !tours.includes(String(A.tour))) A.tour = 'dernier';
    const agg = agreger(A.fichiers, liens, A.tour);
    const repondus = liens.filter(l => agg.res.get(l.k).n > 0);
    const cnt = k => repondus.filter(l => agg.res.get(l.k).accord === k).length;
    const ecart = l => { const a = agg.res.get(l.k); return a.med == null ? null : Math.round(a.med) - classeNum(l.a.force); };
    const nDiff = repondus.filter(l => { const e = ecart(l); return e != null && e !== 0; }).length;
    const nDoute = repondus.filter(l => { const a = agg.res.get(l.k); return a.oui + a.non >= 3 && a.pExiste < 0.5; }).length;
    let evol = '';
    if (tours.length > 1) {
      const a1 = agreger(A.fichiers, liens, tours[0]), a2 = agreger(A.fichiers, liens, tours[tours.length - 1]);
      const fort = ag => liens.filter(l => ag.res.get(l.k).accord === 'fort').length;
      evol = `<p class="at-evol">${esc(t(`Accord fort : ${fort(a1)} liens au tour ${tours[0]}, ${fort(a2)} au tour ${tours[tours.length - 1]}.`, `Strong agreement: ${fort(a1)} links in round ${tours[0]}, ${fort(a2)} in round ${tours[tours.length - 1]}.`))}</p>`;
    }
    const s3 = apri.h(`<div class="at-etape"><h3><span>3</span>${esc(t('Ce que dit le groupe', 'What the group says'))}</h3>
      <div class="at-tuiles">
        <div><b>${agg.participants.length}</b><span>${esc(t('participants', 'participants'))}</span></div>
        <div><b>${repondus.length}</b><span>${esc(t('liens discutés', 'links answered'))}</span></div>
        <div class="fort"><b>${cnt('fort')}</b><span>${esc(t('accord fort', 'strong agreement'))}</span></div>
        <div class="partage"><b>${cnt('partage')}</b><span>${esc(t('accord partagé', 'partial agreement'))}</span></div>
        <div class="faible"><b>${cnt('faible')}</b><span>${esc(t('accord faible', 'weak agreement'))}</span></div>
        <div class="diff"><b>${nDiff}</b><span>${esc(t('autre classe que le modèle', 'other class than the model'))}</span></div>
      </div>${evol}
      ${nDoute ? `<p class="at-alerte">⚠ ${esc(t(`Pour ${nDoute} lien(s), la majorité pense que le lien n'existe pas.`, `For ${nDoute} link(s), most people think the link does not exist.`))}</p>` : ''}
      <div class="at-filtres">
        ${tours.length > 1 ? `<label><span class="libelle">${esc(t('Tour', 'Round'))}</span><select class="champ at-tsel"><option value="dernier">${esc(t('Dernière réponse de chacun', 'Latest answer of each'))}</option>${tours.map(x => `<option value="${x}">${esc(t('Tour', 'Round'))} ${x}</option>`).join('')}</select></label>` : ''}
        <label><span class="libelle">${esc(t('Afficher', 'Show'))}</span><select class="champ at-fsel">
          <option value="tous">${esc(t('Tous les liens répondus', 'All answered links'))}</option>
          <option value="diff">${esc(t('Le groupe diffère du modèle', 'Group differs from the model'))}</option>
          <option value="faible">${esc(t('Accord faible ou partagé', 'Weak or partial agreement'))}</option>
          <option value="doute">${esc(t('Le groupe doute que le lien existe', 'Group doubts the link exists'))}</option></select></label>
        <label><span class="libelle">${esc(t('Thème', 'Theme'))}</span><select class="champ at-thsel"><option value="">${esc(t('Tous les thèmes', 'All themes'))}</option>${themes.map(d => `<option value="${d}">${esc(nomTheme(d))}</option>`).join('')}</select></label>
      </div>
      <div class="at-legende"><span><i class="b"></i>${esc(t('de la plus basse à la plus haute réponse', 'from lowest to highest answer'))}</span><span><i class="m"></i>${esc(t('médiane du groupe', 'group median'))}</span><span><i class="r"></i>${esc(t('classe actuelle du modèle', 'current model class'))}</span></div>
      <div class="at-res"></div>
      <details class="pli"><summary>${esc(t('Comment c\'est calculé', 'How it is computed'))}</summary>
        <ul class="me-liste">
          <li>${esc(t('Médiane : la classe du milieu quand on range les réponses (les « je ne sais pas » et les « le lien n\'existe pas » ne comptent pas dans la force).', 'Median: the middle class once the answers are sorted ("I don\'t know" and "the link does not exist" do not count in the strength).'))}</li>
          <li>${esc(t('Accord : écart entre le premier et le troisième quart des réponses. Une classe d\'écart ou moins : fort ; deux : partagé ; plus : faible. Moins de 3 réponses : trop peu.', 'Agreement: gap between the first and third quarter of the answers. One class or less: strong; two: partial; more: weak. Fewer than 3 answers: too few.'))}</li>
          <li>${esc(t('Existence : part des « oui » parmi les « oui » et les « non ».', 'Existence: share of "yes" among "yes" and "no".'))}</li>
        </ul></details>
      <div class="at-ligne2"><button type="button" class="bouton at-csv">⬇ ${esc(t('Résultats (CSV)', 'Results (CSV)'))}</button></div>
    </div>`);
    z.append(s3);
    const tsel = s3.querySelector('.at-tsel'); if (tsel) { tsel.value = String(A.tour); tsel.onchange = () => { A.tour = tsel.value; sauverA(); dessiner(); }; }
    const fsel = s3.querySelector('.at-fsel'), thsel = s3.querySelector('.at-thsel');
    fsel.value = A.filtre; thsel.value = A.theme || '';
    const zres = s3.querySelector('.at-res');
    const dessinerRes = () => {
      let ls = repondus;
      if (A.theme) ls = ls.filter(l => l.dims.includes(A.theme));
      if (A.filtre === 'diff') ls = ls.filter(l => { const e = ecart(l); return e != null && e !== 0; });
      if (A.filtre === 'faible') ls = ls.filter(l => ['faible', 'partage'].includes(agg.res.get(l.k).accord));
      if (A.filtre === 'doute') ls = ls.filter(l => { const a = agg.res.get(l.k); return a.oui + a.non >= 3 && a.pExiste < 0.5; });
      const ordre = { faible: 0, partage: 1, peu: 2, fort: 3 };
      ls = [...ls].sort((x, y) => ordre[agg.res.get(x.k).accord] - ordre[agg.res.get(y.k).accord] || Math.abs(ecart(y) ?? 0) - Math.abs(ecart(x) ?? 0));
      if (!ls.length) { zres.innerHTML = `<div class="vide">${esc(t('Aucun lien pour ce filtre.', 'No link for this filter.'))}</div>`; return; }
      const total = ls.length; ls = ls.slice(0, voir);
      zres.innerHTML = ls.map(l => {
        const a = agg.res.get(l.k), mc = classeNum(l.a.force), e = ecart(l);
        const pos = k => ((k - 1) / 4 * 100).toFixed(1) + '%';
        const echelle = a.med == null ? `<div class="at-ech vide"></div>` : `<div class="at-ech" title="${esc(t('médiane', 'median'))} ${a.med}">
          <i class="b" style="left:${pos(a.min)};width:calc(${pos(a.max)} - ${pos(a.min)})"></i>
          <i class="r" style="left:${pos(mc)}"></i><i class="m" style="left:${pos(a.med)}"></i></div>`;
        const flag = e == null ? '' : e === 0 ? `<span class="me-flag ok">=</span>` : e > 0 ? `<span class="me-flag haut">↑ ${e}</span>` : `<span class="me-flag bas">↓ ${-e}</span>`;
        const signeAlerte = a.signe && a.signe !== l.a.signe ? `<span class="at-badge faible">${esc(t('sens inverse au modèle', 'direction opposite to the model'))}</span>` : '';
        const ex = a.pExiste != null ? `${Math.round(a.pExiste * 100)}${L === 'en' ? '%' : ' %'} ${esc(t('disent qu\'il existe', 'say it exists'))}` : '';
        return `<div class="at-r"><div class="at-r-t"><b>${esc(nom(l.de))}</b> <span class="${l.a.signe < 0 ? 'neg' : 'pos'}">${l.a.signe < 0 ? '⊣' : '→'}</span> <b>${esc(nom(l.vers))}</b>
            <span class="note">${a.n} ${esc(t('réponses', 'answers'))}${ex ? ' · ' + ex : ''}</span></div>
          <div class="at-r-g">${echelle}<div class="at-r-m">${esc(t('Groupe', 'Group'))} ${pastille(a.med, apri)}</div>
            <span class="at-badge ${a.accord}">${esc(apri.tt(ACCORDS[a.accord]))}</span>
            <div class="at-r-m mod">${esc(t('Modèle', 'Model'))} ${pastille(mc, apri, false)} ${flag}</div>${signeAlerte}</div>
          ${a.comm.length ? `<details class="at-com"><summary>${a.comm.length} ${esc(t('remarque(s)', 'remark(s)'))}</summary><ul>${a.comm.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}</div>`;
      }).join('') + (total > ls.length ? `<div class="at-plus"><button type="button" class="bouton">${esc(t(`Voir plus (${total - ls.length} autres)`, `Show more (${total - ls.length} more)`))}</button></div>` : '');
      const plus = zres.querySelector('.at-plus button'); if (plus) plus.onclick = () => { voir += 15; dessinerRes(); };
    };
    let voir = 12;
    fsel.onchange = () => { A.filtre = fsel.value; voir = 12; sauverA(); dessinerRes(); };
    thsel.onchange = () => { A.theme = thsel.value; voir = 12; sauverA(); dessinerRes(); };
    dessinerRes();
    s3.querySelector('.at-csv').onclick = () => {
      const tete = ['de', 'vers', 'de_nom', 'vers_nom', 'n', 'oui', 'non', 'mediane', 'min', 'max', 'q1', 'q3', 'accord', 'signe_groupe', 'classe_modele', 'signe_modele'];
      const rows = repondus.map(l => { const a = agg.res.get(l.k); return [l.de, l.vers, nom(l.de), nom(l.vers), a.n, a.oui, a.non, a.med ?? '', a.min ?? '', a.max ?? '', a.q1 ?? '', a.q3 ?? '', a.accord, a.signe > 0 ? '+' : a.signe < 0 ? '-' : '', classeNum(l.a.force), l.a.signe > 0 ? '+' : '-']; });
      telecharger(csvTexte([tete, ...rows]), 'APRI-atelier-resultats.csv');
    };

    // proposed links
    const props = [...agg.props.values()].sort((a, b) => b.n - a.n);
    if (props.length) {
      z.append(apri.h(`<div class="at-etape"><h4 class="at-h4">+ ${esc(t('Liens proposés par les participants', 'Links suggested by participants'))}</h4>
        <ul class="at-plist">${props.map(p => `<li><span><b>${esc(nom(p.de))}</b> <b class="${p.signe < 0 ? 'neg' : 'pos'}">${p.signe < 0 ? '⊣' : '→'}</b> <b>${esc(nom(p.vers))}</b> · ${p.n} ${esc(t('personne(s)', 'person(s)'))} · ${pastille(p.med, apri)}${p.raisons.length ? `<br><i class="note">${esc(p.raisons.join(' · '))}</i>` : ''}</span></li>`).join('')}</ul></div>`));
    }

    // Delphi round 2
    const s4 = apri.h(`<div class="at-etape at-delphi"><h3><span>4</span>${esc(t('Deuxième tour (facultatif)', 'Second round (optional)'))}</h3>
      <p>${esc(t('Envoyez ce résumé aux participants. Ils le chargent en mode participant, voient la réponse du groupe pour chaque lien, et revoient leurs réponses seuls. Puis ils vous renvoient un nouveau fichier (tour 2).', 'Send this summary to participants. They load it in participant mode, see the group\'s answer for each link, and review their answers alone. Then they send you a new file (round 2).'))}</p>
      <button type="button" class="bouton primaire">⬇ ${esc(t('Résumé pour le 2e tour (CSV)', 'Summary for round 2 (CSV)'))}</button></div>`);
    z.append(s4);
    s4.querySelector('button').onclick = () => {
      const tete = ['resume', 'de', 'vers', 'de_nom', 'vers_nom', 'n', 'mediane', 'accord', 'existe_pct', 'signe'];
      const rows = repondus.map(l => { const a = agg.res.get(l.k); return ['tour1', l.de, l.vers, nom(l.de), nom(l.vers), a.n, a.med ?? '', a.accord, a.pExiste == null ? '' : Math.round(a.pExiste * 100), a.signe > 0 ? '+' : a.signe < 0 ? '-' : '']; });
      telecharger(csvTexte([tete, ...rows]), 'APRI-atelier-resume-groupe.csv');
    };

    // step 5: calibrated model
    const s5 = apri.h(`<div class="at-etape at-cal"><h3><span>5</span>${esc(t('Essayer le modèle calibré', 'Try the calibrated model'))}</h3>
      <p>${esc(t('On remplace la force des liens par la médiane du groupe, puis on regarde si les leviers changent. Le modèle publié n\'est pas modifié.', 'Link strengths are replaced by the group median, then we check whether the levers change. The published model is not modified.'))}</p>
      <div class="at-opts">
        <label class="at-coche"><input type="checkbox" data-o="retirer" ${A.retirer ? 'checked' : ''}> ${esc(t('Retirer les liens que la majorité juge inexistants', 'Remove the links most people think do not exist'))}</label>
        <label class="at-coche"><input type="checkbox" data-o="ajouter" ${A.ajouter ? 'checked' : ''}> ${esc(t('Ajouter les liens proposés par au moins 2 personnes', 'Add the links suggested by at least 2 people'))}</label>
      </div>
      <button type="button" class="bouton primaire at-go">▶ ${esc(t('Comparer les leviers', 'Compare the levers'))}</button>
      <div class="at-comp"></div></div>`);
    z.append(s5);
    s5.querySelectorAll('[data-o]').forEach(i => i.onchange = () => { A[i.dataset.o] = i.checked; sauverA(); });
    s5.querySelector('.at-go').onclick = () => comparer(s5.querySelector('.at-comp'), agg);
  }

  function comparer(box, agg) {
    box.innerHTML = `<div class="chargement">${esc(t('Calcul…', 'Computing…'))}</div>`;
    setTimeout(() => {
      try {
        const m0 = E.creerModele(donnees, L);
        const { m: m1, changes } = modeleCalibre(donnees, agg, L, { retirer: A.retirer, ajouter: A.ajouter });
        const p0 = portees(m0), p1 = portees(m1);
        const rang0 = new Map(p0.map((x, i) => [x.id, i])), rang1 = new Map(p1.map((x, i) => [x.id, i]));
        const N = 5, max = Math.max(p0[0].p, p1[0].p) || 1;
        const top0 = p0.slice(0, N), top1 = p1.slice(0, N);
        const mot = v => { const f = v / max; return f >= 0.66 ? t('portée forte', 'wide reach') : f >= 0.33 ? t('portée moyenne', 'medium reach') : t('portée faible', 'narrow reach'); };
        const col = (top, autre, titre, cls) => `<div class="at-col ${cls}"><h4>${esc(titre)}</h4><ol>${top.map((x, i) => {
          const ra = autre.get(x.id), d = ra == null ? null : ra - i;
          const mv = cls === 'cal' ? (d == null ? '' : d === 0 ? `<span class="at-mv eg">=</span>` : d > 0 ? `<span class="at-mv up" title="${esc(t('monte', 'moves up'))}">↑ ${d}</span>` : `<span class="at-mv dn">↓ ${-d}</span>`) : '';
          return `<li><span class="at-rg">${i + 1}</span><div><b>${esc(nom(x.id))}</b> ${mv}<div class="at-barre"><i style="width:${(100 * x.p / max).toFixed(1)}%"></i></div><small>${esc(mot(x.p))}</small></div></li>`;
        }).join('')}</ol></div>`;
        const s0 = new Set(top0.map(x => x.id)), s1 = new Set(top1.map(x => x.id));
        const entrent = top1.filter(x => !s0.has(x.id)).map(x => nom(x.id)), sortent = top0.filter(x => !s1.has(x.id)).map(x => nom(x.id));
        const memePremier = top0[0].id === top1[0].id;
        let phrase;
        if (!entrent.length && top0.every((x, i) => x.id === top1[i].id)) phrase = t('Avec les forces de l\'atelier, les cinq premiers leviers restent les mêmes, dans le même ordre. Le classement est robuste à l\'avis du groupe.', 'With the workshop strengths, the top five levers stay the same, in the same order. The ranking holds up against the group\'s view.');
        else if (!entrent.length) phrase = t('Les cinq premiers leviers restent les mêmes, mais leur ordre change.', 'The top five levers stay the same, but their order changes.');
        else phrase = t(`${entrent.join(', ')} entre${entrent.length > 1 ? 'nt' : ''} parmi les cinq premiers leviers ; ${sortent.join(', ')} en sort${sortent.length > 1 ? 'ent' : ''}.`, `${entrent.join(', ')} ${entrent.length > 1 ? 'enter' : 'enters'} the top five levers; ${sortent.join(', ')} ${sortent.length > 1 ? 'drop' : 'drops'} out.`);
        if (!memePremier) phrase += ' ' + t(`Le premier levier devient « ${nom(top1[0].id)} ».`, `The first lever becomes "${nom(top1[0].id)}".`);
        box.innerHTML = `<p class="at-phrase">${esc(phrase)}</p>
          <div class="at-cols">${col(top0, rang1, t('Modèle actuel', 'Current model'), 'act')}${col(top1, rang0, t('Modèle calibré par l\'atelier', 'Model calibrated by the workshop'), 'cal')}</div>
          <p class="note">${esc(t(`Changements appliqués : ${changes.classe} liens changent de classe, ${changes.signe} changent de sens, ${changes.retires.length} retirés, ${changes.ajoutes.length} ajoutés.`, `Changes applied: ${changes.classe} links change class, ${changes.signe} change direction, ${changes.retires.length} removed, ${changes.ajoutes.length} added.`))}</p>
          <details class="pli"><summary>${esc(t('Détail chiffré (valeurs du modèle, pas des mesures)', 'Figures (model values, not measurements)'))}</summary>
            <div class="me-defile"><table class="tableau"><thead><tr><th>${esc(t('Variable', 'Variable'))}</th><th class="num">${esc(t('Portée actuelle', 'Current reach'))}</th><th class="num">${esc(t('Portée calibrée', 'Calibrated reach'))}</th><th class="num">${esc(t('Rang', 'Rank'))}</th></tr></thead>
            <tbody>${p1.slice(0, 12).map((x, i) => { const a = p0[rang0.get(x.id)]; return `<tr><td>${esc(nom(x.id))}</td><td class="num">${apri.nombre(a.p, 2)}</td><td class="num">${apri.nombre(x.p, 2)}</td><td class="num">${rang0.get(x.id) + 1} → ${i + 1}</td></tr>`; }).join('')}</tbody></table></div>
            <p class="note">${esc(t(`Portée : somme de ce qui bouge ailleurs (points sur 10) après une poussée de +1 sur la variable. Stabilité du modèle avant mise à l'échelle : ${apri.nombre(m0.diag.rayon, 2)} (actuel), ${apri.nombre(m1.diag.rayon, 2)} (calibré) ; les deux sont ramenés à ${apri.nombre(m0.C.RAYON_CIBLE, 1)}.`, `Reach: total movement elsewhere (points out of 10) after a +1 push on the variable. Model stability before rescaling: ${apri.nombre(m0.diag.rayon, 2)} (current), ${apri.nombre(m1.diag.rayon, 2)} (calibrated); both are brought to ${apri.nombre(m0.C.RAYON_CIBLE, 1)}.`))}</p>
          </details>`;
      } catch (e) {
        console.error(e);
        box.innerHTML = `<div class="vide">${esc(t('Le calcul n\'a pas abouti.', 'The computation failed.'))}</div>`;
      }
    }, 30);
  }

  dessiner();
}
