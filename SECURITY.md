# Sécurité · Auto Manag KVES (© KVES)

## Principes
- **Hors ligne, local** : aucune donnée n'est envoyée sur Internet. Elles restent dans le stockage du navigateur de l'appareil.
- **Chiffrement** : mot de passe maître -> PBKDF2 (600 000 itérations, SHA-256) -> clé qui protège une clé de données aléatoire AES-256-GCM. Une clé de récupération protège la même clé de données.
- **Politique de sécurité de contenu (CSP)** : aucun script, style en ligne ni connexion externe autorisé (style-src 'self').
- **Verrouillage automatique** après 5 minutes d'inactivité.
- **Sauvegardes** : export chiffré, import et copie de sécurité automatique ; les mises à jour ne modifient jamais les données.

## Hygiène du dépôt public
- Aucun mot de passe, clé de récupération, sauvegarde ni clé privée dans le dépôt. Les sauvegardes restent hors du dépôt.
- Double authentification (2FA) activée sur le compte GitHub propriétaire.
- Aucune dépendance externe : pas de CDN, pas de bibliothèque tierce dans l'application.

## Signature (V2.0.1)
Chaque fichier livré est listé avec son empreinte SHA-256 dans SIGNATURE-KVES.txt, signé en Ed25519 (SIGNATURE-KVES.sig), comme Coach-Mass-KVES, avec une clé propre à Auto Manag. La clé publique est dans kves-automanag-cle-publique.txt ; la clé privée, chiffrée par une phrase secrète, reste chez le propriétaire, hors du dépôt, avec l'outil de signature privé (voir outils/LISEZ-MOI.txt). L'écran Plus > Vérifier l'application recalcule les empreintes ; la vérification automatique GitHub (outils/verifier.js) échoue si un fichier ne correspond plus. Une mise à jour mal signée, ou signée par une autre clé, est refusée par l'application installée (sauf navigateur trop ancien pour Ed25519, où la vérification est impossible et l'application fonctionne normalement).
Limite : une application web ne peut pas, à elle seule, empêcher un attaquant qui contrôlerait tout le dépôt de publier du code (le navigateur met à jour le service worker de lui-même). La signature permet de détecter et d'alerter ; la 2FA, la protection de branche et la future version Android (APK) complètent la protection.

## Signaler un problème
Contacter le propriétaire du dépôt. Ne jamais publier de données comptables dans une demande publique.
