import Vector from "./Vector.js";

export default class LinksBuilder {
	#data = { nodes: [], links: [] };
	#nodeWidth;
	#nodeHeigth;
	#links = [];
	#arrows;
	#linkContainer;
	#editorForeground = "var(--vscode-editor-foreground)";
	#arrowSize = 10;

	constructor(nodeWidth, nodeHeigth, data) {
		this.#nodeWidth = nodeWidth;
		this.#nodeHeigth = nodeHeigth;
		this.#data = data;
	}
	addLinks(newData) {
		this.#data.nodes = [...this.#data.nodes, ...newData.nodes];
		this.#data.links = [...this.#data.links, ...newData.links];
		this.#links = this.#createLinks(this.#data.links);
		this.update();
	}
	removeLinks(nodesIds) {
		this.#data.nodes = this.#data.nodes.filter((node) => !nodesIds.includes(node.id));
		this.#data.links = this.#data.links.filter(
			(link) => !nodesIds.includes(link.source) && !nodesIds.includes(link.target)
		);
		this.#links = this.#createLinks(this.#data.links);
		this.update();
	}

	build(rootGroupContainer) {
		this.#linkContainer = this.#createLinksContainer(rootGroupContainer);
		this.#arrows = this.#createArrows(rootGroupContainer);
		this.#links = this.#createLinks(this.#data.links);
	}

	update() {
		this.#links
			.attr("x1", (d) => {
				d.x1 = this.#getSourceVector(d).getX();
				return d.x1;
			})
			.attr("y1", (d) => {
				d.y1 = this.#getSourceVector(d).getY();
				return d.y1;
			})
			.attr("x2", (d) => {
				d.x2 = this.#getTargetVector(d).getX();
				return d.x2;
			})
			.attr("y2", (d) => {
				d.y2 = this.#getTargetVector(d).getY();
				return d.y2;
			});
	}

	#createLinksContainer(groupContainer) {
		return groupContainer.append("g").attr("class", "links");
	}

	#createLinks(links) {
		let elementLinks = this.#linkContainer
			.selectAll("line")
			.data(links)
			.join("line")
			.attr("x1", (d) => {
				d.x1 = this.#sourceX(d) || 0;
				return d.x1;
			})
			.attr("y1", (d) => {
				d.y1 = this.#sourceY(d) || 0;
				return d.y1;
			})
			.attr("x2", (d) => {
				d.x2 = this.#targetX(d) || 0;
				return d.x2;
			})
			.attr("y2", (d) => {
				d.y2 = this.#targetY(d) || 0;
				return d.y2;
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

		return elementLinks;
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
		const sourceX = d.source.x !== undefined ? d.source.x : this.#getNodeByKey(d.source).x;
		const sourceY = d.source.y !== undefined ? d.source.y : this.#getNodeByKey(d.source).y;
		const targetX = d.target.x !== undefined ? d.target.x : this.#getNodeByKey(d.target).x;
		const targetY = d.target.y !== undefined ? d.target.y : this.#getNodeByKey(d.target).y;
		// debugger;
		if (Math.abs(sourceY - targetY) <= this.#nodeHeigth) {
			if (sourceX > targetX) {
				return sourceX;
			} else {
				return sourceX + this.#nodeWidth;
			}
		} else if (Math.abs(sourceX - targetX) <= this.#nodeWidth + 20) {
			return sourceX + this.#nodeWidth / 2;
		} else if (sourceX > targetX) {
			return sourceX;
		} else {
			return sourceX + this.#nodeWidth;
		}
	}

	#targetX(d) {
		const sourceX = d.source.x !== undefined ? d.source.x : this.#getNodeByKey(d.source).x;
		const sourceY = d.source.y !== undefined ? d.source.y : this.#getNodeByKey(d.source).y;
		const targetX = d.target.x !== undefined ? d.target.x : this.#getNodeByKey(d.target).x;
		const targetY = d.target.y !== undefined ? d.target.y : this.#getNodeByKey(d.target).y;

		if (Math.abs(sourceY - targetY) <= this.#nodeHeigth) {
			if (sourceX < targetX) {
				return targetX;
			} else {
				return targetX + this.#nodeWidth;
			}
		} else if (Math.abs(sourceX - targetX) <= this.#nodeWidth + 20) {
			return targetX + this.#nodeWidth / 2;
		} else if (sourceX < targetX) {
			return targetX;
		} else if (sourceX > targetX) {
			return targetX + this.#nodeWidth;
		} else {
			return targetX + this.#nodeWidth / 2;
		}
	}

	#sourceY(d) {
		const sourceX = d.source.x !== undefined ? d.source.x : this.#getNodeByKey(d.source).x;
		const sourceY = d.source.y !== undefined ? d.source.y : this.#getNodeByKey(d.source).y;
		const targetX = d.target.x !== undefined ? d.target.x : this.#getNodeByKey(d.target).x;
		const targetY = d.target.y !== undefined ? d.target.y : this.#getNodeByKey(d.target).y;

		if (Math.abs(sourceY - targetY) <= this.#nodeHeigth) {
			return sourceY + this.#nodeHeigth / 2;
		} else if (sourceY > targetY) {
			return sourceY;
		} else {
			return sourceY + this.#nodeHeigth;
		}
	}

	#targetY(d) {
		const sourceX = d.source.x !== undefined ? d.source.x : this.#getNodeByKey(d.source).x;
		const sourceY = d.source.y !== undefined ? d.source.y : this.#getNodeByKey(d.source).y;
		const targetX = d.target.x !== undefined ? d.target.x : this.#getNodeByKey(d.target).x;
		const targetY = d.target.y !== undefined ? d.target.y : this.#getNodeByKey(d.target).y;

		if (Math.abs(sourceY - targetY) <= this.#nodeHeigth) {
			return targetY + this.#nodeHeigth / 2;
		} else if (sourceY > targetY) {
			return targetY + this.#nodeHeigth;
		} else if (sourceY < targetY) {
			return targetY;
		}
	}

	#getNodeByKey(nodeKey) {
		const currentNode = this.#data.nodes.find((item) => item.id === nodeKey);
		return currentNode;
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
