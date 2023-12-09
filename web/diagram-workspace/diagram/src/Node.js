import Vector from "./Vector.js";
import state from "./GlobalState.js";
export default class Node {
	#id;
	#name;
	#width; //default value todo move to the diagram set
	#height;
	x;
	y;

	constructor(nodeObj) {
		this.#id = nodeObj.id;
		this.#name = nodeObj.name;
		this.#width = nodeObj.width ? nodeObj.width : state.style.nodeWidth;
		this.#height = nodeObj.height ? nodeObj.height : state.style.nodeHeight;
		this.setInitPosition();
	}

	get id() {
		return this.#id;
	}

	get name() {
		return this.#name;
	}

	setPosition(x, y) {
		this.x = x;
		this.y = y;
	}

	get width() {
		return this.#width;
	}

	get height() {
		return this.#height;
	}

	setInitPosition() {
		let initX = 0;
		let initY = 0;

		const width = this.width;
		const height = this.height;
		while (!this.isPositionClear(initX, initY, width, height)) {
			initX += width + state.padding;
			if (initX + width > state.width) {
				initX = 0;
				initY += height + state.padding;
			}
		}
		this.setPosition(initX, initY);

		// // Update x for the next rectangle
		// initX += width + state.padding;
		// if (initX + width > state.width) {
		// 	initX = 0;
		// 	initY += height + state.padding;
		// }
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
				x1 < x + width + state.padding &&
				x1 + width1 + state.padding > x &&
				y1 < y + height + state.padding &&
				y1 + height1 + state.padding > y
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
				x < Math.max(lineX1, lineX2) + state.padding &&
				x + width + state.padding > Math.min(lineX1, lineX2) &&
				y < Math.max(lineY1, lineY2) + state.padding &&
				y + height + state.padding > Math.min(lineY1, lineY2)
			) {
				return true; // Line collision detected
			}
		}
		return false;
	}
}
