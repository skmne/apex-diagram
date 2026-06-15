# Change Log

All notable changes to Apex Diagram will be documented in this file.

## [0.1.0] - 2026-06-15

### Added

- Initial preview release.
- Apex Diagram activity bar views for Apex classes and selected diagram items.
- Salesforce Tooling API integration for loading Apex classes and symbol tables.
- Interactive UML-style diagram workspace for Apex class dependencies.
- Relationship detection for inheritance, interface realization, and directed associations.
- Add, remove, clear, zoom, inspect source, open local class file, and export SVG actions.
- Diagram state persistence, including node positions.
- Local symbol table cache with stale, missing, and invalid cache handling.
- Lazy Apex class loading when the Apex Diagram views are opened.
- Desktop-only support with Salesforce DX workspace detection through `sfdx-project.json`.

### Changed

- Bundled the extension host and webview for a smaller VSIX package.
- Marketplace metadata, README preview assets, and MIT license added.

### Limitations

- VS Code for the Web is not supported.
- Apex Diagram is shown only in workspaces containing `sfdx-project.json`.
- The initial Apex class list hides likely test classes by class name pattern only.
