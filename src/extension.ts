import * as vscode from "vscode";
import { ApexDiagramController } from "./diagram/ApexDiagramController";
import { registerApexDiagramCommands } from "./diagram/registerApexDiagramCommands";
import { registerApexClassTreeViews } from "./diagram/registerApexClassTreeViews";
import { ApexClass } from "./salesforceAPI/ApexClass";
import { ToolingApi } from "./salesforceAPI/salesforceClient";
import { getSalesforceUserInfo } from "./sfdx/sfdx";

export async function activate(context: vscode.ExtensionContext) {
	const rootPath = getWorkspaceRoot();
	if (!rootPath) {
		await setSalesforceWorkspaceContext(false);
		return;
	}

	if (!await isSalesforceWorkspace()) {
		await setSalesforceWorkspaceContext(false);
		return;
	}

	await setSalesforceWorkspaceContext(true);
	const controller = new ApexDiagramController(context, rootPath, () => loadApexClasses(context, rootPath));

	context.subscriptions.push(
		...registerApexClassTreeViews(controller),
		...registerApexDiagramCommands(controller)
	);
}

function getWorkspaceRoot(): string | undefined {
	return vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
		? vscode.workspace.workspaceFolders[0].uri.fsPath
		: undefined;
}

async function isSalesforceWorkspace(): Promise<boolean> {
	return (await vscode.workspace.findFiles("sfdx-project.json", "**/node_modules/**", 1)).length > 0;
}

function setSalesforceWorkspaceContext(isSalesforceWorkspace: boolean): Thenable<void> {
	return vscode.commands.executeCommand("setContext", "apexDiagram:salesforceWorkspace", isSalesforceWorkspace);
}

function loadApexClasses(
	context: vscode.ExtensionContext,
	rootPath: string
): Thenable<{ tooling: ToolingApi; apexClasses: ApexClass[] } | undefined> {
	return vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Apex Diagram" },
		async (progress) => {
			try {
				progress.report({ message: "Connecting to Salesforce..." });
				const userInfo = await getSalesforceUserInfo(rootPath);
				const tooling = new ToolingApi(
					userInfo.instanceUrl,
					userInfo.accessToken,
					context.workspaceState,
					context.storageUri ?? context.globalStorageUri
				);

				progress.report({ message: "Loading Apex classes..." });
				const apexClasses: ApexClass[] = await tooling.getApexClasses();
				return { tooling, apexClasses };
			} catch (err) {
				vscode.window.showErrorMessage(`Apex Diagram: ${getErrorMessage(err)}`);
				return undefined;
			}
		}
	);
}

function getErrorMessage(err: unknown): string {
	if (err instanceof Error) {
		return err.message;
	}

	return String(err);
}

export function deactivate() {}
