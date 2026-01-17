import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useOfflineStore } from "@/stores/offline";

export function useOfflineSync() {
  const { isOnline, setOnline } = useOfflineStore();

  // Subscribe to network state changes
  useEffect(() => {
    const handleNetworkChange = (state: any) => {
      // isInternetReachable can be null initially, treat as online in that case
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setOnline(online);
    };

    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);

    // Get initial state
    NetInfo.fetch().then(handleNetworkChange);

    return () => {
      unsubscribe();
    };
  }, [setOnline]);

  return {
    isOnline,
  };
}
