import * as jsforce from "jsforce";

import ApexClass from "./ApexClass";
import { ApexClassMember } from "./ApexClassMember";
import QueryResult from "./QueryResult";

const APEX_SYMBOL_TABEL_CONTAINER_NAME = "Apex Schema VSCode Extention";

class BaseAPI {
	protected baseUrl: string;
	protected accessToken: string;
	protected instanceUrl: string;
	protected conn: any;

	constructor(instanceUrl: string, accessToken: string) {
		this.instanceUrl = instanceUrl;
		this.baseUrl = instanceUrl + "/services/data/v54.0";
		this.accessToken = accessToken;

		this.conn = new jsforce.Connection({
			instanceUrl: this.instanceUrl,
			accessToken: this.accessToken,
		});
	}
}

class ToolingApi extends BaseAPI {
	constructor(instanceUrl: string, accessToken: string) {
		super(instanceUrl, accessToken);
		this.baseUrl += "/tooling";
	}

	async getApexClasses(): Promise<ApexClass[]> {
		let query = `
    SELECT Id, Name, ApiVersion, Body 
    FROM ApexClass
    `;
		query += ` WHERE ManageableState != \'installed\'`;

		const result: any = await this.query(query);
		const apexClasses: ApexClass[] = result?.records;

		return apexClasses?.filter((item) => !item.Body.toLowerCase().includes("@istest"));
	}

	async getUnmangedApexClasses(apexClassNames: any) {
		let query = `
    SELECT Id, Name, Body 
    FROM ApexClass
    `;

		if (apexClassNames) {
			let apexClassNameConditions = apexClassNames.map((item: any) => {
				return "'" + item + "'";
			});
			query += ` WHERE Name IN (${apexClassNameConditions.join(",")})`;
		} else {
			query += ` WHERE ManageableState != \'installed\'`;
		}
		console.log(query);

		const result: any = await this.query(query);
		console.log("classes result = ", result);
		const apexClasses: ApexClass[] = result?.records;

		return apexClasses?.filter((item) => !item.Body.toLowerCase().includes("@istest"));
	}

	async getMeatadaContainerByName(name: string) {
		return this.query(`SELECT Id FROM MetadataContainer WHERE Name=\'${name}\'`);
	}

	async getContainerAsyncRequest(asyncReqId: string) {
		return this.query(
			`SELECT Id, State, ErrorMsg, IsCheckOnly FROM ContainerAsyncRequest WHERE Id=\'${asyncReqId}\'`
		);
	}

	async deleteMetadataContainer(metadataContainerIds: Array<string>) {
		return new Promise((resolve, reject) => {
			this.conn.tooling.sobject("MetadataContainer").delete(metadataContainerIds, (err: any, res: any) => {
				if (err) {
					reject(err);
				}
				resolve(res);
			});
		});
	}

	async createMetadataContainer() {
		const container = {
			Name: "Apex Schema VSCode Extention",
		};
		return new Promise((resolve, reject) => {
			this.conn.tooling.sobject("MetadataContainer").create(container, (err: any, res: any) => {
				if (err) {
					console.error(err);
					reject(err);
				}
				resolve(res);
			});
		});
	}

	async createApexClassMember(apexClasses: any, metadataContainerId: string) {
		const apexClassMembers = this.#getApexMemberes(apexClasses, metadataContainerId);
		return new Promise((resolve, reject) => {
			this.conn.tooling.sobject("ApexClassMember").create(apexClassMembers, (err: any, res: any) => {
				if (err) {
					console.error(err);
					reject(err);
				}
				resolve(res);
			});
		});
	}

	async createContainerAsyncRequest(containerId: string) {
		return new Promise((resolve, reject) => {
			this.conn.tooling.sobject("ContainerAsyncRequest").create(
				{
					MetadataContainerId: containerId,
					IsCheckOnly: true,
				},
				(err: any, res: any) => {
					if (err) {
						console.error(err);
						reject(err);
					}
					resolve(res);
				}
			);
		});
	}

	async getApexClassMemberByAsyncReqId(asyncRequestId: string) {
		return this.query(
			`
        SELECT Id, SymbolTable 
        FROM ApexClassMember 
        WHERE MetadataContainerId = \'${asyncRequestId}\'
      `
		);
	}

	async query(query: string) {
		return new Promise((resolve, reject) => {
			this.conn.tooling.query(query, (err: any, res: QueryResult) => {
				if (err) {
					console.error(err);
					reject(err);
				}
				resolve(res);
			});
		});
	}

	async removeMetadaContainer(name: string) {
		let metadataCont: any = await this.getMeatadaContainerByName(APEX_SYMBOL_TABEL_CONTAINER_NAME);
		let metadataContainerIds = metadataCont.records.map((item: any) => item.Id);
		if (metadataContainerIds.length > 0) {
			let deleteResult: any = await this.deleteMetadataContainer(metadataContainerIds);
		}
	}

	async generateApexSymbolTable(apexClasses: any) {
		return this.removeMetadaContainer(APEX_SYMBOL_TABEL_CONTAINER_NAME)
			.then(() => {
				return Promise.all([this.getUnmangedApexClasses(apexClasses), this.createMetadataContainer()]);
			})
			.then((result) => {
				let apexClasses: any = result[0];
				let container: any = result[1];

				console.log("classes = ", apexClasses);
				if (!apexClasses || apexClasses.length === 0) {
					return new Promise((resolve) => resolve(apexClasses));
				}
				console.log("apexClasses : ", apexClasses);
				console.log("createMetadataContainer : ", container);
				return this.createApexClassMember(apexClasses, container.id)
					.then(async (apexMembers) => {
						console.log("apexMembers : ", apexMembers);
						return this.createContainerAsyncRequest(container.id);
					})
					.then(async (asyncReq) => {
						console.log("asyncReq : ", asyncReq);
						return this.checkAsyncRequestResult(asyncReq);
					})
					.then(async (reqRes: any) => {
						if (reqRes.records[0]?.State === "Completed") {
							return this.getApexClassMemberByAsyncReqId(container.id);
						} else {
							console.error(reqRes);
							console.error(reqRes.records);
							throw Error("Generate Sybmol Table was Failed");
						}
					});
			})
			.catch((err) => {
				console.error(err);
			});
	}

	async checkAsyncRequestResult(asyncReq: any) {
		await this.#sleep(2000);
		let reqRes: any = await this.getContainerAsyncRequest(asyncReq.id);
		console.log("reqRes : ", reqRes);
		while (reqRes.records[0]?.State === "Queued") {
			await this.#sleep(2000);
			reqRes = await this.getContainerAsyncRequest(asyncReq.id);
			console.log("interval reqRes : ", reqRes);
		}
		return reqRes;
	}

	#sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	#getApexMemberes(apexClasses: any, metadataContainerId: string) {
		let apexMembers = [];
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
