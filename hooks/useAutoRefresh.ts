import { useEffect } from "react";

export function useAutoRefresh(callback: () => void | Promise<void>, ms = 60000) {
  useEffect(() => {
    const timer = setInterval(() => {
      callback();
    }, ms);

    return () => clearInterval(timer);
  }, [callback, ms]);
}
