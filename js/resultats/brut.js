/* Analyser les résultats > Résultats bruts (Streamlit: app.py, ra_section_selected == "brut").
   Two columns: "Construire ma question" (source, theme, question) on the left,
   the answer on the right. Four sources: household survey, institutional survey,
   biodiversity survey, satellite. */
import {choix} from './brut/graphes.js';

const CSS = 'css/resultats.css';
const SOURCES = [
 ['menages', 'Enquête ménage', 'Household survey'],
 ['institutions', 'Enquête institutionnelle', 'Institutional survey'],
 ['biodiversite', 'Enquête biodiversité', 'Biodiversity survey'],
 ['satellite', 'Satellite', 'Satellite'],
];
// what the reader chose survives a language change and a tab change
const etat = {source: 'menages'};

export default async function render(el, apri){
 if(!document.querySelector(`link[href="${CSS}"]`))
  document.head.append(Object.assign(document.createElement('link'), {rel: 'stylesheet', href: CSS}));
 if(!document.querySelector('link[data-brut-icones]')){
  const l = Object.assign(document.createElement('link'), {rel: 'stylesheet',
   href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400,0,0&display=block'});
  l.dataset.brutIcones = '1';
  document.head.append(l);
 }
 const dessiner = async () => {
  const y = window.scrollY;
  el.style.minHeight = el.offsetHeight + 'px';
  el.innerHTML = '';
  const zone = apri.h(`<div class="brut-zone colonnes">
   <aside class="brut-gauche"><div class="brut-constructeur">
    <h3>${apri.esc(apri.t('Construire ma question', 'Build my question'))}</h3>
    <p class="note">${apri.esc(apri.t('Choisissez une source, un thème, puis une question.', 'Choose a source, a theme, then a question.'))}</p>
    <div class="brut-src"></div><div class="brut-ctl"></div>
   </div></aside>
   <div class="brut-droite"><div class="brut-reponse"></div></div></div>`);
  el.append(zone);
  zone.querySelector('.brut-src').append(choix(apri, {
   label: apri.t('Source', 'Source'), cle: 'source',
   options: SOURCES.map(([c, fr, en]) => [c, apri.t(fr, en)]), valeur: etat.source,
   surChoix: v => { etat.source = v || 'menages'; dessiner(); }}));
  const gauche = zone.querySelector('.brut-ctl');
  const droite = zone.querySelector('.brut-reponse');
  droite.innerHTML = `<div class="chargement">${apri.esc(apri.t('Chargement…', 'Loading…'))}</div>`;
  etat[etat.source] = etat[etat.source] || {};
  try{
   const mod = await import(`./brut/${etat.source}.js`);
   droite.innerHTML = '';
   await mod.default({gauche, droite, apri, etat: etat[etat.source], redessiner: dessiner});
  }catch(e){
   console.error('brut', e);
   droite.innerHTML = `<div class="vide">${apri.esc(apri.t("Cette rubrique n'a pas pu se charger.", 'This section could not load.'))}</div>`;
  }
  el.style.minHeight = '';
  if(Math.abs(window.scrollY - y) > 2) window.scrollTo({top: y, behavior: 'instant'});
 };
 await dessiner();
}
