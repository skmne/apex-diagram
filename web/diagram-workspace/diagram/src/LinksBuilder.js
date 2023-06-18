import Vector from "./Vector.js";

export default class LinksBuilder {
	#data = [];
	#nodeWidth;
	#nodeHeigth;
	#links;
	#arrows;
	#editorForeground = "var(--vscode-editor-foreground)";
	#arrowSize = 10;

	constructor(nodeWidth, nodeHeigth, data) {
		this.#nodeWidth = nodeWidth;
		this.#nodeHeigth = nodeHeigth;
		this.#data = data;
	}

	build(rootGroupContainer) {
		const createLinkContainer = this.#createLinksContainer(rootGroupContainer);
		this.#arrows = this.#createArrows(rootGroupContainer);
		this.#links = this.#createLinks(createLinkContainer);
	}

	update() {
		this.#links
			.attr("x1", (d) => this.#getSourceVector(d).getX())
			.attr("y1", (d) => this.#getSourceVector(d).getY())
			.attr("x2", (d) => this.#getTargetVector(d).getX())
			.attr("y2", (d) => this.#getTargetVector(d).getY());
	}

	#createLinksContainer(groupContainer) {
		return groupContainer.append("g").attr("class", "links");
	}

	#createLinks(container) {
		let links = container
			.selectAll("line")
			.data(this.#data.links)
			.join("line")
			.attr("x1", (d) => this.#sourceX(d) || 0)
			.attr("y1", (d) => this.#sourceY(d) || 0)
			.attr("x2", (d) => {
				let x = this.#targetX(d) || 0;

				return x;
			})
			.attr("y2", (d) => {
				return this.#targetY(d) || 0;
			})
			.attr("marker-end", (d) => {
				let marker = "";
				switch (d.type) {
					case "Realization":
						marker = "url(#inheritance-arrow)";
						break;
					case "Inheritance":
						marker = "url(#inheritance-arrow)";
						break;
					default:
						marker = "url(#standard-arrow)";
				}
				return marker;
			})
			.attr("stroke-dasharray", (d) => {
				if (d.type === "Realization") {
					return "10, 10";
				}
			})
			.attr("stroke-width", 1)
			.attr("stroke", this.#editorForeground);

		return links;
	}

	#createArrows(groupContainer) {
		return [this.#createStandardArrow(groupContainer), this.#createInheritanceArrow(groupContainer)];
	}

	#createStandardArrow(groupContainer) {
		let marker = groupContainer
			.append("marker")
			.attr("id", "standard-arrow")
			.attr("viewBox", "0 0 10 10")
			.attr("refX", "0")
			.attr("refY", "5")
			.attr("markerUnits", "strokeWidth")
			.attr("markerWidth", "10")
			.attr("markerHeight", "10")
			.attr("orient", "auto");

		marker.append("path").attr("d", "M 0 0 L 10 5 L 0 10 z").attr("fill", this.#editorForeground);
		return marker;
	}

	#createInheritanceArrow(groupContainer) {
		let marker = groupContainer
			.append("marker")
			.attr("id", "inheritance-arrow")
			.attr("viewBox", "0 0 10 10")
			.attr("refX", "0")
			.attr("refY", "5")
			.attr("markerUnits", "strokeWidth")
			.attr("markerWidth", "10")
			.attr("markerHeight", "10")
			.attr("orient", "auto");

		marker.append("path")
			.attr("d", "M 0 0 L 10 5 L 0 10 z")
			.attr("stroke-width", "1")
			.attr("stroke", this.#editorForeground)
			.attr("fill", "none");
		return marker;
	}

	#sourceX(d) {
		if (Math.abs(d.source.y - d.target.y) <= this.#nodeHeigth) {
			if (d.source.x > d.target.x) {
				return d.source.x;
			} else {
				return d.source.x + this.#nodeWidth;
			}
		} else if (Math.abs(d.source.x - d.target.x) <= this.#nodeWidth + 20) {
			return d.source.x + this.#nodeWidth / 2;
		} else if (d.source.x > d.target.x) {
			return d.source.x;
		} else {
			return d.source.x + this.#nodeWidth;
		}
	}

	#targetX(d) {
		if (Math.abs(d.source.y - d.target.y) <= this.#nodeHeigth) {
			if (d.source.x < d.target.x) {
				return d.target.x;
			} else {
				return d.target.x + this.#nodeWidth;
			}
		} else if (Math.abs(d.source.x - d.target.x) <= this.#nodeWidth + 20) {
			return d.target.x + this.#nodeWidth / 2;
		} else if (d.source.x < d.target.x) {
			return d.target.x;
		} else if (d.source.x > d.target.x) {
			return d.target.x + this.#nodeWidth;
		} else {
			return d.target.x + this.#nodeWidth / 2;
		}
	}

	#sourceY(d) {
		if (Math.abs(d.source.y - d.target.y) <= this.#nodeHeigth) {
			return d.source.y + this.#nodeHeigth / 2;
		} else if (d.source.y > d.target.y) {
			return d.source.y;
		} else {
			return d.source.y + this.#nodeHeigth;
		}
	}

	#targetY(d) {
		if (Math.abs(d.source.y - d.target.y) <= this.#nodeHeigth) {
			return d.target.y + this.#nodeHeigth / 2;
		} else if (d.source.y > d.target.y) {
			return d.target.y + this.#nodeHeigth;
		} else if (d.source.y < d.target.y) {
			return d.target.y;
		}
	}

	#getSourceVector(d) {
		return new Vector(this.#sourceX(d), this.#sourceY(d));
	}

	#getTargetVector(d) {
		const sourceVector = this.#getSourceVector(d);
		const currentVector = new Vector(
			this.#targetX(d) - sourceVector.getX(),
			this.#targetY(d) - sourceVector.getY()
		);
		const normalizedVector = currentVector.normalized();
		normalizedVector.multipleVectorByScalar(currentVector.getLength() - this.#arrowSize);

		const targetVector = new Vector(
			sourceVector.getX() + normalizedVector.getX(),
			sourceVector.getY() + normalizedVector.getY()
		);

		return targetVector;
	}
}
