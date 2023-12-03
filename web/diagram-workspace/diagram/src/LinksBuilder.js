import Link from "./Link.js";
import state from "./GlobalState.js";
export default class LinksBuilder {
	#links = [];
	#arrows;
	#linkContainer;
	#editorForeground = "var(--vscode-editor-foreground)";

	constructor() {}
	addLinks(newData) {
		// state.nodes = [...state.nodes, ...newData.nodes]; //todo create and move to base data state

		// const newLinks = newData.links.map((item) => new Link(item, state));

		// state.links = [...state.links, ...newLinks];
		// console.log("links = ", state.links);
		this.#links = this.#createLinks(state.links);
		this.update();
	}
	removeLinks(nodesIds) {
		state.nodes = state.nodes.filter((node) => !nodesIds.includes(node.id));
		state.links = state.links.filter(
			(link) => !nodesIds.includes(link.source) && !nodesIds.includes(link.target)
		);
		this.#links = this.#createLinks(state.links);
		this.update();
	}

	build(rootGroupContainer) {
		this.#linkContainer = this.#createLinksContainer(rootGroupContainer);
		this.#arrows = this.#createArrows(rootGroupContainer);
		this.#links = this.#createLinks(state.links);
	}

	update() {
		this.#links
			.attr("x1", (d) => {
				d.x1 = d.getSourceVector().getX();
				return d.x1;
			})
			.attr("y1", (d) => {
				d.y1 = d.getSourceVector().getY();
				return d.y1;
			})
			.attr("x2", (d) => {
				d.x2 = d.getTargetVector().getX();
				return d.x2;
			})
			.attr("y2", (d) => {
				d.y2 = d.getTargetVector().getY();
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
				d.x1 = d.getSourceVector().getX();
				return d.x1;
			})
			.attr("y1", (d) => {
				d.y1 = d.getSourceVector().getY();
				return d.y1;
			})
			.attr("x2", (d) => {
				d.x2 = d.getTargetVector().getX();
				return d.x2;
			})
			.attr("y2", (d) => {
				d.y2 = d.getTargetVector().getY();
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
}
