import { Network } from "./types.js";
import { ConfigurationError } from "./errors.js";

export interface NetworkConfig {
  /** EAS core contract address */
  eas: string;
  /** EAS SchemaRegistry contract address */
  schemaRegistry: string;
  /** EnergyRegistry contract address (null = not yet deployed) */
  registry: string | null;
  /** EAS schema UID for energy attestations (null = not yet registered) */
  schemaUID: string | null;
  /** Default public JSON-RPC endpoint */
  defaultRpcUrl: string;
  /** The Graph subgraph endpoint for this network (null = not yet deployed) */
  subgraphUrl: string | null;
  /** EVM chain ID for this network */
  chainId: number;
}

/**
 * Built-in network configurations.
 *
 * Networks with `registry: null` and `schemaUID: null` require the user to
 * provide those values explicitly via the SDK config. This happens when
 * the Energy Attestation Service contracts are not yet deployed on that network.
 */
const NETWORK_CONFIG: Record<Network, NetworkConfig> = {
  [Network.AMOY]: {
    eas: "0xb101275a60d8bfb14529C421899aD7CA1Ae5B5Fc",
    schemaRegistry: "0x23c5701A1BDa89C61d181BD79E5203c730708AE7",
    registry: "0xeD6fe3145c1a390114ebEeD03d24963D92c197B5",
    schemaUID: "0x826d8672ade4ea0c0c2d7133e3095f010faa3b3dca331641835adbc7ac4384ce",
    defaultRpcUrl: "https://rpc-amoy.polygon.technology",
    subgraphUrl:
      "https://gateway.thegraph.com/api/subgraphs/id/33b8nJcqxLyH96eSyyHC9vsdvHifUXejLzMEtqLeySBC",
    chainId: 80002,
  },
  [Network.POLYGON]: {
    eas: "0x5E634ef5355f45A855d02D66eCD687b1502AF790",
    schemaRegistry: "0x7876EEF51A891E737AF8ba5A5E0f0Fd29073D5a7",
    registry: "0x644Dd384FCF5d94da98Bf8F6F10C448426974d29",
    schemaUID: "0xbca196f2a002d6c29cddd85eb41637d2804d50c5c37faae85c15b375253844ef",
    defaultRpcUrl: "https://polygon-rpc.com",
    subgraphUrl:
      "https://gateway.thegraph.com/api/subgraphs/id/D8AgWoxUr3aDgWQCEy2hVeU8hnsrs5N3vmPSeGMphgEi",
    chainId: 137,
  },
  [Network.CELO]: {
    eas: "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92",
    schemaRegistry: "0x5ece93bE4BDCF293Ed61FA78698B594F2135AF34",
    registry: "0x644Dd384FCF5d94da98Bf8F6F10C448426974d29",
    schemaUID: "0xbca196f2a002d6c29cddd85eb41637d2804d50c5c37faae85c15b375253844ef",
    defaultRpcUrl: "https://forno.celo.org",
    subgraphUrl:
      "https://gateway.thegraph.com/api/subgraphs/id/9BM6kQzg7jtcbnphW7UXCGMmvJ2QtDkxnU8fqDYinUx1",
    chainId: 42220,
  },
  [Network.ALFAJORES]: {
    eas: "",
    schemaRegistry: "",
    registry: null,
    schemaUID: null,
    defaultRpcUrl: "https://alfajores-forno.celo-testnet.org",
    subgraphUrl: null,
    chainId: 44787,
  },
};

/** Returns the full network configuration for a given network. */
export function getNetworkConfig(network: Network): NetworkConfig {
  return NETWORK_CONFIG[network];
}

/**
 * EVM chain IDs for all supported networks.
 * Useful when integrating with MetaMask's `wallet_switchEthereumChain` or
 * when validating the connected network before submitting transactions.
 */
export const CHAIN_IDS: Record<Network, number> = {
  [Network.AMOY]: 80002,
  [Network.POLYGON]: 137,
  [Network.CELO]: 42220,
  [Network.ALFAJORES]: 44787,
};

/**
 * Resolves the EAS contract address for a network.
 * Throws if EAS is not deployed on the given network.
 */
export function getEASAddress(network: Network): string {
  const config = NETWORK_CONFIG[network];
  if (!config.eas) {
    throw new ConfigurationError(
      `EAS is not yet deployed on ${network}. Provide an explicit easAddress in your config.`,
    );
  }
  return config.eas;
}
