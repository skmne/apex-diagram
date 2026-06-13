import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		ignores: ['out/**', 'dist/**', 'web/**', '**/*.d.ts', 'node_modules/**'],
	},
	{
		files: ['src/**/*.ts'],
		extends: [
			...tseslint.configs.recommended,
		],
		rules: {
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-explicit-any': 'off',
			'curly': 'warn',
			'eqeqeq': 'warn',
			'no-throw-literal': 'warn',
		},
	},
	{
		files: [
			'src/salesforceAPI/**/*.ts',
			'src/test/suite/dependencyAnalyzer.test.ts',
			'src/test/suite/SymbolTableCache.test.ts',
		],
		rules: {
			'@typescript-eslint/naming-convention': 'off',
		},
	}
);
