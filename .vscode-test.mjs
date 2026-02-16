import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
	{
		label: 'integrationTests',
		files: 'out/test/suite/**/*.test.js',
		version: 'insiders',
		launchArgs: ['--user-data-dir', '.vscode-test/user-data'],
		mocha: {
			ui: 'tdd',
			color: true,
			timeout: 20000
		}
	}
]);
