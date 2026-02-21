import * as assert from "assert";
import { ToolingApi } from "../../salesforceAPI/salesforceClient";
import type { ApexClassMember } from "../../salesforceAPI/ApexClassMember";
import type { ApexClass } from "../../salesforceAPI/ApexClass";
import { SymbolTable } from "../../salesforceAPI/SymbolTable";

function makeMockMemento() {
	const store = new Map<string, unknown>();
	return {
		get<T>(key: string, defaultValue?: T): T | undefined {
			return (store.has(key) ? store.get(key) : defaultValue) as T | undefined;
		},
		update(key: string, value: unknown): Thenable<void> {
			if (value === undefined) {
				store.delete(key);
			} else {
				store.set(key, value);
			}
			return Promise.resolve();
		},
		keys(): readonly string[] {
			return [...store.keys()];
		},
	};
}

function makeSymbolTable(name: string): SymbolTable {
	const st = new SymbolTable();
	st.name = name;
	return st;
}

function makeApexClassMember(name: string, lastSyncDate: Date): ApexClassMember {
	return {
		Id: undefined,
		SymbolTable: makeSymbolTable(name),
		LastSyncDate: lastSyncDate,
	};
}

function makeApexClass(name: string, lastModifiedDate: Date): ApexClass {
	return {
		Id: "001",
		Name: name,
		NamespacePrefix: "",
		Body: `public class ${name} {}`,
		LastModifiedDate: lastModifiedDate,
		ApiVersion: "54.0",
	};
}

const INSTANCE_URL = "https://test.salesforce.com";
const CACHE_MAX_SIZE = 100;

suite("ToolingApi cache", () => {
	let api: ToolingApi;
	let memento: ReturnType<typeof makeMockMemento>;

	setup(() => {
		memento = makeMockMemento();
		api = new ToolingApi(INSTANCE_URL, "fake-token", memento as never);
	});

	suite("getCachedApexClassMembers", () => {
		test("returns cached member when date matches and entry is fresh", () => {
			const syncDate = new Date("2024-01-01T00:00:00Z");
			const member = makeApexClassMember("AccountService", syncDate);
			(api as never as Record<string, Function>).saveToCache([member]);

			const apexClass = makeApexClass("AccountService", syncDate);
			const result = (api as never as Record<string, Function>).getCachedApexClassMembers([apexClass]) as ApexClassMember[];

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].SymbolTable.name, "AccountService");
		});

		test("returns nothing when LastSyncDate does not match LastModifiedDate", () => {
			const syncDate = new Date("2024-01-01T00:00:00Z");
			const newerDate = new Date("2024-02-01T00:00:00Z");
			const member = makeApexClassMember("AccountService", syncDate);
			(api as never as Record<string, Function>).saveToCache([member]);

			const apexClass = makeApexClass("AccountService", newerDate);
			const result = (api as never as Record<string, Function>).getCachedApexClassMembers([apexClass]) as ApexClassMember[];

			assert.strictEqual(result.length, 0);
		});

		test("treats expired entry (older than 7 days) as miss", () => {
			const syncDate = new Date("2024-01-01T00:00:00Z");
			const member = makeApexClassMember("AccountService", syncDate);
			const cacheKey = `${INSTANCE_URL}:AccountService`;
			memento.update(cacheKey, {
				member,
				cachedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
			});

			const apexClass = makeApexClass("AccountService", syncDate);
			const result = (api as never as Record<string, Function>).getCachedApexClassMembers([apexClass]) as ApexClassMember[];

			assert.strictEqual(result.length, 0);
		});

		test("treats old-format entry (no cachedAt) as miss", () => {
			const syncDate = new Date("2024-01-01T00:00:00Z");
			const member = makeApexClassMember("AccountService", syncDate);
			const cacheKey = `${INSTANCE_URL}:AccountService`;
			memento.update(cacheKey, { member }); // legacy format, no cachedAt

			const apexClass = makeApexClass("AccountService", syncDate);
			const result = (api as never as Record<string, Function>).getCachedApexClassMembers([apexClass]) as ApexClassMember[];

			assert.strictEqual(result.length, 0);
		});
	});

	suite("getUncachedApexClasses", () => {
		test("returns class as uncached when no entry exists", () => {
			const apexClass = makeApexClass("AccountService", new Date("2024-01-01T00:00:00Z"));
			const result = (api as never as Record<string, Function>).getUncachedApexClasses([apexClass]) as ApexClass[];

			assert.strictEqual(result.length, 1);
			assert.strictEqual(result[0].Name, "AccountService");
		});

		test("returns empty when class is cached with matching date", () => {
			const syncDate = new Date("2024-01-01T00:00:00Z");
			const member = makeApexClassMember("AccountService", syncDate);
			(api as never as Record<string, Function>).saveToCache([member]);

			const apexClass = makeApexClass("AccountService", syncDate);
			const result = (api as never as Record<string, Function>).getUncachedApexClasses([apexClass]) as ApexClass[];

			assert.strictEqual(result.length, 0);
		});

		test("returns class as uncached when TTL expired", () => {
			const syncDate = new Date("2024-01-01T00:00:00Z");
			const member = makeApexClassMember("AccountService", syncDate);
			const cacheKey = `${INSTANCE_URL}:AccountService`;
			memento.update(cacheKey, {
				member,
				cachedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
			});

			const apexClass = makeApexClass("AccountService", syncDate);
			const result = (api as never as Record<string, Function>).getUncachedApexClasses([apexClass]) as ApexClass[];

			assert.strictEqual(result.length, 1);
		});

		test("returns class as uncached when date does not match", () => {
			const syncDate = new Date("2024-01-01T00:00:00Z");
			const newerDate = new Date("2024-02-01T00:00:00Z");
			const member = makeApexClassMember("AccountService", syncDate);
			(api as never as Record<string, Function>).saveToCache([member]);

			const apexClass = makeApexClass("AccountService", newerDate);
			const result = (api as never as Record<string, Function>).getUncachedApexClasses([apexClass]) as ApexClass[];

			assert.strictEqual(result.length, 1);
		});
	});

	suite("evictIfOverLimit", () => {
		test("evicts the oldest entries when incoming count would exceed max size", () => {
			for (let i = 0; i < CACHE_MAX_SIZE; i++) {
				memento.update(`${INSTANCE_URL}:Class${i}`, {
					member: makeApexClassMember(`Class${i}`, new Date()),
					cachedAt: 1000 + i, // Class0 has the oldest timestamp
				});
			}

			(api as never as Record<string, Function>).evictIfOverLimit(5);

			for (let i = 0; i < 5; i++) {
				assert.strictEqual(
					memento.get(`${INSTANCE_URL}:Class${i}`),
					undefined,
					`Class${i} should have been evicted`
				);
			}
			assert.notStrictEqual(memento.get(`${INSTANCE_URL}:Class5`), undefined);
		});

		test("does not evict when total stays within max size", () => {
			const syncDate = new Date("2024-01-01T00:00:00Z");
			const member = makeApexClassMember("AccountService", syncDate);
			(api as never as Record<string, Function>).saveToCache([member]);

			(api as never as Record<string, Function>).evictIfOverLimit(1);

			assert.notStrictEqual(memento.get(`${INSTANCE_URL}:AccountService`), undefined);
		});
	});

	suite("org isolation", () => {
		test("does not return cached entry from a different org", () => {
			const syncDate = new Date("2024-01-01T00:00:00Z");
			const otherApi = new ToolingApi("https://other.salesforce.com", "fake-token", memento as never);
			const member = makeApexClassMember("AccountService", syncDate);
			(otherApi as never as Record<string, Function>).saveToCache([member]);

			const apexClass = makeApexClass("AccountService", syncDate);
			const result = (api as never as Record<string, Function>).getCachedApexClassMembers([apexClass]) as ApexClassMember[];

			assert.strictEqual(result.length, 0);
		});

		test("eviction does not touch entries belonging to a different org", () => {
			const otherUrl = "https://other.salesforce.com";
			for (let i = 0; i < CACHE_MAX_SIZE; i++) {
				memento.update(`${INSTANCE_URL}:Class${i}`, {
					member: makeApexClassMember(`Class${i}`, new Date()),
					cachedAt: 1000 + i,
				});
			}
			// Write one entry from a different org
			const otherEntry = { member: makeApexClassMember("OtherClass", new Date()), cachedAt: 999 };
			memento.update(`${otherUrl}:OtherClass`, otherEntry);

			// Adding 5 more to the main org triggers eviction of 5 oldest main-org entries
			(api as never as Record<string, Function>).evictIfOverLimit(5);

			// The other org's entry must remain untouched
			assert.notStrictEqual(memento.get(`${otherUrl}:OtherClass`), undefined);
		});
	});
});
