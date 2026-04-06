import { describe, it, expect, vi } from "vitest";
import { JsonRpcProvider, Wallet } from "ethers";
import { EnergySDK, Network, ConfigurationError } from "../src/index.js";

const PRIVATE_KEY = "0x" + "ab".repeat(32);

describe("EnergySDK.fromPrivateKey", () => {
  describe("minimal init (auto-resolved config)", () => {
    it("creates SDK with just privateKey and network for Amoy", async () => {
      const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
        chainId: 80002n,
        name: "amoy",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
      });
      expect(sdk).toBeDefined();
      expect(sdk.address).toBe(new Wallet(PRIVATE_KEY).address);
      expect(sdk.signer).toBeDefined();
      expect(sdk.watchers).toBeDefined();
      expect(sdk.projects).toBeDefined();
      expect(sdk.attesters).toBeDefined();
      expect(sdk.attestations).toBeDefined();
      expect(sdk.read).toBeDefined();
      spy.mockRestore();
    });

    it("auto-resolves rpcUrl, registryAddress, schemaUID, and easAddress for Amoy", async () => {
      const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
        chainId: 80002n,
        name: "amoy",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
      });
      expect(sdk).toBeDefined();
      expect(sdk.provider).toBeDefined();
      spy.mockRestore();
    });
  });

  describe("networks without full deployment", () => {
    it("creates SDK with just privateKey and network for Polygon", async () => {
      const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
        chainId: 137n,
        name: "matic",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.POLYGON,
      });
      expect(sdk).toBeDefined();
      spy.mockRestore();
    });

    it("creates SDK with just privateKey and network for Celo", async () => {
      const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
        chainId: 42220n,
        name: "celo",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.CELO,
      });
      expect(sdk).toBeDefined();
      spy.mockRestore();
    });

    it("accepts Polygon with custom registryAddress and schemaUID", async () => {
      const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
        chainId: 137n,
        name: "matic",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.POLYGON,
        registryAddress: "0xA02034E7BA757370a022df7D7Ad7191fcB788281",
        schemaUID: "0x" + "cd".repeat(32),
      });
      expect(sdk).toBeDefined();
      spy.mockRestore();
    });

    it("accepts Celo with custom registryAddress and schemaUID", async () => {
      const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
        chainId: 42220n,
        name: "celo",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.CELO,
        registryAddress: "0xA02034E7BA757370a022df7D7Ad7191fcB788281",
        schemaUID: "0x" + "cd".repeat(32),
      });
      expect(sdk).toBeDefined();
      spy.mockRestore();
    });
  });

  describe("custom overrides on supported networks", () => {
    it("uses custom rpcUrl when provided", async () => {
      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
        rpcUrl: "https://my-custom-rpc.example.com",
      });
      expect(sdk).toBeDefined();
    });

    it("uses custom registryAddress when provided", async () => {
      const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
        chainId: 80002n,
        name: "amoy",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
        registryAddress: "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92",
      });
      expect(sdk).toBeDefined();
      spy.mockRestore();
    });

    it("uses custom schemaUID when provided", async () => {
      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
        schemaUID: "0x" + "ff".repeat(32),
      });
      expect(sdk).toBeDefined();
    });

    it("uses custom easAddress when provided", async () => {
      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
        easAddress: "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92",
      });
      expect(sdk).toBeDefined();
    });
  });

  describe("validation errors", () => {
    it("throws ConfigurationError for missing privateKey", async () => {
      await expect(
        EnergySDK.fromPrivateKey({
          privateKey: "",
          network: Network.AMOY,
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws when privateKey is invalid hex (ethers rejects it)", async () => {
      await expect(
        EnergySDK.fromPrivateKey({
          privateKey: "0x1234",
          network: Network.AMOY,
        }),
      ).rejects.toThrow();
    });

    it("throws ConfigurationError for invalid registryAddress", async () => {
      await expect(
        EnergySDK.fromPrivateKey({
          privateKey: PRIVATE_KEY,
          network: Network.AMOY,
          registryAddress: "not-an-address",
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError for invalid schemaUID format", async () => {
      await expect(
        EnergySDK.fromPrivateKey({
          privateKey: PRIVATE_KEY,
          network: Network.AMOY,
          schemaUID: "0xbad",
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError for invalid easAddress", async () => {
      await expect(
        EnergySDK.fromPrivateKey({
          privateKey: PRIVATE_KEY,
          network: Network.AMOY,
          easAddress: "not-an-address",
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError when RPC returns wrong chain ID", async () => {
      const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
        chainId: 1n, // mainnet instead of Amoy (80002)
        name: "mainnet",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);

      await expect(
        EnergySDK.fromPrivateKey({
          privateKey: PRIVATE_KEY,
          network: Network.AMOY,
        }),
      ).rejects.toThrow(ConfigurationError);

      spy.mockRestore();
    });

    it("succeeds when RPC returns the correct chain ID", async () => {
      const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
        chainId: 80002n, // Amoy
        name: "amoy",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);

      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
      });
      expect(sdk).toBeDefined();

      spy.mockRestore();
    });

    it("succeeds when RPC is unreachable (skips chain ID validation)", async () => {
      const spy = vi
        .spyOn(JsonRpcProvider.prototype, "getNetwork")
        .mockRejectedValue(new Error("network request failed"));

      const sdk = await EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
      });
      expect(sdk).toBeDefined();

      spy.mockRestore();
    });
  });
});

describe("EnergySDK sdk.network", () => {
  it("exposes network for fromPrivateKey with AMOY", async () => {
    const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 80002n,
      name: "amoy",
    } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
    const sdk = await EnergySDK.fromPrivateKey({ privateKey: PRIVATE_KEY, network: Network.AMOY });
    expect(sdk.network).toBe(Network.AMOY);
    spy.mockRestore();
  });

  it("exposes network for fromPrivateKey with POLYGON", async () => {
    const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 137n,
      name: "matic",
    } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
    const sdk = await EnergySDK.fromPrivateKey({
      privateKey: PRIVATE_KEY,
      network: Network.POLYGON,
    });
    expect(sdk.network).toBe(Network.POLYGON);
    spy.mockRestore();
  });

  it("exposes network for fromSigner", async () => {
    const provider = new JsonRpcProvider("https://rpc-amoy.polygon.technology");
    const signer = new Wallet(PRIVATE_KEY, provider);
    const sdk = await EnergySDK.fromSigner({ signer, network: Network.AMOY });
    expect(sdk.network).toBe(Network.AMOY);
  });
});

describe("EnergySDK assertSignerAddress", () => {
  it("does not throw when address matches (exact)", async () => {
    const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 80002n,
      name: "amoy",
    } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
    const sdk = await EnergySDK.fromPrivateKey({ privateKey: PRIVATE_KEY, network: Network.AMOY });
    expect(() => sdk.assertSignerAddress(sdk.address)).not.toThrow();
    spy.mockRestore();
  });

  it("does not throw when address matches (different case)", async () => {
    const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 80002n,
      name: "amoy",
    } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
    const sdk = await EnergySDK.fromPrivateKey({ privateKey: PRIVATE_KEY, network: Network.AMOY });
    expect(() => sdk.assertSignerAddress(sdk.address.toLowerCase())).not.toThrow();
    spy.mockRestore();
  });

  it("throws ConfigurationError when address does not match", async () => {
    const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 80002n,
      name: "amoy",
    } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
    const sdk = await EnergySDK.fromPrivateKey({ privateKey: PRIVATE_KEY, network: Network.AMOY });
    expect(() => sdk.assertSignerAddress("0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92")).toThrow(
      ConfigurationError,
    );
    spy.mockRestore();
  });

  it("throws ConfigurationError when expected is not a valid address", async () => {
    const spy = vi.spyOn(JsonRpcProvider.prototype, "getNetwork").mockResolvedValue({
      chainId: 80002n,
      name: "amoy",
    } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
    const sdk = await EnergySDK.fromPrivateKey({ privateKey: PRIVATE_KEY, network: Network.AMOY });
    expect(() => sdk.assertSignerAddress("not-an-address")).toThrow(ConfigurationError);
    spy.mockRestore();
  });
});

describe("EnergySDK.fromSigner validation", () => {
  it("throws ConfigurationError when signer is null", async () => {
    await expect(
      EnergySDK.fromSigner({ signer: null as never, network: Network.AMOY }),
    ).rejects.toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when signer is undefined", async () => {
    await expect(
      EnergySDK.fromSigner({ signer: undefined as never, network: Network.AMOY }),
    ).rejects.toThrow(ConfigurationError);
  });
});

describe("EnergySDK chain ID error handling", () => {
  it("re-throws non-transport errors from provider.getNetwork()", async () => {
    const spy = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockRejectedValue(new SyntaxError("unexpected token"));
    await expect(
      EnergySDK.fromPrivateKey({ privateKey: PRIVATE_KEY, network: Network.AMOY }),
    ).rejects.toThrow(SyntaxError);
    spy.mockRestore();
  });

  it("still succeeds when provider.getNetwork() throws a transport error", async () => {
    const spy = vi
      .spyOn(JsonRpcProvider.prototype, "getNetwork")
      .mockRejectedValue(new Error("network request failed"));
    const sdk = await EnergySDK.fromPrivateKey({ privateKey: PRIVATE_KEY, network: Network.AMOY });
    expect(sdk).toBeDefined();
    spy.mockRestore();
  });
});

describe("EnergySDK TxFeeConfig validation", () => {
  it("throws ConfigurationError when maxFeeMultiplier is 0", async () => {
    await expect(
      EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
        tx: { maxFeeMultiplier: 0 },
      }),
    ).rejects.toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when maxFeeMultiplier is 0.5", async () => {
    await expect(
      EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
        tx: { maxFeeMultiplier: 0.5 },
      }),
    ).rejects.toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when minPriorityFeeGwei is -1", async () => {
    await expect(
      EnergySDK.fromPrivateKey({
        privateKey: PRIVATE_KEY,
        network: Network.AMOY,
        tx: { minPriorityFeeGwei: -1 },
      }),
    ).rejects.toThrow(ConfigurationError);
  });

  it("succeeds when maxFeeMultiplier is exactly 1", async () => {
    const sdk = await EnergySDK.fromPrivateKey({
      privateKey: PRIVATE_KEY,
      network: Network.AMOY,
      tx: { maxFeeMultiplier: 1 },
    });
    expect(sdk).toBeDefined();
  });

  it("succeeds when minPriorityFeeGwei is 0", async () => {
    const sdk = await EnergySDK.fromPrivateKey({
      privateKey: PRIVATE_KEY,
      network: Network.AMOY,
      tx: { minPriorityFeeGwei: 0 },
    });
    expect(sdk).toBeDefined();
  });
});

describe("EnergySDK.fromSigner", () => {
  function createTestSigner(): Wallet {
    const provider = new JsonRpcProvider("https://rpc-amoy.polygon.technology");
    return new Wallet(PRIVATE_KEY, provider);
  }

  describe("happy path", () => {
    it("creates SDK from a signer with provider", async () => {
      const signer = createTestSigner();
      const sdk = await EnergySDK.fromSigner({
        signer,
        network: Network.AMOY,
      });
      expect(sdk).toBeDefined();
      expect(sdk.address).toBe(signer.address);
      expect(sdk.signer).toBe(signer);
      expect(sdk.provider).toBe(signer.provider);
    });

    it("exposes all modules", async () => {
      const signer = createTestSigner();
      const sdk = await EnergySDK.fromSigner({
        signer,
        network: Network.AMOY,
      });
      expect(sdk.watchers).toBeDefined();
      expect(sdk.projects).toBeDefined();
      expect(sdk.attesters).toBeDefined();
      expect(sdk.attestations).toBeDefined();
      expect(sdk.read).toBeDefined();
    });

    it("resolves address via getAddress()", async () => {
      const signer = createTestSigner();
      const sdk = await EnergySDK.fromSigner({
        signer,
        network: Network.AMOY,
      });
      const expected = await signer.getAddress();
      expect(sdk.address).toBe(expected);
    });

    it("accepts custom contract addresses", async () => {
      const signer = createTestSigner();
      const sdk = await EnergySDK.fromSigner({
        signer,
        network: Network.AMOY,
        registryAddress: "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92",
        schemaUID: "0x" + "ff".repeat(32),
        easAddress: "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92",
      });
      expect(sdk).toBeDefined();
    });

    it("works with Polygon network", async () => {
      const provider = new JsonRpcProvider("https://polygon-rpc.com");
      const signer = new Wallet(PRIVATE_KEY, provider);
      const spy = vi.spyOn(provider, "getNetwork").mockResolvedValue({
        chainId: 137n,
        name: "matic",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
      const sdk = await EnergySDK.fromSigner({
        signer,
        network: Network.POLYGON,
      });
      expect(sdk).toBeDefined();
      spy.mockRestore();
    });

    it("works with Celo network", async () => {
      const provider = new JsonRpcProvider("https://forno.celo.org");
      const spy = vi.spyOn(provider, "getNetwork").mockResolvedValue({
        chainId: 42220n,
        name: "celo",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);
      const signer = new Wallet(PRIVATE_KEY, provider);
      const sdk = await EnergySDK.fromSigner({
        signer,
        network: Network.CELO,
      });
      expect(sdk).toBeDefined();
      spy.mockRestore();
    });
  });

  describe("validation errors", () => {
    it("throws ConfigurationError when signer has no provider", async () => {
      const signer = new Wallet(PRIVATE_KEY);
      await expect(
        EnergySDK.fromSigner({
          signer,
          network: Network.AMOY,
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("rejects when signer.getAddress() throws", async () => {
      const provider = new JsonRpcProvider("https://rpc-amoy.polygon.technology");
      const signer = new Wallet(PRIVATE_KEY, provider);
      // Override getAddress to simulate a failing signer
      signer.getAddress = async () => {
        throw new Error("Signer disconnected");
      };

      await expect(EnergySDK.fromSigner({ signer, network: Network.AMOY })).rejects.toThrow(
        "Signer disconnected",
      );
    });

    it("throws ConfigurationError for invalid registryAddress", async () => {
      const signer = createTestSigner();
      await expect(
        EnergySDK.fromSigner({
          signer,
          network: Network.AMOY,
          registryAddress: "not-an-address",
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError for invalid schemaUID", async () => {
      const signer = createTestSigner();
      await expect(
        EnergySDK.fromSigner({
          signer,
          network: Network.AMOY,
          schemaUID: "0xbad",
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError for invalid easAddress", async () => {
      const signer = createTestSigner();
      await expect(
        EnergySDK.fromSigner({
          signer,
          network: Network.AMOY,
          easAddress: "not-an-address",
        }),
      ).rejects.toThrow(ConfigurationError);
    });

    it("throws ConfigurationError when wallet is on wrong chain", async () => {
      const provider = new JsonRpcProvider("https://rpc-amoy.polygon.technology");
      const signer = new Wallet(PRIVATE_KEY, provider);
      const spy = vi.spyOn(provider, "getNetwork").mockResolvedValue({
        chainId: 1n, // mainnet instead of Amoy (80002)
        name: "mainnet",
      } as Awaited<ReturnType<JsonRpcProvider["getNetwork"]>>);

      await expect(EnergySDK.fromSigner({ signer, network: Network.AMOY })).rejects.toThrow(
        ConfigurationError,
      );

      spy.mockRestore();
    });

    it("succeeds when provider is unreachable (skips chain ID validation)", async () => {
      const provider = new JsonRpcProvider("https://rpc-amoy.polygon.technology");
      const signer = new Wallet(PRIVATE_KEY, provider);
      const spy = vi
        .spyOn(provider, "getNetwork")
        .mockRejectedValue(new Error("network request failed"));

      const sdk = await EnergySDK.fromSigner({ signer, network: Network.AMOY });
      expect(sdk).toBeDefined();

      spy.mockRestore();
    });
  });
});
