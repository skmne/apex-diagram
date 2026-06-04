import { Connection } from "jsforce";

import { ApexClass } from "./ApexClass";
import { ApexClassMember } from "./ApexClassMember";
import { Memento } from "vscode";

const SALESFORCE_API_VERSION = "66.0";
const MAX_COMPOSITE_SUBREQUESTS = 25;

type CompositeResponse = {
	compositeResponse: Array<{
		body?: { id?: string; success?: boolean; errors?: unknown[] } | unknown;
		httpStatusCode: number;
		referenceId: string;
	}>;
};

class BaseAPI {
	protected baseUrl: string;
	protected accessToken: string;
	protected instanceUrl: string;
	protected conn: Connection;

	constructor(instanceUrl: string, accessToken: string) {
		this.instanceUrl = instanceUrl;
		this.baseUrl = `${instanceUrl}/services/data/v${SALESFORCE_API_VERSION}`;
		this.accessToken = accessToken;

		this.conn = new Connection({
			instanceUrl: this.instanceUrl,
			accessToken: this.accessToken,
			version: SALESFORCE_API_VERSION,
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

	public async getMetadataContainerByName(name: string) {
		return this.query(`SELECT Id FROM MetadataContainer WHERE Name=\'${name}\'`);
	}

	public async getContainerAsyncRequest(asyncReqId: string) {
		return this.query(
			`SELECT Id, State, ErrorMsg, IsCheckOnly FROM ContainerAsyncRequest WHERE Id=\'${asyncReqId}\'`
		);
	}

	public async deleteMetadataContainer(metadataContainerIds: Array<string>) {
		return Promise.all(
			metadataContainerIds.map((metadataContainerId) =>
				this.conn.tooling.sobject("MetadataContainer").destroy(metadataContainerId)
			)
		);
	}

	public async createMetadataContainer() {
		const container = {
			Name: "Apex Diagram:" + new Date().valueOf(),
		};
		return this.conn.tooling.sobject("MetadataContainer").create(container);
	}

	public async createApexClassMember(apexClasses: ApexClass[], metadataContainerId: string) {
		const apexClassMembers = this.getApexMembers(apexClasses, metadataContainerId);
		const results = [];

		for (let i = 0; i < apexClassMembers.length; i += MAX_COMPOSITE_SUBREQUESTS) {
			const chunk = apexClassMembers.slice(i, i + MAX_COMPOSITE_SUBREQUESTS);
			const response = await this.createApexClassMembersComposite(chunk, i);
			this.assertCompositeSuccess(response);
			results.push(...response.compositeResponse);
		}

		return results;
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
								await this.deleteMetadataContainer([containerId]).catch((err) => {
									console.warn("Apex Diagram: Failed to delete metadata container", err);
								});
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

	private async createApexClassMembersComposite(apexClassMembers: unknown[], offset: number): Promise<CompositeResponse> {
		return this.conn.request<CompositeResponse>({
			method: "POST",
			url: `${this.baseUrl}/composite`,
			body: JSON.stringify({
				allOrNone: true,
				compositeRequest: apexClassMembers.map((apexClassMember, index) => ({
					method: "POST",
					url: `/services/data/v${SALESFORCE_API_VERSION}/tooling/sobjects/ApexClassMember/`,
					referenceId: `apexClassMember_${offset + index}`,
					body: apexClassMember,
				})),
			}),
			headers: {
				"content-type": "application/json",
			},
		});
	}

	private assertCompositeSuccess(response: CompositeResponse) {
		const failedResponse = response.compositeResponse.find((item) => item.httpStatusCode >= 300);
		if (failedResponse) {
			throw Error(`Create ApexClassMember Failed: ${JSON.stringify(failedResponse.body)}`);
		}
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
