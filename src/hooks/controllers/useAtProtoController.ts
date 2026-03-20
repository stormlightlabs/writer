import { atprotoLogin, atprotoLogout, atprotoSessionStatus, runCmd } from "$ports";
import { useAtProtoUiState } from "$state/selectors";
import { showErrorToast, showSuccessToast } from "$state/stores/toasts";
import { f } from "$utils/serialize";
import * as logger from "@tauri-apps/plugin-log";
import { useCallback, useEffect } from "react";

export function useAtProtoController() {
  const {
    sheetMode,
    session,
    isHydrated,
    isPending,
    openLoginSheet,
    openSessionSheet,
    closeSheet,
    setSession,
    setHydrated,
    setPending,
  } = useAtProtoUiState();

  useEffect(() => {
    let isCancelled = false;

    void runCmd(atprotoSessionStatus((nextSession) => {
      if (isCancelled) {
        return;
      }

      setSession(nextSession);
      setHydrated(true);
    }, (error) => {
      if (isCancelled) {
        return;
      }

      logger.error(f("Failed to load AT Protocol session status", { error }));
      setSession(null);
      setHydrated(true);
    }));

    return () => {
      isCancelled = true;
    };
  }, [setHydrated, setSession]);

  const openAuthSheet = useCallback(() => {
    if (session) {
      openSessionSheet();
      return;
    }

    openLoginSheet();
  }, [openLoginSheet, openSessionSheet, session]);

  const handleLogin = useCallback((handle: string) => {
    const trimmedHandle = handle.trim();
    if (!trimmedHandle || isPending) {
      return;
    }

    setPending(true);
    void runCmd(atprotoLogin(trimmedHandle, (nextSession) => {
      setPending(false);
      setSession(nextSession);
      openSessionSheet();
      showSuccessToast(`Connected to Tangled as ${nextSession.handle}`);
    }, (error) => {
      setPending(false);
      logger.error(f("AT Protocol login failed", { handle: trimmedHandle, error }));
      showErrorToast(error.message);
    }));
  }, [isPending, openSessionSheet, setPending, setSession]);

  const handleLogout = useCallback(() => {
    if (isPending) {
      return;
    }

    setPending(true);
    void runCmd(atprotoLogout(() => {
      setPending(false);
      setSession(null);
      closeSheet();
      showSuccessToast("Disconnected from Tangled");
    }, (error) => {
      setPending(false);
      logger.error(f("AT Protocol logout failed", { error }));
      showErrorToast(error.message);
    }));
  }, [closeSheet, isPending, setPending, setSession]);

  return {
    sheetMode,
    session,
    isHydrated,
    isPending,
    openAuthSheet,
    openLoginSheet,
    openSessionSheet,
    closeSheet,
    handleLogin,
    handleLogout,
  };
}
