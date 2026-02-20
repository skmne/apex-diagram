import * as assert from "assert";
import { parseDependency, getUnloadedApexNames } from "../../dependencyAnalyzer";
import { ApexClassMember } from "../../salesforceAPI/ApexClassMember";

function createApexClassMember(
	name: string,
	opts?: {
		namespace?: string;
		parentClass?: string;
		interfaces?: string[];
		externalReferences?: Array<{ name: string; namespace?: string }>;
	}
): ApexClassMember {
	return {
		Id: `id_${name}`,
		LastSyncDate: new Date(),
		SymbolTable: {
			id: `id_${name}`,
			name,
			namespace: opts?.namespace ?? "",
			parentClass: opts?.parentClass,
			interfaces: opts?.interfaces ?? [],
			externalReferences: (opts?.externalReferences ?? []).map((ref) => ({
				name: ref.name,
				namespace: ref.namespace ?? "",
				methods: [],
				references: [],
				variables: [],
			})),
			constructors: [],
			innerClasses: [],
			key: undefined,
			methods: [],
			tableDeclaration: undefined,
			variables: [],
		},
	};
}

suite("parseDependency", () => {
	test("should return empty model for empty input", () => {
		const result = parseDependency([]);
		assert.strictEqual(result.nodes.length, 0);
		assert.strictEqual(result.links.length, 0);
	});

	test("should create nodes for each class", () => {
		const members = [
			createApexClassMember("AccountService"),
			createApexClassMember("ContactService"),
		];

		const result = parseDependency(members);

		assert.strictEqual(result.nodes.length, 2);
		assert.strictEqual(result.nodes[0].name, "AccountService");
		assert.strictEqual(result.nodes[1].name, "ContactService");
	});

	test("should create node with namespace", () => {
		const members = [
			createApexClassMember("AccountService", { namespace: "myns" }),
		];

		const result = parseDependency(members);

		assert.strictEqual(result.nodes.length, 1);
		assert.strictEqual(result.nodes[0].namespace, "myns");
		assert.strictEqual(result.nodes[0].name, "AccountService");
	});

	test("should create Inheritance link for parentClass", () => {
		const members = [
			createApexClassMember("BaseService"),
			createApexClassMember("AccountService", { parentClass: "BaseService" }),
		];

		const result = parseDependency(members);

		assert.strictEqual(result.links.length, 1);
		assert.strictEqual(result.links[0].source, "AccountService");
		assert.strictEqual(result.links[0].target, "BaseService");
		assert.strictEqual(result.links[0].type, "Inheritance");
	});

	test("should not create Inheritance link when parent is not in the input set", () => {
		const members = [
			createApexClassMember("AccountService", { parentClass: "UnknownBase" }),
		];

		const result = parseDependency(members);

		assert.strictEqual(result.nodes.length, 1);
		assert.strictEqual(result.links.length, 0);
	});

	test("should create Realization links for interfaces", () => {
		const members = [
			createApexClassMember("IService"),
			createApexClassMember("AccountService", { interfaces: ["IService"] }),
		];

		const result = parseDependency(members);

		const realizationLinks = result.links.filter((l) => l.type === "Realization");
		assert.strictEqual(realizationLinks.length, 1);
		assert.strictEqual(realizationLinks[0].source, "AccountService");
		assert.strictEqual(realizationLinks[0].target, "IService");
	});

	test("should create Realization links for multiple interfaces", () => {
		const members = [
			createApexClassMember("IService"),
			createApexClassMember("ILoggable"),
			createApexClassMember("AccountService", {
				interfaces: ["IService", "ILoggable"],
			}),
		];

		const result = parseDependency(members);

		const realizationLinks = result.links.filter((l) => l.type === "Realization");
		assert.strictEqual(realizationLinks.length, 2);
	});

	test("should not create Realization link when interface is not in the input set", () => {
		const members = [
			createApexClassMember("AccountService", { interfaces: ["IUnknown"] }),
		];

		const result = parseDependency(members);

		assert.strictEqual(result.links.length, 0);
	});

	test("should create Directed Association links for external references", () => {
		const members = [
			createApexClassMember("Logger"),
			createApexClassMember("AccountService", {
				externalReferences: [{ name: "Logger" }],
			}),
		];

		const result = parseDependency(members);

		const assocLinks = result.links.filter((l) => l.type === "Directed Association");
		assert.strictEqual(assocLinks.length, 1);
		assert.strictEqual(assocLinks[0].source, "AccountService");
		assert.strictEqual(assocLinks[0].target, "Logger");
	});

	test("should not create link for external reference not in the input set", () => {
		const members = [
			createApexClassMember("AccountService", {
				externalReferences: [{ name: "UnknownUtil" }],
			}),
		];

		const result = parseDependency(members);

		assert.strictEqual(result.links.length, 0);
	});

	test("should handle external reference with namespace", () => {
		const members = [
			createApexClassMember("Logger", { namespace: "myns" }),
			createApexClassMember("AccountService", {
				externalReferences: [{ name: "Logger", namespace: "myns" }],
			}),
		];

		const result = parseDependency(members);

		const assocLinks = result.links.filter((l) => l.type === "Directed Association");
		assert.strictEqual(assocLinks.length, 1);
		assert.strictEqual(assocLinks[0].target, "myns.Logger");
	});

	test("should handle class with all relationship types", () => {
		const members = [
			createApexClassMember("BaseService"),
			createApexClassMember("IService"),
			createApexClassMember("Logger"),
			createApexClassMember("AccountService", {
				parentClass: "BaseService",
				interfaces: ["IService"],
				externalReferences: [{ name: "Logger" }],
			}),
		];

		const result = parseDependency(members);

		assert.strictEqual(result.nodes.length, 4);
		assert.strictEqual(result.links.length, 3);

		const inheritance = result.links.filter((l) => l.type === "Inheritance");
		const realization = result.links.filter((l) => l.type === "Realization");
		const association = result.links.filter((l) => l.type === "Directed Association");

		assert.strictEqual(inheritance.length, 1);
		assert.strictEqual(realization.length, 1);
		assert.strictEqual(association.length, 1);
	});

	test("should handle single class with no relationships", () => {
		const members = [createApexClassMember("StandaloneClass")];

		const result = parseDependency(members);

		assert.strictEqual(result.nodes.length, 1);
		assert.strictEqual(result.links.length, 0);
		assert.strictEqual(result.nodes[0].name, "StandaloneClass");
	});
});

suite("getUnloadedApexNames", () => {
	test("should return empty array when no dependencies are missing", () => {
		const old = [
			createApexClassMember("BaseService"),
			createApexClassMember("AccountService", { parentClass: "BaseService" }),
		];

		const result = getUnloadedApexNames(old, [old[1]]);

		assert.strictEqual(result.length, 0);
	});

	test("should detect unloaded parent class", () => {
		const loaded = [createApexClassMember("AccountService")];
		const newMembers = [
			createApexClassMember("AccountService", { parentClass: "BaseService" }),
		];

		const result = getUnloadedApexNames(loaded, newMembers);

		assert.strictEqual(result.length, 1);
		assert.ok(result.includes("BaseService"));
	});

	test("should detect unloaded interfaces", () => {
		const loaded = [createApexClassMember("AccountService")];
		const newMembers = [
			createApexClassMember("AccountService", {
				interfaces: ["IService", "ILoggable"],
			}),
		];

		const result = getUnloadedApexNames(loaded, newMembers);

		assert.strictEqual(result.length, 2);
		assert.ok(result.includes("IService"));
		assert.ok(result.includes("ILoggable"));
	});

	test("should not include already loaded interfaces", () => {
		const loaded = [
			createApexClassMember("AccountService"),
			createApexClassMember("IService"),
		];
		const newMembers = [
			createApexClassMember("AccountService", {
				interfaces: ["IService", "ILoggable"],
			}),
		];

		const result = getUnloadedApexNames(loaded, newMembers);

		assert.strictEqual(result.length, 1);
		assert.ok(result.includes("ILoggable"));
	});

	test("should detect unloaded external references", () => {
		const loaded = [createApexClassMember("AccountService")];
		const newMembers = [
			createApexClassMember("AccountService", {
				externalReferences: [{ name: "Logger" }, { name: "Utils" }],
			}),
		];

		const result = getUnloadedApexNames(loaded, newMembers);

		assert.strictEqual(result.length, 2);
		assert.ok(result.includes("Logger"));
		assert.ok(result.includes("Utils"));
	});

	test("should not include already loaded external references", () => {
		const loaded = [
			createApexClassMember("AccountService"),
			createApexClassMember("Logger"),
		];
		const newMembers = [
			createApexClassMember("AccountService", {
				externalReferences: [{ name: "Logger" }, { name: "Utils" }],
			}),
		];

		const result = getUnloadedApexNames(loaded, newMembers);

		assert.strictEqual(result.length, 1);
		assert.ok(result.includes("Utils"));
	});

	test("should deduplicate results", () => {
		const loaded = [
			createApexClassMember("ClassA"),
			createApexClassMember("ClassB"),
		];
		const newMembers = [
			createApexClassMember("ClassA", {
				externalReferences: [{ name: "SharedDep" }],
			}),
			createApexClassMember("ClassB", {
				externalReferences: [{ name: "SharedDep" }],
			}),
		];

		const result = getUnloadedApexNames(loaded, newMembers);

		assert.strictEqual(result.length, 1);
		assert.ok(result.includes("SharedDep"));
	});

	test("should detect all types of unloaded dependencies at once", () => {
		const loaded = [createApexClassMember("AccountService")];
		const newMembers = [
			createApexClassMember("AccountService", {
				parentClass: "BaseService",
				interfaces: ["IService"],
				externalReferences: [{ name: "Logger" }],
			}),
		];

		const result = getUnloadedApexNames(loaded, newMembers);

		assert.strictEqual(result.length, 3);
		assert.ok(result.includes("BaseService"));
		assert.ok(result.includes("IService"));
		assert.ok(result.includes("Logger"));
	});

	test("should return empty array when new members have no dependencies", () => {
		const loaded = [createApexClassMember("AccountService")];
		const newMembers = [createApexClassMember("AccountService")];

		const result = getUnloadedApexNames(loaded, newMembers);

		assert.strictEqual(result.length, 0);
	});
});
