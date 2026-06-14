import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { DiagrammModel } from "../model/DiagrammModel";
import Node from "../model/Node";

export default class DiagramWorkspaceProvider {
	private static instance: DiagramWorkspaceProvider | null = null;
	private data: DiagrammModel = { nodes: [], links: [] };
	private diagramWorkspaceWebviewPanel: vscode.WebviewPanel;
	private onDataChanged?: (data: DiagrammModel) => void | Thenable<void>;

	private constructor(
		context: vscode.ExtensionContext,
		initialData: DiagrammModel = new DiagrammModel(),
		onDataChanged?: (data: DiagrammModel) => void | Thenable<void>
	) {
		this.data = initialData;
		this.onDataChanged = onDataChanged;
		this.diagramWorkspaceWebviewPanel = vscode.window.createWebviewPanel(
			"apex-classes-workspace",
			"Apex Diagram",
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.joinPath(context.extensionUri, "dist", "webview"),
					vscode.Uri.joinPath(context.extensionUri, "resources"),
				],
			}
		);
		this.diagramWorkspaceWebviewPanel.iconPath = {
			light: vscode.Uri.file(path.join(context.extensionPath, "./resources/logo-tab-light.svg")),
			dark: vscode.Uri.file(path.join(context.extensionPath, "./resources/logo-tab-dark.svg")),
		};
		this.diagramWorkspaceWebviewPanel.webview.html = this.getWebviewContent(context);

		this.diagramWorkspaceWebviewPanel.webview.onDidReceiveMessage(
			async (message: { command: string; text?: string }) => {
				switch (message.command) {
					case "ready":
						this.restoreDiagram();
						break;
					case "export":
						await this.exportDiagram(message.text);
						break;
				}
			},
			undefined,
			context.subscriptions
		);

		this.diagramWorkspaceWebviewPanel.onDidDispose(this.destroy, null, context.subscriptions);
	}

	public static newInstance(
		context: vscode.ExtensionContext,
		initialData?: DiagrammModel,
		onDataChanged?: (data: DiagrammModel) => void | Thenable<void>
	): DiagramWorkspaceProvider {
		if (!DiagramWorkspaceProvider.instance) {
			DiagramWorkspaceProvider.instance = new DiagramWorkspaceProvider(context, initialData, onDataChanged);
		} else {
			DiagramWorkspaceProvider.instance.showDiagramWorkspace();
		}
		return DiagramWorkspaceProvider.instance;
	}

	public static getInstance(): DiagramWorkspaceProvider | null {
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
		this.notifyDataChanged();
	}

	public getNewNodes<T extends Node>(nodes: T[]): T[] {
		const existingIds = new Set(this.data.nodes.map((node) => node.id));
		return nodes.filter((node) => {
			if (existingIds.has(node.id)) {
				return false;
			}
			existingIds.add(node.id);
			return true;
		});
	}

	public getNodeNames(additionalNodes: Node[] = []): string[] {
		return [...this.data.nodes, ...additionalNodes]
			.map((node) => node.name)
			.filter((name): name is string => Boolean(name));
	}

	public addNodes(data: DiagrammModel): void {
		const newNodes = this.getNewNodes(data.nodes);
		if (newNodes.length === 0) {
			return;
		}

		this.data.nodes = [...this.data.nodes, ...newNodes];
		this.data.links = this.mergeLinks(this.data.links, data.links);
		this.notifyDataChanged();
		this.diagramWorkspaceWebviewPanel.webview.postMessage({
			command: "Add",
			value: { nodes: newNodes, links: data.links },
		});
	}

	public removeNodes(nodesIds: string[]): void {
		this.data.nodes = this.data.nodes.filter((node) => !nodesIds.includes(node.id ?? ""));
		this.data.links = this.data.links.filter(
			(link) => !nodesIds.includes(String(link.source)) && !nodesIds.includes(String(link.target))
		);
		this.notifyDataChanged();
		this.diagramWorkspaceWebviewPanel.webview.postMessage({ command: "Remove", value: nodesIds });
	}

	public clear(): void {
		const nodeIds = this.data.nodes
			.map((node) => node.id)
			.filter((id): id is string => Boolean(id));
		this.data = new DiagrammModel();
		this.notifyDataChanged();

		if (nodeIds.length > 0) {
			this.diagramWorkspaceWebviewPanel.webview.postMessage({ command: "Remove", value: nodeIds });
		}
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
		const nonce = this.getNonce();
		const csp = [
			"default-src 'none'",
			`img-src ${this.diagramWorkspaceWebviewPanel.webview.cspSource} data:`,
			`style-src ${this.diagramWorkspaceWebviewPanel.webview.cspSource} 'unsafe-inline'`,
			`script-src 'nonce-${nonce}'`,
		].join("; ");
		html = html
			.replace("{{csp}}", csp)
			.replace("{{nonce}}", nonce)
			.replace("./bundle.js", bundleUri.toString());

		return html;
	}

	private async exportDiagram(svgText?: string): Promise<void> {
		const fileInfo = await vscode.window.showSaveDialog({
			saveLabel: "Save Apex Diagram",
			filters: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				Images: ["svg"],
			},
		});

		if (!fileInfo) {
			return;
		}

		await vscode.workspace.fs.writeFile(fileInfo, Buffer.from(svgText ?? "", "utf8"));
		const selectedButton = await vscode.window.showInformationMessage(
			"Apex diagram saved.",
			{ modal: false },
			"Open"
		);

		if (selectedButton === "Open") {
			await vscode.env.openExternal(fileInfo);
		}
	}

	private getNonce(): string {
		return crypto.randomBytes(16).toString("base64");
	}

	private restoreDiagram(): void {
		if (this.data.nodes.length === 0) {
			return;
		}

		this.diagramWorkspaceWebviewPanel.webview.postMessage({
			command: "Add",
			value: this.data,
		});
	}

	private notifyDataChanged(): void {
		this.onDataChanged?.(this.data);
	}

	private mergeLinks(currentLinks: DiagrammModel["links"], newLinks: DiagrammModel["links"]): DiagrammModel["links"] {
		const mergedLinks = [...currentLinks];
		const existingKeys = new Set(currentLinks.map((link) => this.getLinkKey(link)));

		for (const link of newLinks) {
			const key = this.getLinkKey(link);
			if (!existingKeys.has(key)) {
				mergedLinks.push(link);
				existingKeys.add(key);
			}
		}

		return mergedLinks;
	}

	private getLinkKey(link: DiagrammModel["links"][number]): string {
		return `${link.source}|${link.target}|${link.type}`;
	}

	private destroy(): void {
		DiagramWorkspaceProvider.instance = null;
	}
}
