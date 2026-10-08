/* Tab "Variables les plus alarmantes / Most alarming variables" of
   "Analyser les résultats" (port of analyse_ecarts.render_alarmes followed by
   interventions_page.chercheur("sol")).
   A group is designated by five optional registers; its lowest scores, its
   highest scores, and where it falls furthest behind the rest of the cohort.
   Streamlit computes on household data; here every profile the five
   selectors can build is precomputed as aggregates (outils/export_resultats_solutions.py).
   Profiles or indicator cells resting on fewer than 5 households are not shown. */
import {donnees as donneesFiches, chercheur, feuille} from '../fiches/commun.js';

const etat = {choix: {}, combien: 5, demande: ''};
const ROUGE = '#c33a24';

function f(apri, v, dec = 2, signe = false){
 if(v == null || isNaN(v)) return '—';
 let s = Number(v).toFixed(dec);
 if(signe && !s.startsWith('-')) s = '+' + s;
 return apri.lang !== 'en' ? s.replace('.', ',') : s;
}

function alerte(score, ecart){
 const e = ecart || 0;
 if(score <= 2 || (score <= 4 && e >= 2)) return 'critique';
 if(score <= 4 || (score <= 6 && e >= 2)) return 'eleve';
 if(score <= 6 || e >= 2) return 'modere';
 return 'faible';
}

export default async function render(el, apri){
 feuille('css/resultats.css');
 const meta = await apri.donnees('data/resultats/solutions/meta.json');
 const T = (k, p) => {
  const o = meta.textes[k]; let s = o ? apri.t(o.fr, o.en) : k;
  if(p) for(const [a, b] of Object.entries(p)) s = s.split('{' + a + '}').join(b);
  return s;
 };
 const e = apri.esc;
 el.innerHTML = '';
 const racine = document.createElement('div'); racine.className = 'sol-z';
 el.append(racine);

 // ---- whose variables: five optional registers
 racine.append(apri.h(`<div class="sol-sec">${e(T('al_qui'))}<span class="l"></span></div>`));
 const grille = document.createElement('div'); grille.className = 'sol-regs';
 for(const ax of meta.axes){
  const v = etat.choix[ax.axe] || '';
  const b = apri.h(`<div><label class="libelle">${e(apri.tt(ax.lib))}</label><select class="champ">
   <option value="">${e(T('al_tous'))}</option>${ax.valeurs.map(x => `<option value="${e(x.v)}"${x.v === v ? ' selected' : ''}>${e(apri.t(x.fr, x.en))}</option>`).join('')}</select></div>`);
  b.querySelector('select').onchange = ev => { etat.choix[ax.axe] = ev.target.value || null; render(el, apri); };
  grille.append(b);
 }
 racine.append(grille);
 const cb = apri.h(`<div class="sol-combien"><label class="libelle">${e(T('al_combien'))}</label><select class="champ">${[5, 10, 20].map(n => `<option${n === etat.combien ? ' selected' : ''}>${n}</option>`).join('')}</select></div>`);
 cb.querySelector('select').onchange = ev => { etat.combien = Number(ev.target.value); render(el, apri); };
 racine.append(cb);

 const resultat = document.createElement('div'); racine.append(resultat);
 const bas = document.createElement('div'); bas.className = 'sol-chercheur'; racine.append(bas);

 // the search for intervention profiles, under the tables
 donneesFiches(apri).then(d => chercheur(bas, apri, d, etat, null, null)).catch(err => console.error(err));

 // ---- the profile
 const sec = etat.choix.section || '';
 const fichier = meta.fichiers[sec];
 const prof = await apri.donnees(`data/resultats/solutions/${fichier}.json`);
 const cle = meta.axes.slice(1).map(ax => etat.choix[ax.axe] || '').join('|');
 const p = prof[cle];
 const noms = meta.axes.map(ax => ax.valeurs.find(x => x.v === etat.choix[ax.axe])).filter(Boolean).map(x => apri.t(x.fr, x.en));
 const nom = noms.length ? noms.join(' · ') : null;
 const libG = nom || T('al_tout_ech');
 const infoBox = txt => apri.h(`<div class="sol-info">${e(txt)}</div>`);
 if(!p || p.n === 0){ resultat.append(infoBox(T('ec_rien'))); return; }
 if(p.n === '<5'){
  resultat.append(infoBox(apri.t('Moins de 5 ménages dans ce groupe (n < 5) : ses résultats ne sont pas publiés, pour protéger les répondants.',
   'Fewer than 5 households in this group (n < 5): its results are not published, to protect respondents.')));
  return;
 }
 let masques = 0;
 const lignes = [];
 p.i.forEach((x, k) => {
  if(x === 0) return;
  if(x === null){ masques++; return; }
  const ind = meta.indicateurs[k];
  const l = {nom: apri.t(ind.fr, ind.en), ligne: ind.ligne, moyenne: ind.moyenne, score: x[0], valeur: x[1], n: x[2]};
  if(nom){ l.reste = x[3] ?? null; l.d = l.reste == null ? null : Math.round((l.score - l.reste) * 100) / 100; }
  lignes.push(l);
 });
 if(!lignes.length){ resultat.append(infoBox(T('ec_rien'))); return; }
 const k = etat.combien;
 resultat.append(apri.h(`<p class="sol-note">${e(T('al_n', {g: libG, n: f(apri, p.n, 0)}))}</p>`));
 if(masques) resultat.append(apri.h(`<p class="sol-note">${e(apri.t(
  `${masques} indicateur${masques > 1 ? 's reposent' : ' repose'} sur moins de 5 ménages dans ce groupe et n'${masques > 1 ? 'apparaissent' : 'apparaît'} pas (n < 5).`,
  `${masques} indicator${masques > 1 ? 's rest' : ' rests'} on fewer than 5 households in this group and ${masques > 1 ? 'are' : 'is'} not shown (n < 5).`))}</p>`));

 const valTxt = l => l.valeur == null ? '' : (l.moyenne ? f(apri, l.valeur, 3) : f(apri, l.valeur, 1) + '&#8201;%');
 const pastille = niv => {
  const c = {critique: ROUGE, eleve: '#d1730c', modere: '#b58b00'}[niv] || '#8a93a5';
  return `<span class="sol-past"><i style="background:${c}"></i><span style="color:${c}">${e(T('al_n_' + niv))}</span></span>`;
 };
 const table = (ls, avecReste) => {
  let h = `<table class="sol-tab"><thead><tr><th>${e(T('al_c_ind'))}</th><th class="n">${e(T('al_c_score'))}</th><th class="n">${e(T('al_c_val'))}</th>`;
  if(avecReste) h += `<th class="n">${e(T('al_c_reste'))}</th><th class="n">${e(T('al_c_ecart'))}</th>`;
  h += `<th>${e(T('al_alerte'))}</th></tr></thead><tbody>`;
  for(const x of ls){
   h += `<tr${x.n < meta.n_min ? ' class="pale"' : ''}><td>${e(x.nom)}</td><td class="n v" style="color:${x.coul}">${f(apri, x.score, 1)}</td><td class="n">${valTxt(x)}</td>`;
   if(avecReste) h += `<td class="n" style="color:#8a93a5">${f(apri, x.reste, 1)}</td><td class="n v" style="color:${ROUGE}">${f(apri, x.d, 1)}</td>`;
   h += `<td>${pastille(x.alerte)}</td></tr>`;
  }
  return h + '</tbody></table>';
 };
 const csv = (ls, avecReste, nomFichier) => {
  const b = apri.h(`<button type="button" class="bouton sol-csv">CSV ↓</button>`);
  b.onclick = () => {
   const q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
   const tete = [T('al_c_ind'), T('al_c_score'), T('al_c_val'), ...(avecReste ? [T('al_c_reste'), T('al_c_ecart')] : []), T('al_alerte')];
   const rows = ls.map(x => [x.nom, x.score, x.valeur, ...(avecReste ? [x.reste, x.d] : []), T('al_n_' + x.alerte)]);
   const txt = '﻿' + [tete, ...rows].map(r => r.map(q).join(',')).join('\n');
   const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(new Blob([txt], {type: 'text/csv'})), download: nomFichier});
   document.body.append(a); a.click(); a.remove();
  };
  return b;
 };

 const cols = document.createElement('div'); cols.className = 'sol-cols';
 const basL = [...lignes].sort((a, b) => a.score - b.score || a.valeur - b.valeur).slice(0, k)
  .map(x => ({...x, coul: ROUGE, alerte: alerte(x.score, null)}));
 const hautL = [...lignes].sort((a, b) => b.score - a.score || b.valeur - a.valeur).slice(0, k)
  .map(x => ({...x, coul: '#1a6b52', alerte: alerte(x.score, null)}));
 const c1 = apri.h(`<div><div class="sol-sec" style="margin-top:18px">${e(T('al_bas'))}<span class="l"></span></div><div class="sol-defile">${table(basL)}</div></div>`);
 c1.append(csv(basL, false, 'variables_basses.csv'));
 const c2 = apri.h(`<div><div class="sol-sec" style="margin-top:18px">${e(T('al_haut'))}<span class="l"></span></div><div class="sol-defile">${table(hautL)}</div></div>`);
 c2.append(csv(hautL, false, 'variables_hautes.csv'));
 cols.append(c1, c2);
 resultat.append(cols);

 // ---- where the group falls furthest behind the rest
 resultat.append(apri.h(`<div class="sol-sec" style="margin-top:24px">${e(T('al_ecart'))}<span class="l"></span></div>`));
 if(!nom){ resultat.append(apri.h(`<p class="sol-note">${e(T('al_ecart_vide'))}</p>`)); return; }
 const ecarts = lignes.filter(x => x.d != null && x.d < 0).sort((a, b) => a.d - b.d).slice(0, k)
  .map(x => ({...x, coul: ROUGE, alerte: alerte(x.score, -x.d)}));
 const nr = p.nr === '<5' ? 'n < 5' : f(apri, p.nr, 0);
 resultat.append(apri.h(`<p class="sol-note">${e(T('al_ecart_x', {n: nr}))}</p>`));
 if(ecarts.length){
  const w = apri.h(`<div><div class="sol-defile">${table(ecarts, true)}</div></div>`);
  w.append(csv(ecarts, true, 'variables_ecarts.csv'));
  resultat.append(w);
  if(ecarts.some(x => x.n < meta.n_min)) resultat.append(apri.h(`<p class="sol-note">${e(T('ec_fragile', {n: meta.n_min}))}</p>`));
 } else resultat.append(apri.h(`<p class="sol-note">${e(T('al_ecart_rien'))}</p>`));
}
