import UMLDiagram from '@alesik/uml-diagram';

const headerElement = getHTMLElement("header");
const containerElement = getHTMLElement("container");
const svgElement = getHTMLElement("uml-diagram");
const nodeContextMenuElement = getHTMLElement("nodeContextMenu");
const openClassFileElement = getHTMLElement("openClassFile");
const vscodeAPI = getVsCodeApi();
let contextMenuNode;
const printExportStyle = {
	background: "#ffffff",
	nodeForeground: "#111111",
	nodeBackground: "#ffffff",
	fontColor: "#111111",
};

resizeDiagram();

const diagram = new UMLDiagram(svgElement);
diagram.setStyle({
	nodeForeground: "var(--vscode-editor-foreground)",
	nodeBackground: "var(--vscode-editor-background)",
	fontFamily: "var(--vscode-font-family)",
	fontSize: "12px",
	fontColor: "var(--vscode-editor-foreground)",
	nodeWidth: 200,
});
diagram.build();

bindResize();
bindDiagramEvents();
bindWebviewMessages();
bindToolbar();
bindKeyboard();

if (vscodeAPI) {
	vscodeAPI.postMessage({
		command: "ready",
	});
}

function getHTMLElement(id) {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing required webview element: ${id}`);
	}

	return element;
}

function getVsCodeApi() {
	if (typeof acquireVsCodeApi === "function") {
		return acquireVsCodeApi();
	}

	return undefined;
}

function bindResize() {
	window.addEventListener("resize", resizeDiagram, true);
}

function bindDiagramEvents() {
	if (!vscodeAPI) {
		return;
	}

	diagram.on("layoutChanged", (data) => {
		vscodeAPI.postMessage({
			command: "layoutChanged",
			value: getNodeLayout(data),
		});
	});

	diagram.on("nodeContextMenu", ({ node, event }) => {
		event.preventDefault();
		contextMenuNode = node;
		showNodeContextMenu(event.clientX, event.clientY);
	});
}

function resizeDiagram() {
	const header = headerElement.getBoundingClientRect();
	const svgContainer = containerElement.getBoundingClientRect();
	const width = svgContainer.width;
	const height = svgContainer.height - header.height;

	setSvgSize(svgElement, width, height);
}

function setSvgSize(element, width, height) {
	element.setAttribute("width", width);
	element.setAttribute("height", height);
}

function bindWebviewMessages() {
	window.addEventListener("message", (event) => {
		const message = event.data;
		switch (message.command) {
			case "Add":
				diagram.addItems(message.value);
				break;
			case "Remove":
				diagram.removeItems(message.value);
				break;
		}
	});
}

function bindToolbar() {
	openClassFileElement.addEventListener("click", () => {
		openContextMenuNodeFile();
	});

	document.addEventListener("click", (event) => {
		if (!nodeContextMenuElement.contains(event.target)) {
			hideNodeContextMenu();
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			hideNodeContextMenu();
		}
	});

	getHTMLElement("zoomIn").addEventListener("click", () => {
		diagram.getZoom().zoomIn();
	});

	getHTMLElement("zoomOut").addEventListener("click", () => {
		diagram.getZoom().zoomOut();
	});

	getHTMLElement("resetZoom").addEventListener("click", () => {
		diagram.getZoom().resetZoom();
	});

	getHTMLElement("export").addEventListener("click", () => {
		if (vscodeAPI) {
			vscodeAPI.postMessage({
				command: "export",
				text: getSVGText(),
			});
		} else {
			exportSvg();
		}
	});
}

function bindKeyboard() {
	document.addEventListener("keydown", (event) => {
		switch (event.key.toLowerCase()) {
			case "a":
				diagram.getZoom().panLeft();
				break;
			case "s":
				diagram.getZoom().panDown();
				break;
			case "d":
				diagram.getZoom().panRight();
				break;
			case "w":
				diagram.getZoom().panUp();
				break;
			case " ":
				diagram.getZoom().center();
				break;
		}
	});
}

function exportSvg() {
	const svgString = getSVGText();
	const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });

	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "exported-svg.svg";
	link.click();
}

function getSVGText() {
	return diagram.exportSvg(printExportStyle);
}

function getNodeLayout(data) {
	return data.nodes
		.map((node) => ({
			id: node.id,
			x: node.x,
			y: node.y,
		}))
		.filter((node) => typeof node.id === "string" && Number.isFinite(node.x) && Number.isFinite(node.y));
}

function showNodeContextMenu(x, y) {
	nodeContextMenuElement.classList.remove("hidden");

	const rect = nodeContextMenuElement.getBoundingClientRect();
	const left = Math.min(x, window.innerWidth - rect.width - 8);
	const top = Math.min(y, window.innerHeight - rect.height - 8);

	nodeContextMenuElement.style.left = `${Math.max(8, left)}px`;
	nodeContextMenuElement.style.top = `${Math.max(8, top)}px`;
}

function hideNodeContextMenu() {
	nodeContextMenuElement.classList.add("hidden");
	contextMenuNode = undefined;
}

function openContextMenuNodeFile() {
	if (!vscodeAPI || !contextMenuNode) {
		hideNodeContextMenu();
		return;
	}

	const name = getNodeName(contextMenuNode);
	if (name) {
		vscodeAPI.postMessage({
			command: "openClass",
			value: { name },
		});
	}

	hideNodeContextMenu();
}

function getNodeName(node) {
	if (typeof node.name === "string" && node.name.length > 0) {
		return node.name;
	}

	if (typeof node.id !== "string" || node.id.length === 0) {
		return undefined;
	}

	const idParts = node.id.split(".");
	return idParts[idParts.length - 1];
}
