import { Network } from "./types.js";

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
    registry: "0x059D4655941204cf6aaC1cF578Aa9dc5D3ed6B39",
    schemaUID: "0x4673141c77c3d54962edf6ef7f25a0c62656f9bd08138b4c4f9561413c235435",
    defaultRpcUrl: "https://rpc-amoy.polygon.technology",
    subgraphUrl:
      "https://gateway.thegraph.com/api/subgraphs/id/33b8nJcqxLyH96eSyyHC9vsdvHifUXejLzMEtqLeySBC",
    chainId: 80002,
  },
  [Network.POLYGON]: {
    eas: "0x5E634ef5355f45A855d02D66eCD687b1502AF790",
    schemaRegistry: "0x7876EEF51A891E737AF8ba5A5E0f0Fd29073D5a7",
    registry: "0xA5B5f895091d79d1f099531cDB8cb896F17ec4C1",
    schemaUID: "0xb9c136082a935b39c6e276ea137ac489bdc090aac17a116347c7ea90442ef7e0",
    defaultRpcUrl: "https://polygon-bor-rpc.publicnode.com",
    subgraphUrl:
      "https://gateway.thegraph.com/api/subgraphs/id/D8AgWoxUr3aDgWQCEy2hVeU8hnsrs5N3vmPSeGMphgEi",
    chainId: 137,
  },
  [Network.CELO]: {
    eas: "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92",
    schemaRegistry: "0x5ece93bE4BDCF293Ed61FA78698B594F2135AF34",
    registry: "0xA5B5f895091d79d1f099531cDB8cb896F17ec4C1",
    schemaUID: "0xb9c136082a935b39c6e276ea137ac489bdc090aac17a116347c7ea90442ef7e0",
    defaultRpcUrl: "https://forno.celo.org",
    subgraphUrl:
      "https://gateway.thegraph.com/api/subgraphs/id/9BM6kQzg7jtcbnphW7UXCGMmvJ2QtDkxnU8fqDYinUx1",
    chainId: 42220,
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
};

/**
 * Resolves the EAS contract address for a network.
 * Throws if EAS is not deployed on the given network.
 */
export function getEASAddress(network: Network): string {
  return NETWORK_CONFIG[network].eas;
}
