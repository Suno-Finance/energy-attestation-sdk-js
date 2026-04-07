import { describe, it, expect, vi, afterEach } from "vitest";
import { EnergyQuery } from "../src/EnergyQuery.js";
import { Network } from "../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: vi.fn().mockResolvedValue(body),
  };
}

function mockFetch(data: unknown) {
  return vi.fn().mockResolvedValue(makeFetchResponse({ data }));
}

function mockFetchHttpError(status: number) {
  return vi.fn().mockResolvedValue(makeFetchResponse({}, status));
}

function mockFetchGraphQLError(...messages: string[]) {
  const errors = messages.map((message) => ({ message }));
  return vi.fn().mockResolvedValue(makeFetchResponse({ errors }));
}

function mockFetchNetworkError(message = "Network failure") {
  return vi.fn().mockRejectedValue(new Error(message));
}

function mockFetchEmptyData() {
  return vi.fn().mockResolvedValue(makeFetchResponse({}));
}

function makeQuery(overrides: { apiKey?: string; subgraphUrl?: string } = {}) {
  return new EnergyQuery({ network: Network.AMOY, ...overrides });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EnergyQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  describe("constructor", () => {
    it("creates instance for network with built-in subgraph URL", () => {
      expect(() => makeQuery()).not.toThrow();
    });

    it("explicit subgraphUrl overrides built-in URL", async () => {
      const fetch = mockFetch({ protocol: null });
      vi.stubGlobal("fetch", fetch);

      const q = new EnergyQuery({
        network: Network.AMOY,
        subgraphUrl: "https://custom.example.com/subgraph",
      });
      await q.getProtocol();

      expect(fetch).toHaveBeenCalledWith("https://custom.example.com/subgraph", expect.anything());
    });

    it("sets Authorization header when apiKey is provided", async () => {
      const fetch = mockFetch({ protocol: null });
      vi.stubGlobal("fetch", fetch);

      const q = makeQuery({ apiKey: "my-api-key" });
      await q.getProtocol();

      const [, options] = fetch.mock.calls[0];
      expect(options.headers["Authorization"]).toBe("Bearer my-api-key");
    });

    it("does not set Authorization header when apiKey is omitted", async () => {
      const fetch = mockFetch({ protocol: null });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getProtocol();

      const [, options] = fetch.mock.calls[0];
      expect(options.headers["Authorization"]).toBeUndefined();
    });

    it("throws ConfigurationError when no subgraph URL is available", () => {
      // All built-in networks have a subgraphUrl, so we test via the explicit override path:
      // passing subgraphUrl as empty string resolves to a falsy value that triggers the guard.
      expect(() => new EnergyQuery({ network: Network.AMOY, subgraphUrl: "" })).toThrow();
    });

    it("always sets Content-Type header", async () => {
      const fetch = mockFetch({ protocol: null });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getProtocol();

      const [, options] = fetch.mock.calls[0];
      expect(options.headers["Content-Type"]).toBe("application/json");
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe("error handling", () => {
    it("throws on network failure", async () => {
      vi.stubGlobal("fetch", mockFetchNetworkError("ECONNREFUSED"));
      await expect(makeQuery().getProtocol()).rejects.toThrow("Subgraph request failed");
    });

    it("throws on HTTP error status", async () => {
      vi.stubGlobal("fetch", mockFetchHttpError(500));
      await expect(makeQuery().getProtocol()).rejects.toThrow(/Subgraph HTTP 500 error/);
    });

    it("throws on GraphQL errors in response", async () => {
      vi.stubGlobal("fetch", mockFetchGraphQLError("store error", "timeout"));
      await expect(makeQuery().getProtocol()).rejects.toThrow(
        /Subgraph query error.*store error, timeout/,
      );
    });

    it("throws when response has no data field", async () => {
      vi.stubGlobal("fetch", mockFetchEmptyData());
      await expect(makeQuery().getProtocol()).rejects.toThrow(/Subgraph returned empty data/);
    });

    it("fetch receives an AbortSignal", async () => {
      const fetch = mockFetch({ protocol: null });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getProtocol();

      const [, options] = fetch.mock.calls[0];
      expect(options.signal).toBeDefined();
    });

    it("throws when fetch is aborted (timeout)", async () => {
      const err = new DOMException("The operation was aborted", "AbortError");
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
      await expect(makeQuery().getProtocol()).rejects.toThrow(/Subgraph request failed/);
    });
  });

  // -------------------------------------------------------------------------
  // getProtocol
  // -------------------------------------------------------------------------

  describe("getProtocol", () => {
    it("returns protocol object", async () => {
      const protocol = {
        totalWatchers: 5,
        totalProjects: 12,
        totalAttestations: 300,
        totalGeneratedWh: "1000000",
        totalConsumedWh: "500000",
        energyTypeAdmin: "0xadmin",
      };
      vi.stubGlobal("fetch", mockFetch({ protocol }));

      const result = await makeQuery().getProtocol();
      expect(result).toEqual(protocol);
    });

    it("returns null when protocol entity does not exist yet", async () => {
      vi.stubGlobal("fetch", mockFetch({ protocol: null }));
      expect(await makeQuery().getProtocol()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getEnergyTypes
  // -------------------------------------------------------------------------

  describe("getEnergyTypes", () => {
    it("returns array of energy types", async () => {
      const energyTypes = [
        { id: "1", name: "solar_pv", registered: true, totalGeneratedWh: "9000" },
        { id: "2", name: "wind", registered: true, totalGeneratedWh: "3000" },
      ];
      vi.stubGlobal("fetch", mockFetch({ energyTypes }));

      const result = await makeQuery().getEnergyTypes();
      expect(result).toEqual(energyTypes);
      expect(result).toHaveLength(2);
    });

    it("returns empty array when no energy types registered", async () => {
      vi.stubGlobal("fetch", mockFetch({ energyTypes: [] }));
      expect(await makeQuery().getEnergyTypes()).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getWatcher
  // -------------------------------------------------------------------------

  describe("getWatcher", () => {
    const watcher = {
      id: "1",
      name: "Solar Watcher",
      owner: "0xowner",
      registered: true,
      totalGeneratedWh: "5000",
      totalConsumedWh: "0",
      projectCount: 2,
      createdAt: "1700000000",
      createdAtBlock: "1000",
      projects: [],
      watcherAttesters: [],
      ownershipHistory: [],
    };

    it("returns watcher detail", async () => {
      vi.stubGlobal("fetch", mockFetch({ watcher }));
      const result = await makeQuery().getWatcher("1");
      expect(result).toEqual(watcher);
    });

    it("returns null for non-existent watcher", async () => {
      vi.stubGlobal("fetch", mockFetch({ watcher: null }));
      expect(await makeQuery().getWatcher("999")).toBeNull();
    });

    it("passes watcher ID as variable", async () => {
      const fetch = mockFetch({ watcher });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getWatcher("42");

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables).toMatchObject({ id: "42" });
    });
  });

  // -------------------------------------------------------------------------
  // getWatchers
  // -------------------------------------------------------------------------

  describe("getWatchers", () => {
    const watcherList = [
      {
        id: "1",
        name: "W1",
        owner: "0xowner1",
        registered: true,
        totalGeneratedWh: "1000",
        totalConsumedWh: "0",
        projectCount: 1,
        createdAt: "1700000000",
        createdAtBlock: "100",
      },
    ];

    it("returns items array and hasMore flag", async () => {
      vi.stubGlobal("fetch", mockFetch({ watchers: watcherList }));
      const result = await makeQuery().getWatchers();
      expect(result.items).toEqual(watcherList);
      expect(result.hasMore).toBe(false);
    });

    it("requests first+1 items to detect hasMore", async () => {
      const fetch = mockFetch({ watchers: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getWatchers({ first: 10 });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.first).toBe(11);
    });

    it("sets hasMore true and slices when subgraph returns first+1 items", async () => {
      const items = Array.from({ length: 11 }, (_, i) => ({
        ...watcherList[0],
        id: String(i + 1),
      }));
      vi.stubGlobal("fetch", mockFetch({ watchers: items }));
      const result = await makeQuery().getWatchers({ first: 10 });
      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(10);
    });

    it("sets hasMore false when fewer than first+1 items returned", async () => {
      vi.stubGlobal("fetch", mockFetch({ watchers: watcherList }));
      const result = await makeQuery().getWatchers({ first: 10 });
      expect(result.hasMore).toBe(false);
    });

    it("applies default skip=0", async () => {
      const fetch = mockFetch({ watchers: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getWatchers();

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables).toMatchObject({ skip: 0 });
    });

    it("passes registered filter", async () => {
      const fetch = mockFetch({ watchers: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getWatchers({ registered: false });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ registered: false });
    });

    it("lowercases owner filter", async () => {
      const fetch = mockFetch({ watchers: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getWatchers({ owner: "0xOWNER" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where.owner).toBe("0xowner");
    });

    it("passes custom skip", async () => {
      const fetch = mockFetch({ watchers: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getWatchers({ first: 10, skip: 20 });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables).toMatchObject({ skip: 20 });
    });
  });

  // -------------------------------------------------------------------------
  // getWatcherOwnershipHistory
  // -------------------------------------------------------------------------

  describe("getWatcherOwnershipHistory", () => {
    it("returns ownership transfer history", async () => {
      const transfers = [
        {
          id: "0xtx-0",
          previousOwner: "0xold",
          newOwner: "0xnew",
          timestamp: "1700000000",
          blockNumber: "100",
          txHash: "0xtx",
          watcher: { id: "1", name: "W1" },
        },
      ];
      vi.stubGlobal("fetch", mockFetch({ watcherOwnershipTransfers: transfers }));

      const result = await makeQuery().getWatcherOwnershipHistory("1");
      expect(result).toEqual(transfers);
    });

    it("passes watcherId as variable", async () => {
      const fetch = mockFetch({ watcherOwnershipTransfers: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getWatcherOwnershipHistory("5");

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables).toMatchObject({ watcherId: "5" });
    });
  });

  // -------------------------------------------------------------------------
  // getProject
  // -------------------------------------------------------------------------

  describe("getProject", () => {
    const project = {
      id: "3",
      name: "Solar Farm",
      registered: true,
      totalGeneratedWh: "9999",
      totalConsumedWh: "0",
      lastToTimestamp: "1700003600",
      metadataURI: "ipfs://Qmtest",
      attestationCount: 5,
      createdAt: "1700000000",
      createdAtBlock: "200",
      watcher: { id: "1", name: "W1" },
      energyType: { id: "1", name: "solar_pv" },
    };

    it("returns project", async () => {
      vi.stubGlobal("fetch", mockFetch({ project }));
      expect(await makeQuery().getProject("3")).toEqual(project);
    });

    it("returns null for non-existent project", async () => {
      vi.stubGlobal("fetch", mockFetch({ project: null }));
      expect(await makeQuery().getProject("999")).toBeNull();
    });

    it("passes project ID as variable", async () => {
      const fetch = mockFetch({ project });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getProject("3");

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables).toMatchObject({ id: "3" });
    });
  });

  // -------------------------------------------------------------------------
  // getProjects
  // -------------------------------------------------------------------------

  describe("getProjects", () => {
    it("returns items array and hasMore flag", async () => {
      const projects = [{ id: "1", name: "P1" }];
      vi.stubGlobal("fetch", mockFetch({ projects }));
      const result = await makeQuery().getProjects();
      expect(result.items).toEqual(projects);
      expect(result.hasMore).toBe(false);
    });

    it("sets hasMore true and slices when subgraph returns first+1 items", async () => {
      const projects = Array.from({ length: 6 }, (_, i) => ({
        id: String(i + 1),
        name: `P${i + 1}`,
      }));
      vi.stubGlobal("fetch", mockFetch({ projects }));
      const result = await makeQuery().getProjects({ first: 5 });
      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(5);
    });

    it("sets hasMore false when fewer than first+1 items returned", async () => {
      vi.stubGlobal("fetch", mockFetch({ projects: [{ id: "1", name: "P1" }] }));
      const result = await makeQuery().getProjects({ first: 5 });
      expect(result.hasMore).toBe(false);
    });

    it("passes watcherId filter", async () => {
      const fetch = mockFetch({ projects: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getProjects({ watcherId: "2" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ watcher: "2" });
    });

    it("maps energyTypeId '0' to null in where clause (consumer projects)", async () => {
      const fetch = mockFetch({ projects: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getProjects({ energyTypeId: "0" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where.energyType).toBeNull();
    });

    it("passes non-zero energyTypeId as-is", async () => {
      const fetch = mockFetch({ projects: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getProjects({ energyTypeId: "1" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where.energyType).toBe("1");
    });

    it("passes registered filter", async () => {
      const fetch = mockFetch({ projects: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getProjects({ registered: true });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ registered: true });
    });
  });

  // -------------------------------------------------------------------------
  // getAttestation
  // -------------------------------------------------------------------------

  describe("getAttestation", () => {
    const attestation = {
      id: "0xuid",
      fromTimestamp: "1700000000",
      toTimestamp: "1700003600",
      energyWh: "1000",
      attester: "0xattester",
      metadataURI: null,
      readings: ["500", "500"],
      replaced: false,
      replacedBy: null,
      replaces: null,
      blockTimestamp: "1700001000",
      blockNumber: "300",
      txHash: "0xtx",
      project: { id: "1", name: "P1" },
      energyType: { id: "1", name: "solar_pv" },
    };

    it("returns attestation", async () => {
      vi.stubGlobal("fetch", mockFetch({ energyAttestation: attestation }));
      expect(await makeQuery().getAttestation("0xuid")).toEqual(attestation);
    });

    it("returns null for non-existent UID", async () => {
      vi.stubGlobal("fetch", mockFetch({ energyAttestation: null }));
      expect(await makeQuery().getAttestation("0xunknown")).toBeNull();
    });

    it("passes uid as id variable", async () => {
      const fetch = mockFetch({ energyAttestation: attestation });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getAttestation("0xuid");

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables).toMatchObject({ id: "0xuid" });
    });
  });

  // -------------------------------------------------------------------------
  // getAttestations
  // -------------------------------------------------------------------------

  describe("getAttestations", () => {
    it("returns items array and hasMore flag", async () => {
      const energyAttestations = [{ id: "0xabc" }];
      vi.stubGlobal("fetch", mockFetch({ energyAttestations }));
      const result = await makeQuery().getAttestations();
      expect(result.items).toEqual(energyAttestations);
      expect(result.hasMore).toBe(false);
    });

    it("sets hasMore true and slices when subgraph returns first+1 items", async () => {
      const energyAttestations = Array.from({ length: 6 }, (_, i) => ({ id: `0x${i}` }));
      vi.stubGlobal("fetch", mockFetch({ energyAttestations }));
      const result = await makeQuery().getAttestations({ first: 5 });
      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(5);
    });

    it("sets hasMore false when fewer than first+1 items returned", async () => {
      vi.stubGlobal("fetch", mockFetch({ energyAttestations: [{ id: "0xabc" }] }));
      const result = await makeQuery().getAttestations({ first: 5 });
      expect(result.hasMore).toBe(false);
    });

    it("passes projectId filter", async () => {
      const fetch = mockFetch({ energyAttestations: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getAttestations({ projectId: "5" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ project: "5" });
    });

    it("lowercases attester filter", async () => {
      const fetch = mockFetch({ energyAttestations: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getAttestations({ attester: "0xATTESTER" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where.attester).toBe("0xattester");
    });

    it("passes replaced filter", async () => {
      const fetch = mockFetch({ energyAttestations: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getAttestations({ replaced: false });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ replaced: false });
    });

    it("passes timestamp range filters", async () => {
      const fetch = mockFetch({ energyAttestations: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getAttestations({
        fromTimestamp_gte: "1700000000",
        fromTimestamp_lte: "1700100000",
      });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({
        fromTimestamp_gte: "1700000000",
        fromTimestamp_lte: "1700100000",
      });
    });

    it("passes toTimestamp range filters", async () => {
      const fetch = mockFetch({ energyAttestations: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getAttestations({
        toTimestamp_gte: "1700003600",
        toTimestamp_lte: "1700200000",
      });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({
        toTimestamp_gte: "1700003600",
        toTimestamp_lte: "1700200000",
      });
    });

    it("passes energyTypeId filter for generator type", async () => {
      const fetch = mockFetch({ energyAttestations: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getAttestations({ energyTypeId: "1" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ energyType: "1" });
    });

    it("maps energyTypeId '0' to null for consumer attestations", async () => {
      const fetch = mockFetch({ energyAttestations: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getAttestations({ energyTypeId: "0" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where.energyType).toBeNull();
    });

    it("omits energyType from where when energyTypeId is not set", async () => {
      const fetch = mockFetch({ energyAttestations: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getAttestations({ projectId: "1" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(Object.keys(body.variables.where)).not.toContain("energyType");
    });
  });

  // -------------------------------------------------------------------------
  // iterateDailySnapshots
  // -------------------------------------------------------------------------

  describe("iterateDailySnapshots", () => {
    function makeSnapshot(id: string, date: string) {
      return {
        id,
        date,
        timestamp: "1700000000",
        generatedWh: "1000",
        consumedWh: "0",
        attestationCount: 1,
        project: { id: "1", name: "P1" },
      };
    }

    it("yields all items when subgraph returns fewer than first", async () => {
      const snapshots = [makeSnapshot("1-2024-01-01", "2024-01-01")];
      vi.stubGlobal("fetch", mockFetch({ dailyEnergySnapshots: snapshots }));

      const results = [];
      for await (const snap of makeQuery().iterateDailySnapshots({ projectId: "1" })) {
        results.push(snap);
      }

      expect(results).toHaveLength(1);
      expect(results[0].date).toBe("2024-01-01");
    });

    it("paginates across multiple pages until no more results", async () => {
      const page1 = Array.from({ length: 4 }, (_, i) =>
        makeSnapshot(`1-2024-01-0${i + 1}`, `2024-01-0${i + 1}`),
      );
      // page1 has 4 items when first=3, meaning hasMore is true for the first call (3+1=4)
      const page2 = [makeSnapshot("1-2024-01-04", "2024-01-04")];

      let call = 0;
      const fetchFn = vi.fn().mockImplementation(() => {
        const data = call++ === 0 ? page1 : page2;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: vi.fn().mockResolvedValue({ data: { dailyEnergySnapshots: data } }),
        });
      });
      vi.stubGlobal("fetch", fetchFn);

      const results = [];
      for await (const snap of makeQuery().iterateDailySnapshots({ projectId: "1", first: 3 })) {
        results.push(snap);
      }

      // page1 returned 4 items (first+1=4), so hasMore=true; we yield first 3 then fetch page2
      expect(results).toHaveLength(4); // 3 from page1 + 1 from page2
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it("passes projectId and date filters through to each fetch", async () => {
      const fetch = mockFetch({ dailyEnergySnapshots: [] });
      vi.stubGlobal("fetch", fetch);

      const gen = makeQuery().iterateDailySnapshots({
        projectId: "5",
        dateFrom: "2024-06-01",
        dateTo: "2024-06-30",
      });
      await gen.next();

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({
        project: "5",
        date_gte: "2024-06-01",
        date_lte: "2024-06-30",
      });
    });

    it("uses default first=365 when not specified", async () => {
      const fetch = mockFetch({ dailyEnergySnapshots: [] });
      vi.stubGlobal("fetch", fetch);

      const gen = makeQuery().iterateDailySnapshots({ projectId: "1" });
      await gen.next();

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      // internally requests first+1 = 366
      expect(body.variables.first).toBe(366);
    });

    it("yields nothing when subgraph returns empty array", async () => {
      vi.stubGlobal("fetch", mockFetch({ dailyEnergySnapshots: [] }));

      const results = [];
      for await (const snap of makeQuery().iterateDailySnapshots({ projectId: "1" })) {
        results.push(snap);
      }

      expect(results).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getDailySnapshots
  // -------------------------------------------------------------------------

  describe("getDailySnapshots", () => {
    const snapshots = [
      {
        id: "1-2024-01-01",
        date: "2024-01-01",
        timestamp: "1704067200",
        generatedWh: "5000",
        consumedWh: "0",
        attestationCount: 1,
        project: { id: "1", name: "P1" },
      },
    ];

    it("returns daily snapshots for a project", async () => {
      vi.stubGlobal("fetch", mockFetch({ dailyEnergySnapshots: snapshots }));
      const result = await makeQuery().getDailySnapshots({ projectId: "1" });
      expect(result).toEqual(snapshots);
    });

    it("passes projectId in where clause", async () => {
      const fetch = mockFetch({ dailyEnergySnapshots: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getDailySnapshots({ projectId: "7" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ project: "7" });
    });

    it("passes dateFrom and dateTo filters", async () => {
      const fetch = mockFetch({ dailyEnergySnapshots: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getDailySnapshots({
        projectId: "1",
        dateFrom: "2024-01-01",
        dateTo: "2024-01-31",
      });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({
        date_gte: "2024-01-01",
        date_lte: "2024-01-31",
      });
    });

    it("uses default first=365", async () => {
      const fetch = mockFetch({ dailyEnergySnapshots: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getDailySnapshots({ projectId: "1" });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables).toMatchObject({ first: 365 });
    });
  });

  // -------------------------------------------------------------------------
  // getProjectAttesters
  // -------------------------------------------------------------------------

  describe("getProjectAttesters", () => {
    const attesters = [
      {
        id: "1-0xaddr",
        attester: "0xaddr",
        active: true,
        addedAt: "1700000000",
        addedAtBlock: "100",
        project: { id: "1", name: "P1" },
      },
    ];

    it("returns project attesters", async () => {
      vi.stubGlobal("fetch", mockFetch({ projectAttesters: attesters }));
      expect(await makeQuery().getProjectAttesters("1")).toEqual(attesters);
    });

    it("passes projectId in where clause", async () => {
      const fetch = mockFetch({ projectAttesters: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getProjectAttesters("3");

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ project: "3" });
    });

    it("passes active filter", async () => {
      const fetch = mockFetch({ projectAttesters: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getProjectAttesters("1", { active: false });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ active: false });
    });
  });

  // -------------------------------------------------------------------------
  // getWatcherAttesters
  // -------------------------------------------------------------------------

  describe("getWatcherAttesters", () => {
    const attesters = [
      {
        id: "1-0xaddr",
        attester: "0xaddr",
        active: true,
        addedAt: "1700000000",
        addedAtBlock: "100",
        watcher: { id: "1", name: "W1" },
      },
    ];

    it("returns watcher attesters", async () => {
      vi.stubGlobal("fetch", mockFetch({ watcherAttesters: attesters }));
      expect(await makeQuery().getWatcherAttesters("1")).toEqual(attesters);
    });

    it("passes watcherId in where clause", async () => {
      const fetch = mockFetch({ watcherAttesters: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getWatcherAttesters("2");

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ watcher: "2" });
    });

    it("passes active filter", async () => {
      const fetch = mockFetch({ watcherAttesters: [] });
      vi.stubGlobal("fetch", fetch);

      await makeQuery().getWatcherAttesters("1", { active: true });

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.variables.where).toMatchObject({ active: true });
    });
  });

  // -------------------------------------------------------------------------
  // Pagination generators
  // -------------------------------------------------------------------------

  describe("iterateWatchers", () => {
    it("yields all items from a single page", async () => {
      const watchers = [{ id: "1" }, { id: "2" }];
      vi.stubGlobal("fetch", mockFetch({ watchers }));

      const results = [];
      for await (const w of makeQuery().iterateWatchers({ first: 10 })) {
        results.push(w);
      }
      expect(results).toHaveLength(2);
    });

    it("paginates across multiple pages", async () => {
      const page1 = Array.from({ length: 3 }, (_, i) => ({ id: String(i + 1) }));
      const page2 = [{ id: "4" }];
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(makeFetchResponse({ data: { watchers: page1 } }))
        .mockResolvedValueOnce(makeFetchResponse({ data: { watchers: page2 } }));
      vi.stubGlobal("fetch", fetch);

      const results = [];
      for await (const w of makeQuery().iterateWatchers({ first: 2 })) {
        results.push(w);
      }
      expect(results).toHaveLength(3);
    });

    it("yields nothing for empty results", async () => {
      vi.stubGlobal("fetch", mockFetch({ watchers: [] }));
      const results = [];
      for await (const w of makeQuery().iterateWatchers()) {
        results.push(w);
      }
      expect(results).toHaveLength(0);
    });
  });

  describe("iterateProjects", () => {
    it("yields all items from a single page", async () => {
      const projects = [{ id: "1" }, { id: "2" }];
      vi.stubGlobal("fetch", mockFetch({ projects }));

      const results = [];
      for await (const p of makeQuery().iterateProjects({ first: 10 })) {
        results.push(p);
      }
      expect(results).toHaveLength(2);
    });

    it("paginates across multiple pages", async () => {
      const page1 = Array.from({ length: 3 }, (_, i) => ({ id: String(i + 1) }));
      const page2 = [{ id: "4" }];
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(makeFetchResponse({ data: { projects: page1 } }))
        .mockResolvedValueOnce(makeFetchResponse({ data: { projects: page2 } }));
      vi.stubGlobal("fetch", fetch);

      const results = [];
      for await (const p of makeQuery().iterateProjects({ first: 2 })) {
        results.push(p);
      }
      expect(results).toHaveLength(3);
    });

    it("yields nothing for empty results", async () => {
      vi.stubGlobal("fetch", mockFetch({ projects: [] }));
      const results = [];
      for await (const p of makeQuery().iterateProjects()) {
        results.push(p);
      }
      expect(results).toHaveLength(0);
    });
  });

  describe("iterateAttestations", () => {
    it("yields all items from a single page", async () => {
      const energyAttestations = [{ id: "0x1" }, { id: "0x2" }];
      vi.stubGlobal("fetch", mockFetch({ energyAttestations }));

      const results = [];
      for await (const a of makeQuery().iterateAttestations({ first: 10 })) {
        results.push(a);
      }
      expect(results).toHaveLength(2);
    });

    it("paginates across multiple pages", async () => {
      const page1 = Array.from({ length: 3 }, (_, i) => ({ id: `0x${i}` }));
      const page2 = [{ id: "0x3" }];
      const fetch = vi
        .fn()
        .mockResolvedValueOnce(makeFetchResponse({ data: { energyAttestations: page1 } }))
        .mockResolvedValueOnce(makeFetchResponse({ data: { energyAttestations: page2 } }));
      vi.stubGlobal("fetch", fetch);

      const results = [];
      for await (const a of makeQuery().iterateAttestations({ first: 2 })) {
        results.push(a);
      }
      expect(results).toHaveLength(3);
    });

    it("yields nothing for empty results", async () => {
      vi.stubGlobal("fetch", mockFetch({ energyAttestations: [] }));
      const results = [];
      for await (const a of makeQuery().iterateAttestations()) {
        results.push(a);
      }
      expect(results).toHaveLength(0);
    });
  });
});
