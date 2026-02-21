import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { DiagrammModel } from "./DiagrammModel";

export default class DiagramWorkspaceProvider {
	private static instance: DiagramWorkspaceProvider | null = null;
	private data: DiagrammModel = { nodes: [], links: [] };
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
			async (message: { command: string; text?: string }) => {
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
							.then((fileInfos: vscode.Uri | undefined) => {
								if (!fileInfos) { return; }
								fs.writeFileSync(fileInfos.fsPath, message.text ?? "");
								vscode.window
									.showInformationMessage(
										`Apex diagram was successfully saved!`,
										{ modal: false },
										"Open"
									)
									.then((selectedButton) => {
										if (selectedButton === "Open") {
											vscode.env.openExternal(fileInfos); // Open the URI externally
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

	public getData(): DiagrammModel {
		return this.data;
	}

	public setData(newData: DiagrammModel): void {
		this.data = newData;
	}

	public addNodes(data: DiagrammModel): void {
		const existingNodeIds = new Set(this.data.nodes.map((n) => n.id));
		const newNodes = data.nodes.filter((n) => !existingNodeIds.has(n.id));

		const existingLinkKeys = new Set(this.data.links.map((l) => `${l.source}→${l.target}`));
		const newLinks = data.links.filter((l) => !existingLinkKeys.has(`${l.source}→${l.target}`));

		this.data.nodes = [...this.data.nodes, ...newNodes];
		this.data.links = [...this.data.links, ...newLinks];

		this.diagramWorkspaceWebviewPanel.webview.postMessage({
			command: "Add",
			value: { nodes: newNodes, links: newLinks },
		});
	}

	public removeNodes(nodesIds: string[]): void {
		const removed = new Set(nodesIds);
		this.data.nodes = this.data.nodes.filter((node) => !nodesIds.includes(node.id ?? ""));
		this.data.links = this.data.links.filter((l) => !removed.has(String(l.source)) && !removed.has(String(l.target)));
		this.diagramWorkspaceWebviewPanel.webview.postMessage({ command: "Remove", value: nodesIds });
	}

	public executeWebviewCommand(command: string, value: unknown) {
		this.diagramWorkspaceWebviewPanel.webview.postMessage({ command: command, value: value });
	}

	private getWebviewContent(context: vscode.ExtensionContext) {
		const pathToHtmlTemplate = path.join(context.extensionPath, "./web/diagram-workspace/index.html");
		const pathToBundle = path.join(context.extensionPath, "./dist/webview/bundle.js");

		let html: string;
		try {
			html = fs.readFileSync(pathToHtmlTemplate).toString();
		} catch {
			vscode.window.showErrorMessage("Apex Diagram: Failed to load webview template.");
			return "";
		}

		// Replace bundle.js path with webview URI
		const bundleUri = this.diagramWorkspaceWebviewPanel.webview.asWebviewUri(
			vscode.Uri.file(pathToBundle)
		);
		html = html.replace("./bundle.js", bundleUri.toString());

		return html;
	}

	private destroy(): void {
		DiagramWorkspaceProvider.instance = null;
	}
}
