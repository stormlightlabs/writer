import { LogLevel } from "$types";
import { attachConsole, debug, error, info, trace, warn } from "@tauri-apps/plugin-log";

type LogContext = Record<string, unknown>;

type Logger = {
  init: () => Promise<void>;
  trace: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
};

let initialized = false;

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatMessage(message: string, context?: LogContext): string {
  if (!context) {
    return message;
  }

  return `${message} | context=${safeStringify(context)}`;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  const formatted = formatMessage(message, context);
  const writer: Record<LogLevel, (msg: string) => Promise<void>> = { trace, debug, info, warn, error };
  void writer[level](formatted).catch(() => {});
}

export const logger: Logger = {
  async init() {
    if (initialized) {
      return;
    }

    initialized = true;
    await attachConsole().catch(() => {});
    write("info", "Frontend logging initialized");
  },

  trace(message, context) {
    write("trace", message, context);
  },

  debug(message, context) {
    write("debug", message, context);
  },

  info(message, context) {
    write("info", message, context);
  },

  warn(message, context) {
    write("warn", message, context);
  },

  error(message, context) {
    write("error", message, context);
  },
};
