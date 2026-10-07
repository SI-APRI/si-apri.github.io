/* Institutional source (Streamlit: institutions_page.render, institutions_ddas.render).
   Declarations by institutions (CASEC, schools, health, organisations), not households.
   Answers stay in their original French; the interface is bilingual. */
import {esc, choix} from './graphes.js';

export default async function render({gauche, droite, apri, etat, redessiner}){
 const D = await apri.donnees('data/resultats/brut/institutions.json');
 const t = (fr, en) => apri.t(fr, en);
 const lots = [['ddas', 'Quentin et Beaulieu — DDAS'], ['ore', t('ORE — section à confirmer', 'ORE — section to be confirmed')]];
 etat.lot ??= 'ddas';
 droite.append(choix(apri, {label: t('Résultats institutionnels', 'Institutional results'), cle: 'instlot', options: lots, valeur: etat.lot,
  surChoix: v => { etat.lot = v || 'ddas'; redessiner(); }}));
 const z = document.createElement('div'); z.className = 'brut-inst';
 droite.append(z);
 const add = h => z.insertAdjacentHTML('beforeend', h);
 const table = (cols, rows) => `<div class="brut-tabwrap brut-tabhaut"><table class="tableau"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>`
  + rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';

 if(etat.lot === 'ddas'){
  const secteurs = [['', t('Tous les secteurs', 'All sectors')], ['Éducation', t('Éducation', 'Education')], ['Santé', t('Santé', 'Health')], ['CASEC', 'CASEC'], ['Organisations', t('Organisations', 'Organisations')]];
  etat.secteur ??= '';
  const rows = D.ddas;
  const matching = rows.filter(r => !etat.secteur || r.secteur === etat.secteur);
  const questions = [...new Set(matching.map(r => r.question))];
  if(etat.question && !questions.includes(etat.question)) etat.question = null;
  gauche.append(choix(apri, {label: t('Secteur', 'Sector'), cle: 'instsec', options: secteurs.filter(([v]) => v), vide: t('Tous les secteurs', 'All sectors'), valeur: etat.secteur || null,
   surChoix: v => { etat.secteur = v || ''; redessiner(); }}));
  gauche.append(choix(apri, {label: 'Question', cle: 'instq', options: questions.map(q => [q, q]), vide: t('Toutes les questions', 'All questions'), valeur: etat.question,
   surChoix: v => { etat.question = v; redessiner(); }}));
  etat.section ??= '';
  z.append(choix(apri, {label: t('Section communale', 'Communal section'), cle: 'instsct', options: [['Quentin', 'Quentin'], ['Beaulieu', 'Beaulieu']], vide: 'Quentin et Beaulieu', valeur: etat.section || null,
   surChoix: v => { etat.section = v || ''; redessiner(); }}));
  add(`<h3>${esc(t('Enquêtes institutionnelles — Quentin et Beaulieu', 'Institutional surveys — Quentin and Beaulieu'))}</h3>`);
  add(`<p class="brut-gris">${esc(t('9 questionnaires distincts : 2 CASEC, 2 éducation, 2 santé et 3 organisations. Réponses originales en français.', '9 distinct questionnaires: 2 CASEC, 2 education, 2 health and 3 organisations. Original answers in French.'))}</p>`);
  add(`<div class="brut-info">${esc(t('Localisation provisoire : les enquêtes CASEC, éducation et santé sont rattachées à la section nommée dans le fichier reçu, à confirmer par les partenaires. Les organisations indiquent explicitement leur section. Ces déclarations ne modifient pas les scores APRI ni les corrélations entre ménages.',
   'Provisional location: the CASEC, education and health surveys are attached to the section named in the file received, to be confirmed by the partners. The organisations state their section explicitly. These declarations change neither the APRI scores nor the correlations between households.'))}</div>`);
  const sel = matching.filter(r => (!etat.section || r.section === etat.section) && (!etat.question || r.question === etat.question));
  add(table(['Section', t('Secteur', 'Sector'), 'Question', t('Réponse déclarée', 'Declared answer'), t('Questionnaire', 'Questionnaire')],
   sel.map(r => [r.section, r.secteur, r.question, String(r.valeur), r.questionnaire])));
  add(`<p class="brut-gris">${esc(t('Les réponses absentes ne sont pas affichées et ne sont jamais remplacées par zéro. Les nombres sont des déclarations institutionnelles, pas des taux de couverture de la population.',
   'Missing answers are not shown and are never replaced by zero. Numbers are institutional declarations, not population coverage rates.'))}</p>`);
  const puces = apri.lang === 'en' ? [
   'Each questionnaire is counted once thanks to its Kobo identifier, even when it appears in several exports.',
   'The two DDAS health files received contain the same values: they are not two collections.',
   'The territorial attachment of the six sector questionnaires remains to be confirmed. Other anonymous answers are not attributed by deduction.',
   'Periods mentioned in the questions are kept; the date an export was sent is not the survey date.',
   'Conditional fields and repeated labels must be read in their context in the form. No automatic calculation is made on these declarations.',
   'The answers on births need checking: teenage deliveries are declared while the total of recorded deliveries is zero. Collection perimeters may differ.',
   'The ORE documents remain available separately, without attribution to Blactote or Dalmette.'] : [
   'Chaque questionnaire est compté une seule fois grâce à son identifiant Kobo, même lorsqu’il figure dans plusieurs exports.',
   'Les deux fichiers santé DDAS reçus contiennent les mêmes valeurs : ils ne constituent pas deux collectes.',
   'Le rattachement territorial des six questionnaires sectoriels reste à confirmer. Les autres réponses anonymes ne sont pas attribuées par déduction.',
   'Les périodes mentionnées dans les questions sont conservées ; la date d’envoi d’un export n’est pas la date d’enquête.',
   'Les champs conditionnels et les libellés répétés doivent être lus avec leur contexte dans le formulaire. Aucun calcul automatique n’est effectué sur ces déclarations.',
   'Les réponses sur les naissances nécessitent une vérification : des accouchements d’adolescentes sont déclarés alors que le total des accouchements enregistrés est zéro. Les périmètres de recueil peuvent différer.',
   'Les documents ORE restent disponibles séparément, sans attribution à Blactote ou Dalmette.'];
  add(`<details class="pli"><summary>${esc(t('Sources et vérifications en cours', 'Sources and checks in progress'))}</summary><div class="brut-pli-corps"><ul class="brut-puces">${puces.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`
   + table(['Questionnaire', 'Question', t('Fichier', 'File'), t('Feuille', 'Sheet'), t('Ligne', 'Row'), t('Colonne', 'Column'), 'Localisation'],
     sel.map(r => [r.questionnaire, r.question, r.source, r.feuille, r.ligne, r.colonne, r.localisation])) + '</div></details>');
  return;
 }

 // ---- ORE
 const STATUT = {transcrit: ['Réponse transcrite', 'Transcribed answer'], declaration: ['Déclaration institutionnelle', 'Institutional declaration'],
  lecture_a_confirmer: ['Lecture à confirmer', 'Reading to be confirmed'], contradiction: ['Réponse contradictoire', 'Contradictory answer'],
  indetermine: ['Indéterminé', 'Undetermined'], non_renseigne: ['Non renseigné', 'Not filled in'], non_enregistre: ['Non enregistré', 'Not recorded']};
 const st = c => apri.t(...(STATUT[c] || [c, c]));
 const valeur = r => {
  const v = r.valeur;
  if(v == null) return st(r.statut);
  if(typeof v === 'boolean') return v ? t('Oui', 'Yes') : t('Non', 'No');
  if(Array.isArray(v)) return v.join(' ; ');
  return String(v) + (r.unite ? ' ' + r.unite : '');
 };
 const rows = D.ore;
 const themes = [...new Set(rows.map(r => r.theme))];
 if(etat.oreTheme && !themes.includes(etat.oreTheme)) etat.oreTheme = null;
 gauche.append(choix(apri, {label: t('Thème', 'Theme'), cle: 'oreth', options: themes.map(x => [x, x]), vide: t('Tous les thèmes', 'All themes'), valeur: etat.oreTheme,
  surChoix: v => { etat.oreTheme = v; redessiner(); }}));
 const matching = rows.filter(r => !etat.oreTheme || r.theme === etat.oreTheme);
 if(etat.oreQ && !matching.some(r => r.id === etat.oreQ)) etat.oreQ = null;
 gauche.append(choix(apri, {label: 'Question', cle: 'oreq', options: matching.map(r => [r.id, r.libelle]), vide: t('Toutes les questions', 'All questions'), valeur: etat.oreQ,
  surChoix: v => { etat.oreQ = v; redessiner(); }}));
 add(`<h3>${esc(t('ORE — section communale à confirmer', 'ORE — communal section to be confirmed'))}</h3>`);
 add(`<p class="brut-gris">${esc(t('Résultats provisoires · 3 questionnaires · Éducation, santé et CASEC', 'Provisional results · 3 questionnaires · Education, health and CASEC'))}</p>`);
 add(`<div class="brut-info">${esc(t('Le territoire couvert n’est pas encore identifié : ces déclarations ne sont attribuées ni à Blactote ni à Dalmette. Elles ne modifient pas les scores APRI et ne sont pas utilisées dans les corrélations entre ménages.',
  'The territory covered is not yet identified: these declarations are attributed neither to Blactote nor to Dalmette. They do not change the APRI scores and are not used in the correlations between households.'))}</div>`);
 add(`<p class="brut-gris">${esc(t('Transcription des réponses originales en français. Le formulaire porte la référence MGS3_09/2024 ; la date de collecte reste à confirmer. Les années explicitement mentionnées dans les questions sont conservées.',
  'Transcription of the original answers in French. The form bears the reference MGS3_09/2024; the collection date remains to be confirmed. Years explicitly mentioned in the questions are kept.'))}</p>`);
 const sel = etat.oreQ ? matching.filter(r => r.id === etat.oreQ) : matching;
 if(etat.oreQ){
  const r = sel[0];
  add(`<h4>${esc(r.libelle)}</h4><p>${esc(valeur(r))}</p><p class="brut-gris">${esc(r.source)} · page ${esc(r.page)} · ${esc(st(r.statut))}</p>`);
  if(r.note) add(`<div class="brut-info">${esc(r.note)}</div>`);
 } else {
  add(table(['Question', t('Réponse', 'Answer'), t('Statut', 'Status'), t('Période', 'Period'), 'Source', t('Précision', 'Detail')],
   sel.map(r => [r.libelle, valeur(r), st(r.statut), r.periode ? String(r.periode) : t('À confirmer / non précisée', 'To be confirmed / not stated'), `${r.source} · p. ${r.page}`, r.note || ''])));
 }
 const ids = new Set(sel.map(r => r.id));
 const der = D.derives.filter(d => ids.has(d.source_id));
 if(der.length){
  add(`<details class="pli"><summary>${esc(t('Équipements scolaires : effectifs et proportions', 'School equipment: counts and proportions'))}</summary><div class="brut-pli-corps"><p class="brut-gris">${esc(t(
   'Proportions provisoires : nombre d’écoles équipées ÷ nombre d’écoles du même niveau × 100. Dénominateurs déclarés : 6 écoles primaires, 2 secondaires. Le périmètre commun aux réponses reste à valider. Un résultat de 50 % au secondaire représente une école sur deux.',
   'Provisional proportions: number of equipped schools ÷ number of schools of the same level × 100. Declared denominators: 6 primary schools, 2 secondary. The perimeter common to the answers remains to be validated. A result of 50% in secondary represents one school out of two.'))}</p>`
   + table([t('Service', 'Service'), t('Écoles', 'Schools'), t('Part (%)', 'Share (%)')], der.map(d => [d.libelle, `${d.numerateur} / ${d.denominateur}`, apri.nombre(d.pourcentage, 1)])) + '</div></details>');
 }
 const puces = apri.lang === 'en' ? [
  ['A blank is not a zero.', '“Not filled in”, “undetermined” and “not recorded” remain distinct.'],
  ['A declaration is not an exhaustive census.', '“No case recorded” does not necessarily mean “no case in the population”.'],
  ['300 malaria cases declared in 2023 is a count', ', not an incidence rate: the population and the collection perimeter are not known.'],
  ['Ambiguous answers are excluded from calculations', ': secondary canteen, addiction care, COUC/COUL and the existence of the emergency shelter. The name of the credit institution remains to be confirmed.'],
  ['The three questionnaires cover different sectors.', 'They do not represent three territories and cannot be turned into individual household observations.'],
  ['The presence of health services needs clarifying', ': the CASEC indicates a technical health institution not represented, while the health questionnaire describes a dispensary. Definitions or perimeters may differ.'],
  ['The data entry is a structured selection of the answers on the 25 pages', ', not an exhaustive transcription of all empty conditional fields.']] : [
  ['Un blanc n’est pas un zéro.', '« Non renseigné », « indéterminé » et « non enregistré » restent distincts.'],
  ['Une déclaration n’est pas un recensement exhaustif.', '« Aucun cas enregistré » ne signifie pas forcément « aucun cas dans la population ».'],
  ['300 cas de malaria déclarés en 2023 est un effectif', ', pas un taux d’incidence : la population et le périmètre du recueil ne sont pas connus.'],
  ['Les réponses ambiguës sont exclues des calculs', ' : cantine secondaire, prise en charge des addictions, COUC/COUL et existence de l’abri d’urgence. Le nom de l’organisme de crédit reste à confirmer.'],
  ['Les trois questionnaires portent sur des secteurs différents.', 'Ils ne représentent pas trois territoires et ne peuvent pas être transformés en observations individuelles de ménages.'],
  ['La présence des services de santé doit être clarifiée', ' : le CASEC indique une institution technique de santé non représentée, tandis que le questionnaire santé décrit un dispensaire. Les définitions ou périmètres peuvent différer.'],
  ['La saisie est une sélection structurée des réponses des 25 pages', ', pas une transcription exhaustive de tous les champs conditionnels vides.']];
 add(`<details class="pli"><summary>${esc(t('Comprendre les données et les vérifications en cours', 'Understanding the data and the checks in progress'))}</summary><div class="brut-pli-corps"><ul class="brut-puces">`
  + puces.map(([a, b]) => `<li><b>${esc(a)}</b>${/^[,:; ]/.test(b) ? '' : ' '}${esc(b)}</li>`).join('') + `</ul><p class="brut-gris">${esc(t(
  'Sources : District Scolaire.pdf (3 pages), Ministere de la Sante.pdf (11 pages), CASEC.pdf (11 pages), transmis le 25 septembre 2026. Chaque observation renvoie à sa page source. Les scans ne sont pas proposés au téléchargement.',
  'Sources: District Scolaire.pdf (3 pages), Ministere de la Sante.pdf (11 pages), CASEC.pdf (11 pages), sent on 25 September 2026. Each observation refers to its source page. The scans are not offered for download.'))}</p></div></details>`);
}
