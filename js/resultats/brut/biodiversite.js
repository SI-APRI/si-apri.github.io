/* Biodiversity source (Streamlit: biodiversite_page.render). Values transcribed
   from the published PNUE MGS3 report, not recomputed. */
import {esc, choix} from './graphes.js';

const PDF = 'data/resultats/brut/bio_rapport_2026.pdf';

export default async function render({gauche, droite, apri, etat, redessiner}){
 const t = (fr, en) => apri.t(fr, en);
 const groupes = {pollinisateurs: t('Pollinisateurs', 'Pollinators'), odonates: t('Libellules et demoiselles', 'Dragonflies and damselflies')};
 const vues = {results: t('Résultats', 'Results'), indicators: t('Lien avec les indicateurs APRI', 'Link to APRI indicators'), report: t('Rapport complet et figures', 'Full report and figures')};
 etat.groupe ??= 'pollinisateurs'; etat.vue ??= 'results'; etat.mesure ??= 'abundance';
 gauche.append(choix(apri, {label: t('Groupe étudié', 'Study group'), cle: 'biog', options: Object.entries(groupes), valeur: etat.groupe,
  surChoix: v => { etat.groupe = v || 'pollinisateurs'; redessiner(); }}));
 gauche.append(choix(apri, {label: t('Afficher', 'Show'), cle: 'biov', options: Object.entries(vues), valeur: etat.vue,
  surChoix: v => { etat.vue = v || 'results'; redessiner(); }}));

 const z = document.createElement('div'); z.className = 'brut-bio';
 droite.append(z);
 const add = h => z.insertAdjacentHTML('beforeend', h);
 const cap = s => add(`<p class="brut-gris">${esc(s)}</p>`);
 const txt = s => add(`<p>${esc(s)}</p>`);
 const source = pages => cap(t('Source : rapport PNUE MGS3, volet 1, octobre 2026', 'Source: PNUE MGS3 report, Part 1, October 2026') + ' · p. ' + pages);
 const metrics = items => add(`<div class="brut-kpis">${items.map(([a, b]) => `<div class="brut-kpi"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join('')}</div>`);
 const pli = (titre, html) => add(`<details class="pli"><summary>${esc(titre)}</summary><div class="brut-pli-corps">${html}</div></details>`);
 const srcH = pages => `<p class="brut-gris">${esc(t('Source : rapport PNUE MGS3, volet 1, octobre 2026', 'Source: PNUE MGS3 report, Part 1, October 2026') + ' · p. ' + pages)}</p>`;

 add(`<h3>${esc(groupes[etat.groupe])}</h3>`);
 cap(t('Résultats transcrits du rapport · octobre 2025–mars 2026 · Sites étudiés, pas l’ensemble des dix sections communales. Aucun score territorial n’est ajouté.',
  'Results transcribed from the report · October 2025–March 2026 · Surveyed sites, not all ten communal sections. No territorial score is added.'));

 if(etat.vue === 'report'){
  txt(t('Rapport PNUE MGS3 · Biodiversité et résilience paysagère · Volet 1 · Octobre 2026 · 97 pages · Français',
   'PNUE MGS3 report · Biodiversity and landscape resilience · Part 1 · October 2026 · 97 pages · French'));
  cap(t('Figures originales : pollinisateurs, p. 29–35 ; odonates, p. 65–69. Les barres d’incertitude et les légendes originales sont conservées dans le document.',
   'Original figures: pollinators, pp. 29–35; odonates, pp. 65–69. Original uncertainty bars and captions are preserved in the document.'));
  add(`<p><a class="bouton" href="${PDF}" download>PDF ↓</a> <a class="bouton" href="${PDF}" target="_blank" rel="noopener">${esc(t('Ouvrir dans un nouvel onglet', 'Open in a new tab'))}</a></p>`
   + `<div class="brut-pdf"><iframe src="${PDF}#view=FitH" title="${esc(t('Rapport de biodiversité', 'Biodiversity report'))}" loading="lazy"></iframe></div>`);
  return;
 }
 if(etat.vue === 'indicators'){
  const rows = [
   ['47', t('Richesse spécifique', 'Species richness'), t('30 taxons de pollinisateurs ; 35 espèces d’odonates, sur l’ensemble des sites de chaque étude.', '30 pollinator taxa; 35 odonate species across all sites in each study.'), '27, 61'],
   ['48', 'Simpson (1−D)', t('Pollinisateurs : moyenne publiée 0,479 sous le nom « Simpson ». Vérifier la convention avant de l’assimiler à 1−D. Ne pas inverser une moyenne de Hill q2 pour obtenir une moyenne de Simpson.', 'Pollinators: published mean 0.479 labelled “Simpson”. Verify the convention before treating it as 1−D. Do not invert a mean Hill q2 to derive a mean Simpson value.'), '28, 62'],
   ['49', 'Shannon (H′)', t('Moyennes publiées : pollinisateurs 0,818 ; odonates 1,30. Périmètres et protocoles différents : ne pas les comparer comme des scores équivalents.', 'Published means: pollinators 0.818; odonates 1.30. Different coverage and protocols: not directly comparable scores.'), '28, 62']];
  add(`<div class="brut-tabwrap"><table class="tableau"><thead><tr><th>APRI</th><th>${esc(t('Indicateur', 'Indicator'))}</th><th>${esc(t('Résultat disponible à l’échelle de l’étude', 'Available study-level result'))}</th><th>Pages</th></tr></thead><tbody>`
   + rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>');
  add(`<div class="brut-info">${esc(t('Score par section non disponible. Il faut les relevés et coordonnées des stations, puis vérifier les règles de regroupement et les barèmes. Le rapport ne contient pas le volet oiseaux et ne complète pas à lui seul les diversités fonctionnelle et phylogénétique.',
   'Section-level scores are unavailable. Station records and coordinates are needed, followed by checks of aggregation rules and scoring thresholds. The report has no bird component and cannot by itself complete functional or phylogenetic diversity indicators.'))}</div>`);
  return;
 }
 if(etat.groupe === 'pollinisateurs'){
  txt('Port-Salut · Roche-à-Bateau · Beaumont · Arniquet');
  metrics([[t('Individus capturés', 'Individuals captured'), '373'], [t('Taxons recensés', 'Taxa recorded'), '30'], [t('Unités de terrain', 'Field units'), '12'], [t('Relevés', 'Surveys'), '48']]);
  cap(t('12 unités suivies 4 fois : 48 relevés, pas 48 sites indépendants. Un taxon est un groupe identifié ; il ne correspond pas nécessairement à une espèce confirmée.',
   '12 units sampled 4 times: 48 surveys, not 48 independent sites. A taxon is an identified group, not necessarily a confirmed species.'));
  source('19–24, 27');
  txt(t('Dans les secteurs les plus transformés par les activités humaines, les captures sont moins abondantes et comportent moins de taxons. Il s’agit d’une comparaison entre secteurs, pas d’une baisse observée au fil des années.',
   'The more human-modified sectors have fewer captures and fewer taxa. This is a comparison between sectors, not a decline measured over years.'));
  const mesures = {abundance: t('Abondance des captures', 'Capture abundance'), richness: t('Nombre de taxons', 'Number of taxa')};
  const c = choix(apri, {label: t('Mesure', 'Measure'), cle: 'biom', options: Object.entries(mesures), valeur: etat.mesure,
   surChoix: v => { etat.mesure = v || 'abundance'; redessiner(); }});
  z.append(c);
  const vals = etat.mesure === 'abundance' ? [12.71, 6.77, 3.33] : [4.03, 2.27, 1.45];
  add(graphe([t('Faible', 'Low'), t('Intermédiaire', 'Intermediate'), t('Forte', 'High')], vals,
   t('Moyenne estimée par le modèle', 'Model-estimated mean'), t('Selon le niveau d’anthropisation', 'By degree of human modification'), apri.lang));
  cap(t('Moyennes ajustées publiées, distinctes des moyennes brutes. Les intervalles de confiance à 95 % sont visibles dans les figures originales 2 et 3 du rapport ; ils ne sont pas reconstruits ici.',
   'Published adjusted means, distinct from raw averages. The 95% confidence intervals are shown in original report figures 2 and 3; they are not reconstructed here.'));
  source('28–30, figures 2–3');
  pli(t('Comprendre les résultats et leurs limites', 'Understand results and limits'),
   `<p>${esc(t('Les tests du rapport indiquent une association avec le gradient : p = 9,12 × 10⁻¹³ pour l’abondance ; p = 3,64 × 10⁻¹⁴ pour la richesse. Une petite valeur de p n’indique ni la taille de l’effet, ni une preuve de causalité. Plusieurs caractéristiques des habitats varient ensemble.',
    'Report tests show an association with the gradient: p = 9.12 × 10⁻¹³ for abundance; p = 3.64 × 10⁻¹⁴ for richness. A small p-value is neither an effect size nor proof of causality. Several habitat characteristics vary together.'))}</p>`
   + `<p>${esc(t('Les pièges-bols donnent une vue partielle des insectes présents. Les captures ne mesurent pas directement la pollinisation des cultures, les rendements ou la capacité du paysage à récupérer après un choc.',
    'Pan traps provide a partial view of insects present. Captures do not directly measure crop pollination, yields or landscape recovery after a shock.'))}</p>` + srcH('35, 40–41, 82, 85–86'));
 } else {
  txt('Port-Salut · Roche-à-Bateau · Beaumont · Roseaux');
  metrics([[t('Individus recensés', 'Individuals recorded'), '1 652'], [t('Espèces', 'Species'), '35'], [t('Stations', 'Stations'), '40'], [t('Relevés', 'Surveys'), '120']]);
  cap(t('40 stations suivies 3 fois dans 4 cours d’eau. Les relevés répétés ne sont pas des stations supplémentaires.', '40 stations sampled 3 times in 4 watercourses. Repeated surveys are not additional stations.'));
  source('47–50, 61');
  add(graphe(['Beaumont', 'Port-Salut', 'Roseaux', 'Roche-à-Bateau'], [5.13, 4.43, 3.80, 3.63],
   t('Espèces par relevé (moyenne)', 'Species per survey (mean)'), t('Richesse observée dans les sites étudiés', 'Observed richness at surveyed sites'), apri.lang));
  cap(t('Moyennes descriptives publiées, pas le nombre total d’espèces de chaque commune ni un classement des sections. Le test global de l’effet du site sur la richesse donne p = 0,0528 : il ne franchit pas le seuil de 0,05 retenu dans le rapport.',
   'Published descriptive means, not total species counts for each municipality or a ranking of communal sections. The global site test for richness gives p = 0.0528, above the report’s 0.05 threshold.'));
  source('62–63');
  txt(t('Des sites avec moins d’espèces peuvent abriter des espèces différentes et contribuer à la diversité du paysage. Préserver plusieurs types de milieux peut donc compter autant que protéger seulement les sites les plus riches.',
   'Sites with fewer species may host different species and contribute to landscape diversity. Protecting several habitat types can therefore matter alongside protecting the richest sites.'));
  cap(t('78,19 % des différences de composition entre stations correspondent au remplacement d’espèces. Ce chiffre ne signifie pas que 78,19 % des espèces ont disparu. Il ne mesure pas une évolution dans le temps.',
   '78.19% of compositional dissimilarity between stations is attributed to species replacement. This does not mean 78.19% of species have disappeared, and does not measure change over time.'));
  source('66, 83–85');
  pli(t('Comprendre les résultats et leurs limites', 'Understand results and limits'),
   `<p>${esc(t('Seuls les adultes ont été inventoriés. Leur présence ne prouve pas qu’ils se reproduisent sur place et ne mesure pas directement la potabilité de l’eau. Le gradient amont–aval n’a pas le même sens écologique dans tous les cours d’eau. Trois campagnes ne décrivent pas toute la saisonnalité annuelle.',
    'Only adults were surveyed. Their presence does not prove local breeding or directly measure drinking-water safety. Upstream–downstream position has different ecological meanings across watercourses. Three campaigns do not describe full annual seasonality.'))}</p>` + srcH('49, 83–86'));
 }
}

/* the Plotly bar chart of the Streamlit page, drawn in SVG (no zoom, no wheel) */
function graphe(labels, values, ylabel, titre, lang){
 const W = 760, H = 340, ML = 62, MR = 20, MT = 55, MB = 40;
 const vmax = Math.max(...values) * 1.23;
 const pas = [0.5, 1, 2, 5, 10, 20].find(s => vmax / s <= 6) || 5;
 const pw = W - ML - MR, ph = H - MT - MB;
 const y = v => MT + ph - ph * v / vmax;
 const bw = pw / labels.length;
 const nf = v => lang === 'fr' ? String(v).replace('.', ',') : String(v);
 let s = `<text x="${ML}" y="28" font-size="15" fill="#34483f">${esc(titre)}</text>`;
 for(let v = 0; v <= vmax; v += pas){
  s += `<line x1="${ML}" x2="${W - MR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#e6ecea"/><text x="${ML - 8}" y="${(y(v) + 4).toFixed(1)}" font-size="12" text-anchor="end" fill="#34483f">${nf(v)}</text>`;
 }
 labels.forEach((l, i) => {
  const x = ML + bw * i + bw * 0.1, w = bw * 0.8, v = values[i];
  s += `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${w.toFixed(1)}" height="${(MT + ph - y(v)).toFixed(1)}" fill="#28745c"><title>${esc(l)} : ${nf(v)}</title></rect>`
   + `<text x="${(x + w / 2).toFixed(1)}" y="${(y(v) - 6).toFixed(1)}" font-size="13" text-anchor="middle" fill="#34483f">${nf(v)}</text>`
   + `<text x="${(x + w / 2).toFixed(1)}" y="${H - MB + 20}" font-size="13" text-anchor="middle" fill="#34483f">${esc(l)}</text>`;
 });
 s += `<text transform="translate(16 ${MT + ph / 2}) rotate(-90)" font-size="12.5" text-anchor="middle" fill="#34483f">${esc(ylabel)}</text>`;
 return `<div class="brut-graphe"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" font-family="Inter,system-ui,sans-serif">${s}</svg></div>`;
}
