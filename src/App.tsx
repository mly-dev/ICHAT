import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation';
import { startNetworkMonitor } from '@/services/api';
import { socketClient } from '@/services/socket';

export default function App() {
  useEffect(() => {
    // Une seule surveillance réseau pour toute l'app ; le socket s'y branche.
    const stopNetworkMonitor = startNetworkMonitor();
    socketClient.connect();
    return () => {
      socketClient.disconnect();
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
