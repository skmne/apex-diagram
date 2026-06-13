import type { ToolingApi } from "./salesforceClient";
import { ApexClassMember } from "./ApexClassMember";
import { SymbolTableCache } from "./SymbolTableCache";

const ASYNC_REQUEST_POLL_INTERVAL_MS = 2000;
const ASYNC_REQUEST_MAX_POLL_ATTEMPTS = 450;
const PENDING_ASYNC_REQUEST_STATES = new Set(["Queued", "Processing"]);

class ApexSymbolTableGenerator {
	constructor(
		private readonly toolingApi: ToolingApi,
		private readonly cache: SymbolTableCache
	) {}

	public async generate(apexClassNames: string[]): Promise<ApexClassMember[]> {
		const apexClasses = await this.toolingApi.getApexClassesByNames(apexClassNames);
		if (!apexClasses || apexClasses.length === 0) {
			return [];
		}

		const { cachedApexClassMembers, uncachedApexClasses } = await this.cache.getCachedAndUncachedApexClasses(apexClasses);
		if (uncachedApexClasses.length === 0) {
			return cachedApexClassMembers;
		}

		const container = await this.toolingApi.createMetadataContainer();
		const containerId = container.id;
		if (!containerId) {
			throw Error("Create MetadataContainer Failed: missing container id");
		}

		try {
			await this.toolingApi.createApexClassMember(uncachedApexClasses, containerId);

			const asyncReq = await this.toolingApi.createContainerAsyncRequest(containerId);
			if (!asyncReq.id) {
				throw Error("Create ContainerAsyncRequest Failed: missing request id");
			}

			const reqRes = await this.checkAsyncRequestResult(asyncReq.id);
			if (reqRes.records[0]?.State !== "Completed") {
				throw Error("Generate Symbol Table Failed");
			}

			const apexClassMemberResult = await this.toolingApi.getApexClassMemberByMetadataContainerId(containerId);
			const apexClassMembers = apexClassMemberResult.records as unknown as ApexClassMember[];
			await this.cache.save(apexClassMembers);

			return [...cachedApexClassMembers, ...apexClassMembers];
		} finally {
			await this.toolingApi.deleteMetadataContainer([containerId]).catch((err) => {
				console.warn("Apex Diagram: Failed to delete metadata container", err);
			});
		}
	}

	private async checkAsyncRequestResult(asyncRequestId: string) {
		let reqRes = await this.toolingApi.getContainerAsyncRequest(asyncRequestId);

		for (let attempt = 0; attempt < ASYNC_REQUEST_MAX_POLL_ATTEMPTS; attempt++) {
			const state = reqRes.records[0]?.State;
			if (!state || !PENDING_ASYNC_REQUEST_STATES.has(state)) {
				return reqRes;
			}

			await this.sleep(ASYNC_REQUEST_POLL_INTERVAL_MS);
			reqRes = await this.toolingApi.getContainerAsyncRequest(asyncRequestId);
		}

		const state = reqRes.records[0]?.State ?? "unknown";
		throw Error(`Generate Symbol Table timed out while ContainerAsyncRequest was ${state}`);
	}

	private sleep(ms: number) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

export { ApexSymbolTableGenerator };
