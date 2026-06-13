import * as assert from "assert";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import type { Uri } from "vscode";
import { ApexClassWithBody } from "../../salesforceAPI/ApexClass";
import { ApexClassMember } from "../../salesforceAPI/ApexClassMember";
import { SYMBOL_TABLE_CACHE_KEY_PREFIX } from "../../salesforceAPI/salesforceConstants";
import { SymbolTableCache } from "../../salesforceAPI/SymbolTableCache";
import { MemoryMemento } from "./testDoubles";

function apexClass(name: string, lastModifiedDate: Date, namespace = ""): ApexClassWithBody {
	return {
		Id: name,
		Name: name,
		NamespacePrefix: namespace,
		Body: `class ${name} {}`,
		LastModifiedDate: lastModifiedDate,
	};
}

function member(name: string, lastSyncDate: Date, namespace = ""): ApexClassMember {
	return {
		Id: name,
		LastSyncDate: lastSyncDate,
		SymbolTable: {
			id: name,
			name,
			namespace,
			parentClass: undefined,
			interfaces: [],
			externalReferences: [],
			constructors: [],
			innerClasses: [],
			key: undefined,
			methods: [],
			tableDeclaration: undefined,
			variables: [],
		},
	};
}

async function withCache(
	run: (cache: SymbolTableCache, state: MemoryMemento) => Promise<void>
): Promise<void> {
	const storagePath = await fs.mkdtemp(path.join(os.tmpdir(), "apex-diagram-cache-"));
	const state = new MemoryMemento();
	const cache = new SymbolTableCache(state, { fsPath: storagePath } as Uri, "https://example.my.salesforce.com");

	try {
		await run(cache, state);
	} finally {
		await fs.rm(storagePath, { recursive: true, force: true });
	}
}

suite("SymbolTableCache", () => {
	test("saves symbol tables and returns them while LastModifiedDate matches", async () => {
		const date = new Date("2026-01-01T00:00:00.000Z");

		await withCache(async (cache, state) => {
			await cache.save([member("InvoiceService", date, "pkg")]);

			const result = await cache.getCachedAndUncachedApexClasses([
				apexClass("InvoiceService", date, "pkg"),
			]);

			assert.strictEqual(state.keys().length, 1);
			assert.match(state.keys()[0], new RegExp(`^${SYMBOL_TABLE_CACHE_KEY_PREFIX}:.*:pkg\\.InvoiceService$`));
			assert.deepStrictEqual(result.uncachedApexClasses, []);
			assert.strictEqual(result.cachedApexClassMembers[0].SymbolTable.name, "InvoiceService");
			assert.strictEqual(result.cachedApexClassMembers[0].SymbolTable.namespace, "pkg");
		});
	});

	test("treats changed Apex classes as uncached", async () => {
		await withCache(async (cache) => {
			await cache.save([member("InvoiceService", new Date("2026-01-01T00:00:00.000Z"))]);

			const result = await cache.getCachedAndUncachedApexClasses([
				apexClass("InvoiceService", new Date("2026-01-02T00:00:00.000Z")),
			]);

			assert.deepStrictEqual(result.cachedApexClassMembers, []);
			assert.strictEqual(result.uncachedApexClasses[0].Name, "InvoiceService");
		});
	});

	test("treats missing cache files as uncached", async () => {
		const date = new Date("2026-01-01T00:00:00.000Z");

		await withCache(async (cache, state) => {
			await cache.save([member("InvoiceService", date)]);
			const cacheEntry = state.get<{ filePath: string }>(state.keys()[0]);
			await fs.unlink(cacheEntry!.filePath);

			const result = await cache.getCachedAndUncachedApexClasses([
				apexClass("InvoiceService", date),
			]);

			assert.deepStrictEqual(result.cachedApexClassMembers, []);
			assert.strictEqual(result.uncachedApexClasses[0].Name, "InvoiceService");
		});
	});
});
