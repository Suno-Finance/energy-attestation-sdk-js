import { describe, it, expect, vi } from "vitest";
import { sendTx } from "../../src/utils/transaction.js";
import { createMockContext } from "../helpers/mocks.js";

function makeReceipt(hash = "0xabc") {
  return { hash, logs: [] };
}

describe("sendTx retry logic", () => {
  it("succeeds on first attempt (no retry)", async () => {
    const ctx = createMockContext();
    const receipt = makeReceipt();
    const call = vi.fn().mockResolvedValue({ wait: () => Promise.resolve(receipt) });

    const result = await sendTx(call, ctx);

    expect(result).toBe(receipt);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("retries once and succeeds on second attempt", async () => {
    const ctx = createMockContext({ tx: { minPriorityFeeGwei: 25, maxFeeMultiplier: 2, retryCount: 1, retryDelayMs: 0 } });
    const receipt = makeReceipt();
    const call = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient error"))
      .mockResolvedValueOnce({ wait: () => Promise.resolve(receipt) });

    const result = await sendTx(call, ctx);

    expect(result).toBe(receipt);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("does not retry when error has .data (contract revert)", async () => {
    const ctx = createMockContext({ tx: { minPriorityFeeGwei: 25, maxFeeMultiplier: 2, retryCount: 3, retryDelayMs: 0 } });
    const call = vi.fn().mockRejectedValue({ data: "0xdeadbeef", message: "revert" });

    await expect(sendTx(call, ctx)).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("retries retryCount times then throws on final failure", async () => {
    const ctx = createMockContext({ tx: { minPriorityFeeGwei: 25, maxFeeMultiplier: 2, retryCount: 2, retryDelayMs: 0 } });
    const call = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(sendTx(call, ctx)).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("retryCount: 0 (default) means exactly 1 attempt", async () => {
    const ctx = createMockContext({ tx: { minPriorityFeeGwei: 25, maxFeeMultiplier: 2, retryCount: 0, retryDelayMs: 0 } });
    const call = vi.fn().mockRejectedValue(new Error("fail"));

    await expect(sendTx(call, ctx)).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(1);
  });
});
