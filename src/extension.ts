import * as vscode from "vscode";
import { ApexClassTreeDataProvider } from "./ApexClassTreeDataProvider";
import DiagramWorkspaceProvider from "./DiagramWorkspaceProvider";
import { getSalesforceUserInfo } from "./sfdx/sfdx";
import UserInfo from "./sfdx/UserInfo";
import { ToolingApi } from "./salesforceAPI/salesforceClient";
import ApexClass from "./salesforceAPI/ApexClass";
import { parseDependency } from "./dependencyAnalaizer";
import { DiagrammModel } from "./DiagrammModel";

export async function activate(context: vscode.ExtensionContext) {
	const rootPath: any =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

	if (!rootPath) {
		throw Error("salesforce project was not found");
	}

	const userInfo: UserInfo = await getSalesforceUserInfo(rootPath);
	vscode.window.showInformationMessage("user info = " + userInfo.username);
	const tooling = new ToolingApi(userInfo.instanceUrl, userInfo.accessToken);
	const apexClasses: ApexClass[] = await tooling.getApexClasses();

	const apexClassesTreeProvider = new ApexClassTreeDataProvider(rootPath, apexClasses);

	vscode.window.createTreeView("apex-classes-view", {
		treeDataProvider: apexClassesTreeProvider,
		canSelectMany: true,
	});

	vscode.commands.registerCommand("apex-classes-view.refreshEntry", () => apexClassesTreeProvider.refresh());

	vscode.commands.registerCommand("apex-classes-view.addEntry", async (node: any) => {
		node.contextValue = "remove_context";
		apexClassesTreeProvider.refreshItem(node);
		const diagramWorkspace = DiagramWorkspaceProvider.newInstance(context);
		let newData = new DiagrammModel();
		newData.nodes = [node];

		let currentData = diagramWorkspace.getData();
		currentData.nodes = [...currentData.nodes, node];

		const apexClassNames = currentData.nodes.map((node: any) => node.name);
		console.log(apexClassNames);
		if (apexClassNames.length > 1) {
			const apexSymbolTable: any = await tooling.generateApexSymbolTable(apexClassNames);
			const dependencyData = parseDependency(apexSymbolTable.records);

			newData.links = dependencyData.links;
			console.log("Dependency  = ", dependencyData);
		}
		diagramWorkspace.addNodes(newData);

		vscode.window.showInformationMessage(`Successfully added ${node.id}.`);
	});

	vscode.commands.registerCommand("apex-classes-view.removeEntry", (node: any) => {
		node.contextValue = "add_context";
		apexClassesTreeProvider.refreshItem(node);

		DiagramWorkspaceProvider.newInstance(context).removeNodes([node.id]);

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
