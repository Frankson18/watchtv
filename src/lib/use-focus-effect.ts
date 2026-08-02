import { useEffect } from "react";
import { usePathname } from "expo-router";

export function useFocusEffect(callback: () => void) {
  const pathname = usePathname();

  useEffect(() => {
    callback();
  }, [pathname, callback]);
}