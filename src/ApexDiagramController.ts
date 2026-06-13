import * as vscode from "vscode";
import { ApexClassTreeDataProvider, ApexClassTreeItem } from "./ApexClassTreeDataProvider";
import { DiagrammModel } from "./DiagrammModel";
import DiagramWorkspaceProvider from "./DiagramWorkspaceProvider";
import { getApexClassKey } from "./apexClassKey";
import { parseDependency } from "./dependencyAnalyzer";
import { getStoredDiagramData, saveDiagramData } from "./diagramState";
import { ApexClass } from "./salesforceAPI/ApexClass";
import { ApexClassMember } from "./salesforceAPI/ApexClassMember";
import { ToolingApi } from "./salesforceAPI/salesforceClient";
import { clearSymbolTableCache } from "./symbolTableCache";

type DiagramProgress = vscode.Progress<{ message?: string }>;

class ApexDiagramController {
	public readonly apexClassesTreeProvider: ApexClassTreeDataProvider;
	public readonly activeApexClassesTreeProvider: ApexClassTreeDataProvider;

	private readonly apexClassesIcon = new vscode.ThemeIcon("file");
	private readonly activeApexClassesIcon = new vscode.ThemeIcon("symbol-class");
	private diagramDataState: DiagrammModel;

	constructor(
		private readonly context: vscode.ExtensionContext,
		rootPath: string,
		private readonly tooling: ToolingApi,
		apexClasses: ApexClass[]
	) {
		this.diagramDataState = getStoredDiagramData(context);
		const restoredActiveIds = new Set(
			this.diagramDataState.nodes
				.map((node) => node.id)
				.filter((id): id is string => Boolean(id))
		);
		const restoredActiveApexClasses = apexClasses.filter((apexClass) =>
			restoredActiveIds.has(this.getApexClassId(apexClass))
		);
		const inactiveApexClasses = apexClasses.filter((apexClass) =>
			!restoredActiveIds.has(this.getApexClassId(apexClass))
		);

		this.apexClassesTreeProvider = new ApexClassTreeDataProvider(rootPath, inactiveApexClasses, this.apexClassesIcon);
		this.activeApexClassesTreeProvider = new ApexClassTreeDataProvider(
			rootPath,
			restoredActiveApexClasses,
			this.activeApexClassesIcon
		);
		this.activeApexClassesTreeProvider.getItems().forEach((node) => this.markAsActiveNode(node));
	}

	public async refreshApexClasses(progress: DiagramProgress): Promise<void> {
		progress.report({ message: "Refreshing Apex classes" });
		const freshApexClasses = await this.tooling.getApexClasses();
		const activeIds = new Set(this.activeApexClassesTreeProvider.getItemIds());
		this.apexClassesTreeProvider.updateApexClasses(
			freshApexClasses.filter((apexClass) => !activeIds.has(this.getApexClassId(apexClass)))
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
		const nodesToAdd = selectedNodes ?? [node];
		progress.report({ message: "Loading Apex class details..." });

		const diagramWorkspace = this.getDiagramWorkspace();
		const newNodes = diagramWorkspace.getNewNodes(nodesToAdd);

		if (newNodes.length === 0) {
			return;
		}

		const diagramData = await this.createDiagramData(diagramWorkspace, newNodes, progress);
		this.moveNodesToActiveList(newNodes);
		diagramWorkspace.addNodes(diagramData);
	}

	public removeEntry(node: ApexClassTreeItem, selectedNodes: ApexClassTreeItem[] | undefined): void {
		const nodesToRemove = selectedNodes ?? [node];

		nodesToRemove.forEach((item: ApexClassTreeItem) => {
			item.contextValue = "add_context";
			item.iconPath = this.apexClassesIcon;
		});
		const nodeIds = nodesToRemove.map((item: ApexClassTreeItem) => item.id);
		this.activeApexClassesTreeProvider.remove(nodeIds);
		this.apexClassesTreeProvider.add(nodesToRemove);

		this.getDiagramWorkspace().removeNodes(nodeIds);
	}

	public clearWorkspaceDiagram(): void {
		const activeNodes = this.activeApexClassesTreeProvider.getItems();
		activeNodes.forEach((node) => {
			node.contextValue = "add_context";
			node.iconPath = this.apexClassesIcon;
		});

		this.activeApexClassesTreeProvider.remove(activeNodes.map((node) => node.id));
		this.apexClassesTreeProvider.add(activeNodes);
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
		return DiagramWorkspaceProvider.newInstance(this.context, this.diagramDataState, (data) => this.saveDiagramData(data));
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

	private moveNodesToActiveList(nodes: ApexClassTreeItem[]): void {
		nodes.forEach((node) => this.markAsActiveNode(node));

		const nodeIds = nodes.map((item: ApexClassTreeItem) => item.id);
		this.activeApexClassesTreeProvider.add(nodes);
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

	private markAsActiveNode(node: ApexClassTreeItem): void {
		node.contextValue = "remove_context";
		node.iconPath = this.activeApexClassesIcon;
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
