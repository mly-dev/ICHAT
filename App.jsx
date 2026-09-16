import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation';
import { stopNetworkMonitor } from '@/services/api';
import { startNotifications } from '@/services/notifications';
import { outbox } from '@/services/outbox';
import { socketClient, startSocketSync } from '@/services/socket';
import { connectOutboxToStore } from '@/store/messagesStore';
import { colors } from '@/theme';

export default function App() {
  useEffect(() => {
    // La file d'envoi reprend ce qui n'est jamais parti lors de la session
    // précédente : un message écrit sans réseau n'est pas perdu.
    const disconnectOutbox = connectOutboxToStore();
    void outbox.start();

    // Le socket ne parle qu'aux stores, jamais aux écrans.
    const stopSocketSync = startSocketSync();
    socketClient.connect();

    // Push : enregistrement du token, réception, badge et deep-link.
    const stopNotifications = startNotifications();

    return () => {
      stopNotifications();
      socketClient.disconnect();
      stopSocketSync();
      outbox.stop();
      disconnectOutbox();
      stopNetworkMonitor();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
