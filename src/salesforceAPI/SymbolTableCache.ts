import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { Memento, Uri } from "vscode";
import { getApexClassKey } from "../apexClassKey";
import { ApexClass } from "./ApexClass";
import { ApexClassMember } from "./ApexClassMember";
import { SYMBOL_TABLE_CACHE_DIR, SYMBOL_TABLE_CACHE_KEY_PREFIX } from "./salesforceConstants";

type SymbolTableCacheEntry = {
	filePath: string;
	lastSyncDate: string;
};

class SymbolTableCache {
	private readonly orgCacheHash: string;
	private readonly symbolTableCacheRootPath: string;

	constructor(
		private readonly cacheState: Memento,
		storageUri: Uri,
		instanceUrl: string
	) {
		this.orgCacheHash = this.hash(instanceUrl);
		this.symbolTableCacheRootPath = path.join(storageUri.fsPath, SYMBOL_TABLE_CACHE_DIR, this.orgCacheHash);
	}

	public async save(apexClassMembers: ApexClassMember[]): Promise<void> {
		await fs.mkdir(this.symbolTableCacheRootPath, { recursive: true });

		for (const item of apexClassMembers) {
			if (!item.SymbolTable.name) {
				continue;
			}
			const classKey = this.getClassCacheKey(item.SymbolTable.namespace, item.SymbolTable.name);
			const cacheKey = this.getSymbolTableCacheKey(classKey);
			const filePath = this.getSymbolTableCacheFilePath(classKey);
			await fs.writeFile(filePath, JSON.stringify(item), "utf8");
			await this.cacheState.update(cacheKey, {
				filePath,
				lastSyncDate: String(item.LastSyncDate),
			} satisfies SymbolTableCacheEntry);
		}
	}

	public async getCachedAndUncachedApexClasses(apexClasses: ApexClass[]): Promise<{
		cachedApexClassMembers: ApexClassMember[];
		uncachedApexClasses: ApexClass[];
	}> {
		const cachedApexClassMembers: ApexClassMember[] = [];
		const uncachedApexClasses: ApexClass[] = [];

		for (const apexClass of apexClasses) {
			const cacheEntry = this.getCacheEntry(apexClass);
			if (!this.hasUpToDateSymbolTableCache(cacheEntry, apexClass)) {
				uncachedApexClasses.push(apexClass);
				continue;
			}

			const cachedMember = await this.readApexClassMemberFromCache(cacheEntry!.filePath);
			if (cachedMember) {
				cachedApexClassMembers.push(cachedMember);
			} else {
				uncachedApexClasses.push(apexClass);
			}
		}

		return { cachedApexClassMembers, uncachedApexClasses };
	}

	private getCacheEntry(apexClass: ApexClass): SymbolTableCacheEntry | undefined {
		const classKey = this.getClassCacheKey(apexClass.NamespacePrefix, apexClass.Name);
		return this.cacheState.get<SymbolTableCacheEntry>(this.getSymbolTableCacheKey(classKey));
	}

	private hasUpToDateSymbolTableCache(cacheEntry: SymbolTableCacheEntry | undefined, apexClass: ApexClass): boolean {
		if (!cacheEntry?.filePath) {
			return false;
		}

		const cachedLastSyncMs = new Date(cacheEntry.lastSyncDate).getTime();
		const apexLastModifiedMs = new Date(apexClass.LastModifiedDate).getTime();

		return cachedLastSyncMs === apexLastModifiedMs;
	}

	private async readApexClassMemberFromCache(filePath: string): Promise<ApexClassMember | undefined> {
		try {
			return JSON.parse(await fs.readFile(filePath, "utf8")) as ApexClassMember;
		} catch {
			return undefined;
		}
	}

	private getClassCacheKey(namespace: string | undefined, name: string): string {
		return getApexClassKey(namespace, name) ?? name;
	}

	private getSymbolTableCacheKey(classKey: string): string {
		return `${SYMBOL_TABLE_CACHE_KEY_PREFIX}:${this.orgCacheHash}:${classKey}`;
	}

	private getSymbolTableCacheFilePath(classKey: string): string {
		return path.join(this.symbolTableCacheRootPath, `${this.hash(classKey)}.json`);
	}

	private hash(value: string): string {
		return crypto.createHash("sha256").update(value).digest("hex");
	}
}

export { SymbolTableCache };
