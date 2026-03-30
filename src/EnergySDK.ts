import {
  Contract,
  Interface,
  JsonRpcProvider,
  Wallet,
  isAddress,
  type AbstractSigner,
  type Provider,
} from "ethers";
import type { PrivateKeySDKConfig, SignerSDKConfig, SDKContext, TxFeeConfig } from "./types.js";
import { ConfigurationError } from "./errors.js";
import { getNetworkConfig } from "./networks.js";
import { ENERGY_REGISTRY_ABI } from "./abi/EnergyRegistry.js";
import { ENERGY_ATTESTATION_RESOLVER_ABI } from "./abi/EnergyAttestationResolver.js";
import { EAS_ABI } from "./abi/EAS.js";
import { WatcherModule } from "./modules/WatcherModule.js";
import { ProjectModule } from "./modules/ProjectModule.js";
import { AttesterModule } from "./modules/AttesterModule.js";
import { AttestationModule } from "./modules/AttestationModule.js";
import { ReadModule } from "./modules/ReadModule.js";

interface ResolvedAddresses {
  registryAddress: string;
  schemaUID: string;
  easAddress: string;
}

const DEFAULT_TX_POLICY: Required<TxFeeConfig> = {
  // Celo validators often reject low tips from generic wallet defaults.
  minPriorityFeeGwei: 25,
  maxFeeMultiplier: 2,
};

function resolveAddresses(
  network: PrivateKeySDKConfig["network"],
  overrides: { registryAddress?: string; schemaUID?: string; easAddress?: string },
): ResolvedAddresses {
  const networkConfig = getNetworkConfig(network);

  const registryAddress = overrides.registryAddress ?? networkConfig.registry;
  if (!registryAddress) {
    throw new ConfigurationError(
      `Energy Attestation Service contracts are not yet deployed on ${network}. ` +
        `Provide registryAddress and schemaUID for a custom deployment, or use a supported network.`,
    );
  }
  if (!isAddress(registryAddress)) {
    throw new ConfigurationError("registryAddress must be a valid Ethereum address");
  }

  const schemaUID = overrides.schemaUID ?? networkConfig.schemaUID;
  if (!schemaUID || !/^0x[0-9a-fA-F]{64}$/.test(schemaUID)) {
    throw new ConfigurationError(
      schemaUID
        ? "schemaUID must be a valid bytes32 hex string (0x + 64 hex chars)"
        : `No schema UID available for ${network}. ` +
          `Provide an explicit schemaUID for a custom deployment, or use a supported network.`,
    );
  }

  const easAddress = overrides.easAddress ?? networkConfig.eas;
  if (!easAddress) {
    throw new ConfigurationError(
      `EAS is not yet deployed on ${network}. Provide an explicit easAddress.`,
    );
  }
  if (!isAddress(easAddress)) {
    throw new ConfigurationError("easAddress must be a valid Ethereum address");
  }

  return { registryAddress, schemaUID, easAddress };
}

function buildContext(
  signer: AbstractSigner,
  provider: Provider,
  addresses: ResolvedAddresses,
  txOverrides?: TxFeeConfig,
): SDKContext {
  const registryInterface = new Interface(ENERGY_REGISTRY_ABI);
  const resolverInterface = new Interface(ENERGY_ATTESTATION_RESOLVER_ABI);

  const registry = new Contract(addresses.registryAddress, ENERGY_REGISTRY_ABI, signer);
  const eas = new Contract(addresses.easAddress, EAS_ABI, signer);

  return {
    registry,
    eas,
    schemaUID: addresses.schemaUID,
    registryInterface,
    resolverInterface,
    signer,
    provider,
    tx: { ...DEFAULT_TX_POLICY, ...txOverrides },
  };
}

export class EnergySDK {
  readonly provider: Provider;
  readonly signer: AbstractSigner;
  readonly address: string;
  readonly watchers: WatcherModule;
  readonly projects: ProjectModule;
  readonly attesters: AttesterModule;
  readonly attestations: AttestationModule;
  readonly read: ReadModule;

  private constructor(init: {
    signer: AbstractSigner;
    provider: Provider;
    address: string;
    ctx: SDKContext;
  }) {
    this.signer = init.signer;
    this.provider = init.provider;
    this.address = init.address;
    this.watchers = new WatcherModule(init.ctx);
    this.projects = new ProjectModule(init.ctx);
    this.attesters = new AttesterModule(init.ctx);
    this.attestations = new AttestationModule(init.ctx);
    this.read = new ReadModule(init.ctx);
  }

  /**
   * Create an SDK instance from a hex-encoded private key.
   * Use this for Node.js scripts, IoT devices, and backend services.
   */
  static async fromPrivateKey(config: PrivateKeySDKConfig): Promise<EnergySDK> {
    if (!config.privateKey) {
      throw new ConfigurationError("privateKey is required");
    }

    const networkConfig = getNetworkConfig(config.network);
    const rpcUrl = config.rpcUrl ?? networkConfig.defaultRpcUrl;
    if (!rpcUrl) {
      throw new ConfigurationError(
        `No default RPC URL available for ${config.network}. Provide an explicit rpcUrl.`,
      );
    }

    const addresses = resolveAddresses(config.network, config);
    const provider = new JsonRpcProvider(rpcUrl);

    try {
      const network = await provider.getNetwork();
      const expectedChainId = BigInt(networkConfig.chainId);
      if (network.chainId !== expectedChainId) {
        throw new ConfigurationError(
          `RPC endpoint returned chain ID ${network.chainId}, expected ${networkConfig.chainId} for network "${config.network}". ` +
            `Check that your rpcUrl points to the correct network.`,
        );
      }
    } catch (error) {
      if (error instanceof ConfigurationError) throw error;
      // RPC unreachable or provider error — skip chain ID validation
    }

    const wallet = new Wallet(config.privateKey, provider);
    const ctx = buildContext(wallet, provider, addresses, config.tx);

    return new EnergySDK({ signer: wallet, provider, address: wallet.address, ctx });
  }

  /**
   * Create an SDK instance from an ethers AbstractSigner (e.g. from BrowserProvider.getSigner()).
   * Use this for browser wallets (MetaMask, WalletConnect, etc.) and multisig signers.
   */
  static async fromSigner(config: SignerSDKConfig): Promise<EnergySDK> {
    if (!config.signer) {
      throw new ConfigurationError("signer is required");
    }
    if (!config.signer.provider) {
      throw new ConfigurationError(
        "signer must have an attached provider. " +
          "Use new BrowserProvider(window.ethereum).getSigner() or connect your signer to a provider.",
      );
    }

    const networkConfig = getNetworkConfig(config.network);
    try {
      const { chainId } = await config.signer.provider.getNetwork();
      const expectedChainId = BigInt(networkConfig.chainId);
      if (chainId !== expectedChainId) {
        throw new ConfigurationError(
          `Wallet is connected to chain ${chainId}, expected ${networkConfig.chainId} for network "${config.network}". ` +
            `Switch your wallet to the correct network before initializing the SDK.`,
        );
      }
    } catch (error) {
      if (error instanceof ConfigurationError) throw error;
      // Provider unreachable — skip chain ID validation
    }

    const addresses = resolveAddresses(config.network, config);
    const address = await config.signer.getAddress();
    const ctx = buildContext(config.signer, config.signer.provider, addresses, config.tx);

    return new EnergySDK({
      signer: config.signer,
      provider: config.signer.provider,
      address,
      ctx,
    });
  }
}
