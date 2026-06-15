# Diagram Workspace

This folder contains the browser-side webview UI for rendering Apex class dependency diagrams.

## Files

- `index.html` is the VS Code webview HTML template.
- `index.js` contains the diagram UI logic and imports `@alesik/uml-diagram`.
- `dist/webview/bundle.js` is the generated webview bundle. It is built from `index.js` by webpack.

## Build

- `npm run build:webview` builds only the webview bundle.
- `npm run watch:webview` rebuilds the webview bundle when files change.
- `npm run compile` builds the webview bundle and the extension host TypeScript.

## Runtime Flow

1. Webpack uses `web/diagram-workspace/index.js` as the webview entry point.
2. The `@alesik/uml-diagram` dependency is bundled into `dist/webview/bundle.js`.
3. `DiagramWorkspaceProvider` reads `index.html`, injects the Content Security Policy, and rewrites `./bundle.js` to a VS Code webview URI.
4. The webview posts messages back to the extension host for export, source preview, file opening, and diagram item removal.

## Notes

Keep this folder browser-only. Extension-host logic, workspace file access, and VS Code API calls belong under `src/`.
