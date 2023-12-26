import * as vscode from "vscode";
import { ApexClassTreeDataProvider } from "./ApexClassTreeDataProvider";
import DiagramWorkspaceProvider from "./DiagramWorkspaceProvider";
import { getSalesforceUserInfo } from "./sfdx/sfdx";
import UserInfo from "./sfdx/UserInfo";
import { ToolingApi } from "./salesforceAPI/salesforceClient";
import { ApexClass } from "./salesforceAPI/ApexClass";
import { parseDependency } from "./dependencyAnalaizer";
import { DiagrammModel } from "./DiagrammModel";
import { ApexClassMember } from "./salesforceAPI/ApexClassMember";

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
	const tooling = new ToolingApi(userInfo.instanceUrl, userInfo.accessToken, context.workspaceState);
	const apexClasses: ApexClass[] = await tooling.getApexClasses();
	const apexClassesTreeProvider = new ApexClassTreeDataProvider(rootPath, apexClasses);
	const activeApexClassesTreeProvider = new ApexClassTreeDataProvider(rootPath, []);
	vscode.window.createTreeView("apex-classes-view", {
		treeDataProvider: apexClassesTreeProvider,
		canSelectMany: true,
	});
	vscode.window.createTreeView("active-apex-classes-view", {
		treeDataProvider: activeApexClassesTreeProvider,
		canSelectMany: true,
	});

	vscode.commands.registerCommand("apex-classes-view.refreshEntry", () => apexClassesTreeProvider.refresh()); //todo add refresh logic

	vscode.commands.registerCommand("apex-classes-view.addEntry", async (node: any, selectedNodes: any) => {
		if (!selectedNodes) {
			selectedNodes = [node];
		}

		console.log("selected nodes", selectedNodes);

		selectedNodes.forEach((node: any) => {
			node.contextValue = "remove_context";
		});

		const nodeIds = selectedNodes.map((item: any) => item.id);
		activeApexClassesTreeProvider.add(selectedNodes);
		apexClassesTreeProvider.remove(nodeIds);

		const diagramWorkspace = DiagramWorkspaceProvider.newInstance(context);
		let newData = new DiagrammModel();
		newData.nodes = selectedNodes;

		let currentData = diagramWorkspace.getData();
		currentData.nodes = [...currentData.nodes, ...selectedNodes];

		const apexClassNames = currentData.nodes.map((node: any) => node.name);
		console.log(apexClassNames);
		if (apexClassNames.length > 1) {
			const apexClassMembers: any = await tooling.generateApexSymbolTable(apexClassNames);
			const dependencyData = parseDependency(apexClassMembers);

			newData.links = dependencyData.links;
			console.log("Dependency  = ", dependencyData);
		}
		diagramWorkspace.addNodes(newData);

		vscode.window.showInformationMessage(`Successfully added ${selectedNodes.length}.`);
	});

	vscode.commands.registerCommand("active-apex-classes-view.removeEntry", (node: any, selectedNodes: any) => {
		if (!selectedNodes) {
			selectedNodes = [node];
		}

		selectedNodes.forEach((node: any) => {
			node.contextValue = "add_context";
		});
		const nodeIds = selectedNodes.map((item: any) => item.id);
		// apexClassesTreeProvider.refreshItems(selectedNodes);
		activeApexClassesTreeProvider.remove(nodeIds);
		apexClassesTreeProvider.add(selectedNodes);

		DiagramWorkspaceProvider.newInstance(context).removeNodes(nodeIds);

		vscode.window.showInformationMessage(`Successfully remove ${selectedNodes.length}.`);
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
