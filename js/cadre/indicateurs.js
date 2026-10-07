/* Cadre de résilience · Calcul des scores.
   Port of cadre_page.render(vue="indicateurs"): the folded score_parcours walkthrough,
   then _v_indicateurs (view, dimension and indicator pickers; the scale ruler, the
   computation chain, the two normalisation logics) and _v_metadonnees (record view). */
import {css, donnees, traducteur, fmt, teinte, encre, bandesCss, cadreHtml, barreExport} from './commun.js';

// widget state, shared with "Tester le concept" (same Streamlit keys cad_i_vue, cad_i_dim, cad_i_ind)
const etat = {vue:'bareme', dim:null, ind:null};

export default async function render(el, apri){
 css();
 const d = await donnees(apri);
 el.innerHTML = '';
 // "Comprendre le calcul des scores": st.expander holding score_parcours.render()
 const pli = apri.h(`<details class="pli"><summary>${apri.esc(apri.t('Comprendre le calcul des scores','Understand score calculation'))}</summary><div class="cad-blanc"></div></details>`);
 pli.addEventListener('toggle', ()=>{
  const z = pli.querySelector('.cad-blanc');
  if(pli.open && !z.firstChild) z.append(cadreHtml((d.langs[apri.lang]||d.langs.fr).score, 400, apri.t('Calcul des scores','Score calculation')));
 });
 el.append(pli);
 const z = document.createElement('div'); el.append(z);
 vueIndicateurs(z, apri, d);
}

/** _v_indicateurs, drawn into el */
export function vueIndicateurs(el, apri, d){
 const T = traducteur(d, apri);
 const esc = apri.esc;
 const tous = d.indicateurs;
 el.innerHTML = '';
 if(!tous.length){ el.innerHTML = `<div class="cad-info">${esc(T('e_absent'))}</div>`; return; }

 const ctl = apri.h(`<div class="cad-ctl">
  <div><label class="libelle" for="cad-i-vue">${esc(apri.t('Vue','View'))}</label>
   <select class="champ" id="cad-i-vue">${['bareme','meta'].map(c=>`<option value="${c}">${esc(T('cad_iv_'+c))}</option>`).join('')}</select></div>
  <div><label class="libelle" for="cad-i-dim">${esc(T('cad_ind_dim'))}</label>
   <select class="champ" id="cad-i-dim"><option value="">${esc(T('cad_ind_all'))}</option>${d.dims.map(c=>`<option value="${c}">${esc(T(c))}</option>`).join('')}</select></div>
  <div class="plein"><label class="libelle" for="cad-i-ind">${esc(T('cad_ind_ind'))}</label>
   <div class="cad-combo"><input class="champ" id="cad-i-ind" role="combobox" aria-expanded="false" aria-autocomplete="list" autocomplete="off" placeholder="${esc(T('cad_ind_tous'))}">
   <button type="button" class="x" aria-label="${esc(apri.t('Effacer','Clear'))}">×</button><ul role="listbox"></ul></div></div>
 </div>`);
 el.append(ctl);
 const zone = document.createElement('div'); el.append(zone);

 const selVue = ctl.querySelector('#cad-i-vue'), selDim = ctl.querySelector('#cad-i-dim');
 const combo = ctl.querySelector('.cad-combo'), inp = combo.querySelector('input'), liste = combo.querySelector('ul');
 selVue.value = etat.vue; selDim.value = etat.dim || '';
 const choix = ()=>tous.filter(x=>!etat.dim || x.dim===etat.dim);
 const libelle = x => x.nom + ' · ' + T(x.dim);
 const parCle = ()=>Object.fromEntries(choix().map(x=>[x.ligne,x]));
 const afficherChoix = ()=>{ const x = parCle()[etat.ind]; inp.value = x ? libelle(x) : ''; combo.classList.toggle('rempli', !!x); };

 // the selection does not survive a dimension change that excludes it
 if(etat.ind!=null && !parCle()[etat.ind]) etat.ind = null;
 afficherChoix();

 selVue.onchange = ()=>{ etat.vue = selVue.value; contenu(); };
 selDim.onchange = ()=>{ etat.dim = selDim.value || null; if(!parCle()[etat.ind]) etat.ind = null; afficherChoix(); contenu(); };

 let actif = -1, vus = [];
 function ouvrir(filtre){
  const q = apri.plier(filtre||'');
  vus = choix().filter(x=>!q || apri.plier(libelle(x)).includes(q));
  actif = vus.findIndex(x=>x.ligne===etat.ind);
  liste.innerHTML = vus.length ? vus.map((x,i)=>`<li role="option" data-i="${i}" class="${i===actif?'actif':''}">${esc(libelle(x))}</li>`).join('')
   : `<li class="vide">${esc(apri.t('Aucun résultat','No results'))}</li>`;
  combo.classList.add('ouvert'); inp.setAttribute('aria-expanded','true');
  liste.querySelector('.actif')?.scrollIntoView({block:'nearest'});
 }
 function fermer(){ combo.classList.remove('ouvert'); inp.setAttribute('aria-expanded','false'); }
 function choisir(x){ etat.ind = x ? x.ligne : null; fermer(); afficherChoix(); contenu(); }
 inp.addEventListener('focus', ()=>{ inp.select(); ouvrir(''); });
 inp.addEventListener('input', ()=>ouvrir(inp.value));
 inp.addEventListener('blur', ()=>setTimeout(()=>{ fermer(); afficherChoix(); }, 150));
 inp.addEventListener('keydown', e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
   e.preventDefault(); if(!combo.classList.contains('ouvert')) ouvrir(inp.value);
   actif = Math.max(0, Math.min(vus.length-1, actif + (e.key==='ArrowDown'?1:-1)));
   liste.querySelectorAll('li').forEach((li,i)=>li.classList.toggle('actif', i===actif));
   liste.querySelector('.actif')?.scrollIntoView({block:'nearest'});
  } else if(e.key==='Enter'){ e.preventDefault(); if(vus[actif]) choisir(vus[actif]); else if(vus.length===1) choisir(vus[0]); }
  else if(e.key==='Escape'){ fermer(); afficherChoix(); inp.blur(); }
 });
 liste.addEventListener('mousedown', e=>{ const li = e.target.closest('li[data-i]'); if(li){ e.preventDefault(); choisir(vus[+li.dataset.i]); inp.blur(); } });
 combo.querySelector('.x').onclick = ()=>choisir(null);

 function contenu(){
  zone.innerHTML = '';
  const x = etat.ind!=null ? parCle()[etat.ind] : null;
  if(x && [47,48,49].includes(Number(x.ligne))) zone.append(noticeBio(apri, d));
  if(etat.vue==='meta'){
   if(!x){ zone.append(apri.h(`<div class="cad-info">${esc(T('cad_ind_vide'))}</div>`)); return; }
   zone.append(apri.h(fiche(x, apri, d, T)));
   return;
  }
  if(!x){
   zone.append(apri.h(`<p class="cad-attr-x" style="margin:10px 0 18px">${esc(T('cad_ind_vide'))}</p>`));
   zone.append(apri.h(`<div><div class="cad-ex-t">${esc(T('cad_ex_gen'))}</div>${chaineGenerique(T,esc)}${normalisations(null, T, esc)}</div>`));
   return;
  }
  const [num, ...r] = T(x.dim).split('. '); const court = r.join('. ');
  const quoi = ((apri.lang==='fr' ? x.metrique_fr : x.metrique_en) || x.metrique || '').trim();
  const aide = quoi ? `<span class="cad-it-q" title="${esc(quoi)}" aria-label="${esc(quoi)}">?</span>` : '';
  const table = apri.h(`<table class="cad-it"><thead><tr><th>${esc(T('cad_ind_c_nom'))}</th><th>${esc(T('cad_ind_c_ech'))}</th>
   <th class="n">${esc(T('cad_ind_c_p'))}<span class="cad-it-ech">${esc(T('cad_ind_c_p_ech'))}</span></th></tr></thead><tbody>
   <tr><td><div class="cad-it-n">${esc(x.nom)}${aide}</div><div class="cad-it-d"><span class="cad-it-r">${esc(num)}</span> ${esc(court)}</div></td>
   <td class="cad-it-e">${echelleHtml(x, T, esc)}</td>
   <td class="n" data-l="${esc(T('cad_ind_c_p'))}"><div class="cad-it-p">${fmt(x.poids)}</div></td></tr></tbody></table>`);
  zone.append(table);
  reglette(table);
  zone.append(barreExport(apri, table, true));
  zone.append(apri.h(`<div><p class="cad-attr-x" style="margin:16px 0 4px">${esc(T('cad_band_x'))}</p>
   <div class="cad-ex-t">${esc(T('cad_ex_titre'))}</div>${chaineIndicateur(x, d, T, esc, apri)}${normalisations(x, T, esc)}</div>`));
 }
 contenu();
}

/* ---------- the biodiversity notice of indicators 47, 48, 49 ---------- */
function noticeBio(apri, d){
 const b = (d.langs[apri.lang]||d.langs.fr).bio, esc = apri.esc;
 const corps = b.blocs.map(([k,v])=>{
  if(k==='caption') return `<p class="cad-caption">${esc(v)}</p>`;
  if(k==='info') return `<div class="cad-info">${esc(v)}</div>`;
  const [tete, ...lignes] = v;
  return `<div class="cad-df"><table class="tableau"><thead><tr>${tete.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${lignes.map(l=>`<tr>${l.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 }).join('');
 const pli = apri.h(`<details class="pli"><summary>${esc(b.titre)}</summary>${corps}<p><button type="button" class="bouton">${esc(b.bouton)}</button></p></details>`);
 pli.querySelector('button').onclick = ()=>apri.aller('resultats','brut');
 return pli;
}

/* ---------- the sliding scale (_echelle_html) ---------- */
function echelleHtml(x, T, esc){
 if(!x.echelle) return `<span style="color:#a7b0be">${esc(T('cad_ind_sans'))}</span>`;
 const par = x.bandes;
 if(!par.length) return esc(x.echelle);
 const scores = par.map(p=>p[0]), nmax = Math.max(...scores) || 1, borne = Object.fromEntries(par);
 const bouts = [[T('cad_ec_'+x.ec.unite), T('cad_ec_'+x.ec.unite+'_x')]];
 if(x.ec.sens) bouts.push([T('cad_ec_'+x.ec.sens), T('cad_ec_'+x.ec.sens+'_x')]);
 const type = `<span class="cad-ec-t" title="${esc(bouts.map(b=>b[1]).join(' '))}">${bouts.map(b=>esc(b[0])).join(' · ')}</span>`;
 const zones = scores.map((i,k)=>`<span class="cad-ec-z" data-i="${i}" style="left:${(100*k/scores.length).toFixed(3)}%;width:${(100/scores.length).toFixed(3)}%"></span>`).join('');
 const lignes = scores.map(i=>{ const c = teinte(i/nmax); return `<span class="cad-ec-v" data-i="${i}"><b style="background:${c};color:${encre(c)}">${i}</b>${esc(borne[i])}</span>`; }).join('');
 const bas = scores[0], haut = scores[scores.length-1], c0 = teinte(0), c1 = teinte(1);
 const defaut = `<span class="cad-ec-d"><span class="cad-ec-u"><b style="background:${c0};color:${encre(c0)}">${bas}</b>${esc(borne[bas])}</span>`+
  `<span class="cad-ec-u"><b style="background:${c1};color:${encre(c1)}">${haut}</b>${esc(borne[haut])}</span></span>`;
 return `<span class="cad-ec">${type}<span class="cad-ec-b" style="background:linear-gradient(90deg,${bandesCss()})"></span>${zones}<span class="cad-ec-l">${defaut}${lignes}</span></span>`;
}
// hover (or tap) a notch: its threshold joins the 0 and 10 bounds, which stay written
function reglette(racine){
 racine.querySelectorAll('.cad-ec').forEach(ec=>{
  const montrer = i=>{
   ec.querySelectorAll('.cad-ec-v').forEach(v=>v.style.display = v.dataset.i===i ? 'inline-flex' : '');
   const d = ec.querySelector('.cad-ec-d'); if(d) d.style.display = (i==='0'||i==='10') ? 'none' : '';
  };
  ec.querySelectorAll('.cad-ec-z').forEach(z=>{
   z.addEventListener('pointerenter', ()=>montrer(z.dataset.i));
   z.addEventListener('pointerdown', ()=>montrer(z.dataset.i));
  });
  ec.addEventListener('pointerleave', e=>{ if(e.pointerType==='mouse') montrer(null); });
 });
}

/* ---------- the computation chain ---------- */
function cas(T, esc, rang, titre, valeur, phrase, {sous=null, operation=false, resultat=null}={}){
 let corps = operation ? 'cad-ch-o' : 'cad-ch-v';
 if(valeur==='—') corps += ' cad-ch-vide';
 return `<div class="cad-ch-e"><div class="cad-ch-h"><span class="cad-ch-n">${rang}</span><span class="cad-ch-t">${esc(titre)}</span></div>`+
  `<div class="${corps}">${esc(valeur)}</div>`+(sous?`<div class="cad-ch-s">${esc(sous)}</div>`:'')+
  `<p class="cad-ch-x">${esc(phrase)}</p>`+(resultat?`<div class="cad-ch-r">${esc(T('cad_ex_res'))} <b>${esc(resultat)}</b></div>`:'')+'</div>';
}
function chaineGenerique(T, esc){
 const R='—';
 return '<div class="cad-ch">'+[cas(T,esc,1,T('cad_e1_t'),R,T('cad_e1_x')), cas(T,esc,2,T('cad_e2_t'),T('cad_e2_v'),T('cad_e2_x'),{operation:true}),
  cas(T,esc,3,T('cad_e3_t'),R,T('cad_e3_x')), cas(T,esc,4,T('cad_e4_t'),R,T('cad_e4_x'))].join('')+'</div>';
}
function chaineIndicateur(x, d, T, esc, apri){
 const par = x.bandes;
 const pct = par.length ? par.map(p=>p[1]).join('').includes('%') : x.echelle.includes('%');
 const val = x.valeur==null ? '—' : fmt(x.valeur,1) + (pct?' %':'');
 const normeS = par.length ? T('cad_ex_seuils') : T('cad_ex_stat');
 const [scV, scX] = x.score==null ? [T('cad_ex_sc_non'), T('cad_ex_sc_non_x')] : [fmt(x.score,1)+' / 10', T('cad_e3_x')];
 const dsc = d.score_dim[x.dim];
 const sous1 = d.menages ? T('cad_ex_ech',{n:fmt(d.menages,0)}) : T('cad_e1_x');
 return '<div class="cad-ch">'+[
  cas(T,esc,1,T('cad_e1_t'),val,x.metrique,{sous:sous1}),
  cas(T,esc,2,T('cad_e2_t'),T('cad_e2_v'),T('cad_e2_x'),{sous:normeS,operation:true,resultat:x.score==null?null:scV}),
  cas(T,esc,3,T('cad_e3_t'),scV,scX),
  cas(T,esc,4,T('cad_e4_t'),T('cad_ex_p_v',{p:fmt(x.poids,1)}),T('cad_ex_p_x'))].join('')+'</div>'+
  `<div class="cad-dsc"><p>${esc(apri.t('Score global de la dimension','Overall dimension score'))} : ${dsc==null?'—':fmt(dsc,2)+' / 10'}</p>`+
  `<p>${esc(T(x.dim))} · ${esc(apri.t('Moyenne pondérée de tous les indicateurs renseignés de cette dimension : somme des (scores × poids) ÷ somme des poids. Les indicateurs sans score sont exclus.','Weighted mean of all scored indicators in this dimension: sum of (scores × weights) ÷ sum of weights. Indicators without scores are excluded.'))}</p></div>`;
}

/** _tableau_echelle: the eleven ordinal scenarios, red to dark green */
export function echelleIrla(bandes, score, esc){
 const max = bandes.length ? Math.max(...bandes.map(b=>b[0])) : 10;
 return '<div class="irla-scale">'+[...bandes].sort((a,b)=>a[0]-b[0]).map(([rang,borne])=>{
  const c = teinte(rang/(max||10)), act = score!=null && Number(score)===rang;
  return `<div class="irla-step${act?' irla-current':''}" style="--rank:${c};--ink:${encre(c)}"><span>${esc(String(borne).trim().replace(/^[()]+|[()]+$/g,''))}</span><b>${rang}</b>${act?'<em aria-label="Score">◀</em>':''}</div>`;
 }).join('')+'</div>';
}

function normalisations(x, T, esc){
 const par = x ? x.bandes : [];
 const brut = par.some(p=>p[1]);
 let droite;
 if(x && brut) droite = `<div class="cad-duo">${echelleIrla(par, x.score, esc)}<div class="cad-seu-n">${esc(T('cad_p2b_n'))}</div></div>`;
 else if(!x) droite = echelleIrla(Array.from({length:11},(_,i)=>[i,'—']), null, esc);
 else droite = '';
 const sousB = (x && brut) ? '' : T('cad_p2b_vide');
 return `<div class="cad-nrm"><div><div class="cad-nrm-t">${esc(T('cad_p2s_t'))}</div><div class="cad-nrm-x">${esc(T('cad_p2s_x'))}</div>`+
  `<div class="cad-log"><div class="cad-log-t">${esc(T('cad_p2q_t'))}</div><p class="cad-log-x">${esc(T('cad_p2q_x'))}</p></div>`+
  `<div class="cad-log"><div class="cad-log-t">${esc(T('cad_p2n_t'))}</div><p class="cad-log-x">${esc(T('cad_p2n_x'))}</p></div>`+
  `<div class="cad-nrm-p">${esc(T('cad_p2_sens'))}</div></div>`+
  `<div><div class="cad-nrm-t">${esc(T('cad_p2b_t'))}</div><div class="cad-nrm-x">${esc(sousB)}</div>${droite}</div></div>`;
}

/* ---------- the metadata record (_v_metadonnees) ---------- */
function fiche(x, apri, d, T){
 const esc = apri.esc, fr = apri.lang==='fr', L = apri.lang;
 const nom = fr ? (x.nom_fr || x.nom) : x.nom;
 const mesure = (fr ? x.metrique_fr : x.metrique_en) || x.metrique || '';
 const note = (fr ? x.note : x.note_en) || x.note || '';
 const pourquoi = x.pourquoi[L] || [];
 const section = (t, c)=>`<div class="pdf-section"><h3>${esc(t)}</h3>${c}</div>`;
 const unit = x.unite || (x.echelle.includes('%') ? '%' : '');
 const value = x.valeur==null ? '—' : fmt(x.valeur) + (unit ? ' '+unit : '');
 const score = x.score==null ? '—' : fmt(x.score,1)+' / 10';
 const effects = pourquoi.length ? '<ul>'+pourquoi.map(t=>`<li>${esc(t)}</li>`).join('')+'</ul>' : `<p>${esc(T('cad_meta_pourquoi_absent'))}</p>`;
 const limit = note ? `<aside><b>${esc(apri.t('Limites de la mesure','Measurement limitations'))}</b><p>${esc(note)}</p></aside>` : '';
 const scale = x.bandes.length ? echelleIrla(x.bandes, x.score, esc) : `<p>${esc(x.echelle || apri.t('Barème non renseigné.','Scale not recorded.'))}</p>`;
 const missing = apri.t('Non renseigné dans les données disponibles.','Not recorded in the available data.');
 let comp = (fr ? ['Amérique latine et Caraïbes','Monde','Haïti'] : ['Latin America & Caribbean','World','Haiti'])
  .map(l=>`<div class="pdf-comparison"><b>${esc(l)}</b><span>—</span></div>`).join('');
 comp += `<p class="pdf-note">${esc(apri.t('Comparaisons nationales et internationales non renseignées ; le résultat de l’enquête ci-dessous concerne uniquement les territoires étudiés.','National and international comparisons are not recorded; the survey result below covers only the studied territories.'))}</p>`;
 comp += `<div class="pdf-observed"><span>${esc(T('cad_meta_valeur'))}</span><strong>${esc(value)}</strong><span>${esc(T('cad_meta_score'))}</span><strong>${esc(score)}</strong></div>`;
 const sdg = nom.match(/(?:SDG|ODD)\s*([0-9]+(?:\.[0-9A-Za-z]+)+)/);
 let gauche = section(apri.t('Impact sur la résilience','Impact on resilience'), effects);
 gauche += section(apri.t('Définitions','Definitions'), `<p>${esc(mesure)}</p>`+limit);
 if(sdg) gauche += section(apri.t('ODD ','SDG ')+sdg[1], `<p>${esc(x.metrique || missing)}</p>`);
 gauche += section(apri.t('Mode de levée','Data collection'), `<p>${esc(x.src[L])}</p>`);
 gauche += section(apri.t('Questions contributives','Contributing questions'), `<p>${esc(x.question || missing)}</p>`+(x.modalites?`<p>${esc(x.modalites)}</p>`:''));
 let droite = section(apri.t('Données comparatives','Comparative data'), comp);
 droite += section(apri.t('Échelles de résilience','Resilience scales'), `<p class="pdf-note">${esc(apri.t('Barème publié du référentiel · score de 0 à 10','Published framework scale · score from 0 to 10'))}</p>`+scale);
 return `<article class="pdf-record" lang="${L}"><div class="pdf-dimension">${esc(T(x.dim))}</div><div class="pdf-columns"><div>${gauche}</div><div>${droite}</div></div>`+
  `<div class="pdf-references"><details><summary>${esc(apri.t('Références scientifiques','Scientific references'))}</summary><div>${x.refs[L]}</div></details></div></article>`;
}
