type LogContext = Record<string, unknown>;

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function f(message: string, context?: LogContext): string {
  if (!context) {
    return message;
  }

  return `${message} | context=${safeStringify(context)}`;
}
