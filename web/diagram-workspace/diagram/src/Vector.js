export default class Vector {
	#x = 0;
	#y = 0;
	constructor(x, y) {
		this.#x = x;
		this.#y = y;
	}

	getLength() {
		return Math.abs(Math.sqrt(this.#x * this.#x + this.#y * this.#y));
	}

	normalized() {
		const invLength = 1 / this.getLength();
		return new Vector(this.#x * invLength, this.#y * invLength);
	}

	multipleVectorByScalar(scalar) {
		this.#x *= scalar;
		this.#y *= scalar;
		return this;
	}

	get x() {
		return this.#x;
	}
	get y() {
		return this.#y;
	}
	set x(x) {
		this.#x = x;
	}
	set y(y) {
		this.#y = y;
	}

	getX() {
		return this.#x;
	}
	getY() {
		return this.#y;
	}
}
