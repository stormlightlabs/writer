import type { Cmd } from "$ports";
import { runCmd } from "$ports";
import { useCallback, useRef, useState } from "react";

export type UpdateFn<Model, Msg> = (model: Model, msg: Msg) => [Model, Cmd];

export function useCmdLoop<Model, Msg>(
  initialModel: Model,
  update: UpdateFn<Model, Msg>,
  isMsg: (value: unknown) => value is Msg,
): { model: Model; dispatch: (msg: Msg) => void } {
  const [model, setModel] = useState<Model>(initialModel);
  const modelRef = useRef<Model>(initialModel);

  const dispatch = useCallback((msg: Msg) => {
    const [nextModel, cmd] = update(modelRef.current, msg);
    modelRef.current = nextModel;
    setModel(nextModel);

    if (cmd.type === "Invoke") {
      const wrappedCmd: Cmd = {
        ...cmd,
        onOk: (value) => {
          const nextMsg = cmd.onOk(value);
          if (isMsg(nextMsg)) {
            dispatch(nextMsg);
          }
        },
        onErr: (error) => {
          const nextMsg = cmd.onErr(error);
          if (isMsg(nextMsg)) {
            dispatch(nextMsg);
          }
        },
      };

      void runCmd(wrappedCmd);
    } else if (cmd.type !== "None") {
      void runCmd(cmd);
    }
  }, [isMsg, update]);

  return { model, dispatch };
}
