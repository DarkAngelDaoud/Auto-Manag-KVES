# Auto Manag KVES

Application de gestion pour auto-entrepreneur marocain (services), **hors ligne**, **chiffrée** et installable sur téléphone. Créée par **KVES**.

## À quoi ça sert
Suivre en un seul endroit son activité d'auto-entrepreneur : plafond annuel, échéances des déclarations trimestrielles, et bientôt clients, factures et encaissements. Les règles légales (taux, plafonds, dates) sont modifiables si la loi change.

## Principes
- **Hors ligne** : après la première ouverture, tout marche sans internet.
- **Sécurisé** : données chiffrées (AES-256) avec un mot de passe maître, clé de récupération, sauvegardes chiffrées.
- **Privé** : aucune donnée n'est envoyée. Tout reste dans le navigateur de l'appareil. Ne mets jamais de sauvegarde ni de clé de récupération dans ce dépôt.

## Utilisation
1. Ouvre la page, crée ton mot de passe maître et note ta clé de récupération.
2. Installe l'application depuis le menu du navigateur : « Ajouter à l'écran d'accueil ».
3. Exporte régulièrement une sauvegarde (Plus, Sauvegarde) et garde-la hors du téléphone.

## Version
V1.6.2 : logo et facture soignée. V1.6.1 : factures en PDF. V1.6.0 : sauvegarde vérifiable. V1.5.4 : rappel de sauvegarde renforcé. V1.5.3 : verrouillage en arrière-plan. V1.5.2 : réinitialiser tout. V1.5.1 : code découpé en fichiers par domaine (aucun changement visible). V1.5.0 : langues français, anglais, arabe. V1.4.1 : mot de passe renforcé. V1.4.0 : factures complétées (aperçu, total en lettres, échéance). V1.3.0 : déclarations et exports. V1.2.1 : robustesse (verrou entre fenêtres, mises à jour fiables). V1.2.0 : dépenses et résultat réel. V1.1.0 : factures (numérotation automatique, impression PDF, encaissement lié). V1.0.0 : première version (repartie de zéro à partir de la V1.5.0 de l'ancien dépôt) : coffre chiffré, clients, activités, encaissements, impôt par trimestre, échéances, sauvegarde, thèmes, mises à jour en deux temps.

Les montants et dates affichés sont indicatifs : à vérifier sur rn.ae.gov.ma.

© KVES

## Fichiers
Montants des opérations stockés en centimes ; règles légales en DH.

## Vérification
`cd tests && npm install && npx playwright install chromium && node run.js` lance les tests (aussi exécutés par GitHub à chaque envoi).
