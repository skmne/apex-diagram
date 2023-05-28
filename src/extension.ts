import * as vscode from "vscode";
import { ApexClassTreeDataProvider } from "./ApexClassTreeDataProvider";
import { Webview } from "vscode";

import DiagramWorkspaceProvider from "./DiagramWorkspaceProvider";

export function activate(context: vscode.ExtensionContext) {
	const rootPath: any =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

	const data: Array<any> = [
		{ name: "Account", version: "v54" },
		{ name: "BoatDataService", version: "v54" },
		{ name: "GenerateDataTests", version: "v54" },
		{ name: "fflib_SObjectDescribe", version: "v54" },
		{ name: "fflib_SObjectDomain", version: "v54" },
		{ name: "fflib_ISelectorFactory", version: "v54" },
		{ name: "fflib_Application", version: "v54" },
		{ name: "fflib_ISObjects", version: "v54" },
		{ name: "BaseApexClass", version: "v54" },
		{ name: "fflib_SObjectSelector", version: "v54" },
	];

	const apexClassesTreeProvider = new ApexClassTreeDataProvider(rootPath, data);

	vscode.window.createTreeView("apex-classes-view", {
		treeDataProvider: apexClassesTreeProvider,
		canSelectMany: true,
	});

	vscode.commands.registerCommand("apex-classes-view.refreshEntry", () => apexClassesTreeProvider.refresh());

	vscode.commands.registerCommand("apex-classes-view.addEntry", (node: any) => {
		node.contextValue = "remove_context";
		apexClassesTreeProvider.refreshItem(node);

		DiagramWorkspaceProvider.newInstance(context).executeWebviewCommand("Add", node.label);

		vscode.window.showInformationMessage(`Successfully added ${node.label}.`);
	});
	vscode.commands.registerCommand("apex-classes-view.removeEntry", (node: any) => {
		node.contextValue = "add_context";
		apexClassesTreeProvider.refreshItem(node);

		DiagramWorkspaceProvider.newInstance(context).executeWebviewCommand("Remove", node.label);

		vscode.window.showInformationMessage(`Successfully remove ${node.label}.`);
	});
	vscode.commands.registerCommand("apex-classes-view.openWorkspace", (node: any) =>
		vscode.commands.executeCommand("diagram-workspace.start")
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("diagram-workspace.start", () => {
			vscode.commands.executeCommand("apex-classes-view.focus");

			return DiagramWorkspaceProvider.newInstance(context).getWebviewPanel();
		})
	);
}

export function deactivate() {}
