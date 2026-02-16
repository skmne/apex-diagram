import * as assert from "assert";
import { Link } from "../../Link";

suite("Link", () => {
	test("should set source, target, and type", () => {
		const link = new Link(1, 2, "Inheritance");

		assert.strictEqual(link.source, 1);
		assert.strictEqual(link.target, 2);
		assert.strictEqual(link.type, "Inheritance");
	});

	test("should default type to 'Directed Association' when not provided", () => {
		const link = new Link(1, 2);

		assert.strictEqual(link.type, "Directed Association");
	});

	test("should default type to 'Directed Association' when type is undefined", () => {
		const link = new Link(1, 2, undefined);

		assert.strictEqual(link.type, "Directed Association");
	});

	test("should accept 'Realization' type", () => {
		const link = new Link(1, 2, "Realization");

		assert.strictEqual(link.type, "Realization");
	});

	test("should handle all undefined parameters", () => {
		const link = new Link();

		assert.strictEqual(link.source, undefined);
		assert.strictEqual(link.target, undefined);
		assert.strictEqual(link.type, "Directed Association");
	});
});
