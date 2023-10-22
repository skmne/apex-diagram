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

function setSvgSize(svgElement, width, height) {
	if (svgElement) {
		svgElement.setAttribute("width", width);
		svgElement.setAttribute("height", height);
	}
}

const diagram = new MyLibrary.default(svgElement);
// diagram.setData(getData());
diagram.setNodeSize(100, 50);
diagram.setStyle({
	foreground: "var(--vscode-editor-foreground)",
	background: "var(--vscode-editor-background)",
	fontFamily: "var(--vscode-font-family)",
	fontSize: "12px",
	fontColor: "var(--vscode-editor-foreground)",
});

diagram.build();

// Handle the message inside the webview
window.addEventListener("message", (event) => {
	const message = event.data; // The JSON data our extension sent
	console.log(message);
	switch (message.command) {
		case "Add":
			console.log("add");
			diagram.addItems({
				nodes: [
					{
						name: message.value,
						id: message.value,
					},
				],
				links: [],
			});
			break;
		case "Remove":
			console.log("remove");
			diagram.removeItems([message.value]);
			break;
	}
});

document.getElementById("add").addEventListener("click", () => {
	console.log("add");
	let newDataMock = {
		nodes: [
			{
				namespace: null,
				name: "fflib_Constructor NEW",
				id: "fflib_Constructor_NEW",
				x: 400,
				y: 100,
			},
			{
				namespace: null,
				name: "fflib_Selector NEW",
				id: "fflib_Selector_New",
				x: 100,
				y: 100,
			},
		],
		links: [
			{
				source: "fflib_Constructor_NEW",
				target: "fflib_Selector_New",
				type: "Realization",
			},
		],
	};
	diagram.addItems(newDataMock);
});

document.getElementById("remove").addEventListener("click", () => {
	console.log("remove");
	diagram.removeItems(["fflib_Selector_New", "fflib_Constructor_NEW"]);
});

function getData() {
	return {
		nodes: [
			{
				namespace: null,
				name: "fflib_IDomainConstructor",
				id: "fflib_IDomainConstructor",
				group: 1,
			},
			{
				namespace: null,
				name: "fflib_ISObjectSelector",
				id: "fflib_ISObjectSelector",
				group: 1,
			},
			{
				namespace: null,
				name: "fflib_IObjects",
				id: "fflib_IObjects",
				group: 1,
			},
			{
				namespace: null,
				name: "fflib_IServiceFactory",
				id: "fflib_IServiceFactory",
			},
			{
				namespace: null,
				name: "fflib_StringBuilder",
				id: "fflib_StringBuilder",
			},
			{
				namespace: null,
				name: "fflib_Objects",
				id: "fflib_Objects",
			},
			{
				namespace: null,
				name: "fflib_ISObjectUnitOfWork",
				id: "fflib_ISObjectUnitOfWork",
			},
			{
				namespace: null,
				name: "fflib_SObjectSelector",
				id: "fflib_SObjectSelector",
			},
			{
				namespace: null,
				name: "BaseApexClass",
				id: "BaseApexClass",
			},
			{
				namespace: null,
				name: "fflib_ISObjects",
				id: "fflib_ISObjects",
			},
			{
				namespace: null,
				name: "fflib_Application",
				id: "fflib_Application",
			},
			{
				namespace: null,
				name: "fflib_ISelectorFactory",
				id: "fflib_ISelectorFactory",
			},
			{
				namespace: null,
				name: "ApexClass",
				id: "ApexClass",
			},
			{
				namespace: null,
				name: "BoatDataService",
				id: "BoatDataService",
			},
			{
				namespace: null,
				name: "GenerateDataTests",
				id: "GenerateDataTests",
			},
			{
				namespace: null,
				name: "fflib_SObjectDescribe",
				id: "fflib_SObjectDescribe",
			},
			{
				namespace: null,
				name: "fflib_SObjectDomain",
				id: "fflib_SObjectDomain",
			},
			{
				namespace: null,
				name: "fflib_SObjectUnitOfWork",
				id: "fflib_SObjectUnitOfWork",
			},
			{
				namespace: null,
				name: "SimilarBoatsControllerTest",
				id: "SimilarBoatsControllerTest",
			},
			{
				namespace: null,
				name: "fflib_ISObjectDomain",
				id: "fflib_ISObjectDomain",
			},
			{
				namespace: null,
				name: "BoatDataServiceTest",
				id: "BoatDataServiceTest",
			},
			{
				namespace: null,
				name: "fflib_QueryFactory",
				id: "fflib_QueryFactory",
			},
			{
				namespace: null,
				name: "fflib_IDomain",
				id: "fflib_IDomain",
			},
			{
				namespace: null,
				name: "GenerateData",
				id: "GenerateData",
			},
			{
				namespace: null,
				name: "IApexClass",
				id: "IApexClass",
			},
			{
				namespace: null,
				name: "SimilarBoatsController",
				id: "SimilarBoatsController",
			},
			{
				namespace: null,
				name: "fflib_SecurityUtils",
				id: "fflib_SecurityUtils",
			},
			{
				namespace: null,
				name: "fflib_IDomainFactory",
				id: "fflib_IDomainFactory",
			},
			{
				namespace: null,
				name: "fflib_IUnitOfWorkFactory",
				id: "fflib_IUnitOfWorkFactory",
			},
			{
				namespace: null,
				name: "fflib_SObjects",
				id: "fflib_SObjects",
			},
		],
		links: [
			{
				source: "fflib_IDomainConstructor",
				target: "fflib_ISObjectSelector",
				type: "Directed Association",
			},
			{
				source: "fflib_ISObjectSelector",
				target: "fflib_IObjects",
				type: "Realization",
			},
			{
				source: "fflib_IObjects",
				target: "fflib_IDomainConstructor",
				type: "Directed Association",
			},
			{
				source: "fflib_IDomainConstructor",
				target: "fflib_IObjects",
				type: "Directed Association",
			},
			{
				source: "fflib_IUnitOfWorkFactory",
				target: "fflib_ISObjectSelector",
				type: "Inheritance",
			},
			{
				source: "fflib_IUnitOfWorkFactory",
				target: "fflib_SecurityUtils",
				type: "Inheritance",
			},
			{
				source: "fflib_SecurityUtils",
				target: "GenerateData",
				type: "Inheritance",
			},
			{
				source: "GenerateData",
				target: "IApexClass",
				type: "Inheritance",
			},
			{
				source: "IApexClass",
				target: "fflib_IDomain",
				type: "Inheritance",
			},
			{
				source: "fflib_IDomainFactory",
				target: "fflib_SObjectDomain",
				type: "Inheritance",
			},
			{
				source: "fflib_SObjectDomain",
				target: "fflib_StringBuilder",
				type: "Inheritance",
			},
			{
				source: "fflib_ISObjectDomain",
				target: "GenerateDataTests",
				type: "Inheritance",
			},
			{
				source: "IApexClass",
				target: "fflib_IDomain",
				type: "Inheritance",
			},
			{
				source: "IApexClass",
				target: "fflib_IDomain",
				type: "Inheritance",
			},
			{
				source: "IApexClass",
				target: "fflib_IDomain",
				type: "Inheritance",
			},
			{
				source: "IApexClass",
				target: "fflib_IDomain",
				type: "Inheritance",
			},
			{
				source: "IApexClass",
				target: "fflib_IDomain",
				type: "Inheritance",
			},
			{
				source: "IApexClass",
				target: "fflib_IDomain",
				type: "Inheritance",
			},
			{
				source: "IApexClass",
				target: "fflib_IDomain",
				type: "Inheritance",
			},
			{
				source: "IApexClass",
				target: "fflib_IDomain",
				type: "Inheritance",
			},
		],
	};
}
