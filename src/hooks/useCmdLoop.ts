import type { Cmd } from "$ports";
import { runCmd } from "$ports";
import { useCallback, useState } from "react";

export type UpdateFn<Model, Msg> = (model: Model, msg: Msg) => [Model, Cmd];

export function useCmdLoop<Model, Msg>(
  initialModel: Model,
  update: UpdateFn<Model, Msg>,
  isMsg: (value: unknown) => value is Msg,
): { model: Model; dispatch: (msg: Msg) => void } {
  const [model, setModel] = useState<Model>(initialModel);

  const dispatch = useCallback((msg: Msg) => {
    setModel((prevModel) => {
      const [nextModel, cmd] = update(prevModel, msg);

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

      return nextModel;
    });
  }, [isMsg, update]);

  return { model, dispatch };
}
