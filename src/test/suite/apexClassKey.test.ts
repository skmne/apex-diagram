import * as assert from "assert";
import { getApexClassKey } from "../../apexClassKey";

suite("getApexClassKey", () => {
	test("uses namespace-qualified keys only when namespace is present", () => {
		assert.strictEqual(getApexClassKey("pkg", "InvoiceService"), "pkg.InvoiceService");
		assert.strictEqual(getApexClassKey("", "InvoiceService"), "InvoiceService");
		assert.strictEqual(getApexClassKey(undefined, "InvoiceService"), "InvoiceService");
	});

	test("returns undefined when both parts are missing", () => {
		assert.strictEqual(getApexClassKey(undefined, undefined), undefined);
	});
});
