import * as vscode from "vscode";

export class ApexClassTreeDataProvider implements vscode.TreeDataProvider<ApexClassTreeItem> {
	constructor(private workspaceRoot: string, private apexClassMembers: Array<any>) {}

	private _onDidChangeTreeData: vscode.EventEmitter<ApexClassTreeItem | undefined | null | void> =
		new vscode.EventEmitter<ApexClassTreeItem | undefined | null | void>();

	readonly onDidChangeTreeData: vscode.Event<ApexClassTreeItem | undefined | null | void> =
		this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	refreshItem(node: ApexClassTreeItem): void {
		this._onDidChangeTreeData.fire(node);
	}

	getTreeItem(element: ApexClassTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ApexClassTreeItem): Thenable<ApexClassTreeItem[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage("No sfdx connection in empty workspace");
			return Promise.resolve([]);
		}

		return Promise.resolve(this.getApexClassTreeItems());
	}

	private getApexClassTreeItems(): ApexClassTreeItem[] {
		const apexClassTreeItems = [];
		for (const apexClass of this.apexClassMembers) {
			apexClassTreeItems.push(
				new ApexClassTreeItem(
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
	tooltip: string;
	description: string;
	iconPath = new vscode.ThemeIcon("outline-view-icon");
	contextValue: string = "add_context";

	constructor(
		public readonly label: any,
		private readonly version: any,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState
	) {
		super(label, collapsibleState);
		this.tooltip = `${this.label}-v${this.version}`;
		this.description = this.version;
	}
}
