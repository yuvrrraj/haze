"use client";
import { useEffect, useRef, useState } from "react";

// mode "once" = disconnect after first visibility (lazy load)
// mode "toggle" = keep observing for play/pause (reels)
export function useIntersection(threshold = 0.1, mode: "once" | "toggle" = "once") {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (mode === "once") {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        } else {
          setIsVisible(entry.isIntersecting);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, mode]);

  return { ref, isVisible };
}
