import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation';
import { startNetworkMonitor } from '@/services/api';
import { outbox } from '@/services/outbox';
import { socketClient } from '@/services/socket';
import { connectOutboxToStore } from '@/store/messagesStore';

export default function App() {
  useEffect(() => {
    // Une seule surveillance réseau pour toute l'app ; le socket s'y branche.
    const stopNetworkMonitor = startNetworkMonitor();
    // La file d'envoi reprend ce qui n'est jamais parti lors de la session
    // précédente : un message écrit sans réseau n'est pas perdu.
    const disconnectOutbox = connectOutboxToStore();
    void outbox.start();
    socketClient.connect();

    return () => {
      socketClient.disconnect();
      outbox.stop();
      disconnectOutbox();
      stopNetworkMonitor();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
