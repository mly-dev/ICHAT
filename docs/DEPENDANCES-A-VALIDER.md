# Dépendances à valider

Le socle retenu est **React Native CLI, template blanc, avec react-navigation et
rien d'autre**. Certaines fonctionnalités du backlog demandent un module natif :
React Native nu ne sait pas ouvrir la galerie ni recevoir un push.

Plutôt que d'installer ces paquets de mon côté, chaque besoin passe par un
**adaptateur** dans `src/services/native/`. Toute la logique métier est écrite et
testée autour ; il n'y a que l'adaptateur à brancher le jour où tu valides.

## Ce qui tourne aujourd'hui sans rien ajouter

Liste des conversations, messagerie privée et de groupe, envoi optimiste, file de
réessai, temps réel, statuts, réponse citée, suppression, gestion des groupes,
préférences de notification, et l'intégralité des écrans. Le back simulé
(`src/services/api/mock.js`) permet de tout parcourir sans serveur.

## Ce qui attend ton accord

| Besoin | Paquet proposé | Ce qui manque sans lui | Adaptateur à brancher |
|---|---|---|---|
| Stockage persistant | `@react-native-async-storage/async-storage` | La file d'envoi et les préférences repartent à zéro au redémarrage de l'app. Tout le reste fonctionne. | `setStorageAdapter()` dans `src/services/native/storage.js` |
| Galerie et caméra | `react-native-image-picker` | Impossible d'envoyer une image (ICH-029). L'écran affiche un message clair au lieu de planter. | `setMediaAdapter()` dans `src/services/native/media.js` |
| Sélection de fichiers | `@react-native-documents/picker` | Impossible d'envoyer un fichier (ICH-032). | même adaptateur |
| Notifications push | `@react-native-firebase/app` + `@react-native-firebase/messaging`, et `notifee` pour l'affichage en premier plan | Aucun push reçu (ICH-052 à ICH-055). L'app fonctionne, elle ne sonne pas. | `setPushAdapter()` dans `src/services/native/push.js` |

## Ce que j'ai évité d'ajouter, et comment

| Besoin | Paquet courant | Ce que j'ai fait à la place |
|---|---|---|
| État global | Zustand / Redux Toolkit | `src/store/createStore.js`, 40 lignes sur `useSyncExternalStore`. API proche de Zustand, testé. |
| Temps réel | `socket.io-client` | `src/services/socket/socketClient.js` sur le WebSocket natif : backoff, file d'émission, heartbeat. Testé avec un faux WebSocket. |
| État du réseau | `@react-native-community/netinfo` | Déduit du résultat réel des requêtes + une sonde HEAD. Plus juste ici : « connecté au Wi-Fi » ne veut pas dire « joignable » au Niger. |
| Alias d'import `@/` | `babel-plugin-module-resolver` | `extraNodeModules` dans `metro.config.js` et `moduleNameMapper` dans Jest. |
| Compression d'image | `expo-image-manipulator` | Déléguée à l'adaptateur média : `react-native-image-picker` sait redimensionner et compresser à la prise. |
| Téléchargement de fichier | `react-native-fs` / `expo-file-system` | `Linking.openURL` : le système gère déjà la reprise, la destination et l'app qui ouvre le fichier. |

## Comment brancher un adaptateur

Exemple pour le stockage, une fois le paquet installé :

```js
// index.js, avant AppRegistry.registerComponent
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStorageAdapter } from './src/services/native/storage';

setStorageAdapter({
  getItem: AsyncStorage.getItem,
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
});
```

Rien d'autre à modifier : la file d'envoi et les préférences deviennent
persistantes immédiatement.
