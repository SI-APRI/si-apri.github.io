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
 const z = document.createElement('div'); el.append(z);
 vueIndicateurs(z, apri, d);
}

/** _v_indicateurs, drawn into el */
export function vueIndicateurs(el, apri, d){
 const T=traducteur(d,apri),esc=apri.esc,t=(f,e)=>apri.t(f,e),fr=apri.lang!=='en';
 const name=x=>fr?(x.nom_fr||x.nom):x.nom;
 const measure=x=>(fr?x.metrique_fr:x.metrique_en)||x.metrique||'';
 const missing=t('Non renseigné','Not recorded');
 const method=x=>x.normalisation||x.methode_normalisation||t('Méthode de construction non renseignée dans le référentiel.','Scale construction method not recorded in the framework.');
 el.replaceChildren();el.classList.add('indicator-browser');
 const style=document.createElement('style');style.textContent= '#cadre .indicator-browser{color:#344e59}#cadre .ib-intro{display:flex;justify-content:space-between;align-items:center;gap:24px;margin:24px 0 32px}#cadre .ib-intro p{font-size:18px;margin:0}#cadre .ib-search{background:transparent;border:0;border-bottom:1px solid #aebdc4;padding:12px 4px;font:inherit;color:inherit;width:280px;max-width:100%}#cadre .ib-group{margin:32px 0}#cadre .ib-group h3{font-size:17px;font-weight:600;margin:0 0 14px}#cadre .ib-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 26px}#cadre .ib-item{font:inherit;color:inherit;background:transparent;border:0;border-bottom:1px solid #d4dde1;text-align:left;padding:17px 8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:14px;line-height:1.5;transition:background .2s,transform .2s}#cadre .ib-item:hover,#cadre .ib-item[aria-pressed=true]{background:#e5eaed;transform:translateX(3px)}#cadre .ib-item:focus-visible,#cadre .ib-action:focus-visible{outline:2px solid #415861;outline-offset:4px}#cadre .ib-item span:last-child{font-size:20px}#cadre .ib-detail{border-top:1px solid #aebdc4;border-bottom:1px solid #aebdc4;padding:28px 0;margin:16px 0 40px;scroll-margin-top:95px}#cadre .ib-detail[hidden]{display:none}#cadre .ib-top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}#cadre .ib-detail h3{font-size:clamp(23px,2.4vw,32px);font-weight:500;margin:8px 0 18px;line-height:1.3}#cadre .ib-kicker{font-size:13px;color:#657880}#cadre .ib-action{font:inherit;border:1px solid #aebdc4;background:transparent;color:inherit;padding:10px 16px;border-radius:5px;cursor:pointer;white-space:nowrap}#cadre .ib-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin:26px 0}#cadre .ib-facts dt{font-size:13px;color:#657880;margin-bottom:9px}#cadre .ib-facts dd{font-size:26px;margin:0;font-weight:500}#cadre .ib-facts small{font-size:12px;display:block;line-height:1.5;margin-top:8px}#cadre .ib-scale{max-width:850px;margin:26px 0 8px}#cadre .ib-scale h4{font-size:17px;margin:0 0 12px}#cadre .ib-scale .irla-scale{width:100%}#cadre .ib-count{font-size:13px;color:#657880}.ib-paper-dialog{position:fixed;inset:0 0 0 auto;margin:0;width:min(640px,92vw);height:100dvh;max-height:100dvh;max-width:92vw;box-sizing:border-box;border:0;padding:30px 24px 30px 34px;background:transparent;overflow:auto;color:#344e59;font-family:inherit}.ib-paper-dialog::backdrop{background:rgba(26,42,49,.25);backdrop-filter:blur(2px)}.ib-paper{position:relative;min-height:calc(100dvh - 90px);box-sizing:border-box;padding:30px 30px 36px 44px;background:#faf9f5;border:1px solid #d8d8d1;border-radius:3px;box-shadow:-18px 16px 48px rgba(22,37,44,.25),5px 5px 0 #e6e5df,8px 8px 0 #cecfcb;transform:rotate(-.5deg);background-image:linear-gradient(90deg,transparent 26px,#d5c6c2 26px,#d5c6c2 27px,transparent 27px)}.ib-paper h2{font-size:25px;font-weight:500;line-height:1.35;margin:18px 0 26px}.ib-paper .ib-paper-header{display:flex;align-items:center;justify-content:space-between;gap:15px;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.ib-paper button{font:inherit;font-size:24px;background:transparent;border:0;color:inherit;cursor:pointer;padding:5px 10px}.ib-paper .ib-paper-section{padding:17px 0;border-top:1px solid #dce0df}.ib-paper h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 9px}.ib-paper p,.ib-paper li{font-size:15px;line-height:1.7;margin:0 0 8px}.ib-paper a{color:inherit;overflow-wrap:anywhere}.ib-paper ul{padding-left:18px}.ib-paper-dialog[open]{animation:ib-sheet-in .4s ease-out}@keyframes ib-sheet-in{from{opacity:0;transform:translateX(55px) rotate(2deg)}to{opacity:1;transform:translateX(0) rotate(0)}}@media(max-width:760px){#cadre .ib-grid{grid-template-columns:1fr}#cadre .ib-intro{align-items:stretch;flex-direction:column}#cadre .ib-search{width:100%}#cadre .ib-facts{gap:12px}#cadre .ib-facts dd{font-size:21px}#cadre .ib-top{flex-direction:column}.ib-paper-dialog{padding:20px 18px 20px 14px}.ib-paper{padding:24px 18px 28px 36px}}@media(prefers-reduced-motion:reduce){.ib-paper-dialog[open]{animation:none}#cadre .ib-item{transition:none}}';el.append(style);
 const head=apri.h('<div class="ib-intro"><p>'+esc(t('Choisissez un indicateur pour explorer sa mesure et son échelle.','Choose an indicator to explore its measurement and scale.'))+'</p><input class="ib-search" type="search" aria-label="'+esc(t('Rechercher un indicateur','Find an indicator'))+'" placeholder="'+esc(t('Rechercher un indicateur…','Find an indicator…'))+'"></div>');el.append(head);
 const detail=document.createElement('div');detail.className='ib-detail';detail.hidden=true;detail.tabIndex=-1;el.append(detail);
 const count=document.createElement('p');count.className='ib-count';count.setAttribute('aria-live','polite');el.append(count);
 const list=document.createElement('div');el.append(list);
 const dialog=document.createElement('dialog');dialog.className='ib-paper-dialog';dialog.setAttribute('aria-labelledby','ib-paper-title');el.append(dialog);
 let returnFocus=null;
 dialog.addEventListener('close',()=>returnFocus?.isConnected&&returnFocus.focus());
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 function openMetadata(x,trigger){
  returnFocus=trigger;const lang=apri.lang,section=(title,html)=>'<div class="ib-paper-section"><h3>'+esc(title)+'</h3>'+html+'</div>',p=v=>'<p>'+esc(v||missing)+'</p>';
  const why=x.pourquoi?.[lang]||x.pourquoi?.fr||[];
  dialog.innerHTML='<article class="ib-paper"><div class="ib-paper-header"><span>'+esc(t('Fiche de métadonnées','Metadata record'))+' · '+esc(String(x.ligne))+'</span><button type="button" aria-label="'+esc(t('Fermer la fiche','Close record'))+'">×</button></div><h2 id="ib-paper-title">'+esc(name(x))+'</h2>'+section(t('Dimension','Dimension'),p(T(x.dim)))+section(t('Ce que mesure l’indicateur','What the indicator measures'),p(measure(x)))+section(t('Lien avec la résilience','Relationship to resilience'),why.length?'<ul>'+why.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':p(''))+section(t('Source et collecte','Source and collection'),p(x.src?.[lang]||x.src?.fr||x.source))+section(t('Questions et modalités','Questions and responses'),p(x.question)+(x.modalites?p(x.modalites):''))+section(t('Normalisation','Normalization'),p(method(x)))+section(t('Poids dans l’agrégation','Weight in aggregation'),p(x.poids==null?missing:fmt(x.poids)))+section(t('Limites et précautions','Limitations'),p((fr?x.note:x.note_en)||x.note))+section(t('Références','References'),x.refs?.[lang]||x.refs?.fr||p(''))+'</article>';
  dialog.querySelector('button').onclick=()=>dialog.close();dialog.showModal();dialog.scrollTop=0;
 }
 function select(x){
  etat.ind=x.ligne;detail.hidden=false;
  const unit=x.unite||(String(x.echelle||'').includes('%')?'%':'');
  const val=x.valeur==null?missing:fmt(x.valeur,2)+(unit?' '+unit:'');
  detail.innerHTML='<div class="ib-top"><div><span class="ib-kicker">'+esc(T(x.dim))+'</span><h3>'+esc(name(x))+'</h3></div><button class="ib-action" type="button">'+esc(t('Métadonnées','Metadata'))+' ↗</button></div><p>'+esc(measure(x))+'</p><dl class="ib-facts"><div><dt>'+esc(t('Valeur brute · échantillon','Raw value · sample'))+'</dt><dd>'+esc(val)+'</dd><small>'+esc(t('Résultat disponible pour les territoires étudiés.','Available result for the studied territories.'))+'</small></div><div><dt>'+esc(t('Score de résilience','Resilience score'))+'</dt><dd>'+esc(x.score==null?missing:fmt(x.score,1)+' / 10')+'</dd></div><div><dt>'+esc(t('Poids de l’indicateur','Indicator weight'))+'</dt><dd>'+esc(x.poids==null?missing:fmt(x.poids))+'</dd></div></dl><div class="ib-scale"><h4>'+esc(t('Échelle de normalisation','Normalization scale'))+'</h4><p>'+esc(method(x))+'</p>'+(x.bandes?.length?echelleIrla(x.bandes,x.score,esc):'<p>'+esc(x.echelle||missing)+'</p>')+'</div>';
  const meta=detail.querySelector('button');meta.onclick=()=>openMetadata(x,meta);
  list.querySelectorAll('[data-row]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.row===String(x.ligne))));
  detail.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});detail.focus({preventScroll:true});
 }
 function draw(){const q=apri.plier(head.querySelector('input').value),rows=d.indicateurs.filter(x=>!q||apri.plier(name(x)+' '+measure(x)+' '+T(x.dim)).includes(q));count.textContent=rows.length+' '+t('indicateurs','indicators');list.replaceChildren();for(const dim of d.dims){const group=rows.filter(x=>x.dim===dim);if(!group.length)continue;const section=apri.h('<div class="ib-group"><h3>'+esc(T(dim))+'</h3><div class="ib-grid"></div></div>');const grid=section.querySelector('div');for(const x of group){const b=apri.h('<button type="button" class="ib-item" data-row="'+esc(String(x.ligne))+'" aria-pressed="'+String(etat.ind===x.ligne)+'"><span>'+esc(name(x))+'</span><span aria-hidden="true">↗</span></button>');b.onclick=()=>select(x);grid.append(b);}list.append(section);}if(!rows.length)list.textContent=t('Aucun indicateur trouvé.','No indicators found.');}
 head.querySelector('input').oninput=draw;draw();
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
 const esc = apri.esc, fr = apri.lang !== 'en', L = apri.lang;
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

export async function renderCatalogue(el,apri){
 css();const d=await donnees(apri),T=traducteur(d,apri),esc=apri.esc,t=(f,e)=>apri.t(f,e),fr=apri.lang!=='en';el.replaceChildren();
 const method=x=>{const v=String(x.normalisation||x.methode_normalisation||'');return /quantil/i.test(v)?'quantiles':/normatif|local/i.test(v)?'local':'unknown';};
 const labels={quantiles:t('Discrétisation par quantiles','Quantile discretization'),local:t('Repère normatif local','Local normative reference'),unknown:t('Méthode à documenter','Method to document')};
 const head=apri.h('<h3>'+esc(t('Indicateurs et échelles','Indicators and scales'))+'</h3><p>'+esc(t('Consultez les indicateurs du référentiel et leurs seuils de résilience. La méthode de construction des échelles reste à documenter lorsqu’elle n’est pas précisée dans les données.','Browse framework indicators and resilience thresholds. Scale construction methods remain to be documented where the data do not specify them.'))+'</p>');el.append(head);
 const controls=apri.h('<div class="cad-ctl"><div><label class="libelle" for="catalog-search">'+esc(t('Rechercher un indicateur','Find an indicator'))+'</label><input class="champ" type="search" id="catalog-search"></div><div><label class="libelle" for="catalog-dim">'+esc(t('Dimension','Dimension'))+'</label><select class="champ" id="catalog-dim"><option value="">'+esc(t('Toutes les dimensions','All dimensions'))+'</option>'+d.dims.map(k=>'<option value="'+esc(k)+'">'+esc(T(k))+'</option>').join('')+'</select></div><div><label class="libelle" for="catalog-method">'+esc(t('Normalisation','Normalization'))+'</label><select class="champ" id="catalog-method"><option value="">'+esc(t('Toutes les méthodes','All methods'))+'</option>'+Object.entries(labels).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('')+'</select></div></div>');el.append(controls);
 const count=document.createElement('p');count.setAttribute('aria-live','polite');el.append(count);const list=document.createElement('div');el.append(list);
 const search=controls.querySelector('input'),dim=controls.querySelector('#catalog-dim'),met=controls.querySelector('#catalog-method');
 function draw(){const q=apri.plier(search.value);const rows=d.indicateurs.filter(x=>(!dim.value||x.dim===dim.value)&&(!met.value||method(x)===met.value)&&(!q||apri.plier((x.nom_fr||'')+' '+x.nom+' '+(x.metrique_fr||x.metrique||'')).includes(q)));count.textContent=rows.length+' '+t('indicateurs','indicators');list.replaceChildren();if(!rows.length){list.textContent=t('Aucun indicateur ne correspond à ces filtres.','No indicators match these filters.');return;}rows.forEach(x=>{const name=fr?(x.nom_fr||x.nom):x.nom;const card=apri.h('<details class="catalog-item"><summary><strong>'+esc(name)+'</strong><span>'+esc(T(x.dim))+' · '+esc(labels[method(x)])+'</span></summary><div class="catalog-body"></div></details>');card.addEventListener('toggle',()=>{const body=card.querySelector('.catalog-body');if(!card.open||body.childElementCount)return;body.append(apri.h('<p><b>'+esc(t('Méthode de normalisation : ','Normalization method: '))+'</b>'+esc(labels[method(x)])+'</p>'));body.append(apri.h(fiche(x,apri,d,T)));});list.append(card);});}
 search.oninput=draw;dim.onchange=draw;met.onchange=draw;
 const style=document.createElement('style');style.textContent='#cadre .catalog-item{border:0;border-top:1px solid #d5dce0;background:transparent;padding:18px 0}#cadre .catalog-item summary{cursor:pointer;list-style-position:outside;padding:4px 0}#cadre .catalog-item summary strong{font-size:18px;font-weight:500}#cadre .catalog-item summary span{display:block;margin:8px 0;color:#60717a;font-size:13px}#cadre .catalog-body{padding-top:20px}#cadre .catalog-body .pdf-record{background:transparent;box-shadow:none;border:0}';el.append(style);draw();
}
