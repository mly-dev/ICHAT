# Anomalies relevées sur mes modules (ICH-117)

État au terme du sprint 5. Périmètre : messagerie privée, groupes, médias,
notifications. Rien de ce qui appartient à Adam ou à Ibou n'est listé ici.

## Corrigées

| # | Module | Anomalie | Correction |
|---|---|---|---|
| A1 | Messagerie | Un envoi échoué ne s'affichait jamais comme tel : la règle « un statut ne redescend jamais » bloquait aussi `failed`. L'utilisateur voyait « en cours » indéfiniment, sans bouton de réessai. | `failed` est traité comme un état local : il marque un `pending`, n'efface jamais un statut confirmé, et disparaît si le réessai passe. Couvert par un test. |
| A2 | Messagerie | Un message dont la suppression échouait côté serveur restait barré à l'écran alors qu'il était toujours visible chez le destinataire. | Le retour arrière remet explicitement `deletedAt` à null. Couvert par un test. |
| A3 | Perf | `useMessages` reconstruisait la liste du fil à chaque rendu quand aucun fil n'était chargé : un tableau vide recréé à chaque fois invalidait le `useMemo`, donc re-rendait tous les messages. Relevé par le lint lors du passage au socle React Native CLI. | Référence stable partagée. |

## Non corrigées — j'attends ton avis

| # | Module | Constat | Pourquoi je n'ai pas tranché |
|---|---|---|---|
| B1 | Socket | Le token d'authentification du socket n'est lu qu'à la connexion. Si Adam rafraîchit le token pendant une session longue, le socket garde l'ancien jusqu'à la prochaine reconnexion. | La correction propre est que le store d'Adam expose un événement « token rafraîchi ». C'est une interface entre nos deux périmètres, je ne la décide pas seul. |
| B2 | Socket / API | La resynchronisation après coupure envoie `since=<date ISO>`. Si le back attend un identifiant de message, rien ne remonte et le trou reste. | Question posée à Ibou dans `docs/API-CONTRACT.md`. Tant qu'il n'a pas répondu, corriger serait deviner. |
| B3 | Messagerie | `clientId` est indispensable à la déduplication. Si le back ne le renvoie pas dans `message:new`, un message envoyé par moi apparaîtra en double. | Même raison : dépend de la réponse d'Ibou. Le code est prêt des deux côtés, c'est le contrat qui manque. |
| B4 | Médias | La visionneuse plein écran n'a pas de zoom gestuel. | Cela demande `react-native-gesture-handler` et du travail de perf sur les Android d'entrée de gamme visés. Nouvelle dépendance : je ne l'ajoute pas sans ton accord. |
| B5 | Médias | Le téléchargement d'un fichier est délégué au système (`Linking.openURL`). Sur certains Android, un type MIME inconnu ouvre le navigateur au lieu d'enregistrer. | L'alternative demande une dépendance de plus et un dossier de destination à gérer. À arbitrer. |
| B9 | Socle | Images, fichiers, push et persistance de la file d'envoi attendent chacun une dépendance native. Le code métier est écrit et testé, seuls les adaptateurs manquent. | C'est la conséquence directe du socle « template blanc, rien d'autre que react-navigation » : ces quatre paquets sont à valider un par un. Détail dans `docs/DEPENDANCES-A-VALIDER.md`. |
| B6 | Groupes | Aucun événement socket n'existe pour l'ajout ou le retrait d'un membre : les autres membres ne voient le changement qu'au prochain chargement de l'écran. | Il manque un événement côté back (question 6 du contrat d'API). |
| B7 | Notifications | Le badge de l'icône est remis à jour à chaque changement des non-lus, mais pas quand l'app est tuée puis relancée sans réseau. | Il faudrait persister le dernier total connu. Faisable, mais c'est un choix produit : vaut-il mieux un badge périmé ou pas de badge ? |
| B8 | Tests | Pas encore de test d'intégration socket (reconnexion réelle, rejeu de la file d'émission). Les fonctions de fusion et la file d'envoi sont testées unitairement. | Cela demande un faux serveur socket.io ; à planifier si tu veux ce niveau de garantie. |

## Limites assumées (pas des anomalies)

- Pas d'indicateur « en train d'écrire » : hors périmètre backlog, et coûteux en
  données sur un forfait limité.
- Pas de chiffrement de bout en bout : ce n'est pas au backlog et ce serait une
  décision d'architecture, pas un correctif.
- Le mode mock (`apiConfig.useMocks`) reste actif par défaut tant que l'API
  d'Ibou n'est pas déployée.
- Pas de mise à jour OTA : le socle bare impose un build complet pour chaque
  correctif, même purement JavaScript.
