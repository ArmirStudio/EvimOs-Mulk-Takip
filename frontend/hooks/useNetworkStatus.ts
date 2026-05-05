import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus(): { isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected ?? true);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });

    return unsubscribe;
  }, []);

  return { isConnected };
}
