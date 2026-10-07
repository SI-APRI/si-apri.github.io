/* Analyser les résultats · Corrélations — port of correlations_simples.render,
   croisement_variable.render and correlations_generales.render.
   Static version: the outcome is ONE question and ONE answer (Streamlit also allows
   several answers and several questions combined with AND / OR, which needs the
   household microdata). Everything else is precomputed by outils/export_resultats_liens.py. */
import * as O from './commun_scores/outils.js';

const D = 'data/resultats/liens/';
const RAISONS = ['ok','sample','sections','missing_section','support','degenerate'];
const DIMS4 = ['sexe','paysage','age','richesse'];

let S = {scope:'selected', theme:'__all__', q:null, a:null, xvar:'sexe', xtheme:'__all__', xq:null,
 dims:[...DIMS4], comb:'mixed', dir:'mixed', calcule:null,
 g:{theme:'__all__', dims:[...DIMS4], comb:'mixed', crit:'strength', calcule:false}};
let tour = 0;

/* ---- statistics (croisement_variable.khi2, liens_inference.holm) */
function lgamma(x){
 const c = [76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];
 let y = x, t = x+5.5; t -= (x+0.5)*Math.log(t); let s = 1.000000000190015;
 for(const k of c) s += k/++y;
 return -t + Math.log(2.5066282746310005*s/x);
}
function gammaincUpper(a, x){
 if(x<=0) return 1;
 if(x < a+1){
  let term = 1/a, total = term;
  for(let k=1;k<500;k++){ term *= x/(a+k); total += term; if(Math.abs(term) < Math.abs(total)*1e-14) break; }
  return 1 - total*Math.exp(-x + a*Math.log(x) - lgamma(a));
 }
 const tiny = 1e-300; let b = x+1-a, c = 1/tiny, d = 1/b, h = d;
 for(let i=1;i<500;i++){
  const an = -i*(i-a); b += 2;
  d = an*d+b; if(Math.abs(d)<tiny) d = tiny;
  c = b+an/c; if(Math.abs(c)<tiny) c = tiny;
  d = 1/d; const delta = d*c; h *= delta;
  if(Math.abs(delta-1)<1e-14) break;
 }
 return Math.exp(-x + a*Math.log(x) - lgamma(a))*h;
}
const chi2sf = (x, df) => (df>0 && x>0) ? gammaincUpper(df/2, x/2) : 1;
function khi2(rows){
 const obs = rows.map(r=>[r.cas, r.n-r.cas]);
 const tot = obs.reduce((s,r)=>s+r[0]+r[1],0);
 if(obs.length<2 || tot===0) return null;
 const rs = obs.map(r=>r[0]+r[1]), cs = [obs.reduce((s,r)=>s+r[0],0), obs.reduce((s,r)=>s+r[1],0)];
 let stat = 0, faible = false;
 for(let i=0;i<obs.length;i++) for(let j=0;j<2;j++){
  const e = rs[i]*cs[j]/tot; if(e===0) return null;
  if(e<5) faible = true; stat += (obs[i][j]-e)**2/e;
 }
 const df = obs.length-1;
 return [stat, df, chi2sf(stat, df), Math.sqrt(stat/(tot*1)), faible?1:0];
}
function holm(p){
 const m = p.length, valid = p.map(Number.isFinite), work = p.map((v,i)=>valid[i]?v:1);
 const ordre = work.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0] || a[1]-b[1]).map(x=>x[1]);
 const adj = new Array(m); let run = 0;
 ordre.forEach((i,k)=>{ run = Math.max(run, work[i]*(m-k)); adj[i] = Math.min(1, run); });
 return adj.map((v,i)=>valid[i]?v:NaN);
}

export default async function render(el, apri){
 const moi = ++tour;
 O.init(apri);
 const t = (fr, en) => apri.lang==='en' ? en : fr;
 const {esc, L} = O;
 const meta = await apri.donnees(D+'questions.json');
 if(moi!==tour) return;
 const redessiner = ()=>render(el, apri);
 const f = O.f;
 const qs = new Map(meta.questions.map(q=>[q.i, q]));
 const thLib = c => c==='__all__' ? t('Tous les thèmes','All themes') : L(meta.themes.find(x=>x.code===c));
 const mod = v => L(meta.valeurs[v]) || v;
 const repLib = (q, v) => L(q.a.find(x=>x.v===v)) || v;
 const decision = (p, pHolm, rs) => !Number.isFinite(p)
  ? t('Non calculable : ','Not computable: ') + ({sample:t('effectif insuffisant','insufficient sample'), sections:t('moins de 8 sections','fewer than 8 sections'), missing_section:t('section manquante','missing section'), support:t('réponses concentrées dans trop peu de sections','responses concentrated in too few sections'), degenerate:t('test instable','unstable test')}[RAISONS[rs]] || RAISONS[rs])
  : (pHolm<=.05 ? t('Seuil franchi — sous hypothèses','Threshold met — under assumptions') : t('Seuil non franchi','Threshold not met'));
 const r4 = v => Number.isFinite(v) ? f(v,4) : '—';
 const fixe = (v, d) => Number.isFinite(v) ? f(v, d) : '—';

 el.innerHTML = '';
 const racine = document.createElement('div'); racine.className='sc-racine'; el.append(racine);
 const rs = document.createElement('div'); rs.className='sc-rangee'; racine.append(rs);
 rs.append(O.select({libelle:t('Recherche','Search scope'), cls:'large', opts:[['selected', t('Choisir un cas précis','Choose a specific outcome')], ['survey', t('Toutes les questions — classement général','All questions — overall ranking')]],
  valeur:S.scope, surChange:v=>{ S.scope=v; redessiner(); }}));
 const etape = (n, txt) => racine.insertAdjacentHTML('beforeend', `<div class="sc-etape"><span>${n}</span>${esc(txt)}</div>`);
 const cap = (txt, cible=racine) => cible.insertAdjacentHTML('beforeend', `<p class="sc-cap">${esc(txt)}</p>`);
 const md = (txt, cible=racine) => cible.insertAdjacentHTML('beforeend', `<p class="sc-cap" style="color:var(--texte)">${txt}</p>`);
 const themesPresents = ['__all__', ...meta.themes.map(x=>x.code)];
 const nomProfil = labels => labels.map(mod).join(' · ');

 if(S.scope==='survey') return general();

 // ---------------------------------------------------------------- 01 outcome
 etape('01', t('Définir le cas étudié','Define the outcome'));
 const c1 = document.createElement('div'); c1.className='sc-cadre'; racine.append(c1);
 cap(t('Choisissez ce que vous voulez étudier : thème → question → une réponse.','Choose what to study: theme → question → one answer.'), c1);
 const r1 = document.createElement('div'); r1.className='sc-rangee'; c1.append(r1);
 r1.append(O.select({libelle:t('Thème','Theme'), opts:themesPresents.map(c=>[c, thLib(c)]), valeur:S.theme, surChange:v=>{ S.theme=v; if(S.q!=null && v!=='__all__' && qs.get(S.q).th!==v){ S.q=null; S.a=null; } redessiner(); }}));
 const visibles = meta.questions.filter(q=>S.theme==='__all__' || q.th===S.theme);
 const cq = O.chercheur({libelle:t('Question','Question'), opts:visibles.map(q=>[q.i, L(q.q)]), valeur:S.q, placeholder:t('Tapez un mot-clé…','Type a keyword…'),
  surChange:v=>{ S.q=v; S.a=null; S.calcule=null; redessiner(); }});
 cq.classList.add('large'); r1.append(cq);
 const q = S.q!=null ? qs.get(S.q) : null;
 const r2 = document.createElement('div'); r2.className='sc-rangee'; c1.append(r2);
 if(q) r2.append(O.select({libelle:t('Réponse étudiée','Answer of interest'), opts:q.a.map(x=>[x.v, L(x)]), valeur:S.a, placeholder:t('Choisir une réponse','Choose an answer'),
  surChange:v=>{ S.a=v; S.calcule=null; redessiner(); }}));
 else r2.append(apri.h(`<div class="sc-champ"><label class="libelle">${esc(t('Réponse étudiée','Answer of interest'))}</label><select class="champ" disabled><option>${esc(t('Choisir une réponse','Choose an answer'))}</option></select></div>`));
 cap(t('Version statique : le cas est une question et une réponse. Le site interactif permet aussi de cumuler plusieurs réponses (OU) et plusieurs questions (ET / OU), ce qui demande les réponses individuelles des ménages.',
  'Static version: the outcome is one question and one answer. The interactive site also lets you pool several answers (OR) and several questions (AND / OR), which requires the individual household answers.'), c1);
 if(!q || S.a==null) return;

 const ai = q.a.findIndex(x=>x.v===S.a);
 const k = q.a[ai].k, n = q.n;
 const fq = await apri.donnees(D+'q/'+q.i+'.json');
 if(moi!==tour) return;
 const ent = fq[ai];
 md(`${esc(L(q.q))} : ${esc(repLib(q, S.a))}`);
 racine.insertAdjacentHTML('beforeend', `<div class="sc-kpi"><div><small>${esc(t('Ménages concernés','Affected households'))}</small><b>${k}</b></div><div><small>${esc(t('Réponses complètes','Complete responses'))}</small><b>${n}</b></div><div><small>${esc(t('Fréquence du cas','Outcome frequency'))}</small><b>${n ? f(100*k/n,1)+(apri.lang==='en'?'%':' %') : '—'}</b></div></div>`);
 cap(t('Les réponses manquantes à une question sélectionnée sont exclues. Sexe et âge décrivent le répondant, pas chaque membre du ménage.','Missing responses to the selected question are excluded. Sex and age describe the respondent, not every household member.'));

 // ---------------------------------------------------------------- 02 crosstab
 etape('02', t('Croiser avec une variable choisie','Cross with a chosen variable'));
 const c2 = document.createElement('div'); c2.className='sc-cadre'; racine.append(c2);
 cap(t('Le cas ci-dessus, ventilé selon une variable que vous choisissez : sexe, paysage, âge, niveau économique, section, ou n’importe quelle autre question.','The outcome above, broken down by a variable you choose: sex, landscape, age, economic level, section, or any other question.'), c2);
 const noms = {sexe:t('Sexe','Sex'), paysage:t('Paysage (littoral / montagne)','Landscape (coastal / mountain)'), age:t('Âge','Age'), richesse:t('Niveau économique','Economic level'), section:t('Section communale','Communal section'), __question__:t('Une autre question de l’enquête','Another survey question')};
 const r3 = document.createElement('div'); r3.className='sc-rangee'; c2.append(r3);
 r3.append(O.select({libelle:t('Comparer le cas avec','Compare the outcome with'), opts:Object.keys(noms).map(v=>[v, noms[v]]), valeur:S.xvar, surChange:v=>{ S.xvar=v; redessiner(); }}));
 const zx = document.createElement('div'); c2.append(zx);
 await croiser(zx);
 if(moi!==tour) return;

 // ---------------------------------------------------------------- 03 profiles
 if(Math.min(k, n-k) < 30){
  racine.insertAdjacentHTML('beforeend', O.info(t('Il faut au moins 30 ménages concernés et 30 autres pour établir les classements automatiques ci-dessous. Modifiez la sélection.','At least 30 affected and 30 other households are required for the automatic rankings below. Change the selection.')));
  return;
 }
 const names = {sexe:t('Sexe','Sex'), paysage:t('Paysage','Landscape'), age:t('Âge','Age'), richesse:t('Niveau économique','Economic level')};
 etape('03', t('Choisir les profils à comparer','Choose the profiles to compare'));
 const c3 = document.createElement('div'); c3.className='sc-cadre'; racine.append(c3);
 const r4b = document.createElement('div'); r4b.className='sc-rangee'; c3.append(r4b);
 const mdims = O.multi({libelle:t('Variables de profil','Profile variables'), opts:DIMS4.map(d=>[d, names[d]]), valeurs:S.dims, placeholder:t('Choisir','Choose'), trier:false,
  surChange:v=>{ S.dims = v; S.calcule=null; redessiner(); }});
 mdims.classList.add('large');
 r4b.append(mdims);
 r4b.append(O.select({libelle:t('Combiner les variables','Combine variables'), opts:[['mixed', t('Mixte : seules et combinées','Mixed: individual and combined')], ['combined', t('Toutes ensemble uniquement','All together only')]], valeur:S.comb, surChange:v=>{ S.comb=v; S.calcule=null; redessiner(); }}));
 r4b.append(O.select({libelle:t('Classement de φ','Phi ranking'), opts:[['mixed', t('Mixte : 10 hauts + 10 bas','Mixed: 10 highest + 10 lowest')], ['positive', t('10 φ les plus positifs','10 most positive phi')], ['negative', t('10 φ les plus négatifs','10 most negative phi')]], valeur:S.dir, surChange:v=>{ S.dir=v; redessiner(); }}));
 cap(t('Exemple : sexe + paysage → « toutes ensemble » compare les profils comme femme · montagne ; « mixte » inclut aussi sexe seul et paysage seul. Haut/bas décrit la fréquence du cas choisi, pas une valeur bonne ou mauvaise.', 'Example: sex + landscape → “all together” compares profiles such as woman · mountain; “mixed” also includes sex alone and landscape alone. High/low describes the selected outcome frequency, not a good or bad value.'), c3);
 if(!S.dims.length){ racine.insertAdjacentHTML('beforeend', O.info(t('Choisissez au moins une variable de profil.','Choose at least one profile variable.'))); return; }
 const signature = [q.i, S.a, S.dims.join(','), S.comb].join('|');
 const bouton = document.createElement('button'); bouton.type='button'; bouton.className='bouton primaire'; bouton.style.marginTop='12px';
 bouton.textContent = t('Afficher les profils associés','Show associated profiles');
 bouton.onclick = ()=>{ S.calcule = signature; redessiner(); };
 racine.append(bouton);
 if(S.calcule!==signature) return;

 // the family: candidates in the reader's order, duplicates removed, Holm on what remains
 const canon = new Map(meta.candidats.map((c,pid)=>[c.d.map((d,i)=>d+'='+c.l[i]).sort().join('|'), pid]));
 const parPid = new Map((ent.r||[]).map(r=>[r[0], r]));
 const famille = [], vus = new Set();
 const tailles = S.comb==='mixed' ? S.dims.map((_,i)=>i+1) : [S.dims.length];
 const combis = (arr, kk) => kk===0 ? [[]] : arr.flatMap((x,i)=>combis(arr.slice(i+1), kk-1).map(c=>[x,...c]));
 const produit = listes => listes.reduce((acc,l)=>acc.flatMap(a=>l.map(x=>[...a,x])), [[]]);
 for(const tl of tailles) for(const ds of combis(S.dims, tl)) for(const labels of produit(ds.map(d=>meta.groupes[d]))){
  const pid = canon.get(ds.map((d,i)=>d+'='+labels[i]).sort().join('|'));
  const r = parPid.get(pid); if(!r) continue;
  const [, both, b, nn, aa, sig, pc, rsn] = r;
  if(vus.has(sig)) continue; vus.add(sig);
  const phi = (nn*both - aa*b)/Math.sqrt(aa*(nn-aa)*b*(nn-b));
  famille.push({labels, phi, yes:both, with_n:b, with_pct:100*both/b, without_pct:100*(aa-both)/(nn-b), p: pc>=0 ? pc/1024 : NaN, rs:rsn});
 }
 holm(famille.map(r=>r.p)).forEach((p,i)=>famille[i].p_holm=p);
 etape('04', t('Lire les associations','Read the associations'));
 cap(t('p est corrigée par Holm sur tous les profils admissibles de votre sélection, positifs et négatifs, avant le top 10. Changer seulement le sens du classement ne change pas cette correction.', 'p is Holm-adjusted across all eligible profiles in your selection, positive and negative, before the top ten. Changing only the ranking direction does not change this adjustment.'));
 const cote = positif => {
  const rows = famille.filter(r=>positif ? r.phi>0 : r.phi<0).sort((a,b)=>positif ? b.phi-a.phi : a.phi-b.phi);
  racine.insertAdjacentHTML('beforeend', `<h3>${esc(positif ? t('Les 10 profils les plus associés à une fréquence élevée du cas','The 10 profiles most associated with a higher outcome frequency') : t('Les 10 profils les plus associés à une fréquence faible du cas','The 10 profiles most associated with a lower outcome frequency'))}</h3>`);
  if(!rows.length){ racine.insertAdjacentHTML('beforeend', O.info(t('Aucun profil calculable dans ce sens.','No calculable profile in this direction.'))); }
  else {
   const pre = positif ? t('Cas plus fréquent','Outcome more common') : t('Cas moins fréquent','Outcome less common');
   racine.insertAdjacentHTML('beforeend', `<div class="sc-defile"><table class="tableau sc-tab"><thead><tr><th>${esc(t('Rang','Rank'))}</th><th>${esc(t('Profil','Profile'))}</th><th class="num">φ</th><th>${esc(t('Interprétation de φ','Interpretation of phi'))}</th><th class="num">${esc(t('p corrigée (Holm)','Adjusted p (Holm)'))}</th><th>${esc(t('Interprétation de p','Interpretation of p'))}</th></tr></thead><tbody>`+
    rows.slice(0,10).map((r,j)=>`<tr><td class="num">${j+1}</td><td>${esc(nomProfil(r.labels))}</td><td class="num sc-court">${f(r.phi,3)}</td><td>${esc(t(`${pre} : ${f(r.with_pct,1)} % (${r.yes}/${r.with_n}), contre ${f(r.without_pct,1)} % chez les autres.`, `${pre}: ${f(r.with_pct,1)}% (${r.yes}/${r.with_n}), versus ${f(r.without_pct,1)}% among others.`))}</td><td class="num">${r4(r.p_holm)}</td><td>${esc(decision(r.p, r.p_holm, r.rs))}</td></tr>`).join('')+'</tbody></table></div>');
  }
  if(rows.length<10) cap(t(`${rows.length} profils admissibles dans ce sens : la liste contient moins de dix lignes.`, `${rows.length} eligible profiles in this direction: fewer than ten rows are available.`));
 };
 if(S.dir!=='negative') cote(true);
 if(S.dir!=='positive') cote(false);
 md(t('<b>φ = force et sens du lien.</b> Positif : cas plus fréquent dans le profil ; négatif : moins fréquent. Plus |φ| est proche de 1, plus le lien binaire est fort ; près de 0, il est faible. φ = 0,3 ne signifie pas 30 % de risque.', '<b>Phi = strength and direction of the association.</b> Positive: outcome more common in the profile; negative: less common. The closer |phi| is to 1, the stronger the binary association; near 0 means a weak one. Phi = 0.3 does not mean 30% risk.'));
 md(t('<b>p corrigée = lecture statistique après recherche de nombreux profils.</b> À 0,05 ou moins, le lien franchit le seuil sous les hypothèses du test. Au-delà, les données ne suffisent pas à le confirmer : cela ne prouve pas son absence. Une petite p ne mesure pas la force du lien et ne prouve pas une cause.', '<b>Adjusted p = statistical evidence after searching many profiles.</b> At 0.05 or below, the association meets the threshold under the test assumptions. Above it, the data do not suffice to confirm it: this does not prove its absence. A small p measures neither association strength nor causation.'));
 const [pm, pmc] = O.pli(t('Méthode et limites','Method and limitations'), false);
 racine.append(pm);
 pmc.innerHTML = '<div class="sc-md">'+[
  t(`${famille.length} profils examinés, y compris les liens négatifs, dans la correction de Holm. Les profils se chevauchent. La correction couvre cette recherche, pas vos recherches successives. Des p corrigées identiques sur plusieurs lignes sont possibles, même si les φ diffèrent.`, `${famille.length} profiles, including negative associations, enter the Holm adjustment. Profiles overlap. Adjustment covers this search, not repeated searches. Adjusted p-values can be identical across rows even when phi differs.`),
  t('Au moins 30 observations pour chaque niveau du cas et du profil. Les doublons exacts et les profils identiques ou inverses du cas sont exclus. Les réponses manquantes ne sont jamais comptées comme non. Les cultures sont limitées aux répondants déclarant pratiquer l’agriculture. Les effectifs peuvent varier selon les caractéristiques disponibles.', 'At least 30 observations at each level of the outcome and profile. Exact duplicates and profiles identical or inverse to the outcome are excluded. Missing responses never count as no. Crops are restricted to respondents reporting farming. Sample sizes may vary with available characteristics.'),
  t('La p-value teste l’absence d’écart de proportion : sous cette hypothèse et celles du modèle, elle mesure la fréquence de résultats au moins aussi extrêmes. Ce n’est pas la probabilité que le lien soit faux. Test bilatéral wild cluster bootstrap-t, regroupé par section, puis correction de Holm. Les tests non calculables comptent comme p = 1 dans la correction mais restent affichés comme indisponibles.', 'The p-value tests no difference in proportions: under that hypothesis and model assumptions, it measures the frequency of results at least as extreme. It is not the probability that the association is false. Two-sided wild cluster bootstrap-t grouped by section, then Holm adjustment. Uncomputable tests enter adjustment as p = 1 but remain displayed as unavailable.'),
  t('Dix sections restent peu : ces tests sont approximatifs et supposent des sections indépendantes. Pas de pondération de population ni d’ajustement des profils entre eux. Les résultats restent exploratoires et ne démontrent pas des causes.', 'Ten sections remain few: these tests are approximate and assume independent sections. No population weighting or adjustment between profiles. Results remain exploratory and do not demonstrate causes.')
 ].map(x=>`<p>${esc(x)}</p>`).join('')+'<p><a href="https://www.stata.com/manuals/rwildbootstrap.pdf" target="_blank" rel="noopener">Wild cluster bootstrap — Stata</a></p></div>';

 // ------------------------------------------------------------- crosstab (02)
 async function croiser(z){
  let groupes, titre, ex = {}, nTot, kTot, over = false, kh = null, test = null;
  if(S.xvar==='__question__'){
   const r = document.createElement('div'); r.className='sc-rangee'; z.append(r);
   r.append(O.select({libelle:t('Thème','Theme'), opts:themesPresents.map(c=>[c, thLib(c)]), valeur:S.xtheme, surChange:v=>{ S.xtheme=v; if(S.xq!=null && v!=='__all__' && qs.get(S.xq).th!==v) S.xq=null; redessiner(); }}));
   const vis = meta.questions.filter(x=>(S.xtheme==='__all__' || x.th===S.xtheme) && x.i!==q.i);
   if(S.xq===q.i) S.xq = null;
   const c = O.chercheur({libelle:t('Question','Question'), opts:vis.map(x=>[x.i, L(x.q)]), valeur:S.xq, placeholder:t('Tapez un mot-clé…','Type a keyword…'), surChange:v=>{ S.xq=v; redessiner(); }});
   c.classList.add('large'); r.append(c);
   if(S.xq==null){ cap(t('Choisissez la question à croiser avec le cas.','Choose the question to cross with the outcome.'), z); return; }
   const q2 = qs.get(S.xq);
   titre = L(q2.q);
   z.insertAdjacentHTML('beforeend', `<div class="chargement" style="min-height:80px">${esc(t('Chargement…','Loading…'))}</div>`);
   const fx = await apri.donnees(D+'x/'+q.i+'.json');
   if(moi!==tour) return;
   z.querySelector('.chargement')?.remove();
   const row = fx[q2.i];
   if(!row){ z.insertAdjacentHTML('beforeend', O.info(t('Pas assez de modalités renseignées pour croiser.','Not enough recorded categories to cross.'))); return; }
   const [nn, gl, ks, cs, e] = row; ex = e || {};
   nTot = nn; kTot = ks[ai];
   groupes = q2.a.map((x,j)=>({groupe:x.v, label:L(x), n:gl[j], cas:cs[ai][j]})).filter(g=>g.n!==0);
   over = !!ex.o;
   kh = ex.kh && ex.kh[ai] ? ex.kh[ai] : null;
   // the two-group test: phi from the counts (or written when a group is hidden), p when computable
   test = [ex.phi && ex.phi[ai]!=null ? ex.phi[ai] : null, ex.p && ex.p[ai]!=null ? ex.p[ai] : -1];
  } else {
   const d = ent[S.xvar];
   titre = noms[S.xvar];
   nTot = d.n; kTot = d.k;
   groupes = d.g.map(([g, nn, cas])=>({groupe:g, label:mod(g), n:nn, cas}));
   over = !!d.over; kh = d.kh || null; test = d.t || null;
  }
  if(groupes.length<2){ z.insertAdjacentHTML('beforeend', O.info(t('Pas assez de modalités renseignées pour croiser.','Not enough recorded categories to cross.'))); return; }
  groupes.forEach(g=>{ g.pct = g.n>0 ? 100*g.cas/g.n : null; });
  z.insertAdjacentHTML('beforeend', `<p class="sc-cap" style="color:var(--texte)"><b>${esc(titre)}</b> · ${esc(t(`${nTot} ménages avec réponse aux deux variables, dont ${kTot} concernés (${f(100*kTot/nTot,1)} %).`, `${nTot} households with an answer to both variables, ${kTot} of them affected (${f(100*kTot/nTot,1)}%).`))}</p>`);
  // bars (croisement_variable._barres)
  const BAR_H=20, GAP=10, LAB_W=300, TOP=6, W=860, plotW = W-LAB_W-150;
  const vmax = Math.max(...groupes.map(g=>g.pct ?? 0), 1e-9);
  const h = TOP*2 + groupes.length*(BAR_H+GAP) - GAP;
  const p = [`<svg class="sc-svg" viewBox="0 0 ${W} ${h}" width="100%" style="max-width:${W}px;display:block" role="img"><style>.xl{font:13px system-ui,sans-serif;fill:#3c4761}.xv{font:600 13px system-ui,sans-serif;fill:#25384b}</style>`];
  groupes.forEach((g,i)=>{
   const yy = TOP + i*(BAR_H+GAP);
   const lab = g.label.length<=40 ? g.label : g.label.slice(0,39)+'…';
   p.push(`<text class="xl" x="${LAB_W-10}" y="${yy+14}" text-anchor="end"><title>${esc(g.label)}</title>${esc(lab)}</text>`);
   if(g.pct==null){ p.push(`<text class="xv" x="${LAB_W+8}" y="${yy+14}" style="fill:#8a93a5;font-weight:400">n &lt; 5</text>`); return; }
   const w = plotW*g.pct/vmax;
   p.push(`<rect x="${LAB_W}" y="${yy}" width="${w.toFixed(1)}" height="${BAR_H}" rx="3" fill="#5b6b7a"/>`);
   p.push(`<text class="xv" x="${(LAB_W+w+8).toFixed(1)}" y="${yy+14}">${f(g.pct,1)} % · ${g.cas}/${g.n}</text>`);
  });
  p.push('</svg>');
  const dz = document.createElement('div'); dz.className='sc-dessin'; dz.innerHTML = p.join(''); z.append(dz);
  z.append(O.exports(dz, 'apri-correlations'));
  z.insertAdjacentHTML('beforeend', `<div class="sc-defile"><table class="tableau sc-tab"><thead><tr><th>${esc(t('Modalité','Category'))}</th><th class="num">${esc(t('Ménages','Households'))}</th><th class="num">${esc(t('Concernés','Affected'))}</th><th class="num">${esc(t('Fréquence du cas','Outcome frequency'))}</th></tr></thead><tbody>`+
   groupes.map(g=>`<tr><td>${esc(g.label)}</td><td class="num">${g.n>0?g.n:'n < 5'}</td><td class="num">${g.cas ?? '—'}</td><td class="num">${g.pct==null?'—':f(g.pct,1)}</td></tr>`).join('')+'</tbody></table></div>');
  const petits = groupes.filter(g=>g.n<30).map(g=>g.label);
  if(petits.length) cap(t('Moins de 30 ménages pour : ','Fewer than 30 households for: ')+petits.join(', ')+t('. Les pourcentages de ces lignes sont fragiles.','. Percentages on these rows are fragile.'), z);
  if(over){ cap(t('Question à réponses multiples : un ménage peut figurer sur plusieurs lignes, les pourcentages se lisent ligne par ligne et aucun test global n’est calculé.','Multiple-response question: a household can appear on several rows; read percentages row by row, no overall test is computed.'), z); return; }
  if(!kh && groupes.every(g=>g.n>0)) kh = khi2(groupes);
  if(!kh) return;
  const [stat, df, pk, v, faible] = kh;
  const lignes = [];
  if(groupes.length===2 && test){
   let [phi, pc] = test;
   if(phi==null && groupes.every(g=>g.n>0)){
    const a0 = groupes[0], nn = nTot, aa = kTot, b = a0.n;
    if(Math.min(aa, nn-aa, b, nn-b)>0) phi = (nn*a0.cas - aa*b)/Math.sqrt(aa*(nn-aa)*b*(nn-b));
   }
   if(phi!=null) lignes.push(t(`φ = ${phi>=0?'+':''}${f(phi,3)} (signe rapporté à « ${groupes[0].label} »).`, `phi = ${phi>=0?'+':''}${f(phi,3)} (sign relative to “${groupes[0].label}”).`));
   if(pc>=0) lignes.push(t(`p = ${f(pc/1024,3)}, test bootstrap regroupé par section, le même que pour les classements.`, `p = ${f(pc/1024,3)}, section-clustered bootstrap test, the same as for the rankings.`));
   else lignes.push(t('Test regroupé par section non calculable ici (effectif ou sections insuffisants).','Section-clustered test not computable here (insufficient sample or sections).'));
  }
  lignes.push(t(`V de Cramér = ${f(v,3)} ; khi² = ${f(stat,1)} (${df} ddl), p ≈ ${f(pk,3)}, approximation qui ignore le regroupement par section.`, `Cramér’s V = ${f(v,3)}; chi-square = ${f(stat,1)} (${df} df), p ≈ ${f(pk,3)}, an approximation that ignores section clustering.`));
  if(faible) lignes.push(t('Certaines cases attendues sont inférieures à 5 : le khi² est peu fiable.','Some expected cells are below 5: the chi-square is unreliable.'));
  cap(lignes.join(' '), z);
  cap(t('Lecture : V (et φ) mesurent la force du lien, de 0 (aucun) à 1 (parfait) ; p dit si l’écart entre modalités dépasse ce que le hasard produirait. Un lien n’est pas une cause.','Reading: V (and phi) measure the strength of the association, from 0 (none) to 1 (perfect); p says whether the gap between categories exceeds what chance would produce. An association is not a cause.'), z);
 }

 // ------------------------------------------------------------ overall ranking
 async function general(){
  const G = S.g;
  cap(t('Recherche générale : chaque réponse exploitable de l’enquête est comparée aux profils de sexe, paysage, âge et niveau économique, seuls et combinés.','Overall search: every usable survey answer is compared with profiles of sex, landscape, age and economic level, alone and combined.'));
  cap(t('Il s’agit de liens entre réponses et profils, pas entre deux indicateurs. Les cumuls personnalisés de questions restent dans « Choisir un cas précis ».','These are answer–profile associations, not links between two indicators. Custom combinations of questions remain in “Choose a specific outcome”.'));
  const names = {sexe:t('Sexe','Sex'), paysage:t('Paysage','Landscape'), age:t('Âge','Age'), richesse:t('Niveau économique','Economic level')};
  const r = document.createElement('div'); r.className='sc-rangee'; racine.append(r);
  r.append(O.select({libelle:t('Thème des questions','Question theme'), opts:themesPresents.map(c=>[c, thLib(c)]), valeur:G.theme, surChange:v=>{ G.theme=v; redessiner(); }}));
  const md2 = O.multi({libelle:t('Variables de profil','Profile variables'), opts:DIMS4.map(d=>[d, names[d]]), valeurs:G.dims, placeholder:t('Choisir','Choose'), surChange:v=>{ G.dims=v; redessiner(); }});
  md2.classList.add('large'); r.append(md2);
  r.append(O.select({libelle:t('Combiner','Combine'), opts:[['mixed', t('Seules et combinées','Individual and combined')], ['combined', t('Toutes ensemble uniquement','All together only')]], valeur:G.comb, surChange:v=>{ G.comb=v; redessiner(); }}));
  const r2 = document.createElement('div'); r2.className='sc-rangee'; racine.append(r2);
  r2.append(O.select({libelle:t('Classer les associations par','Rank associations by'), cls:'large', opts:[['strength', t('|φ| le plus élevé — lien le plus fort','Highest |phi| — strongest association')], ['raw_low', t('p brute la plus faible','Lowest raw p')], ['raw_high', t('p brute la plus élevée — pas un lien plus solide','Highest raw p — not stronger evidence')], ['adjusted_low', t('p corrigée (Holm) la plus faible','Lowest adjusted p (Holm)')], ['adjusted_high', t('p corrigée (Holm) la plus élevée','Highest adjusted p (Holm)')]], valeur:G.crit, surChange:v=>{ G.crit=v; redessiner(); }}));
  if(!G.dims.length){ racine.insertAdjacentHTML('beforeend', O.info(t('Choisissez au moins une variable de profil.','Choose at least one profile variable.'))); return; }
  const b = document.createElement('button'); b.type='button'; b.className='bouton primaire'; b.style.marginTop='12px';
  b.textContent = t('Explorer toute l’enquête','Explore the whole survey');
  b.onclick = ()=>{ G.calcule = true; redessiner(); };
  racine.append(b);
  if(!G.calcule) return;
  const gen = await apri.donnees(D+'general.json');
  if(moi!==tour) return;
  const cle = [G.theme, G.dims.map(d=>DIMS4.indexOf(d)).sort().join(''), G.comb, G.crit].join('|');
  const [nf, nr, ids] = gen.combos[cle];
  racine.insertAdjacentHTML('beforeend', `<h3>${esc(t('Les 10 premières associations selon votre classement','Top 10 associations for your ranking'))}</h3>`);
  cap(t(`${gen.outcomes} réponses étudiées ; ${gen.n_rows} associations admissibles dans toute l’enquête. ${nf} correspondent à vos filtres ; ${nr} peuvent être classées avec ce critère.`, `${gen.outcomes} answers examined; ${gen.n_rows} eligible associations across the survey. ${nf} match your filters; ${nr} can be ranked with this criterion.`));
  if(!ids.length) racine.insertAdjacentHTML('beforeend', O.info(t('Aucune association calculable avec ces filtres et ce tri.','No calculable association for these filters and ranking.')));
  else racine.insertAdjacentHTML('beforeend', `<div class="sc-defile"><table class="tableau sc-tab"><thead><tr><th>${esc(t('Rang','Rank'))}</th><th>${esc(t('Question','Question'))}</th><th>${esc(t('Réponse','Answer'))}</th><th>${esc(t('Profil','Profile'))}</th><th class="num">φ</th><th class="num">${esc(t('p brute','Raw p'))}</th><th class="num">${esc(t('p corrigée (Holm)','Adjusted p (Holm)'))}</th><th>${esc(t('Interprétation de φ','Interpretation of phi'))}</th><th>${esc(t('Interprétation de p corrigée','Adjusted p interpretation'))}</th></tr></thead><tbody>`+
   ids.map((id,j)=>{
    const [qid, a, pid, phi, yes, wn, wp, wop, p, ph, rsn] = gen.rows[id];
    const qq = qs.get(qid);
    const fr = phi>0 ? t('Plus fréquent','More common') : phi<0 ? t('Moins fréquent','Less common') : t('Même fréquence','Same frequency');
    return `<tr><td class="num">${j+1}</td><td>${esc(L(qq.q))}</td><td>${esc(repLib(qq, a))}</td><td>${esc(nomProfil(meta.candidats[pid].l))}</td><td class="num sc-court">${f(phi,3)}</td><td class="num">${p==null?'—':r4(p)}</td><td class="num">${ph==null?'—':r4(ph)}</td><td>${esc(t(`${fr} : ${f(wp,1)}% (${yes}/${wn}), contre ${f(wop,1)}% chez les autres.`, `${fr}: ${f(wp,1)}% (${yes}/${wn}), versus ${f(wop,1)}% among others.`))}</td><td>${esc(decision(p==null?NaN:p, ph, rsn))}</td></tr>`;
   }).join('')+'</tbody></table></div>');
  md(t('<b>|φ| élevé = lien observé fort. p faible = davantage d’éléments contre l’absence de lien, sous les hypothèses du test. p élevée ≠ meilleur lien.</b> La décision à 0,05 utilise p corrigée, même lorsque vous triez par p brute. Une association ne prouve pas une cause.', '<b>High |phi| = strong observed association. Low p = more evidence against no association under the test assumptions. High p ≠ a better association.</b> The 0.05 decision uses adjusted p even when sorting by raw p. Association does not prove causation.'));
  const [pm, pmc] = O.pli(t('Méthode du classement général','Overall ranking methodology'), false);
  racine.append(pm);
  pmc.innerHTML = '<div class="sc-md">'+[
   t('Holm porte sur toutes les associations admissibles de toute l’enquête avant les filtres et le top 10. Changer le thème, les variables ou le tri ne réduit pas la correction. Les p non calculables comptent comme 1 pour la correction mais restent indisponibles et sont exclues des tris par p. À égalité de p, on trie par |φ| décroissant ; une égalité ne crée pas une différence statistique.', 'Holm covers all eligible associations across the whole survey before filters and the top ten. Changing themes, variables or ranking does not reduce adjustment. Uncomputable p-values enter adjustment as 1 but remain unavailable and are excluded from p rankings. Tied p-values are ordered by decreasing |phi|; a tie does not create a statistical difference.'),
   t('Chaque réponse est étudiée séparément, contre les autres réponses valides. Pour une question binaire, une seule réponse représente les deux réponses complémentaires. Les combinaisons de réponses ou de questions personnalisées ne sont pas énumérées automatiquement. Minimum 30 observations à chaque niveau du cas et du profil ; doublons de profils et liens identiques ou inverses du cas exclus. Les valeurs manquantes sont exclues ; les cultures sont limitées aux agriculteurs déclarés.', 'Each answer is examined separately against other valid responses. For binary questions, one answer represents both complementary answers. Custom answer or question combinations are not automatically enumerated. At least 30 observations at each level of outcome and profile; duplicate profiles and outcomes identical or inverse to the target excluded. Missing values are excluded; crops are restricted to self-reported farmers.'),
   t('φ décrit un lien binaire, pas un effet causal. p vient d’un wild cluster bootstrap-t par section ; dix sections restent peu et leur indépendance est une hypothèse. Tests approximatifs et exploratoires, sans pondération de population ni ajustement mutuel des facteurs. Le nombre de comparaisons peut conduire à des p corrigées toutes élevées. Les profils se chevauchent et des questions proches peuvent produire des résultats semblables.', 'Phi describes a binary association, not a causal effect. p comes from a section-level wild cluster bootstrap-t; ten sections remain few and independence is an assumption. Tests are approximate and exploratory, without population weighting or mutual adjustment of factors. Many comparisons may produce uniformly high adjusted p-values. Profiles overlap and related questions can produce similar results.')
  ].map(x=>`<p>${esc(x)}</p>`).join('')+'<p><a href="https://www.stata.com/manuals/rwildbootstrap.pdf" target="_blank" rel="noopener">Wild cluster bootstrap — Stata</a></p></div>';
 }
}
