import * as vscode from "vscode";
import { ApexClassTreeDataProvider, ApexClassTreeItem } from "../tree/ApexClassTreeDataProvider";
import { DiagrammModel } from "../model/DiagrammModel";
import DiagramWorkspaceProvider from "./DiagramWorkspaceProvider";
import { getApexClassKey } from "../model/apexClassKey";
import { parseDependency } from "../analyzer/dependencyAnalyzer";
import { getStoredDiagramData, saveDiagramData } from "./diagramState";
import { ApexClass } from "../salesforceAPI/ApexClass";
import { ApexClassMember } from "../salesforceAPI/ApexClassMember";
import { ToolingApi } from "../salesforceAPI/salesforceClient";
import { clearSymbolTableCache } from "./symbolTableCacheCommands";

type DiagramProgress = vscode.Progress<{ message?: string }>;

class ApexDiagramController {
	public readonly apexClassesTreeProvider: ApexClassTreeDataProvider;
	public readonly diagramItemsTreeProvider: ApexClassTreeDataProvider;

	private readonly apexClassesIcon = new vscode.ThemeIcon("code");
	private readonly diagramItemIcon = new vscode.ThemeIcon("symbol-class");
	private readonly loadingIcon = new vscode.ThemeIcon("sync~spin");
	private readonly addingNodeIds = new Set<string>();
	private diagramDataState: DiagrammModel;

	constructor(
		private readonly context: vscode.ExtensionContext,
		rootPath: string,
		private readonly tooling: ToolingApi,
		apexClasses: ApexClass[]
	) {
		this.diagramDataState = getStoredDiagramData(context);
		const restoredDiagramItemIds = new Set(
			this.diagramDataState.nodes
				.map((node) => node.id)
				.filter((id): id is string => Boolean(id))
		);
		const restoredDiagramItems = apexClasses.filter((apexClass) =>
			restoredDiagramItemIds.has(this.getApexClassId(apexClass))
		);
		const inactiveApexClasses = apexClasses.filter((apexClass) =>
			!restoredDiagramItemIds.has(this.getApexClassId(apexClass))
		);

		this.apexClassesTreeProvider = new ApexClassTreeDataProvider(rootPath, inactiveApexClasses, this.apexClassesIcon);
		this.diagramItemsTreeProvider = new ApexClassTreeDataProvider(
			rootPath,
			restoredDiagramItems,
			this.diagramItemIcon
		);
		this.diagramItemsTreeProvider.getItems().forEach((node) => this.markAsDiagramItem(node));
	}

	public async refreshApexClasses(progress: DiagramProgress): Promise<void> {
		progress.report({ message: "Refreshing Apex classes" });
		const freshApexClasses = await this.tooling.getApexClasses();
		const diagramItemIds = new Set(this.diagramItemsTreeProvider.getItemIds());
		this.apexClassesTreeProvider.updateApexClasses(
			freshApexClasses.filter((apexClass) => !diagramItemIds.has(this.getApexClassId(apexClass)))
		);
	}

	public async clearCache(progress: DiagramProgress): Promise<void> {
		progress.report({ message: "Clearing symbol table cache..." });
		const clearedCacheItems = await clearSymbolTableCache(this.context, progress);
		vscode.window.showInformationMessage(
			`Apex Diagram cache cleared. Removed ${clearedCacheItems} cache index item${clearedCacheItems === 1 ? "" : "s"}.`
		);
	}

	public async addEntry(
		node: ApexClassTreeItem,
		selectedNodes: ApexClassTreeItem[] | undefined,
		progress: DiagramProgress
	): Promise<void> {
		const nodesToAdd = (selectedNodes ?? [node]).filter((item) => !this.addingNodeIds.has(item.id));
		progress.report({ message: "Loading Apex class details..." });

		const diagramWorkspace = this.getDiagramWorkspace();
		const newNodes = diagramWorkspace.getNewNodes(nodesToAdd);

		if (newNodes.length === 0) {
			return;
		}

		this.markNodesAsLoading(newNodes);
		let addedToDiagram = false;

		try {
			const diagramData = await this.createDiagramData(diagramWorkspace, newNodes, progress);
			this.moveNodesToDiagramItems(newNodes);
			diagramWorkspace.addNodes(diagramData);
			addedToDiagram = true;
		} finally {
			newNodes.forEach((item) => this.addingNodeIds.delete(item.id));

			if (!addedToDiagram) {
				newNodes.forEach((item) => this.markAsAvailableApexClass(item));
				this.apexClassesTreeProvider.refreshItems(newNodes);
			}
		}
	}

	public removeEntry(node: ApexClassTreeItem, selectedNodes: ApexClassTreeItem[] | undefined): void {
		const nodesToRemove = selectedNodes ?? [node];
		this.removeNodesFromDiagram(nodesToRemove);
	}

	public removeEntriesByIds(nodeIds: string[]): void {
		const nodesToRemove = this.diagramItemsTreeProvider
			.getItems()
			.filter((item) => nodeIds.includes(item.id));

		this.removeNodesFromDiagram(nodesToRemove);
	}

	private removeNodesFromDiagram(nodesToRemove: ApexClassTreeItem[]): void {
		if (nodesToRemove.length === 0) {
			return;
		}

		nodesToRemove.forEach((item: ApexClassTreeItem) => {
			this.markAsAvailableApexClass(item);
		});
		const nodeIds = nodesToRemove.map((item: ApexClassTreeItem) => item.id);
		this.diagramItemsTreeProvider.remove(nodeIds);
		this.apexClassesTreeProvider.add(nodesToRemove);

		this.getDiagramWorkspace().removeNodes(nodeIds);
	}

	public clearWorkspaceDiagram(): void {
		const diagramItems = this.diagramItemsTreeProvider.getItems();
		diagramItems.forEach((node) => {
			this.markAsAvailableApexClass(node);
		});

		this.diagramItemsTreeProvider.remove(diagramItems.map((node) => node.id));
		this.apexClassesTreeProvider.add(diagramItems);
		DiagramWorkspaceProvider.getInstance()?.clear();
		this.saveDiagramData(new DiagrammModel());
	}

	public async openApexClass(node: ApexClassTreeItem | undefined): Promise<void> {
		if (!node) {
			return;
		}

		const apexFileName = `${node.label}.cls`;
		const apexClassFiles = await vscode.workspace.findFiles(`**/${apexFileName}`, "**/node_modules/**", 1);

		if (apexClassFiles.length === 0) {
			vscode.window.showWarningMessage(`Could not find the Apex class file: ${apexFileName}`);
			return;
		}

		const document = await vscode.workspace.openTextDocument(apexClassFiles[0]);
		await vscode.window.showTextDocument(document);
	}

	public openWorkspace(): Thenable<unknown> {
		return vscode.commands.executeCommand("diagram-workspace.start");
	}

	public startWorkspace(): vscode.WebviewPanel {
		vscode.commands.executeCommand("apex-classes-view.focus");
		return this.getDiagramWorkspace().getWebviewPanel();
	}

	private getDiagramWorkspace(): DiagramWorkspaceProvider {
		return DiagramWorkspaceProvider.newInstance(
			this.context,
			this.diagramDataState,
			(data) => this.saveDiagramData(data),
			(nodeIds) => this.removeEntriesByIds(nodeIds)
		);
	}

	private async createDiagramData(
		diagramWorkspace: DiagramWorkspaceProvider,
		newNodes: ApexClassTreeItem[],
		progress: DiagramProgress
	): Promise<DiagrammModel> {
		const newData = new DiagrammModel();
		newData.nodes = newNodes;

		const apexClassMembers = await this.generateSymbolTables(diagramWorkspace, newNodes);
		if (apexClassMembers.length > 0) {
			progress.report({ message: "Analyzing dependencies..." });
			newData.links = parseDependency(apexClassMembers).links;
		}

		return newData;
	}

	private moveNodesToDiagramItems(nodes: ApexClassTreeItem[]): void {
		nodes.forEach((node) => this.markAsDiagramItem(node));

		const nodeIds = nodes.map((item: ApexClassTreeItem) => item.id);
		this.diagramItemsTreeProvider.add(nodes);
		this.apexClassesTreeProvider.remove(nodeIds);
	}

	private async generateSymbolTables(
		diagramWorkspace: DiagramWorkspaceProvider,
		newNodes: ApexClassTreeItem[]
	): Promise<ApexClassMember[]> {
		const apexClassNames = diagramWorkspace.getNodeNames(newNodes);
		if (apexClassNames.length <= 1) {
			return [];
		}

		return this.tooling.generateApexSymbolTable(apexClassNames);
	}

	private markAsDiagramItem(node: ApexClassTreeItem): void {
		node.contextValue = "remove_context";
		node.iconPath = this.diagramItemIcon;
	}

	private markNodesAsLoading(nodes: ApexClassTreeItem[]): void {
		nodes.forEach((node) => {
			this.addingNodeIds.add(node.id);
			node.contextValue = "loading_context";
			node.iconPath = this.loadingIcon;
		});
		this.apexClassesTreeProvider.refreshItems(nodes);
	}

	private markAsAvailableApexClass(node: ApexClassTreeItem): void {
		node.contextValue = "add_context";
		node.iconPath = this.apexClassesIcon;
	}

	private saveDiagramData(data: DiagrammModel): Thenable<void> {
		this.diagramDataState = data;
		return saveDiagramData(this.context, data);
	}

	private getApexClassId(apexClass: ApexClass): string {
		return getApexClassKey(apexClass.NamespacePrefix, apexClass.Name) ?? apexClass.Name;
	}
}

export { ApexDiagramController };
