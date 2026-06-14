import { Connection } from "jsforce";

import { ApexClass, ApexClassWithBody } from "./ApexClass";
import { ApexClassMember } from "./ApexClassMember";
import { Memento, Uri } from "vscode";
import { ApexSymbolTableGenerator } from "./ApexSymbolTableGenerator";
import { SALESFORCE_API_VERSION } from "./salesforceConstants";
import { SymbolTableCache } from "./SymbolTableCache";

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
	private symbolTableGenerator: ApexSymbolTableGenerator;

	constructor(instanceUrl: string, accessToken: string, workspaceState: Memento, storageUri: Uri) {
		super(instanceUrl, accessToken);
		this.baseUrl += "/tooling";
		this.symbolTableGenerator = new ApexSymbolTableGenerator(
			this,
			new SymbolTableCache(workspaceState, storageUri, this.instanceUrl)
		);
	}

	public async getApexClasses(): Promise<ApexClass[]> {
		let query = `
    		SELECT Id, NamespacePrefix, Name, ApiVersion, LastModifiedDate
    		FROM ApexClass
    	`;
		query += ` WHERE ManageableState != \'installed\'`;

		const result = await this.query(query);
		const apexClasses = result?.records as unknown as ApexClass[];

		return apexClasses?.filter((item) => !this.isLikelyTestClassName(item.Name));
	}

	public async getApexClassesByNames(apexClassNames: string[]): Promise<ApexClassWithBody[]> {
		let query = `
    		SELECT Id, NamespacePrefix, Name, Body, LastModifiedDate
   		 	FROM ApexClass
		`;

		const apexClassNameConditions = apexClassNames.map((item: string) => {
			return "'" + this.escapeSingleQuotes(item) + "'";
		});
		query += ` WHERE Name IN (${apexClassNameConditions.join(",")})`;

		const result = await this.query(query);
		const apexClasses = result?.records as unknown as ApexClassWithBody[];
		return apexClasses;
	}

	public async getContainerAsyncRequest(asyncReqId: string) {
		return this.query(
			`SELECT Id, State, ErrorMsg, IsCheckOnly FROM ContainerAsyncRequest WHERE Id=\'${this.escapeSingleQuotes(asyncReqId)}\'`
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

	public async createApexClassMember(apexClasses: ApexClassWithBody[], metadataContainerId: string) {
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

	public async generateApexSymbolTable(apexClassNames: string[]): Promise<ApexClassMember[]> {
		return this.symbolTableGenerator.generate(apexClassNames);
	}

	public getApexClassMemberByMetadataContainerId(metadataContainerId: string) {
		return this.query(
			`
				SELECT Id, SymbolTable, LastSyncDate
				FROM ApexClassMember
				WHERE MetadataContainerId = \'${this.escapeSingleQuotes(metadataContainerId)}\'
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

	private getApexMembers(apexClasses: ApexClassWithBody[], metadataContainerId: string) {
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

	private isLikelyTestClassName(name: string): boolean {
		return /(^test|tests?$|_tests?$|tests?_)/i.test(name);
	}

	private escapeSingleQuotes(value: string): string {
		return value.replace(/'/g, "\\'");
	}
}
export { ToolingApi };
