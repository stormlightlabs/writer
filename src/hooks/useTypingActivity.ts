import { useCallback, useEffect, useRef, useState } from "react";

export type UseTypingActivityOptions = { idleTimeout?: number; onTypingStart?: () => void; onTypingEnd?: () => void };

export function useTypingActivity(
  options: UseTypingActivityOptions = {},
): { isTyping: boolean; handleTypingActivity: () => void } {
  const { idleTimeout = 2000, onTypingStart, onTypingEnd } = options;
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasTypingRef = useRef(false);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleTypingActivity = useCallback(() => {
    clearExistingTimeout();

    if (!wasTypingRef.current) {
      wasTypingRef.current = true;
      setIsTyping(true);
      onTypingStart?.();
    }

    timeoutRef.current = setTimeout(() => {
      wasTypingRef.current = false;
      setIsTyping(false);
      onTypingEnd?.();
    }, idleTimeout);
  }, [clearExistingTimeout, idleTimeout, onTypingStart, onTypingEnd]);

  useEffect(() => {
    return () => {
      clearExistingTimeout();
    };
  }, [clearExistingTimeout]);

  return { isTyping, handleTypingActivity };
}
