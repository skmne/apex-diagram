import { drag } from "d3";

export default class NodesBuilder {
	#data;
	#rootGroup;
	#nodesContainer;
	#nodeWidth = 160;
	#nodeHeigth = 40;
	#nodeGroups;
	#rectangles;
	#textHeaders;

	#foreground = "var(--vscode-editor-foreground)";
	#background = "var(--vscode-editor-background)";

	#fontFamily = "var(--vscode-font-family)";
	#fontSize = "12px";
	#fontColor = "var(--vscode-editor-foreground)";

	constructor() {}

	addNodes(newNodes) {
		this.#data.nodes = [...this.#data.nodes, ...newNodes];
		console.log(this.#data.nodes);
		this.#createNodes(this.#data.nodes);
	}

	removeNodes(nodesIds) {
		this.#data.nodes = this.#data.nodes.filter((node) => !nodesIds.includes(node.id));
		this.#createNodes(this.#data.nodes);
	}

	setData(data) {
		this.#data = data;
	}
	setSize(nodeWidth, nodeHeigth) {
		this.#nodeWidth = nodeWidth;
		this.#nodeHeigth = nodeHeigth;
	}
	getNodeWidth() {
		return this.#nodeWidth;
	}
	getNodeHeigth() {
		return this.#nodeHeigth;
	}

	setStyle(style) {
		this.#foreground = style.foreground;
		this.#background = style.background;
		this.#fontFamily = style.fontFamily;
		this.#fontSize = style.fontSize;
		this.#fontColor = style.fontColor;
	}

	build(rootGroup) {
		this.#rootGroup = rootGroup;
		this.#nodesContainer = this.#createNodesContainer(this.#rootGroup);
		this.#createNodes(this.#data.nodes);
	}

	#createNodes(nodes) {
		this.#nodeGroups = this.#createGroupNodes(nodes);
		this.#rectangles = this.#createRectangles();
		this.#textHeaders = this.#createTexts();
		this.#createTitles();
	}

	getNodeGroups() {
		return this.#nodeGroups;
	}

	getRectangles() {
		return this.#rectangles;
	}

	getHeaders() {
		return this.#textHeaders;
	}

	update() {
		this.#rectangles.attr("x", (d) => d.x).attr("y", (d) => d.y);
		this.#nodeGroups.attr("x", (d) => d.x).attr("y", (d) => d.y);
		this.#textHeaders.attr("x", (d) => d.x).attr("y", (d) => d.y);
	}

	setDragRectangle(_drag) {
		this.#rectangles.call(_drag);
	}

	#createNodesContainer(rootGroup) {
		return rootGroup.append("g").attr("class", "nodes");
	}

	#createGroupNodes(nodes) {
		return this.#nodesContainer
			.selectAll("g")
			.data(nodes)
			.join("g")
			.attr("width", this.#nodeWidth)
			.attr("height", this.#nodeHeigth)
			.attr("x", function (d) {
				return d.x;
			})
			.attr("y", function (d) {
				return d.y;
			})
			.text(function (d) {
				return d.name;
			});
	}

	#createRectangles() {
		return this.#nodeGroups
			.append("rect")
			.attr("width", this.#nodeWidth)
			.attr("height", this.#nodeHeigth)
			.attr("x", function (d) {
				return d.x;
			})
			.attr("y", function (d) {
				return d.y;
			})
			.attr("fill", this.#background)
			.attr("fill-opacity", "0.5")
			.attr("cursor", "move")
			.attr("stroke", this.#foreground)
			.attr("stroke-width", 1);
	}

	#createTexts() {
		const text = this.#nodeGroups
			.append("text")
			.text((d) => {
				if (d.name.length > 30) {
					return d.name.substring(0, 30) + "...";
				}
				return d.name;
			})
			.attr("title", (d) => {
				return d.name;
			})
			.attr("x", (d) => {
				return d.x;
			})
			.attr("y", (d) => {
				return d.y;
			})
			.attr("font-family", this.#fontFamily)
			.attr("font-size", this.#fontSize)
			.attr("fill", this.#fontColor)
			.attr("text-anchor", "middle")
			.attr("cursor", "text")
			.attr("dx", (d) => {
				return this.#nodeWidth / 2;
			})
			.attr("dy", (d) => {
				return this.#nodeHeigth / 2 + 5;
			});
		return text;
	}

	#createTitles() {
		this.#nodeGroups.append("title").text((d) => {
			return d.name;
		});
	}
}
