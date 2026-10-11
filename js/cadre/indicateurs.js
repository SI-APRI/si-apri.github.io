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
 const method=x=>{
  const declared=x.normalisation||x.methode_normalisation;if(declared)return declared;
  // Classification rule supplied by the APRI author: precise numerical intervals use the world reference distribution.
  const bounds=(x.bandes||[]).map(b=>String(b[1]).trim());
  const numerical=bounds.length>1&&bounds.every(b=>/^[\s\d.,%()≤≥<>+−–—=/:\-]+$/.test(b));
  if(numerical&&bounds.some(b=>/\d[,.]\d/.test(b)))return t('Discrétisation par quantiles — référence mondiale. La valeur observée est située dans la distribution mondiale de référence, puis convertie en score de résilience.','Quantile discretization — global reference. The observed value is located in the global reference distribution, then converted into a resilience score.');
  // APRI author: fixed ranks use local normative scenarios, not a world distribution.
  return t('Repère normatif local — des rangs fixes situent la valeur observée entre une situation critique et une situation optimale définies localement.','Local normative reference — fixed ranks position the observed value between locally defined critical and optimal situations.');
 };
 el.replaceChildren();el.classList.add('indicator-browser');
 const style=document.createElement('style');style.textContent= '#cadre .indicator-browser{color:#344e59}#cadre .ib-intro{display:flex;justify-content:space-between;align-items:center;gap:24px;margin:24px 0 32px}#cadre .ib-intro p{font-size:18px;margin:0}#cadre .ib-search{background:transparent;border:0;border-bottom:1px solid #aebdc4;padding:12px 4px;font:inherit;color:inherit;width:280px;max-width:100%}#cadre .ib-group{margin:32px 0}#cadre .ib-group h3{font-size:17px;font-weight:600;margin:0 0 14px}#cadre .ib-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 26px}#cadre .ib-item{font:inherit;color:inherit;background:transparent;border:0;border-bottom:1px solid #d4dde1;text-align:left;padding:17px 8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:14px;line-height:1.5;transition:background .2s,transform .2s}#cadre .ib-item:hover,#cadre .ib-item[aria-pressed=true]{background:#e5eaed;transform:translateX(3px)}#cadre .ib-item:focus-visible,#cadre .ib-action:focus-visible{outline:2px solid #415861;outline-offset:4px}#cadre .ib-item span:last-child{font-size:20px}#cadre .ib-detail{border-top:1px solid #aebdc4;border-bottom:1px solid #aebdc4;padding:28px 0;margin:16px 0 40px;scroll-margin-top:95px}#cadre .ib-detail[hidden]{display:none}#cadre .ib-top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}#cadre .ib-detail h3{font-size:clamp(23px,2.4vw,32px);font-weight:500;margin:8px 0 18px;line-height:1.3}#cadre .ib-kicker{font-size:13px;color:#657880}#cadre .ib-action{font:inherit;border:1px solid #aebdc4;background:transparent;color:inherit;padding:10px 16px;border-radius:5px;cursor:pointer;white-space:nowrap}#cadre .ib-facts{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin:26px 0}#cadre .ib-facts dt{font-size:13px;color:#657880;margin-bottom:9px}#cadre .ib-facts dd{font-size:26px;margin:0;font-weight:500}#cadre .ib-facts small{font-size:12px;display:block;line-height:1.5;margin-top:8px}#cadre .ib-scale{max-width:850px;margin:26px 0 8px}#cadre .ib-scale h4{font-size:17px;margin:0 0 12px}#cadre .ib-scale .irla-scale{width:100%}#cadre .ib-count{font-size:13px;color:#657880}.ib-paper-dialog{position:fixed;inset:0 0 0 auto;margin:0;width:min(640px,92vw);height:100dvh;max-height:100dvh;max-width:92vw;box-sizing:border-box;border:0;padding:30px 24px 30px 34px;background:transparent;overflow:auto;color:#344e59;font-family:inherit}.ib-paper-dialog::backdrop{background:rgba(26,42,49,.25);backdrop-filter:blur(2px)}.ib-paper{position:relative;min-height:calc(100dvh - 90px);box-sizing:border-box;padding:30px 30px 36px 44px;background:#fff;border:1px solid #d8d8d1;border-radius:3px;box-shadow:-18px 16px 48px rgba(22,37,44,.25),5px 5px 0 #e6e5df,8px 8px 0 #cecfcb;transform:rotate(-.5deg);background-image:linear-gradient(90deg,transparent 26px,#d5c6c2 26px,#d5c6c2 27px,transparent 27px)}.ib-paper h2{font-size:25px;font-weight:500;line-height:1.35;margin:18px 0 26px}.ib-paper .ib-paper-header{display:flex;align-items:center;justify-content:space-between;gap:15px;font-size:12px;letter-spacing:.08em;text-transform:uppercase}.ib-paper button{font:inherit;font-size:24px;background:transparent;border:0;color:inherit;cursor:pointer;padding:5px 10px}.ib-paper .ib-paper-section{padding:17px 0;border-top:1px solid #dce0df}.ib-paper h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;margin:0 0 9px}.ib-paper p,.ib-paper li{font-size:15px;line-height:1.7;margin:0 0 8px}.ib-paper a{color:inherit;overflow-wrap:anywhere}.ib-paper ul{padding-left:18px}.ib-paper-dialog[open]{animation:ib-sheet-in .4s ease-out}@keyframes ib-sheet-in{from{transform:translateX(55px) rotate(2deg)}to{transform:translateX(0) rotate(0)}}@media(max-width:760px){#cadre .ib-grid{grid-template-columns:1fr}#cadre .ib-intro{align-items:stretch;flex-direction:column}#cadre .ib-search{width:100%}#cadre .ib-facts{gap:12px}#cadre .ib-facts dd{font-size:21px}#cadre .ib-top{flex-direction:column}.ib-paper-dialog{padding:20px 18px 20px 14px}.ib-paper{padding:24px 18px 28px 36px}}@media(prefers-reduced-motion:reduce){.ib-paper-dialog[open]{animation:none}#cadre .ib-item{transition:none}}';el.append(style);
 const atelierStyle=document.createElement("style");atelierStyle.textContent="#cadre .ib-workspace{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:620px;margin-top:24px;border-top:1px solid #d5dde1}#cadre .ib-sidebar{border-right:1px solid #d5dde1;padding:24px 22px 24px 0;max-height:760px;overflow:auto;scrollbar-width:thin}#cadre .ib-intro{margin:0 0 22px;display:block}#cadre .ib-intro p{display:none}#cadre .ib-search{width:100%;box-sizing:border-box;font-size:14px;padding:12px;border:1px solid #cbd5da;border-radius:5px}#cadre .ib-count{font-size:12px;margin:0 0 22px}#cadre .ib-group{margin:0 0 28px}#cadre .ib-group h3{font-size:11px;letter-spacing:.06em;text-transform:uppercase;line-height:1.6;color:#6d818c;margin-bottom:10px}#cadre .ib-grid{display:block}#cadre .ib-item{width:100%;font-size:14px;border:0;padding:11px 12px;margin:2px 0;border-left:3px solid transparent;border-radius:0 4px 4px 0}#cadre .ib-item span:last-child{display:none}#cadre .ib-item:hover{transform:none}#cadre .ib-item[aria-pressed=true]{background:#dfe5e9;border-left-color:#7c919c;transform:none}#cadre .ib-detail{margin:0;border:0;padding:42px 42px 32px;min-width:0;outline:none}#cadre .ib-detail h3{font-size:clamp(28px,3vw,42px);line-height:1.2;letter-spacing:-.025em;margin:20px 0 24px;max-width:740px}#cadre .ib-top{display:block;position:relative;padding-bottom:0}#cadre .ib-action{font-size:13px;border:0;padding:10px 0;border-bottom:1px solid #9daeb8;border-radius:0}#cadre .ib-description{font-size:17px;line-height:1.65;color:#617780;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin:26px 0}#cadre .ib-facts{margin:38px 0 48px;gap:22px}#cadre .ib-facts>div+div{border-left:1px solid #d5dde1;padding-left:22px}#cadre .ib-facts dd{font-size:clamp(25px,3vw,42px);letter-spacing:-.035em}#cadre .ib-facts small{max-width:180px;color:#6d818c}#cadre .ib-scale{margin:0}#cadre .ib-scale>p{font-size:12px;color:#6d818c;margin-bottom:22px}#cadre .ib-ruler{display:flex;gap:1px;height:22px;border-radius:4px;overflow:visible;margin:32px 0 42px}#cadre .ib-tick{flex:1;position:relative;background:var(--rank);min-width:0}#cadre .ib-tick:first-child{border-radius:4px 0 0 4px}#cadre .ib-tick:last-child{border-radius:0 4px 4px 0}#cadre .ib-tick>span{position:absolute;top:30px;left:50%;transform:translateX(-50%);font-size:12px;color:#49606c}#cadre .ib-tick.is-current:before{content:\"\";position:absolute;width:13px;height:13px;background:#344e59;border:2px solid #f1f3f4;border-radius:50%;left:50%;top:-5px;transform:translateX(-50%);z-index:1}#cadre .ib-tick.is-current:after{content:\"\";position:absolute;width:2px;height:30px;top:-2px;left:50%;background:#344e59}#cadre .ib-thresholds{margin-top:28px}#cadre .ib-thresholds summary{font-size:14px;cursor:pointer;color:#536e7c;padding:10px 0}#cadre .ib-thresholds .irla-scale{margin-top:18px}@media(max-width:900px){#cadre .ib-workspace{grid-template-columns:220px minmax(0,1fr)}#cadre .ib-detail{padding:30px 22px}#cadre .ib-facts{gap:12px}#cadre .ib-facts>div+div{padding-left:12px}}@media(max-width:640px){#cadre .ib-workspace{display:flex;flex-direction:column}#cadre .ib-sidebar{max-height:260px;border-right:0;border-bottom:1px solid #d5dde1;padding:18px 4px}#cadre .ib-detail{padding:28px 4px}#cadre .ib-detail h3{font-size:28px}#cadre .ib-facts dd{font-size:24px}}";atelierStyle.textContent+="#cadre .ib-workspace{min-height:460px;margin-top:12px}#cadre .ib-sidebar{padding-top:16px;max-height:620px}#cadre .ib-detail{padding:22px 30px 24px}#cadre .ib-detail h3{font-size:25px;line-height:1.25;letter-spacing:-.015em;margin:10px 0 10px;max-width:780px}#cadre .ib-description{font-size:14px;line-height:1.55;margin:14px 0;-webkit-line-clamp:3}#cadre .ib-facts{margin:20px 0 24px;gap:18px}#cadre .ib-facts dt{font-size:12px;margin-bottom:5px}#cadre .ib-facts dd{font-size:28px;line-height:1.2;letter-spacing:-.02em}#cadre .ib-facts small{font-size:11px;line-height:1.4;margin-top:5px}#cadre .ib-kicker{font-size:12px}#cadre .ib-action{font-size:12px;padding:5px 0}#cadre .ib-scale h4{font-size:14px;margin-bottom:8px}#cadre .ib-scale>p{font-size:12px;margin:6px 0 12px}#cadre .ib-ruler{height:16px;margin:20px 0 30px}#cadre .ib-tick>span{top:22px;font-size:11px}#cadre .ib-tick.is-current:after{height:23px}#cadre .ib-thresholds{margin-top:16px}#cadre .ib-thresholds summary{font-size:13px;padding:6px 0}#cadre .ib-item{font-size:13px;line-height:1.4;padding:8px 10px}#cadre .ib-group{margin-bottom:20px}#cadre .ib-group h3{font-size:11px;margin-bottom:7px}#cadre .ib-search{font-size:13px;padding:9px 10px}#cadre .ib-intro{margin-bottom:14px}#cadre .ib-count{margin-bottom:16px}.ib-paper h2{font-size:21px;margin:14px 0 18px}.ib-paper p,.ib-paper li{font-size:13px;line-height:1.55}.ib-paper .ib-paper-section{padding:12px 0}.ib-paper{padding:24px 26px 28px 40px}@media(max-width:640px){#cadre .ib-detail{padding:20px 4px}#cadre .ib-detail h3{font-size:23px}#cadre .ib-facts dd{font-size:24px}}";atelierStyle.textContent+="#cadre .ib-ruler{height:auto;min-height:82px;align-items:stretch;margin:18px 0 12px}#cadre .ib-tick{background:linear-gradient(var(--rank),var(--rank)) top/100% 16px no-repeat;padding-top:24px;text-align:center}#cadre .ib-tick>span{position:static;display:block;transform:none;font-size:11px;line-height:1.4;margin-bottom:7px}#cadre .ib-bound{display:block;font-size:10px;line-height:1.4;font-weight:400;color:#415861;padding:0 3px;overflow-wrap:anywhere}#cadre .ib-scale{overflow-x:auto}#cadre .ib-ruler{min-width:660px}.ib-paper{background-color:#fff!important;background-image:linear-gradient(90deg,transparent 26px,rgba(193,110,110,.38) 26px,rgba(193,110,110,.38) 27px,transparent 27px),linear-gradient(rgba(113,153,190,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(113,153,190,.14) 1px,transparent 1px);background-size:100% 100%,16px 16px,16px 16px;border-color:#d6dce2}.ib-paper .ib-paper-section{border-top-color:rgba(123,145,165,.25)}";atelierStyle.textContent+="#cadre .ib-ruler{min-height:64px;margin-top:18px}#cadre .ib-tick{padding-top:0;background-size:100% 27px}#cadre .ib-tick>span{height:27px;line-height:27px;color:#fff;font-size:12px;font-weight:700;text-shadow:0 1px 3px rgba(0,0,0,.6);margin:0}#cadre .ib-boundary{position:absolute;top:35px;left:100%;transform:translateX(-50%);white-space:nowrap;font-size:10px;padding:0;line-height:1.4}#cadre .ib-boundary:not(:empty):before{content:\"\";position:absolute;left:50%;top:-8px;height:5px;border-left:1px solid #9eacb3}#cadre .ib-tick.is-current:before{top:-12px;width:8px;height:8px}#cadre .ib-tick.is-current:after{top:-5px;height:5px}";atelierStyle.textContent+="#cadre:has(.indicator-browser){min-height:0;padding-top:78px;padding-bottom:12px}#cadre .zone-onglet:has(.indicator-browser){padding-top:0}#cadre .ib-workspace{position:relative;min-height:0;margin-top:0;align-items:start}#cadre .ib-sidebar{position:absolute;top:0;bottom:0;left:0;width:280px;box-sizing:border-box;max-height:none;padding-top:12px;padding-bottom:12px}#cadre .ib-detail{grid-column:2;min-height:0;padding-top:14px;padding-bottom:12px}#cadre .ib-ruler{min-height:54px;margin-bottom:0}.ib-paper{min-height:0;padding-top:20px;padding-bottom:20px}.ib-paper-dialog{height:fit-content;max-height:calc(100dvh - 24px);top:12px;bottom:auto;padding-top:10px;padding-bottom:18px}@media(max-width:900px){#cadre .ib-sidebar{width:220px}}@media(max-width:640px){#cadre .ib-sidebar{position:static;width:100%;max-height:230px}#cadre .ib-detail{padding-top:16px}#cadre:has(.indicator-browser){padding-top:76px}}";atelierStyle.textContent+="#cadre .ib-item .ib-status{display:block!important;width:8px;height:8px;min-width:8px;flex:0 0 8px;border-radius:50%;margin-left:auto;align-self:center}#cadre .ib-status.is-complete{background:#27835b}#cadre .ib-status.is-incomplete{background:#db8b24}";atelierStyle.textContent+="#cadre:has(.indicator-browser){background:#fff!important;background-image:none!important;color:#202126;padding:78px 32px 24px}#cadre .indicator-browser{font-family:\"Helvetica Neue\",Helvetica,Arial,sans-serif;color:#202126}#cadre .ib-workspace{grid-template-columns:29% minmax(0,1fr);border-top:1px solid #dededc;margin-top:4px;min-height:0}#cadre .ib-sidebar{position:static;width:auto!important;max-height:none;overflow:visible;padding:32px 24px 16px 0;border-right:1px solid #dededc;display:flex;flex-direction:column}#cadre .ib-intro{margin:0 0 22px}#cadre .ib-search{border:0;border-bottom:1px solid #8f8f8c;border-radius:0;background:transparent;font-size:14px;padding:12px 2px;color:#202126}#cadre .ib-count{display:none}#cadre .ib-item{font:400 14px/1.45 \"Helvetica Neue\",Helvetica,Arial,sans-serif;color:#202126;border:0;border-bottom:1px solid #e5e5e2;border-left:2px solid transparent;border-radius:0;margin:0;min-height:58px;padding:12px 12px;gap:14px}#cadre .ib-item:hover{background:#f7f6f3}#cadre .ib-item[aria-pressed=true]{background:#f2f1ee;border-left-color:#202126}#cadre .ib-status.is-complete{background:#569d63}#cadre .ib-status.is-incomplete{background:#ee8734}#cadre .ib-pagination{display:flex;align-items:center;gap:14px;margin-top:auto;padding-top:24px;font-size:12px;color:#202126}#cadre .ib-pagination span{margin-right:auto}#cadre .ib-pagination button{font:24px/1 Helvetica,Arial,sans-serif;background:none;border:0;padding:6px;cursor:pointer;color:#202126}#cadre .ib-pagination button:disabled{opacity:.25;cursor:default}#cadre .ib-detail{padding:54px 0 24px 44px;display:flex;flex-direction:column;gap:0;align-self:start;min-width:0}#cadre .ib-facts{margin:0 0 54px;gap:20px;grid-template-columns:1.1fr 1fr .7fr}#cadre .ib-facts dt{font-size:14px;font-weight:400;color:#202126;margin-bottom:18px}#cadre .ib-facts dd{font:400 clamp(28px,3.4vw,48px)/1.1 \"Helvetica Neue\",Helvetica,Arial,sans-serif;color:#202126;letter-spacing:-.035em;white-space:nowrap}#cadre .ib-facts>div+div{border-left:1px solid #d8d8d4;padding-left:24px}#cadre .ib-facts small{display:none}#cadre .ib-scale{max-width:none;overflow:visible;margin:0}#cadre .ib-scale h4{font-size:14px;font-weight:400;color:#202126;margin:0 0 18px}#cadre .ib-ruler{min-width:0;min-height:76px;margin:0 0 22px;gap:1px}#cadre .ib-tick{background-size:100% 38px;border-radius:0!important}#cadre .ib-tick>span{height:38px;line-height:38px;font-size:13px;font-weight:400;text-shadow:0 1px 2px #555}#cadre .ib-boundary{top:52px;font-size:10px;color:#49494c}#cadre .ib-boundary:not(:empty):before{height:9px;top:-12px;border-color:#8e8e91}#cadre .ib-scale>p{font-size:12px;line-height:1.6;color:#6b6b6d;margin:14px 0 0}#cadre .ib-action{font-size:13px;color:#3d3d42;border-bottom:1px solid #8f8f94;align-self:flex-start;margin-top:36px;padding:4px 0}#cadre .cadre-primary-tabs [role=tab]{color:#39393d!important;font-family:\"Helvetica Neue\",Helvetica,Arial,sans-serif!important}#cadre .cadre-primary-tabs [role=tab][aria-selected=true]{color:#17171a!important;border-color:#17171a!important;background:transparent!important}@media(max-width:900px){#cadre .ib-detail{padding:34px 0 20px 24px}#cadre .ib-facts{gap:12px}#cadre .ib-facts>div+div{padding-left:12px}#cadre .ib-facts dt{font-size:12px}#cadre .ib-facts dd{font-size:30px}}@media(max-width:640px){#cadre .ib-workspace{display:block}#cadre .ib-sidebar{max-height:none;border-right:0;border-bottom:1px solid #dededc;padding:16px 0}#cadre .ib-item{min-height:44px}#cadre .ib-detail{padding:28px 0}#cadre .ib-facts{margin-bottom:30px}#cadre .ib-facts dd{font-size:26px}#cadre .ib-scale{overflow-x:auto}#cadre .ib-ruler{min-width:600px}#cadre:has(.indicator-browser){padding-left:18px;padding-right:18px}}";atelierStyle.textContent+="#cadre:has(.indicator-browser) #contenu-cadre,#cadre:has(.indicator-browser) .zone-onglet{background:#fff!important;background-image:none!important;border-radius:0;box-shadow:none}#cadre .ib-sidebar{padding-top:28px}#cadre .ib-item{min-height:52px;padding-top:10px;padding-bottom:10px}#cadre .ib-pagination{padding-top:18px}";atelierStyle.textContent+="#cadre .ib-facts dd{font-size:24px;font-weight:400;line-height:1.25;letter-spacing:-.015em}#cadre .ib-facts dt{font-size:12px;margin-bottom:8px;color:#55555a}#cadre .ib-facts{margin-bottom:32px}#cadre .ib-detail{padding-top:36px}#cadre .ib-item{font-size:13px;line-height:1.45}#cadre .ib-search{font-size:13px}#cadre .ib-scale h4{font-size:12px;margin-bottom:14px}#cadre .ib-action{font-size:12px;margin-top:24px}";atelierStyle.textContent+="#cadre:has(.indicator-browser) #contenu-cadre,#cadre:has(.indicator-browser) .zone-onglet,#cadre .ib-workspace,#cadre .ib-sidebar,#cadre .ib-detail,#cadre .ib-item,#cadre .ib-facts>div,#cadre .ib-action{border:0!important;box-shadow:none}#cadre .ib-item{margin:3px 0;border-radius:4px}#cadre .ib-item[aria-pressed=true]{background:#f2f1ee}#cadre .ib-search{border:0!important;background:#f7f7f5;border-radius:5px;padding:10px 12px}#cadre:has(.indicator-browser) .cadre-primary-tabs{border:0!important;box-shadow:none}#cadre:has(.indicator-browser) .cadre-primary-tabs [role=tab]{border:0!important;box-shadow:none!important}#cadre:has(.indicator-browser) .cadre-primary-tabs [role=tab][aria-selected=true]{background:#f2f1ee!important;border-radius:4px}#cadre .ib-boundary:before{display:none}.ib-paper .ib-paper-section{border:0;padding-top:16px}";atelierStyle.textContent+=".ib-paper-dialog .ib-paper{background:#fff1a6!important;background-image:none!important;border:0;border-radius:1px 1px 12px 1px;color:#383326;transform:rotate(-1deg);box-shadow:-10px 14px 32px rgba(35,30,15,.22),2px 3px 0 #e8d780;padding:28px 30px}.ib-paper-dialog .ib-paper:before{content:\"\";position:absolute;top:0;left:0;right:0;height:12px;background:rgba(192,156,45,.08);pointer-events:none}.ib-paper-dialog .ib-paper h2,.ib-paper-dialog .ib-paper h3,.ib-paper-dialog .ib-paper p,.ib-paper-dialog .ib-paper li,.ib-paper-dialog .ib-paper a{color:#383326}.ib-paper-dialog .ib-paper-section{border:0}";atelierStyle.textContent+="#cadre:has(.indicator-browser),#cadre:has(.indicator-browser) #contenu-cadre,#cadre:has(.indicator-browser) .zone-onglet{background:#f2f4f5!important;background-image:none!important}";el.append(atelierStyle);
 const head=apri.h('<div class="ib-intro"><p>'+esc(t('Choisissez un indicateur pour explorer sa mesure et son échelle.','Choose an indicator to explore its measurement and scale.'))+'</p><input class="ib-search" type="search" aria-label="'+esc(t('Rechercher un indicateur','Find an indicator'))+'" placeholder="'+esc(t('Rechercher un indicateur…','Find an indicator…'))+'"></div>');el.append(head);
 const detail=document.createElement('div');detail.className='ib-detail';detail.hidden=true;detail.tabIndex=-1;el.append(detail);
 const count=document.createElement('p');count.className='ib-count';count.setAttribute('aria-live','polite');el.append(count);
 const list=document.createElement('div');el.append(list);
 const workspace=document.createElement('div');workspace.className='ib-workspace';const sidebar=document.createElement('div');sidebar.className='ib-sidebar';sidebar.append(head,count,list);workspace.append(sidebar,detail);el.append(workspace);
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
 function boundLabel(bands,i){
  if(i===bands.length-1)return '';
  const tokens=v=>String(v).match(/-?\d+(?:[.,]\d+)?/g)||[];
  const left=tokens(bands[i][1]),right=tokens(bands[i+1][1]);
  const shared=left.find(v=>right.includes(v));
  return shared ? shared+(String(bands[i][1]).includes('%')?' %':'') : '';
 }
 function select(x,focus=true){
  etat.ind=x.ligne;detail.hidden=false;
  const unit=x.unite||(String(x.echelle||'').includes('%')?'%':'');
  const val=x.valeur==null?missing:fmt(x.valeur,2)+(unit?' '+unit:'');
  detail.innerHTML='<div class="ib-top"><div><span class="ib-kicker">'+esc(T(x.dim))+'</span><h3>'+esc(name(x))+'</h3></div><button class="ib-action" type="button">'+esc(t('Métadonnées','Metadata'))+' ↗</button></div><p class="ib-description">'+esc(measure(x))+'</p><dl class="ib-facts"><div><dt>'+esc(t('Valeur brute · échantillon','Raw value · sample'))+'</dt><dd>'+esc(val)+'</dd><small>'+esc(t('Résultat disponible pour les territoires étudiés.','Available result for the studied territories.'))+'</small></div><div><dt>'+esc(t('Score de résilience','Resilience score'))+'</dt><dd>'+esc(x.score==null?missing:fmt(x.score,1)+' / 10')+'</dd></div><div><dt>'+esc(t('Poids de l’indicateur','Indicator weight'))+'</dt><dd>'+esc(x.poids==null?missing:fmt(x.poids))+'</dd></div></dl><div class="ib-scale"><h4>'+esc(t('Échelle de normalisation','Normalization scale'))+'</h4><p>'+esc(method(x))+'</p>'+(x.bandes?.length?'<div class="ib-ruler" aria-label="'+esc(t('Échelle de résilience de 0 à 10','Resilience scale from 0 to 10'))+'">'+x.bandes.map(([rank,bound],i)=>'<div class="ib-tick'+(x.score!=null&&Math.round(x.score)===Number(rank)?' is-current':'')+'" style="--rank:'+teinte(rank/10)+'" title="'+esc(String(bound))+'"><span>'+esc(String(rank))+'</span><small class="ib-bound ib-boundary">'+esc(boundLabel(x.bandes,i))+'</small></div>').join('')+'</div>':'<p>'+esc(x.echelle||missing)+'</p>')+'</div>';
  const meta=detail.querySelector('button');meta.onclick=()=>openMetadata(x,meta);
  detail.querySelector('.ib-top').remove();detail.querySelector('.ib-description')?.remove();
  detail.append(meta);
  const scale=detail.querySelector('.ib-scale'),caption=scale.querySelector('p');
  scale.querySelector('h4').textContent=method(x).includes('quantil')?t('Référence mondiale · Quantiles','Global reference · Quantiles'):t('Repère normatif local','Local normative reference');
  caption.textContent=method(x).includes('quantil')?t('Normalisation : position de la valeur observée dans la distribution mondiale.','Normalization: position of the observed value in the global distribution.'):t('Normalisation : rangs fixes entre une situation critique et une situation optimale.','Normalization: fixed ranks between critical and optimal situations.');scale.append(caption);
  list.querySelectorAll('[data-row]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.row===String(x.ligne))));
  if(focus){if(matchMedia('(max-width:640px)').matches)detail.scrollIntoView({block:'start',behavior:'smooth'});detail.focus({preventScroll:true});}
 }
 function statusDot(x){
 const absent=[];const hasNumber=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v));
 if(!hasNumber(x.valeur))absent.push(t('valeur brute','raw value'));
 if(!hasNumber(x.score))absent.push(t('score','score'));
 if(!hasNumber(x.poids))absent.push(t('poids','weight'));
 if(!x.bandes?.length&&!String(x.echelle||'').trim())absent.push(t('échelle','scale'));
 const label=absent.length?t('Informations manquantes : ','Missing information: ')+absent.join(', '):t('Indicateur renseigné','Indicator complete');
 return '<span class="ib-status '+(absent.length?'is-incomplete':'is-complete')+'" role="img" aria-label="'+esc(label)+'" title="'+esc(label)+'"></span>';
 }
 let page=0;const pageSize=7;const pager=document.createElement('div');pager.className='ib-pagination';sidebar.append(pager);
 function draw(){const q=apri.plier(head.querySelector('input').value),rows=d.indicateurs.filter(x=>!q||apri.plier(name(x)+' '+measure(x)+' '+T(x.dim)).includes(q));page=Math.min(page,Math.max(0,Math.ceil(rows.length/pageSize)-1));list.replaceChildren();const shown=rows.slice(page*pageSize,(page+1)*pageSize);for(const x of shown){const b=apri.h('<button type="button" class="ib-item" data-row="'+esc(String(x.ligne))+'" aria-pressed="'+String(etat.ind===x.ligne)+'"><span>'+esc(name(x))+'</span>'+statusDot(x)+'</button>');b.onclick=()=>select(x);list.append(b);}if(!rows.length)list.textContent=t('Aucun indicateur trouvé.','No indicators found.');pager.innerHTML='<span>'+String(rows.length?page*pageSize+1:0)+'–'+Math.min((page+1)*pageSize,rows.length)+' '+esc(t('sur','of'))+' '+rows.length+'</span><button type="button" aria-label="'+esc(t('Page précédente','Previous page'))+'" '+(page===0?'disabled':'')+'>←</button><button type="button" aria-label="'+esc(t('Page suivante','Next page'))+'" '+((page+1)*pageSize>=rows.length?'disabled':'')+'>→</button>';const buttons=pager.querySelectorAll('button');buttons[0].onclick=()=>{page--;draw();if(shown.length)select(rows[page*pageSize],false);};buttons[1].onclick=()=>{page++;draw();select(rows[page*pageSize],false);};if(shown.length&&(detail.hidden||!shown.some(x=>x.ligne===etat.ind)))select(shown.find(x=>x.ligne===etat.ind)||shown[0],false);}
 head.querySelector('input').oninput=()=>{page=0;draw();};draw();
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
