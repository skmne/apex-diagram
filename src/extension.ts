import * as vscode from "vscode";
import { ApexClassTreeDataProvider, ApexClassTreeItem } from "./ApexClassTreeDataProvider";
import DiagramWorkspaceProvider from "./DiagramWorkspaceProvider";
import { getSalesforceUserInfo } from "./sfdx/sfdx";
import UserInfo from "./sfdx/UserInfo";
import { ToolingApi } from "./salesforceAPI/salesforceClient";
import { ApexClass } from "./salesforceAPI/ApexClass";
import { ApexClassMember } from "./salesforceAPI/ApexClassMember";
import { parseDependency } from "./dependencyAnalyzer";
import { DiagrammModel } from "./DiagrammModel";

export async function activate(context: vscode.ExtensionContext) {
	const rootPath: string | undefined =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

	if (!rootPath) {
		throw Error("Salesforce project was not found");
	}

	// vscode.window.withProgress(
	// 	{
	// 		location: vscode.ProgressLocation.Notification,
	// 		title: "Apex Diagram",
	// 	},
	// 	async (progress) => {

	// 	}

	// progress.report({ message: "Authenticate with Salesforce" });
	vscode.window.showInformationMessage("Authenticate with Salesforce");
	const userInfo: UserInfo = await getSalesforceUserInfo(rootPath);
	const tooling = new ToolingApi(userInfo.instanceUrl, userInfo.accessToken, context.workspaceState);
	// progress.report({ message: "Retrieve Apex classes" });
	vscode.window.showInformationMessage("Retrieve Apex classes");
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

	vscode.commands.registerCommand("apex-classes-view.addEntry", async (node: ApexClassTreeItem, selectedNodes: ApexClassTreeItem[]) => {
		vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Add Apex Class ${selectedNodes && selectedNodes.length > 1 ? "es" : ""}`,
			},
			async (progress) => {
				await addEntry(node, selectedNodes, progress);
			}
		);
	});

	vscode.commands.registerCommand("active-apex-classes-view.removeEntry", (node: ApexClassTreeItem, selectedNodes: ApexClassTreeItem[]) => {
		if (!selectedNodes) {
			selectedNodes = [node];
		}

		selectedNodes.forEach((node: ApexClassTreeItem) => {
			node.contextValue = "add_context";
		});
		const nodeIds = selectedNodes.map((item: ApexClassTreeItem) => item.id);
		// apexClassesTreeProvider.refreshItems(selectedNodes);
		activeApexClassesTreeProvider.remove(nodeIds);
		apexClassesTreeProvider.add(selectedNodes);

		DiagramWorkspaceProvider.newInstance(context).removeNodes(nodeIds);

		vscode.window.showInformationMessage(
			`Successfully remove ${selectedNodes.length} Apex class${selectedNodes.length > 1 ? "es" : ""}`
		);
	});

	vscode.commands.registerCommand("apex-classes-view.openWorkspace", () =>
		vscode.commands.executeCommand("diagram-workspace.start")
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("diagram-workspace.start", () => {
			vscode.commands.executeCommand("apex-classes-view.focus");
			return DiagramWorkspaceProvider.newInstance(context).getWebviewPanel();
		})
	);

	async function addEntry(node: ApexClassTreeItem, selectedNodes: ApexClassTreeItem[], progress: vscode.Progress<{ message?: string }>) {
		if (!selectedNodes) {
			selectedNodes = [node];
		}
		progress.report({ message: "Receiving Apex Classes Details" });
		console.log("selected nodes", selectedNodes);

		selectedNodes.forEach((node: ApexClassTreeItem) => {
			node.contextValue = "remove_context";
		});

		const nodeIds = selectedNodes.map((item: ApexClassTreeItem) => item.id);
		activeApexClassesTreeProvider.add(selectedNodes);
		apexClassesTreeProvider.remove(nodeIds);

		const diagramWorkspace = DiagramWorkspaceProvider.newInstance(context);
		const newData = new DiagrammModel();
		newData.nodes = selectedNodes;

		const currentData = diagramWorkspace.getData();
		currentData.nodes = [...currentData.nodes, ...selectedNodes];

		const apexClassNames = currentData.nodes.map((node) => node.name);
		console.log(apexClassNames);
		if (apexClassNames.length > 1) {
			const apexClassMembers = await tooling.generateApexSymbolTable(apexClassNames as string[]) as ApexClassMember[];
			progress.report({ message: "Analyzing Dependencies" });
			const dependencyData = parseDependency(apexClassMembers);

			newData.links = dependencyData.links;
			console.log("Dependency  = ", dependencyData);
		}
		diagramWorkspace.addNodes(newData);
		vscode.window.showInformationMessage(
			`Successfully add ${selectedNodes.length} Apex class${selectedNodes.length > 1 ? "es" : ""}`
		);
	}
}

export function deactivate() {}
