import * as vscode from "vscode";
import { ApexClassTreeDataProvider, ApexClassTreeItem } from "./ApexClassTreeDataProvider";
import DiagramWorkspaceProvider from "./DiagramWorkspaceProvider";
import { getSalesforceUserInfo } from "./sfdx/sfdx";
import { SYMBOL_TABLE_CACHE_DIR, SYMBOL_TABLE_CACHE_KEY_PREFIX, ToolingApi } from "./salesforceAPI/salesforceClient";
import { ApexClass } from "./salesforceAPI/ApexClass";
import { ApexClassMember } from "./salesforceAPI/ApexClassMember";
import { parseDependency } from "./dependencyAnalyzer";
import { DiagrammModel } from "./DiagrammModel";

const DIAGRAM_STATE_KEY = "apexDiagram.diagramState";

export async function activate(context: vscode.ExtensionContext) {
	type DiagramProgress = vscode.Progress<{ message?: string }>;

	const rootPath: string | undefined =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

	if (!rootPath) {
		throw Error("No Salesforce workspace folder was found.");
	}

	const { tooling, apexClasses } = await vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Apex Diagram" },
		async (progress) => {
			progress.report({ message: "Connecting to Salesforce..." });
			const userInfo = await getSalesforceUserInfo(rootPath);
			const tooling = new ToolingApi(
				userInfo.instanceUrl,
				userInfo.accessToken,
				context.workspaceState,
				context.storageUri ?? context.globalStorageUri
			);

			progress.report({ message: "Loading Apex classes..." });
			const apexClasses: ApexClass[] = await tooling.getApexClasses();
			return { tooling, apexClasses };
		}
	);

	const apexClassesIcon = new vscode.ThemeIcon("file");
	const activeApexClassesIcon = new vscode.ThemeIcon("symbol-class");
	let diagramDataState = getStoredDiagramData(context);
	const restoredActiveIds = new Set(
		diagramDataState.nodes
			.map((node) => node.id)
			.filter((id): id is string => Boolean(id))
	);
	const restoredActiveApexClasses = apexClasses.filter((apexClass) => restoredActiveIds.has(getApexClassId(apexClass)));
	const inactiveApexClasses = apexClasses.filter((apexClass) => !restoredActiveIds.has(getApexClassId(apexClass)));
	const apexClassesTreeProvider = new ApexClassTreeDataProvider(rootPath, inactiveApexClasses, apexClassesIcon);
	const activeApexClassesTreeProvider = new ApexClassTreeDataProvider(
		rootPath,
		restoredActiveApexClasses,
		activeApexClassesIcon
	);
	activeApexClassesTreeProvider.getItems().forEach(markAsActiveNode);

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
		await vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Notification, title: "Apex Diagram" },
			async (progress) => {
				progress.report({ message: "Clearing symbol table cache..." });
				const clearedCacheItems = await clearSymbolTableCache(context, progress);
				vscode.window.showInformationMessage(
					`Apex Diagram cache cleared. Removed ${clearedCacheItems} cache index item${clearedCacheItems === 1 ? "" : "s"}.`
				);
			}
		);
	});

	vscode.commands.registerCommand("diagram-workspace.clear", () => {
		clearWorkspaceDiagram();
	});

	vscode.commands.registerCommand("apex-classes-view.addEntry", async (node: ApexClassTreeItem, selectedNodes: ApexClassTreeItem[]) => {
		vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Adding Apex class${selectedNodes && selectedNodes.length > 1 ? "es" : ""}`,
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

		getDiagramWorkspace().removeNodes(nodeIds);
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
			return getDiagramWorkspace().getWebviewPanel();
		})
	);

	function getDiagramWorkspace(): DiagramWorkspaceProvider {
		return DiagramWorkspaceProvider.newInstance(context, diagramDataState, saveDiagramData);
	}

	async function addEntry(node: ApexClassTreeItem, selectedNodes: ApexClassTreeItem[], progress: DiagramProgress) {
		const nodesToAdd = selectedNodes ?? [node];
		progress.report({ message: "Loading Apex class details..." });

		const diagramWorkspace = getDiagramWorkspace();
		const newNodes = determineNewNodes(diagramWorkspace, nodesToAdd);

		if (newNodes.length === 0) {
			return;
		}

		const diagramData = await createDiagramData(diagramWorkspace, newNodes, progress);
		moveNodesToActiveList(newNodes);
		addToDiagram(diagramWorkspace, diagramData);
	}

	function determineNewNodes(diagramWorkspace: DiagramWorkspaceProvider, nodes: ApexClassTreeItem[]): ApexClassTreeItem[] {
		return diagramWorkspace.getNewNodes(nodes);
	}

	function moveNodesToActiveList(nodes: ApexClassTreeItem[]): void {
		nodes.forEach(markAsActiveNode);

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
			progress.report({ message: "Analyzing dependencies..." });
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
		saveDiagramData(new DiagrammModel());
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
			vscode.window.showWarningMessage(`Could not find the Apex class file: ${apexFileName}`);
			return;
		}

		const document = await vscode.workspace.openTextDocument(apexClassFiles[0]);
		await vscode.window.showTextDocument(document);
	}

	function markAsActiveNode(node: ApexClassTreeItem): void {
		node.contextValue = "remove_context";
		node.iconPath = activeApexClassesIcon;
	}

	function saveDiagramData(data: DiagrammModel): Thenable<void> {
		diagramDataState = data;
		return context.workspaceState.update(DIAGRAM_STATE_KEY, data);
	}
}

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

function getApexClassId(apexClass: ApexClass): string {
	return apexClass.NamespacePrefix ? `${apexClass.NamespacePrefix}.${apexClass.Name}` : apexClass.Name;
}

async function clearSymbolTableCache(
	context: vscode.ExtensionContext,
	progress?: vscode.Progress<{ message?: string }>
): Promise<number> {
	const cacheKeys = context.workspaceState
		.keys()
		.filter((key) => key.startsWith(`${SYMBOL_TABLE_CACHE_KEY_PREFIX}:`));

	await Promise.all(cacheKeys.map((key) => context.workspaceState.update(key, undefined)));

	const storageUri = context.storageUri ?? context.globalStorageUri;
	progress?.report({ message: "Deleting cache files..." });
	await vscode.workspace.fs.delete(vscode.Uri.joinPath(storageUri, SYMBOL_TABLE_CACHE_DIR), { recursive: true }).then(
		() => undefined,
		() => undefined
	);

	return cacheKeys.length;
}

export function deactivate() {}
