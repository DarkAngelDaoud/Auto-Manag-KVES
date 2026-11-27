# Architecture · Auto Manag KVES (© KVES)

Application web hors ligne (PWA), sans dépendance externe. Scripts classiques partagés dans une même portée globale.

## Ordre de chargement (index.html)
langues.js, lang-en.js, lang-ar.js (textes) -> donnees.js (version, règles légales) -> securite.js (chiffrement) -> app-noyau.js (état, coffre, sauvegarde, outils) -> pdf.js (factures PDF) -> app-vues.js (accueil, clients, plus) -> app-factures.js -> app-declarations.js -> app-depenses.js -> app-encaissements.js -> app-reglages.js -> app-maj.js. theme-init.js est chargé dans l'en-tête.

## Données
Coffre unique chiffré (PBKDF2 -> clé qui enveloppe une clé AES-256-GCM) dans IndexedDB `amk-v1-db`, clés `vault` et `vault.bak`. Montants en centimes. Seuls des réglages non sensibles sont dans localStorage (préfixe `amk.`).

## Écrans
Chaque écran de Plus est une fonction dans l'objet `subs` (app-*.js), appelée par `nav('more','nom')`.

## Textes
Toute chaîne visible est dans langues.js (français, référence) avec son équivalent dans lang-en.js et lang-ar.js. Les factures et récapitulatifs restent en français.

## Tests
`cd tests && npm ci && node run.js` (Playwright, Chromium). Les suites vérifient la cohérence des textes, le chiffrement, les calculs et les écrans.

## Règles légales
donnees.js (REGLES) : chaque règle porte sa source (article) et un indicateur vérifié ou à vérifier.
