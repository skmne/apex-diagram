import { drag } from "d3";

export default class NodesBuilder {
	#data = { nodes: [], links: [] };
	#rootGroup;
	#nodesContainer;
	#nodeWidth = 160;
	#nodeHeigth = 40;
	#padding = 50;
	#nodeGroups;
	#rectangles;
	#textHeaders;

	#foreground = "var(--vscode-editor-foreground)";
	#background = "var(--vscode-editor-background)";

	#fontFamily = "var(--vscode-font-family)";
	#fontSize = "12px";
	#fontColor = "var(--vscode-editor-foreground)";

	#svgWidth;
	constructor(svgWidth) {
		this.#svgWidth = svgWidth;
	}

	addNodes(newData) {
		this.#data.links = [...this.#data.links, ...newData.links];
		let newNodes = this.setInitPosition(newData.nodes);
		this.#data.nodes = [...this.#data.nodes, ...newNodes];
		console.log(this.#data.nodes);
		this.#createNodes(this.#data.nodes);
		this.update();
	}

	setInitPosition(newNodes, existingNodes) {
		let initX = 0;
		let initY = 0;

		newNodes.forEach((item) => {
			var width = this.#nodeWidth;
			var height = this.#nodeHeigth;

			while (!this.isPositionClear(initX, initY, width, height)) {
				initX += width + this.#padding;
				if (initX + width > this.#svgWidth) {
					initX = 0;
					initY += height + this.#padding;
				}
			}

			item.x = initX;
			item.y = initY;

			// Update x for the next rectangle
			initX += width + this.#padding;
			if (initX + width > this.#svgWidth) {
				initX = 0;
				initY += height + this.#padding;
			}
		});
		return newNodes;
	}

	isPositionClear(x, y, width, height) {
		return !this.hasRectangleCollision(x, y, width, height) && !this.hasLineCollision(x, y, width, height);
	}

	// Function to check for collisions with rectangles
	hasRectangleCollision(x, y, width, height) {
		for (var i = 0; i < this.#data.nodes.length; i++) {
			var existingRect = this.#data.nodes[i];
			var x1 = existingRect.x;
			var y1 = existingRect.y;
			var width1 = this.#nodeWidth;
			var height1 = this.#nodeHeigth;

			if (
				x1 < x + width + this.#padding &&
				x1 + width1 + this.#padding > x &&
				y1 < y + height + this.#padding &&
				y1 + height1 + this.#padding > y
			) {
				return true; // Collision detected
			}
		}
		return false; // Position is clear
	}

	// Function to check for collisions with lines
	hasLineCollision(x, y, width, height) {
		console.log(this.#data.links);
		for (var i = 0; i < this.#data.links.length; i++) {
			var existingLine = this.#data.links[i];
			var lineX1 = existingLine.x1;
			var lineY1 = existingLine.y1;
			var lineX2 = existingLine.x2;
			var lineY2 = existingLine.y2;

			if (
				x < Math.max(lineX1, lineX2) + this.#padding &&
				x + width + this.#padding > Math.min(lineX1, lineX2) &&
				y < Math.max(lineY1, lineY2) + this.#padding &&
				y + height + this.#padding > Math.min(lineY1, lineY2)
			) {
				return true; // Line collision detected
			}
		}
		return false;
	}

	removeNodes(nodesIds) {
		this.#data.nodes = this.#data.nodes.filter((node) => !nodesIds.includes(node.id));
		this.#data.links = this.#data.nodes.filter(
			(link) => !nodesIds.includes(link.source) || !nodesIds.includes(link.target)
		);
		console.log(this.#data);
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
