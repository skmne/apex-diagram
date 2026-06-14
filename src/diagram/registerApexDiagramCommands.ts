import * as vscode from "vscode";
import { ApexClassTreeItem } from "../tree/ApexClassTreeDataProvider";
import { ApexDiagramController } from "./ApexDiagramController";

function registerApexDiagramCommands(controller: ApexDiagramController): vscode.Disposable[] {
	return [
		vscode.commands.registerCommand("apex-classes-view.refreshEntry", () =>
			runWithErrorMessage(() => vscode.window.withProgress(
				{ location: vscode.ProgressLocation.Notification, title: "Apex Diagram" },
				(progress) => controller.refreshApexClasses(progress)
			))
		),
		vscode.commands.registerCommand("apex-classes-view.clearCache", () =>
			runWithErrorMessage(() => vscode.window.withProgress(
				{ location: vscode.ProgressLocation.Notification, title: "Apex Diagram" },
				(progress) => controller.clearCache(progress)
			))
		),
		vscode.commands.registerCommand("diagram-workspace.clear", () => {
			controller.clearWorkspaceDiagram();
		}),
		vscode.commands.registerCommand(
			"apex-classes-view.addEntry",
			(node: ApexClassTreeItem, selectedNodes: ApexClassTreeItem[]) =>
				runWithErrorMessage(() => vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: `Adding Apex class${selectedNodes && selectedNodes.length > 1 ? "es" : ""}`,
					},
					(progress) => controller.addEntry(node, selectedNodes, progress)
				))
		),
		vscode.commands.registerCommand("apex-classes-view.addEntry.loading", () => undefined),
		vscode.commands.registerCommand(
			"diagram-items-view.removeEntry",
			(node: ApexClassTreeItem, selectedNodes: ApexClassTreeItem[]) => {
				controller.removeEntry(node, selectedNodes);
			}
		),
		vscode.commands.registerCommand("diagram-items-view.openFile", (node: ApexClassTreeItem) => {
			return runWithErrorMessage(() => controller.openApexClass(node));
		}),
		vscode.commands.registerCommand("apex-classes-view.openWorkspace", () => controller.openWorkspace()),
		vscode.commands.registerCommand("diagram-workspace.start", () => controller.startWorkspace()),
	];
}

async function runWithErrorMessage(action: () => Thenable<unknown> | Promise<unknown> | unknown): Promise<void> {
	try {
		await action();
	} catch (err) {
		await vscode.window.showErrorMessage(`Apex Diagram: ${getErrorMessage(err)}`);
	}
}

function getErrorMessage(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}

	return String(err);
}

export { registerApexDiagramCommands };
