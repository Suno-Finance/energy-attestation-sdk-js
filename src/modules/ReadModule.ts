import type { SDKContext, Watcher, Project, ProjectStats, AttestationData } from "../types.js";
import { decodeAttestationData } from "../encoding.js";

export class ReadModule {
  constructor(private ctx: SDKContext) {}

  async getWatcher(watcherId: number | bigint): Promise<Watcher> {
    const result = await this.ctx.registry.getWatcher(watcherId);
    return {
      owner: result.owner as string,
      registered: result.registered as boolean,
      name: result.name as string,
    };
  }

  async getProject(projectId: number | bigint): Promise<Project> {
    const result = await this.ctx.registry.getProject(projectId);
    return {
      watcherId: BigInt(result.watcherId),
      registered: result.registered as boolean,
      energyType: Number(result.energyType),
      name: result.name as string,
    };
  }

  async isProjectRegistered(projectId: number | bigint): Promise<boolean> {
    return (await this.ctx.registry.isProjectRegistered(projectId)) as boolean;
  }

  async isWatcherRegistered(watcherId: number | bigint): Promise<boolean> {
    return (await this.ctx.registry.isWatcherRegistered(watcherId)) as boolean;
  }

  async getProjectLastTimestamp(projectId: number | bigint): Promise<bigint> {
    return BigInt(await this.ctx.registry.getProjectLastTimestamp(projectId));
  }

  async getTotalGeneratedEnergy(projectId: number | bigint): Promise<bigint> {
    return BigInt(await this.ctx.registry.getTotalGeneratedEnergy(projectId));
  }

  async getTotalConsumedEnergy(projectId: number | bigint): Promise<bigint> {
    return BigInt(await this.ctx.registry.getTotalConsumedEnergy(projectId));
  }

  async getTotalGeneratedEnergyByWatcher(watcherId: number | bigint): Promise<bigint> {
    return BigInt(await this.ctx.registry.getTotalGeneratedEnergyByWatcher(watcherId));
  }

  async getTotalConsumedEnergyByWatcher(watcherId: number | bigint): Promise<bigint> {
    return BigInt(await this.ctx.registry.getTotalConsumedEnergyByWatcher(watcherId));
  }

  async getWatcherProjects(watcherId: number | bigint): Promise<bigint[]> {
    const result = await this.ctx.registry.getWatcherProjects(watcherId);
    return (result as bigint[]).map((id) => BigInt(id));
  }

  async isProjectAttester(projectId: number | bigint, attester: string): Promise<boolean> {
    return (await this.ctx.registry.isProjectAttester(projectId, attester)) as boolean;
  }

  async isWatcherAttester(watcherId: number | bigint, attester: string): Promise<boolean> {
    return (await this.ctx.registry.isWatcherAttester(watcherId, attester)) as boolean;
  }

  async getProjectMetadataURI(projectId: number | bigint): Promise<string> {
    return (await this.ctx.registry.getProjectMetadataURI(projectId)) as string;
  }

  async getProjectEnergyType(projectId: number | bigint): Promise<number> {
    return Number(await this.ctx.registry.getProjectEnergyType(projectId));
  }

  async getReplacementUID(uid: string): Promise<string> {
    return (await this.ctx.registry.getReplacementUID(uid)) as string;
  }

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

  async getAttestedPeriodStartUID(
    projectId: number | bigint,
    fromTimestamp: number | bigint,
  ): Promise<string> {
    return (await this.ctx.registry.getAttestedPeriodStartUID(projectId, fromTimestamp)) as string;
  }

  async getNextProjectId(): Promise<bigint> {
    return BigInt(await this.ctx.registry.getNextProjectId());
  }

  async getNextWatcherId(): Promise<bigint> {
    return BigInt(await this.ctx.registry.getNextWatcherId());
  }

  async getProjectWatcherId(projectId: number | bigint): Promise<bigint> {
    return BigInt(await this.ctx.registry.getProjectWatcherId(projectId));
  }

  async getProjectType(projectId: number | bigint): Promise<number> {
    return Number(await this.ctx.registry.getProjectType(projectId));
  }

  async isAuthorizedResolver(resolver: string): Promise<boolean> {
    return (await this.ctx.registry.isAuthorizedResolver(resolver)) as boolean;
  }

  async isEnergyTypeRegistered(id: number): Promise<boolean> {
    return (await this.ctx.registry.isEnergyTypeRegistered(id)) as boolean;
  }

  async getEnergyTypeName(id: number): Promise<string> {
    return (await this.ctx.registry.getEnergyTypeName(id)) as string;
  }

  async getEnergyTypeAdmin(): Promise<string> {
    return (await this.ctx.registry.getEnergyTypeAdmin()) as string;
  }

  async getWatcherProjectsWithDetails(watcherId: number | bigint): Promise<Project[]> {
    const ids = await this.getWatcherProjects(watcherId);
    return Promise.all(ids.map((id) => this.getProject(id)));
  }

  async getAttestationData(uid: string): Promise<AttestationData> {
    const attestation = await this.ctx.eas.getAttestation(uid);
    return decodeAttestationData(attestation.data as string);
  }

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
