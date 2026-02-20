import * as cp from "child_process";

const execShell = (cmd: string, projectPath: string) =>
	new Promise<string>((resolve, reject) => {
		cp.exec(cmd, { cwd: projectPath }, (err: cp.ExecException | null, out: string) => {
			if (err) {
				try {
					const errorResult = JSON.parse(out);
					if (errorResult.message) {
						return reject(`Error: ${errorResult.message} \nActions: ${errorResult.actions}`);
					}
				} catch (error) {
					return reject(error);
				}

				return reject(err);
			}
			return resolve(out);
		});
	});

export { execShell };
