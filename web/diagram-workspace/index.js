// import Diagram from "./MyLibrary";

var header = document.getElementById("header").getBoundingClientRect();
var svgContainer = document.getElementById("container").getBoundingClientRect();
var width = svgContainer.width;
var height = svgContainer.height - header.height;
const svgElement = document.querySelector("svg");

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

// Handle the message inside the webview
window.addEventListener("message", (event) => {
	const message = event.data; // The JSON data our extension sent
	console.log(message);
	switch (message.command) {
		case "Add":
			console.log("add");
			break;
		case "Remove":
			console.log("remove");
			break;
	}
});

function setSvgSize(svgElement, width, height) {
	if (svgElement) {
		svgElement.setAttribute("width", width);
		svgElement.setAttribute("height", height);
	}
}

const diagram = new MyLibrary.default(svgElement);
