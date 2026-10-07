/* The territory: the full map (Leaflet + 3D relief), built by outils/export_carte.py */
export const onglets = [];
export default async function render(el, apri){
 el.classList.add('sans-marge');
 const src = 'carte_'+apri.lang+'.html';
 let f = el.querySelector('iframe');
 if(f && f.getAttribute('src')===src) return;
 el.innerHTML = '';
 f = document.createElement('iframe');
 f.setAttribute('data-statique',''); f.title = apri.t('Carte du territoire','Map of the territory');
 f.src = src; f.allow = 'fullscreen';
 f.style.cssText = 'display:block;width:100%;border:0;border-radius:10px;height:calc(100dvh - var(--barre) - 76px);min-height:420px;background:#edf4f9';
 el.append(f);
}
