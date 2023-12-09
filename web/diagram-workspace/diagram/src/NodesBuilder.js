import { drag } from "d3";
import Node from "./Node.js";
import state from "./GlobalState.js";

export default class NodesBuilder {
	#rootGroup;
	#nodesContainer;
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

	setInitPosition(newNodes) {
		let initX = 0;
		let initY = 0;

		newNodes.forEach((item) => {
			const width = item.width;
			const height = item.height;
			while (!this.isPositionClear(initX, initY, width, height)) {
				initX += width + this.#padding;
				if (initX + width > this.#svgWidth) {
					initX = 0;
					initY += height + this.#padding;
				}
			}
			item.setPosition(initX, initY);

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
		for (let i = 0; i < state.nodes.length; i++) {
			const existingNode = state.nodes[i];
			const x1 = existingNode.x;
			const y1 = existingNode.y;
			const width1 = existingNode.width;
			const height1 = existingNode.height;
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
		console.log(state.links);
		for (var i = 0; i < state.links.length; i++) {
			var existingLine = state.links[i];
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

	setData(data) {
		state = data;
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
		this.createNodes();
	}

	createNodes() {
		this.#nodeGroups = this.#createGroupNodes(state.nodes);
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
			.attr("width", (d) => {
				return d.width;
			})
			.attr("height", (d) => {
				return d.height;
			})
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
			.attr("width", (d) => {
				return d.width;
			})
			.attr("height", (d) => {
				return d.height;
			})
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
				const width = d.width / 2;
				return width;
			})
			.attr("dy", (d) => {
				const heigth = d.height / 2;
				return heigth;
			});
		return text;
	}

	#createTitles() {
		this.#nodeGroups.append("title").text((d) => {
			return d.name;
		});
	}
}
