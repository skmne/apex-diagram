import { Connection } from "jsforce";

import { ApexClass } from "./ApexClass";
import { ApexClassMember } from "./ApexClassMember";
import { Memento } from "vscode";

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
	cacheState: Memento;
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

	public async getMeatadaContainerByName(name: string) {
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
		console.log("container = ", container);
		return this.conn.tooling.sobject("MetadataContainer").create(container);
	}

	public async createApexClassMember(apexClasses: ApexClass[], metadataContainerId: string) {
		const apexClassMembers = this.getApexMemberes(apexClasses, metadataContainerId);
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
				console.log("classes = ", apexClasses);
				if (!apexClasses || apexClasses.length === 0) {
					return new Promise((resolve) => resolve(apexClasses));
				}
				console.log("apexClasses : ", apexClasses);

				const cachedApexClassMembers = this.getCachedApexClassMembers(apexClasses);
				const uncachedApexClasses = this.getUncachedApexClasses(apexClasses);
				console.log("FROM CASH ===", cachedApexClassMembers);
				console.log("New ===", uncachedApexClasses);

				if (uncachedApexClasses.length === 0) {
					return new Promise((resolve) => resolve(cachedApexClassMembers));
				}
				return this.createMetadataContainer().then((container) => {
					console.log("createMetadataContainer : ", container);
					const containerId = container.id!;
					return this.createApexClassMember(uncachedApexClasses, containerId)
						.then(async (apexMembers) => {
							console.log("apexMembers : ", apexMembers);
							return this.createContainerAsyncRequest(containerId);
						})
						.then(async (asyncReq) => {
							console.log("asyncReq : ", asyncReq);
							return this.checkAsyncRequestResult({ id: asyncReq.id! });
						})
						.then(async (reqRes) => {
							if (reqRes.records[0]?.State === "Completed") {
								return this.getApexClassMemberByAsyncReqId(containerId);
							} else {
								console.error(reqRes);
								console.error(reqRes.records);
								throw Error("Generate Sybmol Table was Failed");
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
				console.error(err);
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
		console.log("reqRes : ", reqRes);
		while (reqRes.records[0]?.State === "Queued") {
			await this.sleep(2000);
			reqRes = await this.getContainerAsyncRequest(asyncReq.id);
			console.log("interval reqRes : ", reqRes);
		}
		return reqRes;
	}
	private saveToCache(apexClassMembers: ApexClassMember[]) {
		for (const item of apexClassMembers) {
			const cacheKey = `${item.SymbolTable.name}`;
			this.cacheState.update(cacheKey, item);
		}
	}
	private getCachedApexClassMembers(apexClasses: ApexClass[]): ApexClassMember[] {
		const cachedMembers: ApexClassMember[] = [];
		for (const apexClass of apexClasses) {
			const cacheKey = `${apexClass.Name}`; //${apexClass.LastModifiedDate}
			const apexClassMemberFromCache: ApexClassMember | undefined = this.cacheState.get(cacheKey);
			console.log("apexClassMemberFromCache = ", apexClassMemberFromCache);
			if (apexClassMemberFromCache?.LastSyncDate === apexClass.LastModifiedDate) {
				cachedMembers.push(apexClassMemberFromCache);
			}
		}
		return cachedMembers;
	}
	private getUncachedApexClasses(apexClasses: ApexClass[]): ApexClass[] {
		return apexClasses.filter((apexClass) => {
			const cacheKey = `${apexClass.Name}`;
			const apexClassMemberFromCache: ApexClassMember | undefined = this.cacheState.get(cacheKey);
			return !(apexClassMemberFromCache?.LastSyncDate === apexClass.LastModifiedDate);
		});
	}

	private sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	private getApexMemberes(apexClasses: ApexClass[], metadataContainerId: string) {
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
