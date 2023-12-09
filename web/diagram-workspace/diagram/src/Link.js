import Vector from "./Vector.js";
import state from "./GlobalState.js";

export default class Link {
	#sourceNode;
	#targetNode;
	#arrowSize = 10;

	constructor(link) {
		this.source = link.source;
		this.target = link.target;
		this.type = link.type;

		this.#sourceNode = this.#getNodeByKey(link.source);
		this.#targetNode = this.#getNodeByKey(link.target);
	}

	getSourceVector() {
		return new Vector(this.#sourceX(), this.#sourceY());
	}

	getTargetVector() {
		const sourceVector = this.getSourceVector();
		const currentVector = new Vector(
			this.#targetX() - sourceVector.getX(),
			this.#targetY() - sourceVector.getY()
		);
		const normalizedVector = currentVector.normalized();
		normalizedVector.multipleVectorByScalar(currentVector.getLength() - this.#arrowSize);

		const targetVector = new Vector(
			sourceVector.getX() + normalizedVector.getX(),
			sourceVector.getY() + normalizedVector.getY()
		);

		return targetVector;
	}

	#sourceX() {
		const sourceX = this.#sourceNode.x;
		const sourceY = this.#sourceNode.y;
		const targetX = this.#targetNode.x;
		const targetY = this.#targetNode.y;

		if (Math.abs(sourceY - targetY) <= this.#sourceNode.height) {
			if (sourceX > targetX) {
				return sourceX;
			} else {
				return sourceX + this.#sourceNode.width;
			}
		} else if (Math.abs(sourceX - targetX) <= this.#sourceNode.width + 20) {
			return sourceX + this.#sourceNode.width / 2;
		} else if (sourceX > targetX) {
			return sourceX;
		} else {
			return sourceX + this.#sourceNode.width;
		}
	}

	#targetX() {
		const sourceX = this.#sourceNode.x;
		const sourceY = this.#sourceNode.y;
		const targetX = this.#targetNode.x;
		const targetY = this.#targetNode.y;

		if (Math.abs(sourceY - targetY) <= this.#targetNode.height) {
			if (sourceX < targetX) {
				return targetX;
			} else {
				return targetX + this.#targetNode.width;
			}
		} else if (Math.abs(sourceX - targetX) <= this.#targetNode.width + 20) {
			return targetX + this.#targetNode.width / 2;
		} else if (sourceX < targetX) {
			return targetX;
		} else if (sourceX > targetX) {
			return targetX + this.#targetNode.width;
		} else {
			return targetX + this.#targetNode.width / 2;
		}
	}

	#sourceY() {
		const sourceY = this.#sourceNode.y;
		const targetY = this.#targetNode.y;

		if (Math.abs(sourceY - targetY) <= Math.abs(this.#sourceNode.height - this.#targetNode.height)) {
			return sourceY + this.#sourceNode.height / 2;
		} else if (sourceY > targetY) {
			return sourceY;
		} else {
			return sourceY + this.#sourceNode.height;
		}
	}

	#targetY() {
		const sourceY = this.#sourceNode.y;
		const targetY = this.#targetNode.y;

		if (Math.abs(sourceY - targetY) <= this.#targetNode.height) {
			return targetY + this.#targetNode.height / 2;
		} else if (sourceY > targetY) {
			return targetY + this.#targetNode.height;
		} else if (sourceY < targetY) {
			return targetY;
		}
	}

	#getNodeByKey(nodeKey) {
		const currentNode = state.nodes.find((item) => item.id === nodeKey);
		return currentNode;
	}
}
