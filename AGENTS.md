# Repository Guide

This project is a VS Code extension that builds Apex class dependency diagrams. The extension host code is TypeScript under `src/`, unit tests live under `test/`, and the diagram webview is plain JavaScript under `web/diagram-workspace/` bundled by webpack into `dist/webview/bundle.js`.

## Main Areas

- `src/extension.ts`: activation entrypoint, workspace detection, Salesforce data bootstrap, and registration handoff.
- `src/diagram/`: diagram controller, webview provider, command/view registration, diagram state, and cache-clear command helpers.
- `src/tree/`: VS Code tree data provider and tree items for Apex class lists.
- `src/model/`: diagram model primitives (`Node`, `Link`, `DiagrammModel`) and Apex class key helpers.
- `src/analyzer/`: converts Salesforce Apex `SymbolTable` data into `DiagrammModel` nodes and links.
- `src/salesforceAPI/`: Tooling API models, Salesforce client, symbol table generation orchestration, and symbol table cache.
- `src/sfdx/`: Salesforce CLI/user-info helpers.
- `web/diagram-workspace/index.js`: webview diagram UI using `@alesik/uml-diagram`.
- `web/diagram-workspace/index.html`: webview template loaded by `DiagramWorkspaceProvider`.
- `webpack.webview.config.js`: webview bundling config.

## Commands

- `npm run compile`: build the webview bundle and compile TypeScript.
- `npm run build:webview`: build only `dist/webview/bundle.js`.
- `npm run watch`: watch TypeScript compilation.
- `npm run watch:webview`: watch webview bundle compilation.
- `npm run lint`: lint `src/**/*.ts`.
- `npm test`: compile, lint, then run VS Code extension tests.
- `npm run test:unit`: compile production and test TypeScript with `tsconfig.test.json`, then run selected Mocha unit tests from `out-test/test/suite/`.

## Coding Conventions

- TypeScript is strict and compiles to CommonJS in `out/`.
- Keep extension-host code in `src/`; do not import webview-only/browser code from extension-host modules.
- Keep webview code in plain JavaScript unless the build pipeline is intentionally changed.
- Prefer existing model classes (`Node`, `Link`, `DiagrammModel`) over introducing parallel shapes.
- Preserve VS Code API boundaries: extension-host file system access belongs in TypeScript; browser DOM/export behavior belongs in `web/diagram-workspace/`.
- Keep new extension-host modules in the semantic folders above instead of adding more root-level `src/*.ts` files, unless the file is an entrypoint.
- Use ASCII for new files unless the file already uses another encoding intentionally.

## Dependency Analysis Notes

- `parseDependency` creates one `Node` per `ApexClassMember` and creates links only when the referenced class/interface/external reference exists in the input set.
- Link types are:
  - `"Inheritance"` for `parentClass`.
  - `"Realization"` for implemented interfaces.
  - default `Link` type for external references, currently `"Directed Association"`.
- Namespaced keys are represented as `namespace.name`; non-namespaced keys are just `name`.
- When changing analyzer behavior, update `src/test/suite/dependencyAnalyzer.test.ts` first or alongside the implementation.

## VS Code Extension Notes

- `activate` requires an open Salesforce workspace folder and authenticates through SFDX before loading Apex classes.
- `DiagramWorkspaceProvider` is a singleton. It retains webview context when hidden and posts `"Add"` / `"Remove"` messages to the webview.
- Webview export posts an `"export"` message back to the extension host, which prompts for an SVG save path.
- `dist/webview/bundle.js` is generated. Rebuild it with `npm run build:webview` or `npm run compile` after changing `web/diagram-workspace/index.js`.

## Salesforce API Notes

- `ToolingApi.getApexClasses()` intentionally avoids selecting `Body` for the initial class list. It hides likely test classes by Apex class name pattern only; this is a performance-oriented heuristic, not a guaranteed `@IsTest` detector.

## Testing Guidance

- For analyzer/model changes, prefer focused unit tests under `test/suite/`.
- For extension activation, Salesforce, or VS Code command behavior, expect tests to need the VS Code test runner and possibly mocks around external Salesforce/SFDX calls.
- Run `npm run compile` after TypeScript or webview changes. Run `npm run lint` when touching `src/**/*.ts`.

## Known Project Quirks

- The public README is still the default VS Code extension scaffold text.
- `web/diagram-workspace/README.md` appears to contain mojibake/encoding-corrupted Russian text.
- The class name `DiagrammModel` is misspelled but used consistently; avoid renaming it unless doing a deliberate compatibility cleanup.
