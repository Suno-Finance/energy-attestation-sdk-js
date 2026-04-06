import { describe, it, expect, vi } from "vitest";
import { sendTx, getTxOverrides } from "../../src/utils/transaction.js";
import { createMockContext } from "../helpers/mocks.js";

function makeReceipt(hash = "0xabc") {
  return { hash, logs: [] };
}

describe("getTxOverrides", () => {
  it("returns gasPrice-only overrides for legacy strategy", async () => {
    const ctx = createMockContext({ gasStrategy: "legacy" });
    (ctx.provider as unknown as { send: ReturnType<typeof vi.fn> }).send.mockResolvedValue(
      "0x12A05F200",
    ); // 5 gwei

    const overrides = await getTxOverrides(ctx);

    expect(overrides.gasPrice).toBe(10_000_000_000n); // 5 gwei * maxFeeMultiplier 2
    expect(overrides.maxFeePerGas).toBeUndefined();
    expect(overrides.maxPriorityFeePerGas).toBeUndefined();
  });

  it("returns EIP-1559 overrides for eip1559 strategy", async () => {
    const ctx = createMockContext({ gasStrategy: "eip1559" });
    (ctx.provider as unknown as { send: ReturnType<typeof vi.fn> }).send.mockResolvedValue({
      baseFeePerGas: "0x174876E800", // 100 gwei
    });

    const overrides = await getTxOverrides(ctx);

    expect(overrides.maxFeePerGas).toBeDefined();
    expect(overrides.maxPriorityFeePerGas).toBeDefined();
    expect(overrides.gasPrice).toBeUndefined();
  });

  it("uses minPriorityFeeGwei as the tip on eip1559 strategy", async () => {
    const ctx = createMockContext({
      gasStrategy: "eip1559",
      tx: { minPriorityFeeGwei: 25, maxFeeMultiplier: 1, retryCount: 0, retryDelayMs: 0 },
    });
    (ctx.provider as unknown as { send: ReturnType<typeof vi.fn> }).send.mockResolvedValue({
      baseFeePerGas: "0xBA43B7400", // 50 gwei
    });

    const overrides = await getTxOverrides(ctx);

    expect(overrides.maxPriorityFeePerGas).toBe(25_000_000_000n); // 25 gwei
    // maxFeePerGas = baseFee * multiplier(1) + tip = 50 gwei + 25 gwei
    expect(overrides.maxFeePerGas).toBe(75_000_000_000n);
  });

  it("applies maxFeeMultiplier to gasPrice on legacy strategy", async () => {
    const ctx = createMockContext({
      gasStrategy: "legacy",
      tx: { minPriorityFeeGwei: 0, maxFeeMultiplier: 3, retryCount: 0, retryDelayMs: 0 },
    });
    (ctx.provider as unknown as { send: ReturnType<typeof vi.fn> }).send.mockResolvedValue(
      "0x2540BE400",
    ); // 10 gwei

    const overrides = await getTxOverrides(ctx);

    expect(overrides.gasPrice).toBe(30_000_000_000n); // 10 gwei * 3
  });
});

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
    const ctx = createMockContext({
      tx: { minPriorityFeeGwei: 25, maxFeeMultiplier: 2, retryCount: 1, retryDelayMs: 0 },
    });
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
    const ctx = createMockContext({
      tx: { minPriorityFeeGwei: 25, maxFeeMultiplier: 2, retryCount: 3, retryDelayMs: 0 },
    });
    const call = vi.fn().mockRejectedValue({ data: "0xdeadbeef", message: "revert" });

    await expect(sendTx(call, ctx)).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("retries retryCount times then throws on final failure", async () => {
    const ctx = createMockContext({
      tx: { minPriorityFeeGwei: 25, maxFeeMultiplier: 2, retryCount: 2, retryDelayMs: 0 },
    });
    const call = vi.fn().mockRejectedValue(new Error("always fails"));

    await expect(sendTx(call, ctx)).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("retryCount: 0 (default) means exactly 1 attempt", async () => {
    const ctx = createMockContext({
      tx: { minPriorityFeeGwei: 25, maxFeeMultiplier: 2, retryCount: 0, retryDelayMs: 0 },
    });
    const call = vi.fn().mockRejectedValue(new Error("fail"));

    await expect(sendTx(call, ctx)).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(1);
  });
});
