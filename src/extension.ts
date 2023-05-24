import * as vscode from "vscode";
import { ApexClassTreeDataProvider } from "./ApexClassTreeDataProvider";
import { Webview } from "vscode";

export function activate(context: vscode.ExtensionContext) {
	const rootPath: any =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
			? vscode.workspace.workspaceFolders[0].uri.fsPath
			: undefined;

	const data: Array<any> = [
		{ name: "Account", version: "v54" },
		{ name: "BoatDataService", version: "v54" },
		{ name: "GenerateDataTests", version: "v54" },
		{ name: "fflib_SObjectDescribe", version: "v54" },
		{ name: "fflib_SObjectDomain", version: "v54" },
		{ name: "fflib_ISelectorFactory", version: "v54" },
		{ name: "fflib_Application", version: "v54" },
		{ name: "fflib_ISObjects", version: "v54" },
		{ name: "BaseApexClass", version: "v54" },
		{ name: "fflib_SObjectSelector", version: "v54" },
	];

	const apexClassesTreeProvider = new ApexClassTreeDataProvider(rootPath, data);

	// Track currently webview panel
	let diagramWorkspaceWebviewPanel: vscode.WebviewPanel | undefined = undefined;

	vscode.window.createTreeView("apex-classes-view", {
		treeDataProvider: apexClassesTreeProvider,
		canSelectMany: true,
	});

	vscode.commands.registerCommand("apex-classes-view.refreshEntry", () => apexClassesTreeProvider.refresh());

	vscode.commands.registerCommand("apex-classes-view.addEntry", (node: any) => {
		node.contextValue = "remove_context";
		apexClassesTreeProvider.refreshItem(node);

		diagramExecuteComand("Add", node.label);
		vscode.window.showInformationMessage(`Successfully added ${node.label}.`);
	});
	vscode.commands.registerCommand("apex-classes-view.removeEntry", (node: any) => {
		node.contextValue = "add_context";
		apexClassesTreeProvider.refreshItem(node);
		diagramExecuteComand("Remove", node.label);
		vscode.window.showInformationMessage(`Successfully remove ${node.label}.`);
	});
	vscode.commands.registerCommand("apex-classes-view.openWorkspace", (node: any) =>
		vscode.commands.executeCommand("diagram-workspace.start")
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("diagram-workspace.start", () => {
			// Create and show panel
			const columnToShowIn = vscode.window.activeTextEditor
				? vscode.window.activeTextEditor.viewColumn
				: undefined;

			if (diagramWorkspaceWebviewPanel) {
				diagramWorkspaceWebviewPanel.reveal(columnToShowIn);
			} else {
				diagramWorkspaceWebviewPanel = vscode.window.createWebviewPanel(
					"apex-classes-workspace",
					"Apex Diagram",
					vscode.ViewColumn.One,
					{
						enableScripts: true,
					}
				);

				// And set its HTML content
				diagramWorkspaceWebviewPanel.webview.html = getWebviewContent();

				// Reset when the current panel is closed
				diagramWorkspaceWebviewPanel.onDidDispose(
					() => {
						diagramWorkspaceWebviewPanel = undefined;
					},
					null,
					context.subscriptions
				);
			}
			vscode.commands.executeCommand("apex-classes-view.focus");

			return diagramWorkspaceWebviewPanel;
		})
	);

	async function diagramExecuteComand(command: any, value: any) {
		if (diagramWorkspaceWebviewPanel) {
			diagramWorkspaceWebviewPanel.webview.postMessage({ command: command, value: value });
		} else {
			const panel: vscode.WebviewPanel = await vscode.commands.executeCommand("diagram-workspace.start");
			panel.webview.postMessage({ command: command, value: value });
		}
	}
}

function getWebviewContent() {
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

export function deactivate() {}
