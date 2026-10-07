/* Tab "Fiches d'intervention / Intervention profiles" (port of
   interventions_page._render): what do you want to improve, what do you want
   to act on, then the levers that move it, sorted by kind, each with its
   profile; what works against it; the integrated packages; recommendations
   for the next survey round. Every figure is precomputed from the causal
   model by outils/export_fiches.py (data/fiches/cibles.json). */
import {donnees, T, fmt, libelle, pli, info, proposition, chercheur, feuille,
        CAT_COULEUR, HAUSSE, BAISSE} from './commun.js';

const etat = {demande: '', cible: null};
let _cibles = null;

export default async function render(el, apri){
 feuille('css/fiches.css');
 const d = await donnees(apri);
 el.innerHTML = '';
 const t = (k, p) => T(apri, d, k, p);
 const e = apri.esc;

 // the target list, in the order Streamlit gives it in each language
 const ordre = apri.lang === 'en' ? d.ordre_en.map(i => d.cibles[i]) : d.cibles;
 const opts = ordre.map(o => [o.c, apri.t(o.fr, o.en)]);
 const libs = Object.fromEntries(opts);
 if(etat.cible && !(etat.cible in libs)) etat.cible = null;

 const racine = document.createElement('div'); racine.className = 'fi-page';
 el.append(racine);
 const choisir = c => { etat.cible = c; render(el, apri); };

 let demandeActive = false, invite = null;
 if(etat.cible === null){
  const ch = chercheur(racine, apri, d, etat, opts, choisir);
  racine.append(apri.h(`<p class="note fi-ou">${e(apri.t('Ou choisissez dans la liste :', 'Or pick from the list:'))}</p>`));
  ch.surChangement(a => { demandeActive = a; if(invite) invite.hidden = a; });
 }
 const sel = apri.h(`<div class="fi-choix"><label class="libelle">${e(t('int_sur_quoi'))}</label>
  <select class="champ"><option value="">${e(t('int_sur_rien'))}</option>${opts.map(([c, l]) => `<option value="${e(c)}">${e(l)}</option>`).join('')}</select></div>`);
 racine.append(sel);
 const select = sel.querySelector('select');
 select.value = etat.cible || '';
 select.onchange = () => choisir(select.value || null);

 if(etat.cible === null){
  invite = apri.h(`<p class="fi-x fi-gris">${e(t('int_rien_encore'))}</p>`);
  invite.hidden = demandeActive;
  racine.append(invite);
  return;
 }

 const zone = document.createElement('div'); zone.className = 'fi-res';
 zone.innerHTML = `<div class="chargement">${e(apri.t('Chargement…', 'Loading…'))}</div>`;
 racine.append(zone);
 if(!_cibles) _cibles = await apri.donnees('data/fiches/cibles.json');
 zone.innerHTML = '';
 cible(zone, apri, d, etat.cible, _cibles[etat.cible] || {lot: []});
}

function cible(el, apri, d, code, r){
 const t = (k, p) => T(apri, d, k, p);
 const e = apri.esc;

 // the state of the chosen line
 if(r.etat){
  const s = r.etat;
  el.append(apri.h(`<div><div class="fi-lab">${e(t('int_etat_t'))}</div>
   <div class="fi-nums">
    <div>${e(t('int_etat_score'))}<b>${s.sc == null ? '—' : Math.round(s.sc) + '/10'}</b></div>
    <div>${e(t('int_etat_val'))}<b>${s.va == null ? '—' : fmt(apri, s.va, 2) + s.un}</b></div>
    <div>${e(t('int_etat_poids'))}<b>${fmt(apri, s.poids || 0, 2)}</b></div></div></div>`));
  if(s.hors) el.append(apri.h(`<p class="note">${e(t('int_hors_modele'))}</p>`));
 }

 // act directly on the chosen line
 if(r.direct){
  el.append(apri.h(`<div><div class="fi-lab" style="color:${HAUSSE}">${e(t('int_direct_t'))}</div><p class="fi-x">${e(t('int_direct_x'))}</p></div>`));
  el.append(pli(apri, libelle(apri, d, r.direct), true, c => proposition(c, apri, d, r.direct)));
 }

 // what a theme covers
 if(r.vars){
  el.append(apri.h(`<div><div class="fi-lab">${e(t('int_th_vars'))}</div>
   <div class="fi-puces">${r.vars.map(v => `<span class="fi-puce">${e(libelle(apri, d, v))}</span>`).join('')}</div></div>`));
  el.append(apri.h(`<p class="note">${e(t('int_th_x'))}</p>`));
 }

 const lot = r.lot.map(([id, effet, cat]) => ({id, effet, cat}));
 if(!lot.length){
  el.append(info(apri, r.direct ? t('int_aucun_levier_2') : t('int_aucun_levier')));
  return;
 }
 const pour = lot.filter(x => x.effet > 0), contre = lot.filter(x => x.effet < 0);
 if(!pour.length) el.append(info(apri, t('int_aucun_pour')));
 const deduits = pour.some(x => !d.parLevier[x.id]);
 for(const cat of ['structurel', 'technique', 'organisationnel', 'comportemental']){
  const part = pour.filter(x => x.cat === cat);
  if(!part.length) continue;
  const cc = CAT_COULEUR[cat];
  el.append(apri.h(`<div class="fi-lab fi-lab-cat" style="color:${cc}">${e(t('int_cat_' + cat))} · <span>${e(t('int_cat_' + cat + '_x'))}</span></div>`));
  for(const x of part) el.append(pli(apri, libelle(apri, d, x.id), false, c => proposition(c, apri, d, x.id)));
 }
 if(pour.length){
  el.append(apri.h(`<p class="note">${e(t('int_prop_x'))}</p>`));
  if(deduits) el.append(apri.h(`<p class="note">${e(t('int_nature_x'))}</p>`));
 }

 // what works against it
 if(contre.length){
  el.append(apri.h(`<div><div class="fi-lab" style="color:${BAISSE}">${e(t('int_contre_t'))}</div>
   <p class="fi-x">${e(t('int_contre_x'))}</p>
   <div class="fi-paq-l">${contre.map(c => `<span class="fi-paq-c fi-contre">${e(libelle(apri, d, c.id))} <b style="color:${BAISSE}">${fmt(apri, c.effet, 2, true)}</b></span>`).join('')}</div></div>`));
 }

 // integrated packages
 const paq = r.paquets || [];
 if(paq.some(p => !p.vide)){
  el.append(apri.h(`<div><div class="fi-lab" style="margin-top:26px">${e(t('int_paq_t'))}</div><p class="fi-x">${e(t('int_paq_x'))}</p></div>`));
  for(const p of paq){
   const ti = e(t('int_paq_' + p.code + '_t')), xx = e(t('int_paq_' + p.code + '_x'));
   if(p.vide){
    el.append(apri.h(`<div class="fi-paq fi-paq-vide"><div class="fi-paq-t">${ti}</div><div class="fi-paq-x">${xx}</div><div class="fi-paq-x" style="margin:0">${e(t('int_paq_vide'))}</div></div>`));
    continue;
   }
   const rec = p.separees > p.touchees ? `<div class="fi-paq-x" style="margin:9px 0 0">${e(t('int_paq_rec', {n: p.separees - p.touchees}))}</div>` : '';
   el.append(apri.h(`<div class="fi-paq"><div class="fi-paq-t">${ti}</div><div class="fi-paq-x">${xx}</div>
    <div class="fi-paq-l">${p.cases.map(c => `<span class="fi-paq-c">${e(libelle(apri, d, c))}</span>`).join('')}</div>
    <div class="fi-nums">
     <div>${e(t('int_paq_effet'))}<b>${fmt(apri, p.ensemble, 2, true)}</b></div>
     <div>${e(t('int_paq_indice'))}<b>${fmt(apri, p.indice, 3, true)}</b></div>
     <div>${e(t('int_paq_touchees'))}<b>${p.touchees}</b></div></div>${rec}</div>`));
  }
  el.append(apri.h(`<p class="note">${e(t('int_paq_note'))}</p>`));
  el.append(apri.h(`<p class="note">${e(t('int_paq_lineaire'))}</p>`));
 }

 // recommendations for the future
 el.append(apri.h(`<div class="fi-lab" style="margin-top:22px">${e(t('int_futur'))}</div>`));
 el.append(pli(apri, t('int_futur_enq'), false, c => {
  const fu = d.futur[apri.lang] || d.futur.fr;
  c.append(apri.h(`<p class="fi-x">${e(t('int_futur_x'))}</p>`));
  if(!fu.menages.length) return;
  c.append(apri.h(`<p class="fi-x fi-petit" style="margin-top:8px">${e(fu.intro)}</p>`));
  c.append(apri.h(`<ul class="fi-act">${fu.menages.map(p => `<li>${e(p)}</li>`).join('')}</ul>`));
  c.append(pli(apri, t('env_v_terrain'), false, cc => {
   cc.append(apri.h(`<p class="fi-x fi-petit">${e(fu.bareme)}</p>`));
   for(const x of fu.terrain) cc.append(apri.h(`<div class="fi-terrain"><div class="fi-t" style="font-size:14.5px">${e(x.nom)}</div>
    <div class="fi-lab">${e(t('env_unite'))}</div><p class="fi-x fi-petit" style="white-space:pre-line">${e(x.unite)}</p>
    <div class="fi-deux"><div class="fi-box" style="border-left-color:${BAISSE}"><div class="fi-box-t" style="color:${BAISSE}">${e(t('env_s0'))}</div><p>${e(x.s0)}</p></div>
    <div class="fi-box" style="border-left-color:${HAUSSE}"><div class="fi-box-t" style="color:${HAUSSE}">${e(t('env_s10'))}</div><p>${e(x.s10)}</p></div></div></div>`));
  }));
 }));
}
