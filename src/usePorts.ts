import type { Cmd } from "$ports";
import type { AppError } from "$types";
import { useCallback, useState } from "react";
import { runCmd } from "./ports";

type UsePortsState<T> = { data: T | null; error: AppError | null; loading: boolean };

type UsePortsReturn<T> = UsePortsState<T> & { execute: (cmd: Cmd) => Promise<void>; reset: () => void };

export function usePorts<T = unknown>(): UsePortsReturn<T> {
  const [state, setState] = useState<UsePortsState<T>>({ data: null, error: null, loading: false });

  const execute = useCallback(async (cmd: Cmd) => {
    if (cmd.type === "None") {
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await runCmd(cmd);
      setState((prev) => ({ ...prev, loading: false }));
    } catch (error) {
      setState({
        data: null,
        error: { code: "IO_ERROR", message: error instanceof Error ? error.message : String(error) },
        loading: false,
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return { ...state, execute, reset };
}
