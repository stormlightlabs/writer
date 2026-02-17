/**
 * UseEditor hook
 *
 * Provides Elm-style state management for the Editor component.
 *
 * Features:
 * - Manages editor state (text, save status, cursor position)
 * - Handles debounced save requests
 * - Integrates with the ports system for backend communication
 */

import { useCallback, useState } from "react";
import type { AppError, Cmd, SaveResult } from "../ports";
import { docOpen, docSave, none, runCmd } from "../ports";
import type { DocContent, DocRef, SaveStatus } from "../types";

export interface EditorModel {
  docRef: DocRef | null;
  text: string;
  saveStatus: SaveStatus;
  cursorLine: number;
  cursorColumn: number;
  selectionFrom: number | null;
  selectionTo: number | null;
  isLoading: boolean;
  error: AppError | null;
}

export const initialEditorModel: EditorModel = {
  docRef: null,
  text: "",
  saveStatus: "Idle",
  cursorLine: 1,
  cursorColumn: 0,
  selectionFrom: null,
  selectionTo: null,
  isLoading: false,
  error: null,
};

export type EditorMsg =
  | { type: "EditorChanged"; text: string }
  | { type: "SaveRequested" }
  | { type: "SaveFinished"; success: boolean; result?: SaveResult; error?: AppError }
  | { type: "DocOpened"; doc: DocContent }
  | { type: "OpenDocRequested"; docRef: DocRef }
  | { type: "DocOpenFinished"; success: boolean; error?: AppError }
  | { type: "CursorMoved"; line: number; column: number }
  | { type: "SelectionChanged"; from: number; to: number | null };

export function updateEditor(model: EditorModel, msg: EditorMsg): [EditorModel, Cmd] {
  switch (msg.type) {
    case "EditorChanged": {
      if (model.text === msg.text) {
        return [model, none];
      }
      return [{ ...model, text: msg.text, saveStatus: model.saveStatus === "Saving" ? "Saving" : "Dirty" }, none];
    }

    case "SaveRequested": {
      if (!model.docRef || model.saveStatus === "Saving") {
        return [model, none];
      }
      return [
        { ...model, saveStatus: "Saving" },
        docSave(
          model.docRef.location_id,
          model.docRef.rel_path,
          model.text,
          (result: SaveResult) => ({ type: "SaveFinished", success: true, result }),
          (error) => ({ type: "SaveFinished", success: false, error }),
        ),
      ];
    }

    case "SaveFinished": {
      return [{ ...model, saveStatus: msg.success ? "Saved" : "Error", error: msg.error ?? null }, none];
    }

    case "OpenDocRequested": {
      return [
        { ...model, isLoading: true, error: null },
        docOpen(
          msg.docRef.location_id,
          msg.docRef.rel_path,
          (doc: DocContent) => ({ type: "DocOpened", doc }),
          (error) => ({ type: "DocOpenFinished", success: false, error }),
        ),
      ];
    }

    case "DocOpened": {
      return [{
        ...model,
        docRef: { location_id: msg.doc.meta.location_id, rel_path: msg.doc.meta.rel_path },
        text: msg.doc.text,
        saveStatus: "Saved",
        isLoading: false,
        error: null,
      }, none];
    }

    case "DocOpenFinished": {
      return [{ ...model, isLoading: false, error: msg.error ?? null }, none];
    }

    case "CursorMoved": {
      return [{ ...model, cursorLine: msg.line, cursorColumn: msg.column }, none];
    }

    case "SelectionChanged": {
      return [{ ...model, selectionFrom: msg.from, selectionTo: msg.to }, none];
    }

    default: {
      return [model, none];
    }
  }
}

export interface UseEditorReturn {
  model: EditorModel;
  dispatch: (msg: EditorMsg) => void;
  openDoc: (docRef: DocRef) => void;
  saveDoc: () => void;
}

/**
 * Hook for managing editor state with Elm-style architecture.
 */
export function useEditor(): UseEditorReturn {
  const [model, setModel] = useState<EditorModel>(initialEditorModel);

  const dispatch = useCallback((msg: EditorMsg) => {
    setModel((prevModel) => {
      const [newModel, cmd] = updateEditor(prevModel, msg);
      if (cmd.type !== "None") {
        runCmd(cmd);
      }
      return newModel;
    });
  }, []);

  const openDoc = useCallback((docRef: DocRef) => {
    dispatch({ type: "OpenDocRequested", docRef });
  }, [dispatch]);

  const saveDoc = useCallback(() => {
    dispatch({ type: "SaveRequested" });
  }, [dispatch]);

  return { model, dispatch, openDoc, saveDoc };
}
