import type { SDKContext, Watcher, Project, ProjectStats, AttestationData } from "../types.js";
import { decodeAttestationData } from "../encoding.js";

function toBigInt(value: bigint | number | string): bigint {
  return typeof value === "bigint" ? value : BigInt(value);
}

export class ReadModule {
  constructor(private ctx: SDKContext) {}

  /** Returns watcher metadata by watcher ID. */
  async getWatcher(watcherId: number | bigint): Promise<Watcher> {
    const result = await this.ctx.registry.getWatcher(watcherId);
    return {
      owner: result.owner as string,
      registered: result.registered as boolean,
      name: result.name as string,
    };
  }

  /** Returns project metadata by project ID. */
  async getProject(projectId: number | bigint): Promise<Project> {
    const result = await this.ctx.registry.getProject(projectId);
    return {
      watcherId: toBigInt(result.watcherId as bigint | number | string),
      registered: result.registered as boolean,
      energyType: Number(result.energyType),
      name: result.name as string,
    };
  }

  /** Checks whether a project is currently registered. */
  async isProjectRegistered(projectId: number | bigint): Promise<boolean> {
    return (await this.ctx.registry.isProjectRegistered(projectId)) as boolean;
  }

  /** Checks whether a watcher is currently registered. */
  async isWatcherRegistered(watcherId: number | bigint): Promise<boolean> {
    return (await this.ctx.registry.isWatcherRegistered(watcherId)) as boolean;
  }

  /** Returns the last attested timestamp (chain tip) for a project. */
  async getProjectLastTimestamp(projectId: number | bigint): Promise<bigint> {
    return toBigInt(await this.ctx.registry.getProjectLastTimestamp(projectId));
  }

  /** Returns cumulative generated energy (Wh) for a project. */
  async getTotalGeneratedEnergy(projectId: number | bigint): Promise<bigint> {
    return toBigInt(await this.ctx.registry.getTotalGeneratedEnergy(projectId));
  }

  /** Returns cumulative consumed energy (Wh) for a project. */
  async getTotalConsumedEnergy(projectId: number | bigint): Promise<bigint> {
    return toBigInt(await this.ctx.registry.getTotalConsumedEnergy(projectId));
  }

  /** Returns cumulative generated energy (Wh) across all projects under a watcher. */
  async getTotalGeneratedEnergyByWatcher(watcherId: number | bigint): Promise<bigint> {
    return toBigInt(await this.ctx.registry.getTotalGeneratedEnergyByWatcher(watcherId));
  }

  /** Returns cumulative consumed energy (Wh) across all projects under a watcher. */
  async getTotalConsumedEnergyByWatcher(watcherId: number | bigint): Promise<bigint> {
    return toBigInt(await this.ctx.registry.getTotalConsumedEnergyByWatcher(watcherId));
  }

  /** Returns all project IDs owned by a watcher. */
  async getWatcherProjects(watcherId: number | bigint): Promise<bigint[]> {
    const ids = (await this.ctx.registry.getWatcherProjects(watcherId)) as Array<
      bigint | number | string
    >;
    return ids.map(toBigInt);
  }

  /** Checks whether an address is authorized to attest for a project. */
  async isProjectAttester(projectId: number | bigint, attester: string): Promise<boolean> {
    return (await this.ctx.registry.isProjectAttester(projectId, attester)) as boolean;
  }

  /** Checks whether an address is authorized as a watcher-level attester. */
  async isWatcherAttester(watcherId: number | bigint, attester: string): Promise<boolean> {
    return (await this.ctx.registry.isWatcherAttester(watcherId, attester)) as boolean;
  }

  /** Returns metadata URI for a project (for example IPFS or HTTPS). */
  async getProjectMetadataURI(projectId: number | bigint): Promise<string> {
    return (await this.ctx.registry.getProjectMetadataURI(projectId)) as string;
  }

  /** Returns the normalized energy type ID for a project. */
  async getProjectEnergyType(projectId: number | bigint): Promise<number> {
    return Number(await this.ctx.registry.getProjectEnergyType(projectId));
  }

  /** Returns the replacement UID for an attestation, or zero hash if not replaced. */
  async getReplacementUID(uid: string): Promise<string> {
    return (await this.ctx.registry.getReplacementUID(uid)) as string;
  }

  /** Returns the attestation UID that exactly matches a project + [from,to) period. */
  async getAttestedPeriodUID(
    projectId: number | bigint,
    fromTimestamp: number | bigint,
    toTimestamp: number | bigint,
  ): Promise<string> {
    return (await this.ctx.registry.getAttestedPeriodUID(
      projectId,
      fromTimestamp,
      toTimestamp,
    )) as string;
  }

  /** Returns the attestation UID that starts at `fromTimestamp` for a project. */
  async getAttestedPeriodStartUID(
    projectId: number | bigint,
    fromTimestamp: number | bigint,
  ): Promise<string> {
    return (await this.ctx.registry.getAttestedPeriodStartUID(projectId, fromTimestamp)) as string;
  }

  /** Returns the next project ID that will be assigned on registration. */
  async getNextProjectId(): Promise<bigint> {
    return toBigInt(await this.ctx.registry.getNextProjectId());
  }

  /** Returns the next watcher ID that will be assigned on registration. */
  async getNextWatcherId(): Promise<bigint> {
    return toBigInt(await this.ctx.registry.getNextWatcherId());
  }

  /** Returns the watcher ID that owns a project. */
  async getProjectWatcherId(projectId: number | bigint): Promise<bigint> {
    return toBigInt(await this.ctx.registry.getProjectWatcherId(projectId));
  }

  /** Returns the raw project type value from the registry. */
  async getProjectType(projectId: number | bigint): Promise<number> {
    return Number(await this.ctx.registry.getProjectType(projectId));
  }

  /** Checks whether an address is an authorized resolver. */
  async isAuthorizedResolver(resolver: string): Promise<boolean> {
    return (await this.ctx.registry.isAuthorizedResolver(resolver)) as boolean;
  }

  /** Checks whether an energy type ID is registered. */
  async isEnergyTypeRegistered(id: number): Promise<boolean> {
    return (await this.ctx.registry.isEnergyTypeRegistered(id)) as boolean;
  }

  /** Returns the human-readable name for an energy type ID. */
  async getEnergyTypeName(id: number): Promise<string> {
    return (await this.ctx.registry.getEnergyTypeName(id)) as string;
  }

  /** Returns the address that administers energy type registration. */
  async getEnergyTypeAdmin(): Promise<string> {
    return (await this.ctx.registry.getEnergyTypeAdmin()) as string;
  }

  /** Returns full metadata for all projects owned by a watcher. */
  async getWatcherProjectsWithDetails(watcherId: number | bigint): Promise<Project[]> {
    const ids = await this.getWatcherProjects(watcherId);
    return Promise.all(ids.map((id) => this.getProject(id)));
  }

  /** Fetches an EAS attestation by UID and decodes its attestation payload. */
  async getAttestationData(uid: string): Promise<AttestationData> {
    const attestation = await this.ctx.eas.getAttestation(uid);
    return decodeAttestationData(attestation.data as string);
  }

  /** Returns a convenience aggregate with project metadata and key totals. */
  async getProjectStats(projectId: number | bigint): Promise<ProjectStats> {
    const [project, totalGenerated, totalConsumed, lastTimestamp, metadataURI] = await Promise.all([
      this.getProject(projectId),
      this.getTotalGeneratedEnergy(projectId),
      this.getTotalConsumedEnergy(projectId),
      this.getProjectLastTimestamp(projectId),
      this.getProjectMetadataURI(projectId),
    ]);
    return { project, totalGenerated, totalConsumed, lastTimestamp, metadataURI };
  }
}
