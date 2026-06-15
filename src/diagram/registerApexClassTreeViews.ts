import * as vscode from "vscode";
import { ApexDiagramController } from "./ApexDiagramController";

function registerApexClassTreeViews(controller: ApexDiagramController): vscode.Disposable[] {
	const apexClassesTreeView = vscode.window.createTreeView("apex-classes-view", {
		treeDataProvider: controller.apexClassesTreeProvider,
		canSelectMany: true,
	});
	const diagramItemsTreeView = vscode.window.createTreeView("diagram-items-view", {
		treeDataProvider: controller.diagramItemsTreeProvider,
		canSelectMany: true,
	});

	const loadWhenVisible = (event: vscode.TreeViewVisibilityChangeEvent) => {
		if (event.visible) {
			void controller.loadApexClasses();
		}
	};

	return [
		apexClassesTreeView,
		diagramItemsTreeView,
		apexClassesTreeView.onDidChangeVisibility(loadWhenVisible),
		diagramItemsTreeView.onDidChangeVisibility(loadWhenVisible),
	];
}

export { registerApexClassTreeViews };
