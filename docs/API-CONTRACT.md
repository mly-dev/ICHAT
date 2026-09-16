# Contrat d'API supposé — périmètre messagerie

⚠️ **Ce document est une hypothèse de travail, à valider avec Ibou.**
Rien ici n'est confirmé côté back. Toutes les routes sont regroupées dans
`src/services/api/endpoints.ts` et les réponses sont normalisées vers les types
de `src/types/models.ts` : si le contrat réel diffère, la correction se fait à
ces deux endroits, jamais dans les écrans.

Tant que `EXPO_PUBLIC_USE_MOCKS=1`, c'est `src/services/api/mock.ts` qui répond.

## Conventions supposées
- Authentification : `Authorization: Bearer <token>` (token fourni par le module d'Adam).
- Dates : ISO 8601 UTC.
- Pagination : curseur opaque, réponse `{ items, nextCursor, hasMore }`.
- Erreurs : `{ message: string }` avec le code HTTP adéquat.

## Conversations
| Méthode | Route | Rôle |
|---|---|---|
| GET | `/conversations?cursor&limit` | Liste triée par activité récente (ICH-013, ICH-016) |
| GET | `/conversations/:id` | Détail d'une conversation |
| POST | `/conversations/direct` `{ userId }` | Ouvre ou crée la conversation privée (ICH-019) |
| POST | `/conversations/:id/read` `{ lastMessageId }` | Marque comme lue (ICH-026) |

## Messages
| Méthode | Route | Rôle |
|---|---|---|
| GET | `/conversations/:id/messages?cursor&limit&since` | Historique paginé (ICH-021, ICH-023) ; `since` sert à la resynchronisation après coupure |
| POST | `/conversations/:id/messages` | Envoi (ICH-020, ICH-027, ICH-029, ICH-032) |
| DELETE | `/conversations/:id/messages/:messageId` | Suppression (ICH-028) |

Corps d'envoi :
```json
{
  "kind": "text | image | file",
  "text": "…",
  "attachmentIds": ["att_1"],
  "replyToId": "msg_12",
  "clientId": "loc_abc"
}
```

**`clientId` est indispensable** : c'est lui qui permet de réconcilier le message
optimiste affiché localement avec le message définitif reçu par socket, donc
d'éviter les doublons. Le back doit le renvoyer tel quel dans la réponse **et**
dans l'événement `message:new`.

## Pièces jointes
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/uploads` (multipart, champ `file`) | Renvoie un `MessageAttachment` |

Le front compresse les images avant envoi (largeur max 1280 px, qualité 0.6) et
refuse au-delà de 5 Mo (image) / 20 Mo (fichier).

## Groupes
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/groups` | Création (ICH-044) |
| GET | `/groups/:id` | Détail (ICH-046) |
| PATCH | `/groups/:id` | Modification du nom / de la description (ICH-046) |
| GET | `/groups/:id/members` | Liste des membres (ICH-047) |
| POST | `/groups/:id/members` `{ memberIds }` | Ajout de membres (ICH-045) |
| DELETE | `/groups/:id/members/:userId` | Retrait d'un membre |
| POST | `/groups/:id/leave` | Quitter le groupe (ICH-051) |

## Notifications (réception seulement — l'envoi est côté Ibou)
| Méthode | Route | Rôle |
|---|---|---|
| POST | `/notifications/devices` | Enregistre le device token (ICH-052) |
| DELETE | `/notifications/devices/:token` | Désenregistre |
| GET / PATCH | `/notifications/preferences` | Préférences (ICH-056) |

Charge utile push attendue (`data`), pour le deep-link (ICH-055) :
```json
{ "conversationId": "c1", "messageId": "m12", "type": "message" }
```

## Événements socket
Définis dans `src/services/socket/events.ts`.

Serveur → app :
- `message:new` `{ message }`
- `message:updated` `{ message }`
- `message:deleted` `{ conversationId, messageId }`
- `message:status` `{ conversationId, messageId, status }`
- `conversation:read` `{ conversationId, userId, lastReadMessageId }`
- `conversation:updated` `{ conversationId, unreadCount }`
- `group:updated` `{ conversationId, name }`

App → serveur :
- `conversation:join` `{ conversationId }`
- `conversation:leave` `{ conversationId }`
- `conversation:read` `{ conversationId, lastMessageId }`

## Questions ouvertes pour Ibou
1. Le `clientId` est-il bien renvoyé dans la réponse HTTP **et** dans `message:new` ?
2. Les statuts `delivered` / `read` sont-ils poussés par message ou par conversation ?
3. `since` accepte-t-il une date ou un identifiant de message ?
4. Quelle taille maximale acceptée par `/uploads` ?
5. L'authentification socket se fait-elle par `auth.token` à la connexion ?
6. Y a-t-il un événement lors de l'ajout/retrait d'un membre de groupe ?
