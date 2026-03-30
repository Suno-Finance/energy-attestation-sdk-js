export const ATTESTATION_SCHEMA =
  "uint64 projectId, uint32 readingCount, uint32 readingIntervalMinutes, uint256[] readings, uint64 fromTimestamp, string method, string metadataURI";

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
