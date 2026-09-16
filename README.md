# ilimiChat

Application de communication interne de l'Université ADU (Niamey, Niger).
Accès réservé aux membres disposant d'une adresse e-mail officielle ADU.

Ce dépôt contient l'application mobile **React Native (CLI, template blanc)**,
en JavaScript. Pas d'Expo, pas de TypeScript.

## Démarrage

```bash
npm install
cd ios && pod install && cd ..   # macOS uniquement
npm start                        # serveur Metro
npm run android                  # ou npm run ios, dans un autre terminal
```

Par défaut `apiConfig.useMocks` vaut `true` dans `src/services/api/config.js` :
l'app tourne sans back-end, servie par `src/services/api/mock.js`. Passer à
`false` et renseigner `baseUrl` / `socketUrl` dès que l'API d'Ibou est déployée.

## Scripts

| Commande | Rôle |
|---|---|
| `npm start` | Serveur Metro |
| `npm run android` / `npm run ios` | Compile et lance sur appareil ou émulateur |
| `npm test` | Tests Jest |
| `npm run lint` | ESLint |

## Dépendances

Le socle est volontairement minimal : le template React Native + **react-navigation**,
et rien d'autre. L'état global, le temps réel et la détection réseau sont écrits à
la main plutôt qu'importés. Ce qui demanderait un module natif (stockage
persistant, galerie, caméra, fichiers, push) passe par un adaptateur dans
`src/services/native/` — voir `docs/DEPENDANCES-A-VALIDER.md`.

## Organisation

```
android/ ios/     projets natifs, versionnés (projet bare)
src/
  navigation/      pile + onglets, deep links, openConversation()
  services/api/    client HTTP, erreurs, endpoints, back simulé
  services/socket/ wrapper WebSocket (reconnexion, file d'émission)
  services/native/ adaptateurs : stockage, média, push
  services/notifications/ push : token, réception, préférences
  store/           createStore maison + conversations, messages, groupes
  components/      briques d'interface, upload partagé, briques de chat
  screens/         écrans de mon périmètre + placeholders pour ceux d'Adam
  mocks/           ce qui appartient à Adam et n'existe pas encore
  utils/ theme/ types/
docs/API-CONTRACT.md           contrat d'API supposé, à valider avec Ibou
docs/DEPENDANCES-A-VALIDER.md  ce qui attend une dépendance
docs/ANOMALIES.md              anomalies relevées sur mes modules (ICH-117)
RELEASE.md                     procédure de build et de publication
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
