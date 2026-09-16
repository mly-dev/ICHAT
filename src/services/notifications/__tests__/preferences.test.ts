/** ICH-112 : préférences de notification. */
import { notificationsApi } from '@/services/api';
import { notificationPreferences } from '@/services/notifications/preferences';

jest.mock('@/services/api', () => ({
  notificationsApi: { getPreferences: jest.fn(), updatePreferences: jest.fn() },
}));

const api = notificationsApi as jest.Mocked<typeof notificationsApi>;

beforeEach(async () => {
  jest.clearAllMocks();
  await notificationPreferences.__resetForTests();
});

describe('préférences de notification', () => {
  it('garde les valeurs par défaut quand le serveur est injoignable', async () => {
    api.getPreferences.mockRejectedValueOnce(new Error('hors ligne'));

    const preferences = await notificationPreferences.load();

    expect(preferences.enabled).toBe(true);
  });

  it('applique la valeur du serveur', async () => {
    api.getPreferences.mockResolvedValueOnce({
      enabled: false,
      directMessages: true,
      groupMessages: false,
    });

    const preferences = await notificationPreferences.load();

    expect(preferences.enabled).toBe(false);
    expect(preferences.groupMessages).toBe(false);
  });

  it('revient en arrière si le serveur refuse la mise à jour', async () => {
    api.updatePreferences.mockRejectedValueOnce(new Error('refus'));

    await expect(notificationPreferences.update({ enabled: false })).rejects.toThrow();
    expect(notificationPreferences.get().enabled).toBe(true);
  });

  it('coupe toutes les alertes quand les notifications sont désactivées', async () => {
    api.updatePreferences.mockResolvedValueOnce({
      enabled: false,
      directMessages: true,
      groupMessages: true,
    });

    await notificationPreferences.update({ enabled: false });

    expect(notificationPreferences.shouldNotify('direct')).toBe(false);
    expect(notificationPreferences.shouldNotify('group')).toBe(false);
  });

  it('respecte la coupure des seuls messages de groupe', async () => {
    api.updatePreferences.mockResolvedValueOnce({
      enabled: true,
      directMessages: true,
      groupMessages: false,
    });

    await notificationPreferences.update({ groupMessages: false });

    expect(notificationPreferences.shouldNotify('direct')).toBe(true);
    expect(notificationPreferences.shouldNotify('group')).toBe(false);
  });
});
