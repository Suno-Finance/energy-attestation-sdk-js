import type { Interface } from "ethers";
import type { TxReceipt } from "./transaction.js";

/**
 * Scan receipt logs for the first log whose topic0 matches the given event topic,
 * then parse and return it. Returns null if no matching log is found.
 * Avoids the try-catch-per-log pattern by filtering on topic0 first.
 */
export function findEventLog(
  receipt: TxReceipt,
  iface: Interface,
  topic0: string,
): ReturnType<Interface["parseLog"]> {
  const needle = topic0.toLowerCase();
  for (const log of receipt.logs) {
    if (log.topics[0]?.toLowerCase() !== needle) continue;
    const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
    if (parsed) return parsed;
  }
  return null;
}

/**
 * Scan receipt logs for all logs whose topic0 matches the given event topic,
 * parse each one, and return them as an array.
 * Used when a single transaction emits multiple events of the same type (e.g. multiAttest).
 */
export function findAllEventLogs(
  receipt: TxReceipt,
  iface: Interface,
  topic0: string,
): NonNullable<ReturnType<Interface["parseLog"]>>[] {
  const needle = topic0.toLowerCase();
  const results: NonNullable<ReturnType<Interface["parseLog"]>>[] = [];
  for (const log of receipt.logs) {
    if (log.topics[0]?.toLowerCase() !== needle) continue;
    const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
    if (parsed) results.push(parsed);
  }
  return results;
}
