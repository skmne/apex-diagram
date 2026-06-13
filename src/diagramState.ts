import * as vscode from "vscode";
import { DiagrammModel } from "./DiagrammModel";

const DIAGRAM_STATE_KEY = "apexDiagram.diagramState";

function getStoredDiagramData(context: vscode.ExtensionContext): DiagrammModel {
	const storedData = context.workspaceState.get<DiagrammModel>(DIAGRAM_STATE_KEY);
	if (!storedData) {
		return new DiagrammModel();
	}

	return {
		nodes: storedData.nodes ?? [],
		links: storedData.links ?? [],
	};
}

function saveDiagramData(context: vscode.ExtensionContext, data: DiagrammModel): Thenable<void> {
	return context.workspaceState.update(DIAGRAM_STATE_KEY, data);
}

export { getStoredDiagramData, saveDiagramData };
