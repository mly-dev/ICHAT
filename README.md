# ilimiChat

Application de communication interne de l'Université ADU (Niamey, Niger).
Accès réservé aux membres disposant d'une adresse e-mail officielle ADU.

Ce dépôt contient l'application mobile React Native (Expo).

## Démarrage

```bash
npm install
cp .env.example .env     # ajuster EXPO_PUBLIC_API_URL quand le back est prêt
npm start
```

Par défaut `EXPO_PUBLIC_USE_MOCKS=1` : l'app tourne sans back-end, servie par
`src/services/api/mock.ts`. Passer à `0` dès que l'API d'Ibou est déployée.

## Scripts

| Commande | Rôle |
|---|---|
| `npm start` | Serveur de développement Expo |
| `npm run android` / `npm run ios` | Lance sur un appareil / émulateur |
| `npm test` | Tests Jest |
| `npm run typecheck` | Vérification TypeScript |

## Organisation

```
src/
  navigation/      pile + onglets, deep links, openConversation()
  services/api/    client HTTP, erreurs typées, endpoints, back simulé
  services/socket/ wrapper socket.io (reconnexion, file d'émission)
  services/notifications/ push : token, réception, préférences
  store/           Zustand : conversations, messages, groupes, notifications
  components/      design system, upload partagé, briques de chat
  screens/         écrans de mon périmètre + placeholders pour ceux d'Adam
  mocks/           ce qui appartient à Adam et n'existe pas encore
  utils/ theme/ types/
docs/API-CONTRACT.md  contrat d'API supposé, à valider avec Ibou
RELEASE.md            procédure de build et de publication
```

## Répartition du travail

Voir `CLAUDE.md`. En résumé : Momo tient la messagerie (conversations, privé,
groupes, médias, notifications), Adam l'authentification, le profil, l'annuaire,
ilimiMarket et les paramètres, Ibou le back-end.

## Contraintes retenues

- Réseau lent ou intermittent : états chargement / vide / erreur / hors-ligne sur
  chaque écran, envois optimistes avec file de réessai.
- Budget data : compression des images avant envoi, historique paginé.
- Android d'entrée de gamme : listes virtualisées, composants mémoïsés.
