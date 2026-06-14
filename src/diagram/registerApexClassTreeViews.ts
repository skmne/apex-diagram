import * as vscode from "vscode";
import { ApexDiagramController } from "./ApexDiagramController";

function registerApexClassTreeViews(controller: ApexDiagramController): vscode.Disposable[] {
	return [
		vscode.window.createTreeView("apex-classes-view", {
			treeDataProvider: controller.apexClassesTreeProvider,
			canSelectMany: true,
		}),
		vscode.window.createTreeView("diagram-items-view", {
			treeDataProvider: controller.diagramItemsTreeProvider,
			canSelectMany: true,
		}),
	];
}

export { registerApexClassTreeViews };
