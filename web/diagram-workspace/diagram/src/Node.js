import Vector from "./Vector.js";

export default class Node {
	#id;
	#name;
	#position = new Vector(0, 0);
	width = 160; //default value todo move to the diagram set
	height = 40;

	constructor(nodeObj) {
		this.#id = nodeObj.id;
		this.#name = nodeObj.name;
		this.width = nodeObj.width ? nodeObj.width : 160;
		this.height = nodeObj.height ? nodeObj.height : 40;
	}

	get id() {
		return this.#id;
	}

	get name() {
		return this.#name;
	}

	setPosition(x, y) {
		this.#position = new Vector(x, y);
	}

	get position() {
		return this.#position;
	}
}
