import * as assert from "assert";
import { parseDependency } from "../../src/analyzer/dependencyAnalyzer";
import { ApexClassMember } from "../../src/salesforceAPI/ApexClassMember";

type Ref = { name: string; namespace?: string };

function member(
	name: string,
	opts: {
		namespace?: string;
		parentClass?: string;
		interfaces?: string[];
		externalReferences?: Ref[];
	} = {}
): ApexClassMember {
	return {
		Id: name,
		LastSyncDate: new Date(0),
		SymbolTable: {
			id: name,
			name,
			namespace: opts.namespace ?? "",
			parentClass: opts.parentClass,
			interfaces: opts.interfaces ?? [],
			externalReferences: (opts.externalReferences ?? []).map((ref) => ({
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

function linkKeys(model = parseDependency([])): string[] {
	return model.links.map((link) => `${link.source}->${link.target}:${link.type}`).sort();
}

suite("parseDependency", () => {
	test("creates one node per Apex class", () => {
		const model = parseDependency([
			member("InvoiceService"),
			member("Logger", { namespace: "pkg" }),
		]);

		assert.deepStrictEqual(
			model.nodes.map((node) => ({ id: node.id, name: node.name, namespace: node.namespace })),
			[
				{ id: "InvoiceService", name: "InvoiceService", namespace: "" },
				{ id: "pkg.Logger", name: "Logger", namespace: "pkg" },
			]
		);
		assert.deepStrictEqual(model.links, []);
	});

	test("creates inheritance, realization, and association links for known classes", () => {
		const model = parseDependency([
			member("BaseService"),
			member("Auditable"),
			member("Logger"),
			member("InvoiceService", {
				parentClass: "BaseService",
				interfaces: ["Auditable"],
				externalReferences: [{ name: "Logger" }],
			}),
		]);

		assert.deepStrictEqual(linkKeys(model), [
			"InvoiceService->Auditable:Realization",
			"InvoiceService->BaseService:Inheritance",
			"InvoiceService->Logger:Directed Association",
		]);
	});

	test("ignores parent, interface, and external references outside the input set", () => {
		const model = parseDependency([
			member("InvoiceService", {
				parentClass: "MissingBase",
				interfaces: ["MissingInterface"],
				externalReferences: [{ name: "MissingLogger" }],
			}),
		]);

		assert.strictEqual(model.nodes.length, 1);
		assert.deepStrictEqual(model.links, []);
	});

	test("matches namespaced source and external reference keys", () => {
		const model = parseDependency([
			member("Logger", { namespace: "pkg" }),
			member("InvoiceService", {
				namespace: "pkg",
				externalReferences: [{ namespace: "pkg", name: "Logger" }],
			}),
		]);

		assert.deepStrictEqual(linkKeys(model), [
			"pkg.InvoiceService->pkg.Logger:Directed Association",
		]);
	});

	test("does not match an unnamespaced reference to a namespaced class", () => {
		const model = parseDependency([
			member("Logger", { namespace: "pkg" }),
			member("InvoiceService", {
				externalReferences: [{ name: "Logger" }],
			}),
		]);

		assert.deepStrictEqual(model.links, []);
	});
});
