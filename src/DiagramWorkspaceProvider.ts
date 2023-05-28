import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

export default class DiagramWorkspaceProvider {
	private static instance: DiagramWorkspaceProvider | null = null;
	private data: any;
	private diagramWorkspaceWebviewPanel: vscode.WebviewPanel | undefined = undefined;

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
		this.diagramWorkspaceWebviewPanel.webview.html = this.getWebviewContent();

		this.diagramWorkspaceWebviewPanel.onDidDispose(this.destroy, null, context.subscriptions);
	}

	public static newInstance(context: vscode.ExtensionContext): DiagramWorkspaceProvider {
		if (!DiagramWorkspaceProvider.instance) {
			DiagramWorkspaceProvider.instance = new DiagramWorkspaceProvider(context);
		} else {
			DiagramWorkspaceProvider?.instance?.showDiagramWorkspace();
		}
		return DiagramWorkspaceProvider.instance;
	}

	public showDiagramWorkspace() {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		this.diagramWorkspaceWebviewPanel?.reveal(columnToShowIn);
	}

	public getWebviewPanel() {
		return this.diagramWorkspaceWebviewPanel;
	}

	public getData(): string {
		return this.data;
	}

	public setData(newData: string): void {
		this.data = newData;
	}

	public executeWebviewCommand(command: any, value: any) {
		this.diagramWorkspaceWebviewPanel?.webview.postMessage({ command: command, value: value });
	}

	private getWebviewContent() {
		return `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cat Coding</title>
      </head>
      <body>
          <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
          <h1 id="lines-of-code-counter">0</h1>
          <script>
          const counter = document.getElementById('lines-of-code-counter');
          // Handle the message inside the webview
          window.addEventListener('message', event => {
    
            const message = event.data; // The JSON data our extension sent
            console.log(message);
              switch (message.command) {
                      case 'Add':
                          counter.textContent = message.value;
                          break;
                    case 'Remove':
                          counter.textContent = message.value;
                    break;
              }
          });
      </script>
      </body>
      </html>`;
	}

	private destroy() {
		this.diagramWorkspaceWebviewPanel = undefined;
		this.data = undefined;
		DiagramWorkspaceProvider.instance = null;
	}
}
