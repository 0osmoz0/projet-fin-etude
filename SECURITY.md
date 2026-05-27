# Politique de sécurité

## Périmètre

Ce dépôt contient une **infrastructure de jeu / lab** avec services volontairement vulnérables (ex. DVWA). Ne déployez pas cette stack sur un réseau public sans pare-feu et isolation.

## Signaler un problème

Pour une faille **accidentelle** (fuite de secret réel, mauvaise config hors scénario) :

1. N’ouvrez pas d’issue publique avec le détail exploitable.  
2. Contactez les mainteneurs du dépôt en privé (email / message direct selon votre contexte académique).

## Bonnes pratiques locales

- Ne commitez pas `.env`, clés API, ou mots de passe réels.  
- Utilisez `make lint` et la CI avant merge.  
- Gardez Docker et les images de base à jour (Dependabot).
