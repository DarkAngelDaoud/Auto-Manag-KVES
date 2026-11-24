# Sécurité · Auto Manag KVES (© KVES)

## Principes
- **Hors ligne, local** : aucune donnée n'est envoyée sur Internet. Elles restent dans le stockage du navigateur de l'appareil.
- **Chiffrement** : mot de passe maître -> PBKDF2 (600 000 itérations, SHA-256) -> clé qui protège une clé de données aléatoire AES-256-GCM. Une clé de récupération protège la même clé de données.
- **Politique de sécurité de contenu (CSP)** : aucun script ni connexion externe autorisé.
- **Verrouillage automatique** après 5 minutes d'inactivité.
- **Sauvegardes** : export chiffré, import et copie de sécurité automatique ; les mises à jour ne modifient jamais les données.

## Hygiène du dépôt public
- Aucun mot de passe, clé de récupération, sauvegarde ni clé privée dans le dépôt. Les sauvegardes restent hors du dépôt.
- Double authentification (2FA) activée sur le compte GitHub propriétaire.
- Aucune dépendance externe : pas de CDN, pas de bibliothèque tierce dans l'application.

## Signature (à la fin du projet)
Un fichier d'empreintes (SHA-256) de tous les fichiers, logo compris, sera signé avec une clé privée conservée hors du dépôt, puis vérifié par l'application.

## Signaler un problème
Contacter le propriétaire du dépôt. Ne jamais publier de données comptables dans une demande publique.
