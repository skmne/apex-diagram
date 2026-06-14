import * as assert from "assert";
import Node from "../../src/model/Node";

suite("Node", () => {
	test("should set name and namespace", () => {
		const node = new Node("myns", "AccountService");

		assert.strictEqual(node.name, "AccountService");
		assert.strictEqual(node.namespace, "myns");
	});

	test("should build id as namespace.name when namespace is provided", () => {
		const node = new Node("myns", "AccountService");

		assert.strictEqual(node.id, "myns.AccountService");
	});

	test("should build id as name only when namespace is empty string", () => {
		const node = new Node("", "AccountService");

		assert.strictEqual(node.id, "AccountService");
	});

	test("should build id as name only when namespace is undefined", () => {
		const node = new Node(undefined, "AccountService");

		assert.strictEqual(node.id, "AccountService");
	});

	test("should handle undefined name", () => {
		const node = new Node("myns", undefined);

		assert.strictEqual(node.name, undefined);
		assert.strictEqual(node.id, "myns.undefined");
	});

	test("should handle both undefined", () => {
		const node = new Node(undefined, undefined);

		assert.strictEqual(node.name, undefined);
		assert.strictEqual(node.namespace, undefined);
		assert.strictEqual(node.id, undefined);
	});

	test("should handle no constructor arguments", () => {
		const node = new Node();

		assert.strictEqual(node.name, undefined);
		assert.strictEqual(node.namespace, undefined);
		assert.strictEqual(node.id, undefined);
	});
});
