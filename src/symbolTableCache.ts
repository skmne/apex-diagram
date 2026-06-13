import * as vscode from "vscode";
import { SYMBOL_TABLE_CACHE_DIR, SYMBOL_TABLE_CACHE_KEY_PREFIX } from "./salesforceAPI/salesforceClient";

async function clearSymbolTableCache(
	context: vscode.ExtensionContext,
	progress?: vscode.Progress<{ message?: string }>
): Promise<number> {
	const cacheKeys = context.workspaceState
		.keys()
		.filter((key) => key.startsWith(`${SYMBOL_TABLE_CACHE_KEY_PREFIX}:`));

	await Promise.all(cacheKeys.map((key) => context.workspaceState.update(key, undefined)));

	const storageUri = context.storageUri ?? context.globalStorageUri;
	progress?.report({ message: "Deleting cache files..." });
	await vscode.workspace.fs.delete(vscode.Uri.joinPath(storageUri, SYMBOL_TABLE_CACHE_DIR), { recursive: true }).then(
		() => undefined,
		() => undefined
	);

	return cacheKeys.length;
}

export { clearSymbolTableCache };
