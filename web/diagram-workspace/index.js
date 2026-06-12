import UMLDiagram from '@alesik/uml-diagram';

var header = document.getElementById("header").getBoundingClientRect();
var svgContainer = document.getElementById("container").getBoundingClientRect();
var width = svgContainer.width;
var height = svgContainer.height - header.height;
const svgElement = document.querySelector("#uml-diagram");
let vscodeAPI;

if (typeof acquireVsCodeApi === "function") {
	vscodeAPI = acquireVsCodeApi();
}

setSvgSize(svgElement, width, height);
window.addEventListener(
	"resize",
	(event) => {
		header = document.getElementById("header").getBoundingClientRect();
		svgContainer = document.getElementById("container").getBoundingClientRect();
		width = svgContainer.width;
		height = svgContainer.height - header.height;
		setSvgSize(svgElement, width, height);
	},
	true
);

function setSvgSize(svgElement, width, height) {
	if (svgElement) {
		svgElement.setAttribute("width", width);
		svgElement.setAttribute("height", height);
	}
}

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

if (vscodeAPI) {
	vscodeAPI.postMessage({
		command: "ready",
	});
}

// Handle the message inside the webview
window.addEventListener("message", (event) => {
	const message = event.data; // The JSON data our extension sent
	switch (message.command) {
		case "Add":
			diagram.addItems(message.value);
			break;
		case "Remove":
			diagram.removeItems(message.value);
			break;
	}
});

document.getElementById("zoomIn").addEventListener("click", (e) => {
	diagram.getZoom().zoomIn();
});

document.getElementById("zoomOut").addEventListener("click", () => {
	diagram.getZoom().zoomOut();
});

document.getElementById("resetZoom").addEventListener("click", () => {
	diagram.getZoom().resetZoom();
});

document.addEventListener("keydown", function (event) {
	switch (event.keyCode) {
		case 65: // 'A'
			diagram.getZoom().panLeft();
			break;
		case 83: // 'S'
			diagram.getZoom().panDown();
			break;
		case 68: // 'D'
			diagram.getZoom().panRight();
			break;
		case 87: // 'W'
			diagram.getZoom().panUp();
			break;
		case 32: // spacebar
			diagram.getZoom().center();
			break;
	}
});

document.getElementById("export").addEventListener("click", () => {
	if (vscodeAPI) {
		const svgString = getSVGText();
		vscodeAPI.postMessage({
			command: "export",
			text: svgString,
		});
	} else {
		exportSvg();
	}
});

function exportSvg() {
	const svgString = getSVGText();
	const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });

	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "exported-svg.svg";
	link.click();
}

function getSVGText() {
	const serializer = new XMLSerializer();
	return serializer.serializeToString(svgElement);
}
