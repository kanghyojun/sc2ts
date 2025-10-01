// Logger Configuration
import { configure, getConsoleSink, getLogger, type Logger } from "@logtape/logtape";

let isConfigured = false;

export async function configureLogger(): Promise<void> {
  if (isConfigured) return;

  await configure({
    sinks: {
      console: getConsoleSink(),
    },
    loggers: [
      { category: ["logtape", "meta"], sinks: ["console"], lowestLevel: "warning" },
      {
        category: "sc2ts",
        lowestLevel: process.env["NODE_ENV"] === "development" ? "debug" : "warning",
        sinks: ["console"],
      },
      {
        category: ["sc2ts", "cli"],
        lowestLevel: "debug",
        sinks: ["console"],
      },
    ],
  });

  isConfigured = true;
}

// Get logger instance for different modules
export function createLogger(category: string | string[]): Logger {
  const fullCategory = Array.isArray(category) ? ["sc2ts", ...category] : ["sc2ts", category];
  return getLogger(fullCategory);
}

// Lazy logger initialization for bundler compatibility
let _logger: Logger | undefined;

export function getDefaultLogger(): Logger {
  _logger ??= getLogger(["sc2ts"]);
  return _logger;
}
