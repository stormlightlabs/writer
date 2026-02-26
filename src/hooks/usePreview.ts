import type { Cmd } from "$ports";
import { none, renderMarkdown } from "$ports";
import type { AppError, DocRef, RenderResult } from "$types";
import { useCallback, useMemo } from "react";
import { useCmdLoop } from "./useCmdLoop";

export type PreviewModel = {
  docRef: DocRef | null;
  renderResult: RenderResult | null;
  isLoading: boolean;
  error: AppError | null;
  syncLine: number;
};

export type UsePreviewReturn = {
  model: PreviewModel;
  dispatch: (msg: PreviewMsg) => void;
  render: (docRef: DocRef, text: string) => void;
  syncLine: (line: number) => void;
  setDoc: (docRef: DocRef | null) => void;
};

export const initialPreviewModel: PreviewModel = {
  docRef: null,
  renderResult: null,
  isLoading: false,
  error: null,
  syncLine: 1,
};

export type PreviewMsg =
  | { type: "RenderRequested"; docRef: DocRef; text: string }
  | { type: "RenderFinished"; success: boolean; result?: RenderResult; error?: AppError }
  | { type: "ScrollToLine"; line: number }
  | { type: "SyncFromEditor"; line: number }
  | { type: "DocChanged"; docRef: DocRef | null };

function isPreviewMsg(value: unknown): value is PreviewMsg {
  return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

export function updatePreview(model: PreviewModel, msg: PreviewMsg): [PreviewModel, Cmd] {
  switch (msg.type) {
    case "RenderRequested": {
      return [
        { ...model, docRef: msg.docRef, isLoading: true, error: null },
        renderMarkdown(
          msg.docRef.location_id,
          msg.docRef.rel_path,
          msg.text,
          undefined,
          (result: RenderResult) => ({ type: "RenderFinished", success: true, result }),
          (error) => ({ type: "RenderFinished", success: false, error }),
        ),
      ];
    }

    case "RenderFinished": {
      return [{
        ...model,
        renderResult: msg.success ? (msg.result ?? null) : null,
        isLoading: false,
        error: msg.error ?? null,
      }, none];
    }

    case "ScrollToLine": {
      return [{ ...model, syncLine: msg.line }, none];
    }

    case "SyncFromEditor": {
      return [{ ...model, syncLine: msg.line }, none];
    }

    case "DocChanged": {
      return [{ ...model, docRef: msg.docRef, renderResult: null, isLoading: false, error: null, syncLine: 1 }, none];
    }

    default: {
      return [model, none];
    }
  }
}

export function usePreview(): UsePreviewReturn {
  const { model, dispatch } = useCmdLoop(initialPreviewModel, updatePreview, isPreviewMsg);

  const render = useCallback((docRef: DocRef, text: string) => {
    dispatch({ type: "RenderRequested", docRef, text });
  }, [dispatch]);

  const syncLine = useCallback((line: number) => {
    dispatch({ type: "SyncFromEditor", line });
  }, [dispatch]);

  const setDoc = useCallback((docRef: DocRef | null) => {
    dispatch({ type: "DocChanged", docRef });
  }, [dispatch]);

  return useMemo(() => ({ model, dispatch, render, syncLine, setDoc }), [model, dispatch, render, syncLine, setDoc]);
}
