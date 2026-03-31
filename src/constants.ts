export const ATTESTATION_SCHEMA =
  "uint64 projectId, uint32 readingCount, uint32 readingIntervalMinutes, uint256[] readings, uint64 fromTimestamp, string method, string metadataURI";

export const DEFAULT_ZERO_PERIOD_METHOD = "0 report";

// Event topic0 constants — keccak256 of canonical event signatures.
// Used to filter receipt logs before parsing, avoiding try-catch on every log.
export const TOPIC0_WATCHER_REGISTERED =
  "0x5a1597dfa7b145f29449939dab0f98ca4b4562846b9f80fccafb144e1af9e056"; // WatcherRegistered(uint64,string,address)
export const TOPIC0_PROJECT_REGISTERED =
  "0x26067c060a09434ccfebe6434048637b08a4bc8c48eab0587c0c090116e36cdc"; // ProjectRegistered(uint64,uint64,string,uint8)
export const TOPIC0_ATTESTED =
  "0x8bf46bf4cfd674fa735a3d63ec1c9ad4153f033c290341f3a588b75685141b35"; // Attested(address,address,bytes32,bytes32)

export const ENERGY_TYPE_NAMES: Record<number, string> = {
  0: "consumer",
  1: "solar_pv",
  2: "wind_onshore",
  3: "wind_offshore",
  4: "hydro",
  5: "biomass",
  6: "geothermal",
  7: "ocean_tidal",
  8: "nuclear",
  9: "natural_gas",
  10: "coal",
  11: "oil",
  12: "storage_discharge",
  13: "hydrogen_fuel_cell",
};
