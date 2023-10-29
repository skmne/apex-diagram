import * as vscode from "vscode";

export class ApexClassTreeDataProvider implements vscode.TreeDataProvider<ApexClassTreeItem> {
	constructor(private workspaceRoot: string, private apexClassMembers: Array<any>) {}

	private _onDidChangeTreeData: vscode.EventEmitter<ApexClassTreeItem | undefined | null | void> =
		new vscode.EventEmitter<ApexClassTreeItem | undefined | null | void>();

	readonly onDidChangeTreeData: vscode.Event<ApexClassTreeItem | undefined | null | void> =
		this._onDidChangeTreeData.event;

	private apexClassTreeItems: ApexClassTreeItem[] = [];

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	add(nodes: ApexClassTreeItem[]): void {
		this.apexClassTreeItems = [...this.apexClassTreeItems, ...nodes];
		this.apexClassTreeItems.sort(this.sortByName);
		this.refresh();
	}

	remove(nodeIds: string[]): void {
		this.apexClassTreeItems = this.apexClassTreeItems.filter((item) => !nodeIds.includes(item.id));
		console.log("remove items", this.apexClassTreeItems);
		// this.refreshItems(this.apexClassTreeItems);
		this.refresh();
	}
	sortByName(a: any, b: any) {
		const nameA = a.name.toUpperCase(); // ignore upper and lowercase
		const nameB = b.name.toUpperCase(); // ignore upper and lowercase
		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}
		return 0;
	}

	refreshItems(nodes: ApexClassTreeItem[]): void {
		nodes.forEach((node) => {
			this._onDidChangeTreeData.fire(node);
		});
	}

	getTreeItem(element: ApexClassTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ApexClassTreeItem): Thenable<ApexClassTreeItem[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage("No sfdx connection in empty workspace");
			return Promise.resolve([]);
		}

		if (this.apexClassTreeItems.length === 0) {
			this.apexClassTreeItems = this.getApexClassTreeItems();
		}
		this.apexClassTreeItems.sort(this.sortByName);
		return Promise.resolve(this.apexClassTreeItems);
	}
	//todo refactoring
	private getApexClassTreeItems(): ApexClassTreeItem[] {
		const apexClassTreeItems = [];
		for (const apexClass of this.apexClassMembers) {
			apexClassTreeItems.push(
				new ApexClassTreeItem(
					apexClass.NamespacePrefix,
					apexClass.Name,
					apexClass.ApiVersion,
					vscode.TreeItemCollapsibleState.None
				)
			);
		}
		return apexClassTreeItems;
	}
}

class ApexClassTreeItem extends vscode.TreeItem {
	id: string;
	name: string;
	tooltip: string;
	description: string;
	iconPath = new vscode.ThemeIcon("outline-view-icon");
	contextValue: string = "add_context";

	constructor(
		public readonly prefix: any,
		public readonly label: any,
		private readonly version: any,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.id = prefix ? prefix + "." + label : label;
		this.name = this.id;
		this.tooltip = `${this.label}-v${this.version}`;
		this.description = this.version;
	}
}
