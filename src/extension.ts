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
	type DiagramProgress = vscode.Progress<{ message?: string }>;

	const rootPath: string | undefined =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

	if (!rootPath) {
		throw Error("Salesforce project was not found");
	}

	vscode.window.showInformationMessage("Authenticate with Salesforce");
	const userInfo: UserInfo = await getSalesforceUserInfo(rootPath);
	const tooling = new ToolingApi(userInfo.instanceUrl, userInfo.accessToken, context.workspaceState);
	vscode.window.showInformationMessage("Retrieve Apex classes");
	const apexClasses: ApexClass[] = await tooling.getApexClasses();

	const apexClassesIcon = new vscode.ThemeIcon("file");
	const activeApexClassesIcon = new vscode.ThemeIcon("symbol-class");
	const apexClassesTreeProvider = new ApexClassTreeDataProvider(rootPath, apexClasses, apexClassesIcon);
	const activeApexClassesTreeProvider = new ApexClassTreeDataProvider(rootPath, [], activeApexClassesIcon);

	vscode.window.createTreeView("apex-classes-view", {
		treeDataProvider: apexClassesTreeProvider,
		canSelectMany: true,
	});
	vscode.window.createTreeView("active-apex-classes-view", {
		treeDataProvider: activeApexClassesTreeProvider,
		canSelectMany: true,
	});

	vscode.commands.registerCommand("apex-classes-view.refreshEntry", () => {
		vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Notification, title: "Apex Diagram" },
			async (progress) => {
				progress.report({ message: "Refreshing Apex classes" });
				const freshApexClasses = await tooling.getApexClasses();
				const activeIds = new Set(activeApexClassesTreeProvider.getItemIds());
				apexClassesTreeProvider.updateApexClasses(
					freshApexClasses.filter((c) => {
						const id = c.NamespacePrefix ? c.NamespacePrefix + "." + c.Name : c.Name;
						return !activeIds.has(id);
					})
				);
			}
		);
	});

	vscode.commands.registerCommand("apex-classes-view.clearCache", async () => {
		await clearSymbolTableCache(context);
		vscode.window.showInformationMessage("Apex Diagram symbol table cache cleared.");
	});

	vscode.commands.registerCommand("diagram-workspace.clear", () => {
		clearWorkspaceDiagram();
		vscode.window.showInformationMessage("Apex Diagram workspace cleared.");
	});

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
			node.iconPath = apexClassesIcon;
		});
		const nodeIds = selectedNodes.map((item: ApexClassTreeItem) => item.id);
		activeApexClassesTreeProvider.remove(nodeIds);
		apexClassesTreeProvider.add(selectedNodes);

		DiagramWorkspaceProvider.newInstance(context).removeNodes(nodeIds);

		vscode.window.showInformationMessage(
			`Successfully remove ${selectedNodes.length} Apex class${selectedNodes.length > 1 ? "es" : ""}`
		);
	});

	vscode.commands.registerCommand("active-apex-classes-view.openClass", async (node: ApexClassTreeItem) => {
		if (!node) {
			return;
		}

		await openApexClass(node);
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

	async function addEntry(node: ApexClassTreeItem, selectedNodes: ApexClassTreeItem[], progress: DiagramProgress) {
		const nodesToAdd = selectedNodes ?? [node];
		progress.report({ message: "Receiving Apex Classes Details" });

		const diagramWorkspace = DiagramWorkspaceProvider.newInstance(context);
		const newNodes = determineNewNodes(diagramWorkspace, nodesToAdd);

		if (newNodes.length === 0) {
			return;
		}

		const diagramData = await createDiagramData(diagramWorkspace, newNodes, progress);
		moveNodesToActiveList(newNodes);
		addToDiagram(diagramWorkspace, diagramData);

		vscode.window.showInformationMessage(
			`Successfully add ${newNodes.length} Apex class${newNodes.length > 1 ? "es" : ""}`
		);
	}

	function determineNewNodes(diagramWorkspace: DiagramWorkspaceProvider, nodes: ApexClassTreeItem[]): ApexClassTreeItem[] {
		return diagramWorkspace.getNewNodes(nodes);
	}

	function moveNodesToActiveList(nodes: ApexClassTreeItem[]): void {
		nodes.forEach((node: ApexClassTreeItem) => {
			node.contextValue = "remove_context";
			node.iconPath = activeApexClassesIcon;
		});

		const nodeIds = nodes.map((item: ApexClassTreeItem) => item.id);
		activeApexClassesTreeProvider.add(nodes);
		apexClassesTreeProvider.remove(nodeIds);
	}

	async function createDiagramData(
		diagramWorkspace: DiagramWorkspaceProvider,
		newNodes: ApexClassTreeItem[],
		progress: DiagramProgress
	): Promise<DiagrammModel> {
		const newData = new DiagrammModel();
		newData.nodes = newNodes;

		const apexClassMembers = await generateSymbolTables(diagramWorkspace, newNodes);
		if (apexClassMembers.length > 0) {
			progress.report({ message: "Analyzing Dependencies" });
			newData.links = parseDependency(apexClassMembers).links;
		}

		return newData;
	}

	function addToDiagram(diagramWorkspace: DiagramWorkspaceProvider, diagramData: DiagrammModel): void {
		diagramWorkspace.addNodes(diagramData);
	}

	function clearWorkspaceDiagram(): void {
		const activeNodes = activeApexClassesTreeProvider.getItems();
		activeNodes.forEach((node) => {
			node.contextValue = "add_context";
			node.iconPath = apexClassesIcon;
		});

		activeApexClassesTreeProvider.remove(activeNodes.map((node) => node.id));
		apexClassesTreeProvider.add(activeNodes);
		DiagramWorkspaceProvider.getInstance()?.clear();
	}

	async function generateSymbolTables(
		diagramWorkspace: DiagramWorkspaceProvider,
		newNodes: ApexClassTreeItem[]
	): Promise<ApexClassMember[]> {
		const apexClassNames = diagramWorkspace.getNodeNames(newNodes);
		if (apexClassNames.length <= 1) {
			return [];
		}

		return tooling.generateApexSymbolTable(apexClassNames) as Promise<ApexClassMember[]>;
	}

	async function openApexClass(node: ApexClassTreeItem): Promise<void> {
		const apexFileName = `${node.label}.cls`;
		const apexClassFiles = await vscode.workspace.findFiles(`**/${apexFileName}`, "**/node_modules/**", 1);

		if (apexClassFiles.length === 0) {
			vscode.window.showWarningMessage(`Apex class file was not found: ${apexFileName}`);
			return;
		}

		const document = await vscode.workspace.openTextDocument(apexClassFiles[0]);
		await vscode.window.showTextDocument(document);
	}
}

async function clearSymbolTableCache(context: vscode.ExtensionContext) {
	await Promise.all(context.workspaceState.keys().map((key) => context.workspaceState.update(key, undefined)));
}

export function deactivate() {}
