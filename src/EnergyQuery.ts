import { ConfigurationError } from "./errors.js";
import { getNetworkConfig } from "./networks.js";
import type {
  EnergyQueryConfig,
  SubgraphProtocol,
  SubgraphEnergyType,
  SubgraphWatcher,
  SubgraphWatcherDetail,
  SubgraphProject,
  SubgraphEnergyAttestation,
  SubgraphDailySnapshot,
  SubgraphProjectAttester,
  SubgraphWatcherAttester,
  SubgraphWatcherOwnershipTransfer,
  WatcherFilters,
  ProjectFilters,
  AttestationFilters,
  DailySnapshotFilters,
  AttesterFilters,
  PageResult,
} from "./query-types.js";

export class EnergyQuery {
  private readonly url: string;
  private readonly headers: Record<string, string>;

  constructor(config: EnergyQueryConfig) {
    const networkConfig = getNetworkConfig(config.network);
    const url = config.subgraphUrl ?? networkConfig.subgraphUrl;

    if (!url) {
      throw new ConfigurationError(
        `No subgraph URL available for ${config.network}. ` +
          `Provide an explicit subgraphUrl in your config, or use a network with a deployed subgraph.`,
      );
    }

    this.url = url;
    this.headers = { "Content-Type": "application/json" };

    if (config.apiKey) {
      this.headers["Authorization"] = `Bearer ${config.apiKey}`;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal GraphQL client
  // ---------------------------------------------------------------------------

  private async query<T>(gql: string, variables?: Record<string, unknown>): Promise<T> {
    const queryName = gql.match(/query\s+(\w+)/)?.[1] ?? "unknown";
    let response: Response;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    try {
      response = await fetch(this.url, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ query: gql, variables }),
        signal: controller.signal,
      });
    } catch (err) {
      throw new Error(`Subgraph request failed (query: ${queryName}): ${String(err)}`, {
        cause: err,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(
        `Subgraph HTTP ${response.status} error for query ${queryName}: ${response.statusText}`,
      );
    }

    const json = (await response.json()) as {
      data?: T;
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      throw new Error(
        `Subgraph query error (${queryName}): ${json.errors.map((e) => e.message).join(", ")}`,
      );
    }

    if (!json.data) {
      throw new Error(`Subgraph returned empty data for query ${queryName}`);
    }

    return json.data;
  }

  // ---------------------------------------------------------------------------
  // Protocol
  // ---------------------------------------------------------------------------

  /** Returns global protocol stats (total watchers, projects, energy). */
  async getProtocol(): Promise<SubgraphProtocol | null> {
    const data = await this.query<{ protocol: SubgraphProtocol | null }>(`
      {
        protocol(id: "protocol") {
          totalWatchers
          totalProjects
          totalAttestations
          totalGeneratedWh
          totalConsumedWh
          energyTypeAdmin
        }
      }
    `);
    return data.protocol;
  }

  // ---------------------------------------------------------------------------
  // Energy types
  // ---------------------------------------------------------------------------

  /** Returns all registered energy types. */
  async getEnergyTypes(): Promise<SubgraphEnergyType[]> {
    const data = await this.query<{ energyTypes: SubgraphEnergyType[] }>(`
      {
        energyTypes(first: 50, orderBy: id, orderDirection: asc) {
          id
          name
          registered
          totalGeneratedWh
        }
      }
    `);
    return data.energyTypes;
  }

  // ---------------------------------------------------------------------------
  // Watchers
  // ---------------------------------------------------------------------------

  /**
   * Returns a single watcher by ID, including its projects, attesters,
   * and ownership history.
   */
  async getWatcher(id: string): Promise<SubgraphWatcherDetail | null> {
    const data = await this.query<{ watcher: SubgraphWatcherDetail | null }>(
      `query GetWatcher($id: ID!) {
        watcher(id: $id) {
          id
          name
          owner
          registered
          totalGeneratedWh
          totalConsumedWh
          projectCount
          createdAt
          createdAtBlock
          projects(first: 100, orderBy: createdAt, orderDirection: asc) {
            id
            name
            registered
            totalGeneratedWh
            totalConsumedWh
            lastToTimestamp
            metadataURI
            attestationCount
            energyType { id name }
          }
          watcherAttesters(first: 100) {
            id
            attester
            active
            addedAt
            addedAtBlock
          }
          ownershipHistory(orderBy: timestamp, orderDirection: asc) {
            id
            previousOwner
            newOwner
            timestamp
            blockNumber
            txHash
          }
        }
      }`,
      { id },
    );
    return data.watcher;
  }

  /** Returns a list of watchers with optional filtering and pagination. */
  async getWatchers(filters: WatcherFilters = {}): Promise<PageResult<SubgraphWatcher>> {
    const {
      first = 100,
      skip = 0,
      orderBy = "createdAt",
      orderDirection = "desc",
      registered,
      owner,
    } = filters;

    const where: Record<string, unknown> = {};
    if (registered !== undefined) where["registered"] = registered;
    if (owner) where["owner"] = owner.toLowerCase();

    const data = await this.query<{ watchers: SubgraphWatcher[] }>(
      `query GetWatchers($first: Int, $skip: Int, $orderBy: Watcher_orderBy, $orderDirection: OrderDirection, $where: Watcher_filter) {
        watchers(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection, where: $where) {
          id
          name
          owner
          registered
          totalGeneratedWh
          totalConsumedWh
          projectCount
          createdAt
          createdAtBlock
        }
      }`,
      { first: first + 1, skip, orderBy, orderDirection, where },
    );
    const hasMore = data.watchers.length > first;
    return { items: hasMore ? data.watchers.slice(0, first) : data.watchers, hasMore };
  }

  /** Async generator that pages through all watchers matching the given filters. */
  async *iterateWatchers(
    filters: Omit<WatcherFilters, "skip"> = {},
  ): AsyncGenerator<SubgraphWatcher> {
    const first = filters.first ?? 100;
    let skip = 0;
    while (true) {
      const result = await this.getWatchers({ ...filters, first, skip });
      yield* result.items;
      if (!result.hasMore) break;
      skip += first;
    }
  }

  /** Returns the full ownership transfer history for a watcher. */
  async getWatcherOwnershipHistory(watcherId: string): Promise<SubgraphWatcherOwnershipTransfer[]> {
    const data = await this.query<{
      watcherOwnershipTransfers: SubgraphWatcherOwnershipTransfer[];
    }>(
      `query GetOwnershipHistory($watcherId: String!) {
        watcherOwnershipTransfers(
          where: { watcher: $watcherId }
          orderBy: timestamp
          orderDirection: asc
        ) {
          id
          previousOwner
          newOwner
          timestamp
          blockNumber
          txHash
          watcher { id name }
        }
      }`,
      { watcherId },
    );
    return data.watcherOwnershipTransfers;
  }

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  /** Returns a single project by ID. */
  async getProject(id: string): Promise<SubgraphProject | null> {
    const data = await this.query<{ project: SubgraphProject | null }>(
      `query GetProject($id: ID!) {
        project(id: $id) {
          id
          name
          registered
          totalGeneratedWh
          totalConsumedWh
          lastToTimestamp
          metadataURI
          attestationCount
          createdAt
          createdAtBlock
          watcher { id name }
          energyType { id name }
        }
      }`,
      { id },
    );
    return data.project;
  }

  /** Returns a list of projects with optional filtering and pagination. */
  async getProjects(filters: ProjectFilters = {}): Promise<PageResult<SubgraphProject>> {
    const {
      first = 100,
      skip = 0,
      orderBy = "createdAt",
      orderDirection = "desc",
      watcherId,
      energyTypeId,
      registered,
    } = filters;

    const where: Record<string, unknown> = {};
    if (watcherId !== undefined) where["watcher"] = watcherId;
    if (registered !== undefined) where["registered"] = registered;
    if (energyTypeId !== undefined) {
      // consumers have energyType = null in the subgraph
      where["energyType"] = energyTypeId === "0" ? null : energyTypeId;
    }

    const data = await this.query<{ projects: SubgraphProject[] }>(
      `query GetProjects($first: Int, $skip: Int, $orderBy: Project_orderBy, $orderDirection: OrderDirection, $where: Project_filter) {
        projects(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection, where: $where) {
          id
          name
          registered
          totalGeneratedWh
          totalConsumedWh
          lastToTimestamp
          metadataURI
          attestationCount
          createdAt
          createdAtBlock
          watcher { id name }
          energyType { id name }
        }
      }`,
      { first: first + 1, skip, orderBy, orderDirection, where },
    );
    const hasMore = data.projects.length > first;
    return { items: hasMore ? data.projects.slice(0, first) : data.projects, hasMore };
  }

  /** Async generator that pages through all projects matching the given filters. */
  async *iterateProjects(
    filters: Omit<ProjectFilters, "skip"> = {},
  ): AsyncGenerator<SubgraphProject> {
    const first = filters.first ?? 100;
    let skip = 0;
    while (true) {
      const result = await this.getProjects({ ...filters, first, skip });
      yield* result.items;
      if (!result.hasMore) break;
      skip += first;
    }
  }

  // ---------------------------------------------------------------------------
  // Attestations
  // ---------------------------------------------------------------------------

  /** Returns a single energy attestation by its EAS UID. */
  async getAttestation(uid: string): Promise<SubgraphEnergyAttestation | null> {
    const data = await this.query<{
      energyAttestation: SubgraphEnergyAttestation | null;
    }>(
      `query GetAttestation($id: ID!) {
        energyAttestation(id: $id) {
          id
          fromTimestamp
          toTimestamp
          energyWh
          attester
          metadataURI
          readings
          replaced
          replacedBy { id }
          replaces { id }
          blockTimestamp
          blockNumber
          txHash
          project { id name }
          energyType { id name }
        }
      }`,
      { id: uid },
    );
    return data.energyAttestation;
  }

  /** Returns a list of energy attestations with optional filtering and pagination. */
  async getAttestations(
    filters: AttestationFilters = {},
  ): Promise<PageResult<SubgraphEnergyAttestation>> {
    const {
      first = 100,
      skip = 0,
      orderBy = "fromTimestamp",
      orderDirection = "asc",
      projectId,
      attester,
      replaced,
      fromTimestamp_gte,
      fromTimestamp_lte,
      toTimestamp_gte,
      toTimestamp_lte,
      energyTypeId,
    } = filters;

    const where: Record<string, unknown> = {};
    if (projectId !== undefined) where["project"] = projectId;
    if (attester) where["attester"] = attester.toLowerCase();
    if (replaced !== undefined) where["replaced"] = replaced;
    if (fromTimestamp_gte) where["fromTimestamp_gte"] = fromTimestamp_gte;
    if (fromTimestamp_lte) where["fromTimestamp_lte"] = fromTimestamp_lte;
    if (toTimestamp_gte) where["toTimestamp_gte"] = toTimestamp_gte;
    if (toTimestamp_lte) where["toTimestamp_lte"] = toTimestamp_lte;
    if (energyTypeId !== undefined) {
      where["energyType"] = energyTypeId === "0" ? null : energyTypeId;
    }

    const data = await this.query<{
      energyAttestations: SubgraphEnergyAttestation[];
    }>(
      `query GetAttestations($first: Int, $skip: Int, $orderBy: EnergyAttestation_orderBy, $orderDirection: OrderDirection, $where: EnergyAttestation_filter) {
        energyAttestations(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection, where: $where) {
          id
          fromTimestamp
          toTimestamp
          energyWh
          attester
          metadataURI
          readings
          replaced
          replacedBy { id }
          replaces { id }
          blockTimestamp
          blockNumber
          txHash
          project { id name }
          energyType { id name }
        }
      }`,
      { first: first + 1, skip, orderBy, orderDirection, where },
    );
    const hasMore = data.energyAttestations.length > first;
    return {
      items: hasMore ? data.energyAttestations.slice(0, first) : data.energyAttestations,
      hasMore,
    };
  }

  /** Async generator that pages through all attestations matching the given filters. */
  async *iterateAttestations(
    filters: Omit<AttestationFilters, "skip"> = {},
  ): AsyncGenerator<SubgraphEnergyAttestation> {
    const first = filters.first ?? 100;
    let skip = 0;
    while (true) {
      const result = await this.getAttestations({ ...filters, first, skip });
      yield* result.items;
      if (!result.hasMore) break;
      skip += first;
    }
  }

  // ---------------------------------------------------------------------------
  // Daily snapshots
  // ---------------------------------------------------------------------------

  /**
   * Returns daily energy snapshots for a project.
   * Useful for building charts and analytics dashboards.
   */
  async getDailySnapshots(filters: DailySnapshotFilters): Promise<SubgraphDailySnapshot[]> {
    const { projectId, dateFrom, dateTo, first = 365, skip = 0, orderDirection = "asc" } = filters;

    const where: Record<string, unknown> = { project: projectId };
    if (dateFrom) where["date_gte"] = dateFrom;
    if (dateTo) where["date_lte"] = dateTo;

    const data = await this.query<{
      dailyEnergySnapshots: SubgraphDailySnapshot[];
    }>(
      `query GetDailySnapshots($first: Int, $skip: Int, $orderDirection: OrderDirection, $where: DailyEnergySnapshot_filter) {
        dailyEnergySnapshots(first: $first, skip: $skip, orderBy: date, orderDirection: $orderDirection, where: $where) {
          id
          date
          timestamp
          generatedWh
          consumedWh
          attestationCount
          project { id name }
        }
      }`,
      { first, skip, orderDirection, where },
    );
    return data.dailyEnergySnapshots;
  }

  /** Async generator that pages through all daily snapshots matching the given filters. */
  async *iterateDailySnapshots(
    filters: Omit<DailySnapshotFilters, "skip">,
  ): AsyncGenerator<SubgraphDailySnapshot> {
    const first = filters.first ?? 365;
    let skip = 0;
    while (true) {
      const items = await this.getDailySnapshots({ ...filters, first: first + 1, skip });
      const hasMore = items.length > first;
      yield* hasMore ? items.slice(0, first) : items;
      if (!hasMore) break;
      skip += first;
    }
  }

  // ---------------------------------------------------------------------------
  // Attesters
  // ---------------------------------------------------------------------------

  /** Returns the list of attesters authorized for a specific project. */
  async getProjectAttesters(
    projectId: string,
    filters: AttesterFilters = {},
  ): Promise<SubgraphProjectAttester[]> {
    const { first = 100, skip = 0, active } = filters;

    const where: Record<string, unknown> = { project: projectId };
    if (active !== undefined) where["active"] = active;

    const data = await this.query<{
      projectAttesters: SubgraphProjectAttester[];
    }>(
      `query GetProjectAttesters($first: Int, $skip: Int, $where: ProjectAttester_filter) {
        projectAttesters(first: $first, skip: $skip, where: $where) {
          id
          attester
          active
          addedAt
          addedAtBlock
          project { id name }
        }
      }`,
      { first, skip, where },
    );
    return data.projectAttesters;
  }

  /** Returns the list of attesters authorized at the watcher level. */
  async getWatcherAttesters(
    watcherId: string,
    filters: AttesterFilters = {},
  ): Promise<SubgraphWatcherAttester[]> {
    const { first = 100, skip = 0, active } = filters;

    const where: Record<string, unknown> = { watcher: watcherId };
    if (active !== undefined) where["active"] = active;

    const data = await this.query<{
      watcherAttesters: SubgraphWatcherAttester[];
    }>(
      `query GetWatcherAttesters($first: Int, $skip: Int, $where: WatcherAttester_filter) {
        watcherAttesters(first: $first, skip: $skip, where: $where) {
          id
          attester
          active
          addedAt
          addedAtBlock
          watcher { id name }
        }
      }`,
      { first, skip, where },
    );
    return data.watcherAttesters;
  }
}
