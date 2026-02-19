import { useCallback, useState } from "react";
import type { Cmd } from "../ports";
import { none, renderMarkdown, runCmd } from "../ports";
import type { AppError, DocRef, RenderResult } from "../types";

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

export function updatePreview(model: PreviewModel, msg: PreviewMsg): [PreviewModel, Cmd] {
  switch (msg.type) {
    case "RenderRequested": {
      if (
        !model.docRef || model.docRef.location_id !== msg.docRef.location_id
        || model.docRef.rel_path !== msg.docRef.rel_path
      ) {
        return [model, none];
      }
      return [
        { ...model, isLoading: true, error: null },
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
  const [model, setModel] = useState<PreviewModel>(initialPreviewModel);

  const dispatch = useCallback((msg: PreviewMsg) => {
    setModel((prevModel) => {
      const [newModel, cmd] = updatePreview(prevModel, msg);
      if (cmd.type !== "None") {
        runCmd(cmd);
      }
      return newModel;
    });
  }, []);

  const render = useCallback((docRef: DocRef, text: string) => {
    dispatch({ type: "RenderRequested", docRef, text });
  }, [dispatch]);

  const syncLine = useCallback((line: number) => {
    dispatch({ type: "SyncFromEditor", line });
  }, [dispatch]);

  const setDoc = useCallback((docRef: DocRef | null) => {
    dispatch({ type: "DocChanged", docRef });
  }, [dispatch]);

  return { model, dispatch, render, syncLine, setDoc };
}
