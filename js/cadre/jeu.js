/* Présentation pédagogique du cadre APRI : un parcours libre, sans jeu ni score de quiz. */
import {css, donnees, teinte, encre, fmt} from './commun.js';

const ATTR = [
 {id:'a1', fr:'Anticiper', en:'Anticipate', c:'#397fa3'},
 {id:'a2', fr:'Absorber', en:'Absorb', c:'#c98a1b'},
 {id:'a3', fr:"S'adapter", en:'Adapt', c:'#2f7a5b'},
];
const SITUATIONS = [
 {a:['a1'], fr:"Le comité local diffuse l'alerte cyclone deux jours avant l'arrivée de la tempête.", en:'The local committee spreads the hurricane warning two days before the storm arrives.'},
 {a:['a1'], fr:"Chaque famille connaît son plan d'évacuation et sait où se trouve l'abri le plus proche.", en:'Every family knows its evacuation plan and where the nearest shelter is.'},
 {a:['a2'], fr:"Après une récolte perdue, la famille vit sur son stock de grains et sur l'argent envoyé par un proche.", en:'After a lost harvest, the family lives on its grain stock and on money sent by a relative.'},
 {a:['a2'], fr:'La maison, solidement construite, reste debout pendant l’ouragan.', en:'The well-built house stays standing during the hurricane.'},
 {a:['a3'], fr:'Après trois sécheresses, la coopérative remplace le maïs par des cultures qui supportent le manque d’eau.', en:'After three droughts, the cooperative replaces maize with crops that tolerate water shortage.'},
 {a:['a1','a3'], fr:'La commune replante la mangrove et interdit de reconstruire dans la zone inondable.', en:'The municipality replants mangroves and bans rebuilding in the flood zone.'},
];
const SOURCES = [
 {id:'menage', k:'cad_so1', ic:'01'},
 {id:'geo', k:'cad_so2', ic:'02'},
 {id:'bio', k:'cad_so3', ic:'03'},
 {id:'inst', k:'cad_so4', ic:'04'},
];
const DIMS = ['dim1','dim2','dim3','dim4','dim5','dim6','dim7'];
const BIO = /richesse sp|shannon|simpson|phylog|abondance relative|diversit[ée] fonctionnelle/i;
function sourceDe(x){
 if(x.source==='satellite' || x.source==='geospatial') return 'geo';
 if(x.source==='OCB') return 'inst';
 if(BIO.test(x.nom_fr||'')) return 'bio';
 if(x.source==='menage_regle' || (x.etat!=='absent' && x.calcule)) return 'menage';
 return null;
}
function nombre(s){return parseFloat(s.replace(/[   ]/g,'').replace(',','.'));}
function intervalles(bandes){const out=[];for(const [sc,txt] of bandes){const t=String(txt).replace(/[()]/g,'').trim(),ns=(t.match(/-?\d[\d   ]*(?:,\d+)?/g)||[]).map(nombre);let lo,hi;if(/[≤<]/.test(t)){lo=-Infinity;hi=ns[0];}else if(/[≥>]/.test(t)){lo=ns[0];hi=Infinity;}else if(ns.length===2){[lo,hi]=ns;}else return null;if(lo==null||hi==null||isNaN(lo)||isNaN(hi))return null;out.push({sc,txt:t,lo,hi});}return out;}
function scorePour(iv,v){return iv.find(b=>v>=b.lo&&v<=b.hi)?.sc??null;}
function preparations(d){
 const I=d.indicateurs||[], parSource={};
 for(const x of I){const s=sourceDe(x);if(s)(parSource[s] ||= []).push(x);}
 return {I, parSource, mesure:I.find(x=>x.valeur!=null&&x.score!=null&&x.ec?.unite==='pct'&&x.valeur>=0&&x.valeur<=100&&x.bandes?.length===11&&intervalles(x.bandes)?.some(b=>x.valeur>=b.lo&&x.valeur<=b.hi&&b.sc===x.score)), pondere:I.find(x=>x.poids!=null&&(x.nom_fr||x.nom))};
}

export default async function render(el, apri){
 css();
 const d=await donnees(apri), P=preparations(d), t=apri.t, e=apri.esc;
 const T=k=>(d.textes[apri.lang]||d.textes.fr)[k]??d.textes.fr[k]??k;
 const nomInd=x=>apri.lang==='en'?(x.nom||x.nom_fr):(x.nom_fr||x.nom);
 const tabs=[
  {id:'modele',fr:'Le modèle',en:'The model'},
  {id:'capacites',fr:'Trois capacités',en:'Three capacities'},
  {id:'dimensions',fr:'Sept dimensions',en:'Seven dimensions'},
  {id:'donnees',fr:'Sources de données',en:'Data sources'},
  {id:'normalisation',fr:'Mesure et score',en:'Measure and score'},
  {id:'indicateurs',fr:'Indicateurs',en:'Indicators'},
 ];
 el.innerHTML='';
 const root=apri.h('<div class="jeu jeu-cadre-guide"></div>');el.append(root);
 const nav=apri.h('<nav class="jeu-chemin guide-tabs" aria-label="'+t('Parcourir le cadre','Explore the framework')+'"></nav>');
 nav.innerHTML=tabs.map((x,i)=>'<button type="button" aria-controls="guide-'+x.id+'" data-cible="guide-'+x.id+'"><span>'+e(t(x.fr,x.en))+'</span></button>').join('');
 root.append(nav);
 const sections=apri.h('<div class="guide-sections"></div>');root.append(sections);
 const section=(id,title,lead)=>{const s=apri.h('<section class="guide-section" id="guide-'+id+'" aria-labelledby="guide-'+id+'-title"><div class="guide-heading"><h3 id="guide-'+id+'-title">'+title+'</h3><p>'+lead+'</p></div></section>');sections.append(s);return s;};

 const sm=section('modele',t('Un modèle de résilience de type capital-based','A capital-based resilience model'),'');
 sm.querySelector('.guide-heading p').remove();
 sm.querySelector('h3').style.cssText='font-size:clamp(24px,2.5vw,32px);line-height:1.25;margin-bottom:20px';
 sm.append(apri.h('<p style="font-size:clamp(22px,2.3vw,29px);line-height:1.5;color:#293742;margin:0 0 24px;max-width:65ch"><strong>'+t('APRI mesure dans quelle mesure les ressources d’un territoire lui permettent d’anticiper les perturbations, d’en absorber les effets et de s’adapter durablement.','APRI measures the extent to which a territory’s resources enable it to anticipate disturbances, absorb their effects and adapt sustainably.')+'</strong></p><p style="font-size:clamp(19px,1.9vw,24px);line-height:1.65;color:#3f5361;margin:0;max-width:75ch">'+t('C’est une approche <strong>fondée sur les capitaux du système socioécologique</strong> : les infrastructures, les institutions, les écosystèmes, les moyens d’existence, les relations sociales, les ressources humaines et les ressources culturelles.','It is an approach <strong>based on the capitals of the socio-ecological system</strong>: infrastructure, institutions, ecosystems, livelihoods, social relationships, human resources and cultural resources.')+'</p>'));

 const sc=section('capacites',t('Trois capacités','Three capacities'),t('Les capacités décrivent la manière dont un système anticipe les perturbations, en absorbe les effets et se transforme lorsque les conditions changent.','Capacities describe how a system anticipates disruption, absorbs its effects and transforms when conditions change.'));
 const caps=apri.h('<div class="guide-capacites"></div>');sc.append(caps);
 ATTR.forEach(a=>{const card=apri.h('<article class="guide-capacite" data-capacite="'+a.id+'"><span class="guide-label">'+t('CAPACITÉ','CAPACITY')+'</span><h4>'+t(a.fr,a.en)+'</h4><p>'+e(T('cad_'+a.id))+'</p></article>');caps.append(card);});
 const ex=apri.h('<div class="guide-exemple"><div class="guide-exemple-meta"><span class="guide-label">'+t('EXEMPLE ILLUSTRATIF','ILLUSTRATIVE EXAMPLE')+'</span><span class="guide-exemple-compteur" aria-hidden="true"></span></div><blockquote class="guide-exemple-phrase" aria-live="polite"></blockquote><div class="guide-exemple-note">'+t('L’exemple est relié à une ou plusieurs capacités pour rendre le modèle concret. Ce n’est pas une question à résoudre.','The example is linked to one or more capacities to make the model concrete. It is not a question to solve.')+'</div></div>');sc.append(ex);
 let ix=0;const phrase=ex.querySelector('.guide-exemple-phrase');
 const showSituation=()=>{if(!root.isConnected)return;const x=SITUATIONS[ix];phrase.classList.add('guide-sortie');caps.querySelectorAll('.guide-capacite').forEach(c=>c.classList.toggle('actif',x.a.includes(c.dataset.capacite)));window.setTimeout(()=>{if(!root.isConnected)return;phrase.textContent='« '+t(x.fr,x.en)+' »';phrase.classList.remove('guide-sortie');ex.querySelector('.guide-exemple-compteur').textContent=String(ix+1).padStart(2,'0')+' / '+String(SITUATIONS.length).padStart(2,'0');ix=(ix+1)%SITUATIONS.length;},180);};
 showSituation();const timer=window.setInterval(showSituation,4300);root._guideTimer=timer;

 const sd=section('dimensions',t('Sept dimensions','Seven dimensions'),t('Les sept dimensions regroupent les attributs et indicateurs qui composent le diagnostic APRI.','The seven dimensions group the attributes and indicators that make up the APRI assessment.'));
 const dimgrid=apri.h('<div class="guide-dimensions"></div>');sd.append(dimgrid);
 DIMS.forEach((k,i)=>dimgrid.append(apri.h('<article class="guide-dimension"><span>'+String(i+1).padStart(2,'0')+'</span><h4>'+e(T(k))+'</h4></article>')));

 const ss=section('donnees',t('Des sources aux indicateurs','From data sources to indicators'),t('Les sources documentent des indicateurs différents. Chaque indicateur est ensuite rattaché à une dimension du cadre.','Different sources document different indicators. Each indicator is then assigned to a framework dimension.'));
 const srcgrid=apri.h('<div class="guide-sources"></div>');ss.append(srcgrid);
 SOURCES.forEach(so=>srcgrid.append(apri.h('<article class="guide-source" data-source="'+so.id+'"><span class="guide-source-index">'+so.ic+'</span><b>'+e(T(so.k+'_t'))+'</b></article>')));
 const flux=apri.h('<div class="guide-source-flux"><div class="guide-source-exemple"><span class="guide-label">'+t('EXEMPLE DE DONNÉE','DATA EXAMPLE')+'</span><b class="guide-source-nom"></b></div><span class="guide-flèche" aria-hidden="true">→</span><div class="guide-source-indicateur"><span class="guide-label">'+t('INDICATEUR','INDICATOR')+'</span><b class="guide-ind-nom"></b><small class="guide-dim-nom"></small></div></div>');ss.append(flux);
 let is=0;const srcNom=flux.querySelector('.guide-source-nom'),indNom=flux.querySelector('.guide-ind-nom'),dimNom=flux.querySelector('.guide-dim-nom');
 const sourcesDispo=SOURCES.map(s=>({source:s,indicateur:(P.parSource[s.id]||[]).find(x=>x.dim)})).filter(x=>x.indicateur);
 const showSource=()=>{if(!root.isConnected||!sourcesDispo.length)return;const z=sourcesDispo[is],x=z.indicateur;srcgrid.querySelectorAll('.guide-source').forEach(c=>c.classList.toggle('actif',c.dataset.source===z.source.id));flux.classList.add('guide-sortie');window.setTimeout(()=>{if(!root.isConnected)return;srcNom.textContent=T(z.source.k+'_t');indNom.textContent=nomInd(x);dimNom.textContent=T(x.dim);flux.classList.remove('guide-sortie');is=(is+1)%sourcesDispo.length;},180);};showSource();const timer2=window.setInterval(showSource,4500);root._guideTimer2=timer2;

 const sn=section('normalisation',t('De la mesure brute au score','From raw measure to score'),t('Une valeur observée est convertie en score ordinal de 0 à 10 selon la méthode de référence disponible pour l’indicateur.','An observed value is converted into an ordinal score from 0 to 10, using the reference method available for that indicator.'));
 const chain=apri.h('<div class="guide-mesure"><div class="guide-mesure-etape"><span>01</span><b>'+t('Donnée brute','Raw data')+'</b><small>'+t('Enquête ou donnée spatiale','Survey or spatial data')+'</small></div><i>→</i><div class="guide-mesure-etape"><span>02</span><b>'+t('Normalisation','Normalization')+'</b><small>'+t('Référence statistique ou seuils locaux','Statistical reference or local thresholds')+'</small></div><i>→</i><div class="guide-score-carte"><span class="guide-label">'+t('SCORE DE RÉSILIENCE','RESILIENCE SCORE')+'</span><b class="guide-score-valeur"></b><small class="guide-score-nom"></small></div></div>');sn.append(chain);
 const methodes=apri.h('<div class="guide-methodes"><article><span>01</span><h4>'+t('Discrétisation par quantiles','Quantile discretization')+'</h4><p>'+t('Quand une distribution empirique internationale ou régionale fiable existe, le score situe la valeur observée dans cette distribution cumulative.','When a reliable international or regional empirical distribution exists, the score places the observed value within that cumulative distribution.')+'</p></article><article><span>02</span><h4>'+t('Repère normatif local','Local normative reference')+'</h4><p>'+t('Quand il n’existe pas de référence comparative robuste, deux scénarios définis localement — optimal et critique — bornent onze scénarios ordinaux.','When no robust comparative reference exists, two locally defined scenarios—optimal and critical—bound eleven ordinal scenarios.')+'</p></article></div>');sn.append(methodes);
 const scoreX=P.mesure, scoreCard=chain.querySelector('.guide-score-carte');
 if(scoreX){const couleur=teinte((scoreX.score??0)/10);scoreCard.style.setProperty('--score-couleur',couleur);chain.querySelector('.guide-score-valeur').textContent=(scoreX.score??'—')+' / 10';chain.querySelector('.guide-score-nom').textContent=nomInd(scoreX);}else{chain.querySelector('.guide-score-valeur').textContent='0–10';chain.querySelector('.guide-score-nom').textContent=t('Échelle APRI','APRI scale');}

 if(scoreX){
  chain.hidden=true;
  const iv=intervalles(scoreX.bandes),pct=v=>fmt(v,1)+(apri.lang==='en'?'%':' %');
  const scale=apri.h('<div class="guide-scale-layout"><div class="guide-scale-detail"><span class="guide-label">'+e(T(scoreX.dim))+'</span><h4>'+e(nomInd(scoreX))+'</h4><div class="guide-scale-measured"><span>'+t('Valeur mesurée','Measured value')+'</span><b>'+e(pct(scoreX.valeur))+'</b></div><p>'+t('Déplacez le curseur pour voir comment la valeur se situe dans le barème.','Move the slider to see where the value falls on the scale.')+'</p><label class="guide-scale-control">'+t('Valeur explorée','Explored value')+' <output></output><input type="range" min="0" max="100" step="0.1" value="'+scoreX.valeur+'" aria-label="'+t('Valeur explorée','Explored value')+'"></label><div class="guide-score-carte"><span class="guide-label">'+t('SCORE DE RÉSILIENCE','RESILIENCE SCORE')+'</span><b class="guide-score-valeur"></b></div></div><div class="guide-scale-bands" role="group" aria-label="'+t('Barème de résilience','Resilience scale')+'"></div></div>');
  const bands=scale.querySelector('.guide-scale-bands');
  [...iv].reverse().forEach(b=>{const c=teinte(b.sc/10);bands.append(apri.h('<div class="guide-scale-row" data-score="'+b.sc+'" style="--palier:'+c+'"><b style="background:'+c+';color:'+encre(c)+'">'+b.sc+'</b><span>'+e(b.txt)+'</span></div>'));});
  const input=scale.querySelector('input'),card=scale.querySelector('.guide-score-carte');
  const update=()=>{const v=Number(input.value),score=scorePour(iv,v),c=teinte((score??0)/10);scale.querySelector('output').textContent=pct(v);card.style.setProperty('--score-couleur',c);card.querySelector('b').textContent=(score??'—')+' / 10';bands.querySelectorAll('.guide-scale-row').forEach(row=>{const active=Number(row.dataset.score)===score;row.classList.toggle('courant',active);if(active)row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');});};
  input.oninput=update;update();sn.insertBefore(scale,methodes);
 }
 sn.append(apri.h('<p class="guide-renvoi">'+t('Les barèmes et les seuils de chaque indicateur sont détaillés dans l’onglet','Indicator-specific scales and thresholds are detailed in the tab')+' <b>'+t('Calcul des scores','Score calculations')+'</b>.</p>'));

 const si=section('indicateurs',t('Des indicateurs pondérés','Weighted indicators'),t('La pondération exprime l’importance relative des indicateurs dans le calcul d’une dimension. Elle s’appuie sur l’évaluation d’experts.','Weighting expresses the relative importance of indicators when calculating a dimension. It is based on expert assessment.'));
 if(P.pondere){const mot=nomInd(P.pondere);const poids=fmt(P.pondere.poids,1);si.append(apri.h('<div class="guide-poids"><div><span class="guide-label">'+t('EXEMPLE D’INDICATEUR','INDICATOR EXAMPLE')+'</span><h4>'+e(mot)+'</h4><small>'+e(T(P.pondere.dim))+'</small></div><div class="guide-poids-val"><b>'+e(poids)+'</b><span>'+t('poids expert','expert weight')+'</span></div></div>'));}
 si.append(apri.h('<p class="guide-fin">'+t('Le parcours se poursuit dans « Calcul des scores », puis dans « Boucles de rétroaction ». L’exemple interactif de test y permet de suivre pas à pas l’effet des seuils sur le passage d’une dynamique négative à une dynamique positive.','Continue with “Score calculations”, then “Feedback loops”. The interactive test example lets you follow step by step how thresholds affect the shift from a negative to a positive dynamic.')+'</p>'));

 const buttons=[...nav.querySelectorAll('button')],panels=[...sections.querySelectorAll('.guide-section')];
 nav.setAttribute('role','tablist');
 const select=id=>{buttons.forEach(b=>{const active=b.dataset.cible===id;b.classList.toggle('ici',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});panels.forEach(panel=>panel.hidden=panel.id!==id);};
 buttons.forEach((b,i)=>{b.id='tab-'+b.dataset.cible;b.setAttribute('role','tab');b.onclick=()=>select(b.dataset.cible);b.onkeydown=ev=>{let n;if(ev.key==='ArrowRight')n=(i+1)%buttons.length;else if(ev.key==='ArrowLeft')n=(i+buttons.length-1)%buttons.length;else if(ev.key==='Home')n=0;else if(ev.key==='End')n=buttons.length-1;else return;ev.preventDefault();select(buttons[n].dataset.cible);buttons[n].focus();};});
 panels.forEach(panel=>{panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','tab-'+panel.id);});select('guide-modele');
}
