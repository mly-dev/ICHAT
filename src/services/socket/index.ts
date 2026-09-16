export { socketClient } from './socketClient';
export type {
  ClientEventName,
  ClientEvents,
  ServerEventName,
  ServerEvents,
  SocketStatus,
} from './events';
export {
  startSocketSync,
  resyncAfterReconnect,
  joinConversation,
  leaveConversation,
  markConversationAsRead,
} from './socketSync';
