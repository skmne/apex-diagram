import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export default class DiagramWorkspaceProvider {
	private static instance: DiagramWorkspaceProvider | null = null;
	private data: any = { nodes: [], links: [] };
	private diagramWorkspaceWebviewPanel: vscode.WebviewPanel;

	private constructor(context: vscode.ExtensionContext) {
		this.diagramWorkspaceWebviewPanel = vscode.window.createWebviewPanel(
			"apex-classes-workspace",
			"Apex Diagram",
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);
		this.diagramWorkspaceWebviewPanel.webview.html = this.getWebviewContent(context);

		this.diagramWorkspaceWebviewPanel.webview.onDidReceiveMessage(
			async (message: any) => {
				switch (
					message.command // Handle messages from the webview
				) {
					case "export":
						vscode.window
							.showSaveDialog({
								saveLabel: "Save Apex Diagram",
								// defaultUri: vscode.Uri.file(os.homedir()),
								filters: {
									// eslint-disable-next-line @typescript-eslint/naming-convention
									Images: ["svg"],
								},
							})
							.then((fileInfos: any) => {
								console.log("try to write apex diagram here:", fileInfos);
								fs.writeFileSync(fileInfos.fsPath, message.text);
								vscode.window
									.showInformationMessage(
										`Apex diagram was successfully saved!`,
										{ modal: false },
										"Open"
									)
									.then((selectedButton) => {
										if (selectedButton === "Open") {
											vscode.env.openExternal(fileInfos.fsPath); // Open the URI externally
										}
									});
							});
						break;
				}
			},
			undefined,
			context.subscriptions
		);

		this.diagramWorkspaceWebviewPanel.onDidDispose(this.destroy, null, context.subscriptions);
	}

	public static newInstance(context: vscode.ExtensionContext): DiagramWorkspaceProvider {
		if (!DiagramWorkspaceProvider.instance) {
			DiagramWorkspaceProvider.instance = new DiagramWorkspaceProvider(context);
		} else {
			DiagramWorkspaceProvider.instance.showDiagramWorkspace();
		}
		return DiagramWorkspaceProvider.instance;
	}

	public showDiagramWorkspace() {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		this.diagramWorkspaceWebviewPanel.reveal(columnToShowIn);
	}

	public getWebviewPanel() {
		return this.diagramWorkspaceWebviewPanel;
	}

	public getData(): any {
		return this.data;
	}

	public setData(newData: string): void {
		this.data = newData;
	}

	public addNodes(data: any): void {
		this.data.nodes = [...this.data.nodes, ...data.nodes]; // todo optimize - remove dublicate
		this.diagramWorkspaceWebviewPanel.webview.postMessage({
			command: "Add",
			value: data,
		});
	}

	public removeNodes(nodesIds: any[]): void {
		this.data.nodes = this.data.nodes.filter((node: { id: any }) => !nodesIds.includes(node.id));
		this.diagramWorkspaceWebviewPanel.webview.postMessage({ command: "Remove", value: nodesIds });
	}

	public executeWebviewCommand(command: any, value: any) {
		this.diagramWorkspaceWebviewPanel.webview.postMessage({ command: command, value: value });
	}

	private getWebviewContent(context: vscode.ExtensionContext) {
		const pathToHtmlTemplate = path.join(context.extensionPath, "./web/diagram-workspace/index.html");
		const pathToBundle = path.join(context.extensionPath, "./dist/webview/bundle.js");

		let html = fs.readFileSync(pathToHtmlTemplate).toString();

		// Replace bundle.js path with webview URI
		const bundleUri = this.diagramWorkspaceWebviewPanel.webview.asWebviewUri(
			vscode.Uri.file(pathToBundle)
		);
		html = html.replace("./bundle.js", bundleUri.toString());

		return html;
	}

	private destroy(): void {
		DiagramWorkspaceProvider.instance = null;
		console.log("**** destroy ****");
	}
}
