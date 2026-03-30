import { describe, it, expect } from "vitest";
import { getEASAddress, getNetworkConfig, CHAIN_IDS } from "../src/networks.js";
import { Network } from "../src/types.js";
import { ConfigurationError } from "../src/errors.js";

describe("getEASAddress", () => {
  it("returns correct address for Polygon", () => {
    expect(getEASAddress(Network.POLYGON)).toBe("0x5E634ef5355f45A855d02D66eCD687b1502AF790");
  });

  it("returns correct address for Amoy", () => {
    expect(getEASAddress(Network.AMOY)).toBe("0xb101275a60d8bfb14529C421899aD7CA1Ae5B5Fc");
  });

  it("returns correct address for Celo", () => {
    expect(getEASAddress(Network.CELO)).toBe("0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92");
  });

  it("throws ConfigurationError for Alfajores (no EAS deployed)", () => {
    expect(() => getEASAddress(Network.ALFAJORES)).toThrow(ConfigurationError);
    expect(() => getEASAddress(Network.ALFAJORES)).toThrow("not yet deployed");
  });
});

describe("getNetworkConfig", () => {
  it("returns full config for Amoy (officially supported)", () => {
    const config = getNetworkConfig(Network.AMOY);
    expect(config.eas).toBe("0xb101275a60d8bfb14529C421899aD7CA1Ae5B5Fc");
    expect(config.registry).toBe("0xeD6fe3145c1a390114ebEeD03d24963D92c197B5");
    expect(config.schemaUID).toBe(
      "0x826d8672ade4ea0c0c2d7133e3095f010faa3b3dca331641835adbc7ac4384ce",
    );
    expect(config.defaultRpcUrl).toBe("https://rpc-amoy.polygon.technology");
    expect(config.schemaRegistry).toBeTruthy();
  });

  it("returns full config for Polygon (officially supported)", () => {
    const config = getNetworkConfig(Network.POLYGON);
    expect(config.eas).toBe("0x5E634ef5355f45A855d02D66eCD687b1502AF790");
    expect(config.registry).toBe("0x644Dd384FCF5d94da98Bf8F6F10C448426974d29");
    expect(config.schemaUID).toBe(
      "0xbca196f2a002d6c29cddd85eb41637d2804d50c5c37faae85c15b375253844ef",
    );
    expect(config.defaultRpcUrl).toBe("https://polygon-rpc.com");
  });

  it("returns full config for Celo (officially supported)", () => {
    const config = getNetworkConfig(Network.CELO);
    expect(config.eas).toBe("0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92");
    expect(config.registry).toBe("0x644Dd384FCF5d94da98Bf8F6F10C448426974d29");
    expect(config.schemaUID).toBe(
      "0xbca196f2a002d6c29cddd85eb41637d2804d50c5c37faae85c15b375253844ef",
    );
    expect(config.defaultRpcUrl).toBe("https://forno.celo.org");
  });

  it("returns empty EAS and null registry for Alfajores", () => {
    const config = getNetworkConfig(Network.ALFAJORES);
    expect(config.eas).toBe("");
    expect(config.registry).toBeNull();
    expect(config.schemaUID).toBeNull();
    expect(config.defaultRpcUrl).toBeTruthy();
  });

  it("returns a default RPC URL for every network", () => {
    for (const network of Object.values(Network)) {
      const config = getNetworkConfig(network);
      expect(config.defaultRpcUrl).toBeTruthy();
    }
  });

  it("includes chainId for every network", () => {
    for (const network of Object.values(Network)) {
      const config = getNetworkConfig(network);
      expect(typeof config.chainId).toBe("number");
      expect(config.chainId).toBeGreaterThan(0);
    }
  });
});

describe("CHAIN_IDS", () => {
  it("contains correct chain ID for Polygon", () => {
    expect(CHAIN_IDS[Network.POLYGON]).toBe(137);
  });

  it("contains correct chain ID for Amoy", () => {
    expect(CHAIN_IDS[Network.AMOY]).toBe(80002);
  });

  it("contains correct chain ID for Celo", () => {
    expect(CHAIN_IDS[Network.CELO]).toBe(42220);
  });

  it("contains correct chain ID for Alfajores", () => {
    expect(CHAIN_IDS[Network.ALFAJORES]).toBe(44787);
  });

  it("has an entry for every Network value", () => {
    for (const network of Object.values(Network)) {
      expect(CHAIN_IDS[network]).toBeDefined();
      expect(typeof CHAIN_IDS[network]).toBe("number");
    }
  });

  it("matches chainId in getNetworkConfig for every network", () => {
    for (const network of Object.values(Network)) {
      expect(CHAIN_IDS[network]).toBe(getNetworkConfig(network).chainId);
    }
  });
});
