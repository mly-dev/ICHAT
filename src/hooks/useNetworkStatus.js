import { useEffect, useState } from 'react';

import { isOnline, subscribeToNetwork } from '@/services/api';

/** État réseau réactif, branché sur la même source que le client API. */
export function useNetworkStatus() {
  const [online, setOnline] = useState(isOnline);
  useEffect(() => subscribeToNetwork(setOnline), []);
  return online;
}
