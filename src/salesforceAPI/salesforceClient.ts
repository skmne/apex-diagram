import { Connection } from "jsforce";

import { ApexClass } from "./ApexClass";
import { ApexClassMember } from "./ApexClassMember";
import { Memento } from "vscode";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const CACHE_MAX_SIZE = 100; // max entries per org

interface CacheEntry {
	member: ApexClassMember;
	cachedAt: number; // Unix timestamp ms
}

class BaseAPI {
	protected baseUrl: string;
	protected accessToken: string;
	protected instanceUrl: string;
	protected conn: Connection;

	constructor(instanceUrl: string, accessToken: string) {
		this.instanceUrl = instanceUrl;
		this.baseUrl = instanceUrl + "/services/data/v54.0";
		this.accessToken = accessToken;

		this.conn = new Connection({
			instanceUrl: this.instanceUrl,
			accessToken: this.accessToken,
		});
	}
}

class ToolingApi extends BaseAPI {
	private cacheState: Memento;
	constructor(instanceUrl: string, accessToken: string, workspaceState: Memento) {
		super(instanceUrl, accessToken);
		this.cacheState = workspaceState;
		this.baseUrl += "/tooling";
	}

	public async getApexClasses(): Promise<ApexClass[]> {
		let query = `
    		SELECT Id, Name, ApiVersion, Body, LastModifiedDate
    		FROM ApexClass
    	`;
		query += ` WHERE ManageableState != \'installed\'`;

		const result = await this.query(query);
		const apexClasses = result?.records as unknown as ApexClass[];

		return apexClasses?.filter((item) => !item.Body.toLowerCase().includes("@istest"));
	}

	public async getApexClassesByNames(apexClassNames: string[]) {
		let query = `
    		SELECT Id, Name , Body, LastModifiedDate
   		 	FROM ApexClass
    	`;

		const apexClassNameConditions = apexClassNames.map((item: string) => {
			return "'" + item + "'";
		});
		query += ` WHERE Name IN (${apexClassNameConditions.join(",")})`;

		const result = await this.query(query);
		const apexClasses = result?.records as unknown as ApexClass[];
		return apexClasses;
	}

	public async getMetadataContainerByName(name: string) {
		return this.query(`SELECT Id FROM MetadataContainer WHERE Name=\'${name}\'`);
	}

	public async getContainerAsyncRequest(asyncReqId: string) {
		return this.query(
			`SELECT Id, State, ErrorMsg, IsCheckOnly FROM ContainerAsyncRequest WHERE Id=\'${asyncReqId}\'`
		);
	}

	public async deleteMetadataContainer(metadataContainerIds: Array<string>) {
		return this.conn.tooling.sobject("MetadataContainer").destroy(metadataContainerIds);
	}

	public async createMetadataContainer() {
		const container = {
			Name: "Apex Diagram:" + new Date().valueOf(),
		};
		return this.conn.tooling.sobject("MetadataContainer").create(container);
	}

	public async createApexClassMember(apexClasses: ApexClass[], metadataContainerId: string) {
		const apexClassMembers = this.getApexMembers(apexClasses, metadataContainerId);
		return this.conn.tooling.sobject("ApexClassMember").create(apexClassMembers);
	}

	public async createContainerAsyncRequest(containerId: string) {
		return this.conn.tooling.sobject("ContainerAsyncRequest").create({
			MetadataContainerId: containerId,
			IsCheckOnly: true,
		});
	}

	public async generateApexSymbolTable(apexClasses: string[]) {
		return this.getApexClassesByNames(apexClasses)
			.then((apexClasses) => {
				if (!apexClasses || apexClasses.length === 0) {
					return new Promise((resolve) => resolve(apexClasses));
				}

				const cachedApexClassMembers = this.getCachedApexClassMembers(apexClasses);
				const uncachedApexClasses = this.getUncachedApexClasses(apexClasses);

				if (uncachedApexClasses.length === 0) {
					return new Promise((resolve) => resolve(cachedApexClassMembers));
				}
				return this.createMetadataContainer().then((container) => {
					const containerId = container.id!;
					return this.createApexClassMember(uncachedApexClasses, containerId)
						.then(async () => {
							return this.createContainerAsyncRequest(containerId);
						})
						.then(async (asyncReq) => {
							return this.checkAsyncRequestResult({ id: asyncReq.id! });
						})
						.then(async (reqRes) => {
							if (reqRes.records[0]?.State === "Completed") {
								return this.getApexClassMemberByAsyncReqId(containerId);
							} else {
								throw Error("Generate Symbol Table Failed");
							}
						})
						.then((apexClassMemberResult) => {
							return new Promise(async (resolve) => {
								const apexClassMembers = apexClassMemberResult.records as unknown as ApexClassMember[];
								this.saveToCache(apexClassMembers);
								await this.deleteMetadataContainer([containerId]);
								resolve([...cachedApexClassMembers, ...apexClassMembers]);
							});
						});
				});
			})
			.catch((err) => {
				throw err;
			});
	}

	private getApexClassMemberByAsyncReqId(asyncRequestId: string) {
		return this.query(
			`
				SELECT Id, SymbolTable, LastSyncDate
				FROM ApexClassMember
				WHERE MetadataContainerId = \'${asyncRequestId}\'
			`
		);
	}

	private async query(query: string) {
		return this.conn.tooling.query(query);
	}

	private async checkAsyncRequestResult(asyncReq: { id: string }) {
		await this.sleep(2000);
		let reqRes = await this.getContainerAsyncRequest(asyncReq.id);
		while (reqRes.records[0]?.State === "Queued") {
			await this.sleep(2000);
			reqRes = await this.getContainerAsyncRequest(asyncReq.id);
		}
		return reqRes;
	}

	private saveToCache(apexClassMembers: ApexClassMember[]) {
		this.evictIfOverLimit(apexClassMembers.length);
		for (const item of apexClassMembers) {
			const cacheKey = `${this.instanceUrl}:${item.SymbolTable.name}`;
			const entry: CacheEntry = { member: item, cachedAt: Date.now() };
			this.cacheState.update(cacheKey, entry);
		}
	}

	private getCachedApexClassMembers(apexClasses: ApexClass[]): ApexClassMember[] {
		const cachedMembers: ApexClassMember[] = [];
		for (const apexClass of apexClasses) {
			const cacheKey = `${this.instanceUrl}:${apexClass.Name}`;
			const entry: CacheEntry | undefined = this.cacheState.get(cacheKey);
			if (!entry?.cachedAt) { continue; } // missing or old format — treat as miss
			if (Date.now() - entry.cachedAt > CACHE_TTL_MS) { continue; } // expired
			if (entry.member.LastSyncDate === apexClass.LastModifiedDate) {
				cachedMembers.push(entry.member);
			}
		}
		return cachedMembers;
	}

	private getUncachedApexClasses(apexClasses: ApexClass[]): ApexClass[] {
		return apexClasses.filter((apexClass) => {
			const cacheKey = `${this.instanceUrl}:${apexClass.Name}`;
			const entry: CacheEntry | undefined = this.cacheState.get(cacheKey);
			if (!entry?.cachedAt) { return true; } // missing or old format
			if (Date.now() - entry.cachedAt > CACHE_TTL_MS) { return true; } // expired
			return !(entry.member.LastSyncDate === apexClass.LastModifiedDate);
		});
	}

	private evictIfOverLimit(incomingCount: number) {
		const orgPrefix = `${this.instanceUrl}:`;
		const orgKeys = this.cacheState.keys().filter((k) => k.startsWith(orgPrefix));
		const toEvict = orgKeys.length + incomingCount - CACHE_MAX_SIZE;
		if (toEvict <= 0) { return; }

		orgKeys
			.map((key) => ({ key, cachedAt: (this.cacheState.get(key) as CacheEntry | undefined)?.cachedAt ?? 0 }))
			.sort((a, b) => a.cachedAt - b.cachedAt)
			.slice(0, toEvict)
			.forEach(({ key }) => this.cacheState.update(key, undefined));
	}

	private sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private getApexMembers(apexClasses: ApexClass[], metadataContainerId: string) {
		const apexMembers = [];
		for (const apexClass of apexClasses) {
			apexMembers.push({
				Body: apexClass.Body,
				ContentEntityId: apexClass.Id,
				// Metadata: apexClass.Metadata,
				MetadataContainerId: metadataContainerId,
			});
		}
		return apexMembers;
	}
}
export { ToolingApi };
