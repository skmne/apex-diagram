import UserInfo from "./UserInfo";
import { execShell } from "../terminal";

const DISPLAY_USER_COMMAND: string = "sf org display user --json";

async function getSalesforceUserInfo(projectPath: string) {
	return new Promise<UserInfo>((resolve, reject) => {
		execShell(DISPLAY_USER_COMMAND, projectPath)
			.then((result: any) => {
				try {
					const res: any = JSON.parse(result);
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
				reject(err + "; path=" + projectPath);
			});
	});
}

// type CommandResponse = {
// 	result?: UserInfo;
// 	message?: any;
// };

export { getSalesforceUserInfo };
