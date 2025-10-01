// Logger for sc2ts library
// Following LogTape best practices for library authors:
// https://logtape.org/manual/library
//
// Library authors should:
// 1. Use namespaced categories (starting with library name)
// 2. NOT call configure() - leave that to application developers
// 3. Simply use getLogger() with appropriate categories

import { getLogger, type Logger } from "@logtape/logtape";

/**
 * Creates a logger instance for a specific module within sc2ts.
 *
 * @param category - Module name or category path (will be prefixed with "sc2ts")
 * @returns Logger instance
 *
 * @example
 * ```typescript
 * const logger = getScLogger("mpq-archive");
 * logger.debug("Parsing MPQ header...");
 * ```
 */
export function getScLogger(category: string | string[]): Logger {
  const fullCategory = Array.isArray(category) ? ["sc2ts", ...category] : ["sc2ts", category];
  return getLogger(fullCategory);
}
