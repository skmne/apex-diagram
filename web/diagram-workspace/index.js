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
diagram.setData(getData());
diagram.setNodeSize(100, 50);
diagram.setStyle({
	foreground: "var(--vscode-editor-foreground)",
	background: "var(--vscode-editor-background)",
	fontFamily: "var(--vscode-font-family)",
	fontSize: "12px",
	fontColor: "var(--vscode-editor-foreground)",
});

diagram.build();

function getData() {
	return {
		nodes: [
			{
				namespace: null,
				name: "fflib_IDomainConstructor",
				key: "fflib_IDomainConstructor",
			},
			{
				namespace: null,
				name: "fflib_ISObjectSelector",
				key: "fflib_ISObjectSelector",
			},
			{
				namespace: null,
				name: "fflib_IObjects",
				key: "fflib_IObjects",
			},
			{
				namespace: null,
				name: "fflib_IServiceFactory",
				key: "fflib_IServiceFactory",
			},
			{
				namespace: null,
				name: "fflib_StringBuilder",
				key: "fflib_StringBuilder",
			},
			{
				namespace: null,
				name: "fflib_Objects",
				key: "fflib_Objects",
			},
			{
				namespace: null,
				name: "fflib_ISObjectUnitOfWork",
				key: "fflib_ISObjectUnitOfWork",
			},
			{
				namespace: null,
				name: "fflib_SObjectSelector",
				key: "fflib_SObjectSelector",
			},
			{
				namespace: null,
				name: "BaseApexClass",
				key: "BaseApexClass",
			},
			{
				namespace: null,
				name: "fflib_ISObjects",
				key: "fflib_ISObjects",
			},
			{
				namespace: null,
				name: "fflib_Application",
				key: "fflib_Application",
			},
			{
				namespace: null,
				name: "fflib_ISelectorFactory",
				key: "fflib_ISelectorFactory",
			},
			{
				namespace: null,
				name: "ApexClass",
				key: "ApexClass",
			},
			{
				namespace: null,
				name: "BoatDataService",
				key: "BoatDataService",
			},
			{
				namespace: null,
				name: "GenerateDataTests",
				key: "GenerateDataTests",
			},
			{
				namespace: null,
				name: "fflib_SObjectDescribe",
				key: "fflib_SObjectDescribe",
			},
			{
				namespace: null,
				name: "fflib_SObjectDomain",
				key: "fflib_SObjectDomain",
			},
			{
				namespace: null,
				name: "fflib_SObjectUnitOfWork",
				key: "fflib_SObjectUnitOfWork",
			},
			{
				namespace: null,
				name: "SimilarBoatsControllerTest",
				key: "SimilarBoatsControllerTest",
			},
			{
				namespace: null,
				name: "fflib_ISObjectDomain",
				key: "fflib_ISObjectDomain",
			},
			{
				namespace: null,
				name: "BoatDataServiceTest",
				key: "BoatDataServiceTest",
			},
			{
				namespace: null,
				name: "fflib_QueryFactory",
				key: "fflib_QueryFactory",
			},
			{
				namespace: null,
				name: "fflib_IDomain",
				key: "fflib_IDomain",
			},
			{
				namespace: null,
				name: "GenerateData",
				key: "GenerateData",
			},
			{
				namespace: null,
				name: "IApexClass",
				key: "IApexClass",
			},
			{
				namespace: null,
				name: "SimilarBoatsController",
				key: "SimilarBoatsController",
			},
			{
				namespace: null,
				name: "fflib_SecurityUtils",
				key: "fflib_SecurityUtils",
			},
			{
				namespace: null,
				name: "fflib_IDomainFactory",
				key: "fflib_IDomainFactory",
			},
			{
				namespace: null,
				name: "fflib_IUnitOfWorkFactory",
				key: "fflib_IUnitOfWorkFactory",
			},
			{
				namespace: null,
				name: "fflib_SObjects",
				key: "fflib_SObjects",
			},
		],
		links: [
			{
				source: 0,
				target: 22,
				type: "Directed Association",
			},
			{
				source: 2,
				target: 22,
				type: "Realization",
			},
			{
				source: 5,
				target: 2,
				type: "Realization",
			},
			{
				source: 7,
				target: 1,
				type: "Realization",
			},
			{
				source: 7,
				target: 15,
				type: "Directed Association",
			},
			{
				source: 7,
				target: 21,
				type: "Directed Association",
			},
			{
				source: 7,
				target: 4,
				type: "Directed Association",
			},
			{
				source: 9,
				target: 2,
				type: "Realization",
			},
			{
				source: 11,
				target: 1,
				type: "Directed Association",
			},
			{
				source: 12,
				target: 8,
				type: "Inheritance",
			},
			{
				source: 12,
				target: 24,
				type: "Realization",
			},
			{
				source: 14,
				target: 23,
				type: "Directed Association",
			},
			{
				source: 16,
				target: 29,
				type: "Inheritance",
			},
			{
				source: 16,
				target: 19,
				type: "Realization",
			},
			{
				source: 16,
				target: 29,
				type: "Directed Association",
			},
			{
				source: 16,
				target: 5,
				type: "Directed Association",
			},
			{
				source: 17,
				target: 6,
				type: "Realization",
			},
			{
				source: 18,
				target: 23,
				type: "Directed Association",
			},
			{
				source: 18,
				target: 25,
				type: "Directed Association",
			},
			{
				source: 19,
				target: 22,
				type: "Realization",
			},
			{
				source: 20,
				target: 23,
				type: "Directed Association",
			},
			{
				source: 20,
				target: 13,
				type: "Directed Association",
			},
			{
				source: 21,
				target: 15,
				type: "Directed Association",
			},
			{
				source: 21,
				target: 26,
				type: "Directed Association",
			},
			{
				source: 25,
				target: 13,
				type: "Directed Association",
			},
			{
				source: 26,
				target: 15,
				type: "Directed Association",
			},
			{
				source: 27,
				target: 22,
				type: "Directed Association",
			},
			{
				source: 28,
				target: 6,
				type: "Directed Association",
			},
			{
				source: 29,
				target: 5,
				type: "Inheritance",
			},
			{
				source: 29,
				target: 9,
				type: "Realization",
			},
			{
				source: 29,
				target: 5,
				type: "Directed Association",
			},
		],
	};
}

document.getElementById("add").addEventListener("click", () => {
	console.log("add");
	let newDataMock = {
		nodes: [
			{
				namespace: null,
				name: "fflib_Constructor NEW",
				key: "fflib_Constructor_NEW",
				x: 400,
				y: 100,
			},
			{
				namespace: null,
				name: "fflib_Selector NEW",
				key: "fflib_Selector_New",
				x: 100,
				y: 100,
			},
		],
		links: [
			{
				source: 0,
				target: 1,
				type: "Realization",
			},
		],
	};
	diagram.addItems(newDataMock);
});
