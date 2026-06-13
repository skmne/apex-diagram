import * as vscode from "vscode";
import { ApexDiagramController } from "./ApexDiagramController";
import { registerApexDiagramCommands } from "./registerApexDiagramCommands";
import { registerApexClassTreeViews } from "./registerApexClassTreeViews";
import { ApexClass } from "./salesforceAPI/ApexClass";
import { ToolingApi } from "./salesforceAPI/salesforceClient";
import { getSalesforceUserInfo } from "./sfdx/sfdx";

export async function activate(context: vscode.ExtensionContext) {
	const rootPath = getWorkspaceRoot();
	if (!rootPath) {
		throw Error("No Salesforce workspace folder was found.");
	}

	const { tooling, apexClasses } = await loadApexClasses(context, rootPath);
	const controller = new ApexDiagramController(context, rootPath, tooling, apexClasses);

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

function loadApexClasses(
	context: vscode.ExtensionContext,
	rootPath: string
): Thenable<{ tooling: ToolingApi; apexClasses: ApexClass[] }> {
	return vscode.window.withProgress(
		{ location: vscode.ProgressLocation.Notification, title: "Apex Diagram" },
		async (progress) => {
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
		}
	);
}

export function deactivate() {}
