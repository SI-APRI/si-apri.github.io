/* Tab "Plans d'action / Action plans" (port of interventions_page._plans):
   the community resilience plans, to download. The folder data/plans of the
   Streamlit repo is read by outils/export_fiches.py; while it is empty, the
   screen says so. */
import {donnees, T, info, feuille} from './commun.js';

export default async function render(el, apri){
 feuille('css/fiches.css');
 const d = await donnees(apri);
 el.innerHTML = '';
 const racine = document.createElement('div'); racine.className = 'fi-page';
 el.append(racine);
 if(!d.plans.length){ racine.append(info(apri, T(apri, d, 'int_plans_vide'))); return; }
 for(const nom of d.plans){
  const titre = nom.replace(/\.[^.]+$/, '').replaceAll('_', ' ');
  racine.append(apri.h(`<div class="fi-plan"><div class="fi-t">${apri.esc(titre)}</div>
   <a class="bouton" href="data/fiches/plans/${encodeURIComponent(nom)}" download>${apri.esc(T(apri, d, 'd_bouton'))}</a></div>`));
 }
}
