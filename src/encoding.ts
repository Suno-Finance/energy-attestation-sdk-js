import { AbiCoder } from "ethers";
import type { AttestParams, AttestationData } from "./types.js";

const coder = AbiCoder.defaultAbiCoder();

const ATTESTATION_TYPES = ["uint64", "uint32", "uint32", "uint256[]", "uint64", "string", "string"];

export function encodeAttestationData(params: AttestParams): string {
  return coder.encode(ATTESTATION_TYPES, [
    params.projectId,
    params.readings.length,
    params.readingIntervalMinutes,
    params.readings,
    params.fromTimestamp,
    params.method,
    params.metadataURI ?? "",
  ]);
}

export function decodeAttestationData(data: string): AttestationData {
  const [
    projectId,
    readingCount,
    readingIntervalMinutes,
    readings,
    fromTimestamp,
    method,
    metadataURI,
  ] = coder.decode(ATTESTATION_TYPES, data);
  return {
    projectId: BigInt(projectId),
    readingCount: Number(readingCount),
    readingIntervalMinutes: Number(readingIntervalMinutes),
    readings: (readings as bigint[]).map((r) => BigInt(r)),
    fromTimestamp: BigInt(fromTimestamp),
    method: method as string,
    metadataURI: metadataURI as string,
  };
}

export function computeToTimestamp(
  fromTimestamp: number,
  readingCount: number,
  readingIntervalMinutes: number,
): number {
  return fromTimestamp + readingCount * readingIntervalMinutes * 60;
}

export function sumReadings(readings: bigint[]): bigint {
  let total = 0n;
  for (const r of readings) total += r;
  return total;
}
