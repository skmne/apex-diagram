import UserInfo from "./UserInfo";
import { execShell } from "../terminal";

const DISPLAY_USER_COMMAND: string = "sf org display user --json";

async function getSalesforceUserInfo(projectPath: string) {
	return new Promise<UserInfo>((resolve, reject) => {
		execShell(DISPLAY_USER_COMMAND, projectPath)
			.then((result) => {
				try {
					const res: { result?: UserInfo; message?: string } = JSON.parse(result);
					if (res.result) {
						resolve(res.result);
					} else {
						reject(res.message + "; path=" + projectPath);
					}
				} catch (err) {
					reject(err + "; path=" + projectPath);
				}
			})
			.catch((err) => {
				reject(new Error(getSalesforceUserInfoErrorMessage(err, projectPath)));
			});
	});
}

function getSalesforceUserInfoErrorMessage(err: unknown, projectPath: string): string {
	const message = String(err);
	if (message.toLowerCase().includes("not recognized") || message.toLowerCase().includes("not found")) {
		return `Salesforce CLI was not found. Install the Salesforce CLI and sign in to an org. Workspace: ${projectPath}`;
	}

	return `Could not get Salesforce org user info. Make sure the workspace has a default Salesforce org and you are signed in with the Salesforce CLI. ${message}; path=${projectPath}`;
}

export { getSalesforceUserInfo };
