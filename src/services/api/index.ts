export { apiClient } from './client';
export { apiConfig } from './config';
export { ApiError, toUserMessage } from './errors';
export type { ApiErrorKind } from './errors';
export { endpoints } from './endpoints';
export { isOnline, startNetworkMonitor, subscribeToNetwork, waitForOnline } from './network';

export { conversationsApi } from './conversations';
export { messagesApi } from './messages';
export type { ListMessagesParams, SendMessagePayload } from './messages';
export { uploadsApi } from './uploads';
export type { UploadSource, UploadOptions } from './uploads';
export { groupsApi } from './groups';
export type { CreateGroupPayload, UpdateGroupPayload } from './groups';
export { notificationsApi } from './notifications';
export type { NotificationPreferencesDto, RegisterDevicePayload } from './notifications';
