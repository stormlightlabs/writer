import type { Cmd, SaveResult } from "$ports";
import { docOpen, docSave, none, runCmd } from "$ports";
import type { AppError, DocContent, DocRef, SaveStatus } from "$types";
import { useCallback, useMemo, useState } from "react";

export type EditorModel = {
  docRef: DocRef | null;
  text: string;
  saveStatus: SaveStatus;
  cursorLine: number;
  cursorColumn: number;
  selectionFrom: number | null;
  selectionTo: number | null;
  isLoading: boolean;
  error: AppError | null;
};

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
  | { type: "DraftDocInitialized"; docRef: DocRef }
  | { type: "NewDraftCreated"; docRef: DocRef }
  | { type: "DocOpened"; doc: DocContent }
  | { type: "OpenDocRequested"; docRef: DocRef }
  | { type: "DocOpenFinished"; success: boolean; error?: AppError; docRef?: DocRef }
  | { type: "CursorMoved"; line: number; column: number }
  | { type: "SelectionChanged"; from: number; to: number | null };

function isEditorMsg(value: unknown): value is EditorMsg {
  return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string";
}

function isGeneratedDraftPath(path: string): boolean {
  const filename = path.split("/").pop() ?? "";
  return /^untitled_\d{4}_\d{2}_\d{2}(?:_\d+)?\.md$/i.test(filename);
}

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

    case "DraftDocInitialized": {
      return [{ ...model, docRef: msg.docRef, saveStatus: "Dirty", error: null }, none];
    }

    case "NewDraftCreated": {
      return [{
        ...model,
        docRef: msg.docRef,
        text: "",
        saveStatus: "Dirty",
        cursorLine: 1,
        cursorColumn: 0,
        selectionFrom: null,
        selectionTo: null,
        isLoading: false,
        error: null,
      }, none];
    }

    case "OpenDocRequested": {
      return [
        { ...model, isLoading: true, error: null },
        docOpen(
          msg.docRef.location_id,
          msg.docRef.rel_path,
          (doc: DocContent) => ({ type: "DocOpened", doc }),
          (error) => ({ type: "DocOpenFinished", success: false, error, docRef: msg.docRef }),
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
      if (!msg.success && msg.error?.code === "NOT_FOUND" && msg.docRef && isGeneratedDraftPath(msg.docRef.rel_path)) {
        return [{
          ...model,
          docRef: msg.docRef,
          text: "",
          saveStatus: "Dirty",
          cursorLine: 1,
          cursorColumn: 0,
          selectionFrom: null,
          selectionTo: null,
          isLoading: false,
          error: null,
        }, none];
      }

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

export function useEditor(): UseEditorReturn {
  const [model, setModel] = useState<EditorModel>(initialEditorModel);

  const dispatch = useCallback((msg: EditorMsg) => {
    setModel((prevModel) => {
      const [newModel, cmd] = updateEditor(prevModel, msg);
      if (cmd.type !== "None") {
        if (cmd.type === "Invoke") {
          const wrappedCmd: Cmd = {
            ...cmd,
            onOk: (value) => {
              const nextMsg = cmd.onOk(value);
              if (isEditorMsg(nextMsg)) {
                dispatch(nextMsg);
              }
            },
            onErr: (error) => {
              const nextMsg = cmd.onErr(error);
              if (isEditorMsg(nextMsg)) {
                dispatch(nextMsg);
              }
            },
          };
          runCmd(wrappedCmd);
        } else {
          runCmd(cmd);
        }
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

  return useMemo(() => ({ model, dispatch, openDoc, saveDoc }), [model, dispatch, openDoc, saveDoc]);
}
