/* Shared pieces of the intervention profiles (port of interventions_page.py):
   data, texts, the free-text search (chercheur), a lever's proposal and the
   full drafted profile. Used by js/fiches/fiches.js and js/resultats/solutions.js.
   Every element is drawn with "fi-" classes; the styles live in css/fiches.css
   (under #fiches) and are repeated in css/resultats.css (under #resultats .sol-). */
import {classer} from './recherche.js';

export const CAT_COULEUR = {structurel:'#7048b6', technique:'#2166ac', organisationnel:'#0f8fa8', comportemental:'#1a8a4f'};
export const NIVEAU_COULEUR = {1:'#2166ac', 2:'#1a8a4f', 3:'#0f8fa8', 4:'#7048b6'};
export const HAUSSE = '#1a8a4f', ALERTE = '#d1730c', BAISSE = '#c33a24', ENCRE = '#101728', ENCRE2 = '#3c4761', ENCRE3 = '#6b7590';

export function feuille(href){
 if(!document.querySelector(`link[href="${href}"]`))
  document.head.append(Object.assign(document.createElement('link'), {rel:'stylesheet', href}));
}

let _d = null;
/** fiches.json, plus derived lookups */
export async function donnees(apri){
 if(_d) return _d;
 const d = await apri.donnees('data/fiches/fiches.json');
 d.parLevier = Object.fromEntries(d.fiches.map(f => [f.levier, f]));
 _d = d;
 return d;
}

/** a text of the module, in the current language, with {x} replaced */
export function T(apri, d, cle, params){
 const o = d.textes[cle];
 let s = o ? (apri.lang === 'en' ? (o.en ?? o.fr) : (o.fr ?? o.en)) : cle;
 if(params) for(const [k, v] of Object.entries(params)) s = s.split('{' + k + '}').join(v);
 return s;
}

/** _fmt of the Streamlit page: fixed decimals, optional sign (decimal comma in French) */
export function fmt(apri, v, dec = 1, signe = false){
 if(v == null || isNaN(v)) return '—';
 let s = Number(v).toFixed(dec);
 if(signe && !s.startsWith('-')) s = '+' + s;
 return apri.lang === 'fr' ? s.replace('.', ',') : s;
}

/** escape, then **double asterisks** to bold */
export function gras(apri, t){
 return apri.esc(t).split('**').map((m, i) => i % 2 ? `<b>${m}</b>` : m).join('');
}

export function libelle(apri, d, nid){
 const n = d.leviers[nid];
 return n ? apri.t(n.fr, n.en) : nid;
}

export function catDe(d, nid){
 const f = d.parLevier[nid];
 return f ? f.cat : (d.cat_de_dim[d.leviers[nid]?.dim || ''] || 'structurel');
}

/** a <details class="pli"> holding content built by remplir(div) */
export function pli(apri, titre, ouvert, remplir){
 const det = document.createElement('details');
 det.className = 'pli fi-pli';
 if(ouvert) det.open = true;
 det.innerHTML = `<summary>${apri.esc(titre)}</summary>`;
 const corps = document.createElement('div'); corps.className = 'fi-corps';
 det.append(corps);
 // drawn lazily, the first time it opens
 let fait = false;
 const go = () => { if(!fait && det.open){ fait = true; remplir(corps); } };
 det.addEventListener('toggle', go);
 go();
 return det;
}

export function info(apri, txt){
 return apri.h(`<div class="fi-info">${gras(apri, txt)}</div>`);
}

/* ------------------------------------------------------------ a lever's proposal
   _proposition(x): the paragraph, the activity ideas, and the drafted profile
   folded underneath when the lever carries one. */
export function proposition(el, apri, d, nid){
 const n = d.leviers[nid] || {};
 const txt = n.prop ? (n.prop[apri.lang] || n.prop.fr) : null;
 const actes = n.act ? (n.act[apri.lang] || n.act.fr || []) : [];
 if(txt) el.append(apri.h(`<p class="fi-x">${apri.esc(txt)}</p>`));
 if(actes.length){
  el.append(apri.h(`<div><div class="fi-lab fi-lab-act">${apri.esc(T(apri, d, 'int_act_idees'))}</div>
   <ul class="fi-act">${actes.map(a => `<li>${apri.esc(a)}</li>`).join('')}</ul></div>`));
  el.append(apri.h(`<p class="note">${apri.esc(T(apri, d, 'int_act_idees_x'))}</p>`));
 }
 if(!txt && !actes.length){
  el.append(apri.h(`<p class="note">${apri.esc(T(apri, d, 'int_idee_x'))}</p>`));
  return;
 }
 const f = d.parLevier[nid];
 if(f) el.append(pli(apri, T(apri, d, 'int_fiche_complete'), false, c => fiche(c, apri, d, f)));
}

/* ------------------------------------------------------------ the full drafted profile (_fiche) */
export function fiche(el, apri, d, f){
 const t = (k, p) => T(apri, d, k, p);
 const e = apri.esc;
 const id = f.id, niv = f.meadows, coul = NIVEAU_COULEUR[niv], cc = CAT_COULEUR[f.cat];
 const nomLev = libelle(apri, d, f.levier);
 const carte = document.createElement('div'); carte.className = 'fi-fiche';
 const chip = (fond, c, txt) => `<span class="fi-chip" style="background:${fond};color:${c}">${e(txt)}</span>`;
 carte.append(apri.h(`<div class="fi-tete">
  <div><div class="fi-t">${e(t('int_' + id + '_t'))}</div>
   <div class="fi-chips">
    ${chip(cc + '1a', cc, t('int_cat_' + f.cat))}
    ${chip(coul + '1a', coul, niv + ' · ' + t('int_n' + niv))}
    ${chip('#f1f4f9', ENCRE2, t('int_faisabilite') + ' : ' + t('int_f_' + f.faisabilite))}
    ${chip('#f1f4f9', ENCRE2, t('int_horizon') + ' : ' + t('int_h_' + f.horizon))}
    ${chip('#f1f4f9', ENCRE2, t('int_mob') + ' : ' + t('int_mob_' + f.mobilisation))}
    ${f.bascule ? chip('#fdf3e3', '#a8560a', t('int_bascule')) : ''}
   </div></div>
  <div class="fi-effet"><div class="fi-eff" style="color:${f.delta > 0 ? HAUSSE : ENCRE3}">${fmt(apri, f.delta, 3, true)}</div>
   <div class="fi-eff-l">${e(t('int_effet'))}</div></div></div>`));

 // where the figure comes from
 carte.append(pli(apri, `${t('int_dou')} : ${fmt(apri, f.delta, 3, true)}`, false, c => {
  const dc = f.dec;
  c.append(apri.h(`<p class="note">${e(t('int_dou_f'))}</p>`));
  c.append(apri.h(`<div class="fi-kpis">${[
   [t('int_dou_pose'), fmt(apri, f.cible, 1, true) + ' pts'],
   [t('int_dou_som'), fmt(apri, dc.somme, 2)],
   [t('int_dou_poids'), fmt(apri, dc.poids_total, 1)],
   [t('int_dou_res'), fmt(apri, f.delta, 3, true)]].map(([l, v]) =>
   `<div><span>${e(l)}</span><b>${e(v)}</b></div>`).join('')}</div>`));
  const pd = 100 * dc.part_directe;
  c.append(apri.h(`<p class="fi-x fi-petit"><b>${pd.toFixed(0)} %</b> ${e(t('int_dou_direct'))}, <b>${(100 - pd).toFixed(0)} %</b> ${e(t('int_dou_casc'))}.</p>`));
  const pc = f.part_couverte || 0;
  if(pc) c.append(apri.h(`<p class="fi-x fi-petit"><b>${e(t('int_dou_peri'))} : </b>${e(t('int_dou_peri_x', {p:(100 * pc).toFixed(0), v:fmt(apri, f.delta / pc, 3, true)}))}</p>`));
  c.append(apri.h(`<div class="fi-lab">${e(t('int_dou_det'))}</div>`));
  c.append(apri.h(`<div class="fi-dec"><div class="fi-dec-l fi-dec-h"><div>${e(t('int_dou_c_ind'))}</div><div>${e(t('int_dou_c_p'))}</div><div>${e(t('int_dou_c_av'))}</div><div>${e(t('int_dou_c_ap'))}</div><div>${e(t('int_dou_c_ct'))}</div></div>
   ${dc.lignes.map(x => `<div class="fi-dec-l"><div>L${x.ligne} · ${e(apri.tt(x.nom))}</div><div>${fmt(apri, x.p, 2)}</div><div>${fmt(apri, x.avant, 1)}</div>
    <div class="fi-fort">${fmt(apri, x.apres, 2)}${x.apres >= 9.999 ? '&nbsp;⊤' : ''}</div><div class="fi-ct" style="color:${x.ct > 0 ? HAUSSE : BAISSE}">${fmt(apri, x.ct, 3, true)}</div></div>`).join('')}</div>`));
  if(dc.plafond) c.append(apri.h(`<p class="note">${e('⊤ — ' + t('int_dou_plaf'))}</p>`));
 }));

 carte.append(apri.h(`<div class="fi-lab">${e(t('int_probleme'))}</div>`));
 carte.append(apri.h(`<p class="fi-x">${gras(apri, t('int_' + id + '_p'))}</p>`));
 carte.append(apri.h(`<div><div class="fi-lab">${e(t('int_objectif'))}</div><p class="fi-x">${gras(apri, t('int_' + id + '_o'))}</p></div>`));
 carte.append(apri.h(`<div class="fi-deux">
  <div class="fi-box" style="border-left-color:#2166ac"><div class="fi-box-t" style="color:#2166ac">⚙ ${e(t('int_act_tech'))}</div><p>${gras(apri, t('int_' + id + '_at'))}</p></div>
  <div class="fi-box" style="border-left-color:#0f8fa8"><div class="fi-box-t" style="color:#0f8fa8">◍ ${e(t('int_act_soc'))}</div><p>${gras(apri, t('int_' + id + '_as'))}</p></div></div>`));

 const dep = f.depart != null ? fmt(apri, f.depart) + ' / 10' : '—';
 const vise = f.depart != null ? fmt(apri, Math.min(10, f.depart + f.cible)) + ' / 10' : '—';
 carte.append(apri.h(`<div class="fi-perf"><div class="fi-box-t" style="color:${HAUSSE}">◎ ${e(t('int_perf'))}</div>
  <div class="fi-perf-l"><div><span class="fi-perf-v">${fmt(apri, f.cible, 1, true)} pt</span><span class="fi-perf-c">${e(t('int_perf_cible'))} : ${e(nomLev)}</span></div>
  <div class="fi-perf-d">${e(dep)} → <b>${e(vise)}</b></div></div></div>`));
 if(f.suivi.length) carte.append(apri.h(`<div class="fi-suivi">${f.suivi.map(s =>
  `<div><span>L${s.ligne} · ${e(apri.tt(s.nom))}</span><b style="color:${s.d > 0 ? HAUSSE : BAISSE}">${s.d > 0 ? '↑' : '↓'} ${fmt(apri, s.d, 2, true)}</b></div>`).join('')}</div>`));
 carte.append(apri.h(`<p class="note">${e(t('int_suivi_note'))}</p>`));
 carte.append(apri.h(`<div class="fi-deux fi-sans">
  <div><div class="fi-lab">${e(t('int_acteurs'))}</div><p class="fi-x fi-petit">${gras(apri, t('int_' + id + '_ac'))}</p></div>
  <div><div class="fi-lab">${e(t('int_calendrier'))} · ${e(t('int_h_' + f.horizon))}</div><p class="fi-x fi-petit">${gras(apri, t('int_' + id + '_cal'))}</p></div></div>`));
 carte.append(apri.h(`<div><div class="fi-lab">${e(t('int_risques'))}</div>
  <p class="fi-x fi-petit"><b style="color:${BAISSE}">${e(t('int_risque'))}</b> : ${gras(apri, t('int_' + id + '_r'))}</p>
  <p class="fi-x fi-petit" style="margin-top:6px"><b style="color:${HAUSSE}">${e(t('int_attenuation'))}</b> : ${gras(apri, t('int_' + id + '_m'))}</p>
  <div class="fi-lab">${e(t('int_boucle_visee'))}</div><p class="fi-x">${gras(apri, t('int_' + id + '_b'))}</p>
  <p class="fi-x fi-depart">${e(t('int_depart'))} : ${e(nomLev)} : <b>${e(dep)}</b> · ${e(t('int_boucles'))} : ${f.boucles}
   <span style="color:${HAUSSE}">R${f.renforcantes}</span> / <span style="color:${ALERTE}">B${f.equilibrantes}</span></p></div>`));
 el.append(carte);
}

/* ------------------------------------------------------------ the search (chercheur)
   etat: {demande} kept by the caller across redraws. opts: [[code, label]] or null.
   surCible(code): called when one of the "what to act on" buttons is pressed.
   Returns nothing; draws into el and redraws its result zone as the reader types. */
export function chercheur(el, apri, d, etat, opts, surCible){
 const tx = (fr, en) => apri.t(fr, en);
 const bloc = document.createElement('div'); bloc.className = 'fi-chercheur';
 bloc.innerHTML = `<h2>${apri.esc(tx('Que voulez-vous améliorer ?', 'What do you want to improve?'))}</h2>
  <label class="libelle">${apri.esc(tx('Écrivez-le avec vos mots', 'Write it in your own words'))}</label>
  <input class="champ fi-demande" type="search" autocomplete="off" placeholder="${apri.esc(tx("Par exemple : l'accès à l'eau, les pertes de récolte, les revenus des pêcheurs, le reboisement…", "For example: access to water, crop losses, fishers' income, reforestation…"))}">
  <div class="fi-trouves"></div>`;
 el.append(bloc);
 const inp = bloc.querySelector('input'), zone = bloc.querySelector('.fi-trouves');
 inp.value = etat.demande || '';
 const listeners = [];
 const dessiner = () => {
  zone.innerHTML = '';
  const demande = etat.demande || '';
  bloc.dataset.actif = demande.trim() ? '1' : '';
  listeners.forEach(cb => cb(!!demande.trim()));
  if(!demande.trim()) return;
  // the corpus: each lever's name, its id, and all its texts in both languages
  const docs = d.corpus.map(nid => {
   const n = d.leviers[nid], m = [libelle(apri, d, nid), nid.replaceAll('_', ' ')];
   for(const o of [n.act, n.prop]) if(o) for(const v of Object.values(o)) m.push(Array.isArray(v) ? v.join(' ') : String(v));
   return [nid, m.join(' ')];
  });
  const trouves = classer(docs, demande, 4);
  if(opts){
   const cibles = classer(opts, demande, 4);
   if(cibles.length){
    const libs = Object.fromEntries(opts);
    zone.append(apri.h(`<div class="fi-cap">${apri.esc(tx('SUR QUOI AGIR', 'WHAT TO ACT ON'))}</div>`));
    const g = document.createElement('div'); g.className = 'fi-cibles';
    for(const [c] of cibles){
     const b = document.createElement('button'); b.type = 'button'; b.className = 'fi-cible'; b.textContent = libs[c]; b.title = libs[c];
     b.onclick = () => surCible(c);
     g.append(b);
    }
    zone.append(g);
   }
  }
  if(!trouves.length){ zone.append(info(apri, tx("Aucune fiche proche. Essayez d'autres mots.", 'No close profile. Try other words.'))); return; }
  zone.append(apri.h(`<div class="fi-cap">${apri.esc(tx('FICHES PROPOSÉES', 'SUGGESTED PROFILES'))}</div>`));
  trouves.forEach(([nid], k) => zone.append(pli(apri, libelle(apri, d, nid), k === 0, c => proposition(c, apri, d, nid))));
 };
 let minuteur;
 inp.addEventListener('input', () => { clearTimeout(minuteur); minuteur = setTimeout(() => { etat.demande = inp.value; dessiner(); }, 180); });
 inp.addEventListener('keydown', ev => { if(ev.key === 'Enter'){ clearTimeout(minuteur); etat.demande = inp.value; dessiner(); } });
 dessiner();
 return {surChangement(cb){ listeners.push(cb); cb(!!(etat.demande || '').trim()); }};
}
