import * as assert from "assert";
import type * as vscode from "vscode";
import { DiagrammModel } from "../../src/model/DiagrammModel";
import { getStoredDiagramData, saveDiagramData } from "../../src/diagram/diagramState";
import { Link } from "../../src/model/Link";
import Node from "../../src/model/Node";
import { MemoryMemento } from "./testDoubles";

const DIAGRAM_STATE_KEY = "apexDiagram.diagramState";

function contextWith(workspaceState = new MemoryMemento()): vscode.ExtensionContext {
	return { workspaceState } as unknown as vscode.ExtensionContext;
}

suite("diagramState", () => {
	test("returns an empty model when no diagram was saved", () => {
		assert.deepStrictEqual(getStoredDiagramData(contextWith()), new DiagrammModel());
	});

	test("saves and restores nodes with links", async () => {
		const workspaceState = new MemoryMemento();
		const data = new DiagrammModel();
		data.nodes = [new Node("pkg", "InvoiceService")];
		data.links = [new Link("pkg.InvoiceService", "pkg.Logger")];

		await saveDiagramData(contextWith(workspaceState), data);

		assert.deepStrictEqual(getStoredDiagramData(contextWith(workspaceState)), {
			nodes: data.nodes,
			links: data.links,
		});
	});

	test("normalizes older partial state shapes", async () => {
		const workspaceState = new MemoryMemento();
		await workspaceState.update(DIAGRAM_STATE_KEY, { nodes: [new Node("", "InvoiceService")] });

		assert.deepStrictEqual(getStoredDiagramData(contextWith(workspaceState)), {
			nodes: [new Node("", "InvoiceService")],
			links: [],
		});
	});
});
