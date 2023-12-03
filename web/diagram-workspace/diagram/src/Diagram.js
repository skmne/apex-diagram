import * as d3 from "d3";
import NodesBuilder from "./NodesBuilder.js";
import LinksBuilder from "./LinksBuilder.js";
import drag from "./drag.js";
import initZoom from "./zoom.js";

import state from "./GlobalState.js";
import Link from "./Link.js";
import Node from "./Node.js";

class Diagram {
	#nodesBuilder;
	#linksBuilder;
	#svg;

	#width = 800;
	#height = 600;
	constructor(svgElement) {
		this.#svg = d3.select(svgElement);
		this.#width = svgElement.getAttribute("width");
		this.#height = svgElement.getAttribute("height");
		state.width = this.#width;
		state.height = this.#height;
		console.log(this.#width, this.#height);
		this.#nodesBuilder = new NodesBuilder(this.#width);
	}
	addItems(newData) {
		for (const node of newData.nodes) {
			state.nodes.push(new Node(node));
		}
		for (const link of newData.links) {
			state.links.push(new Link(link));
		}

		this.#nodesBuilder.addNodes(newData);
		this.#linksBuilder.addLinks(newData);

		this.#nodesBuilder.setDragRectangle(drag(d3, this));
		// this.update();
		// this.#generateSimulation(newData.nodes);
	}

	removeItems(itemIds) {
		this.#nodesBuilder.removeNodes(itemIds);
		this.#linksBuilder.removeLinks(itemIds);

		this.#nodesBuilder.setDragRectangle(drag(d3, this));
	}

	setData(data) {
		// state.nodes = data.nodes.map((item) => new Node(item));
		// state.links = data.links.map((item) => new Link(item));
		// this.#nodesBuilder.setData(this.#data);
	}

	setStyle(style) {
		this.#nodesBuilder.setStyle(style);
	}
	build() {
		const rootGroupContainer = this.#createGroupContainer(this.#svg);
		this.#nodesBuilder.build(rootGroupContainer);
		this.#nodesBuilder.setDragRectangle(drag(d3, this));
		this.#linksBuilder = new LinksBuilder();
		this.#linksBuilder.build(rootGroupContainer);
		this.#generateSimulation(state.nodes);

		initZoom(d3, this.#width, this.#height);
	}

	update() {
		this.#linksBuilder.update();
		this.#nodesBuilder.update();
	}

	#generateSimulation(nodes) {
		return d3
			.forceSimulation()
			.nodes(nodes)
			.force(
				"link",
				d3.forceLink().id(function (d) {
					return d.index;
				})
			)
			.force("charge", d3.forceManyBody().strength(10))
			.force("center", d3.forceCenter(this.#width / 2, this.#height / 2))
			.force(
				"x",
				d3.forceX().x((d) => {
					return 0;
				})
			)
			.force(
				"y",
				d3.forceY().y((d) => {
					return 0;
				})
			)
			.force(
				"collision",
				d3.forceCollide().radius((d) => {
					return this.#getRectangleRadius();
				})
			)
			.on("end", () => {
				console.log("*** manage animation ***");
				// this.svg.classed("hidden", false);
			})
			.on("tick", ticked(this));
	}

	#createGroupContainer(svg) {
		return svg.append("g");
	}

	#getRectangleRadius() {
		return (
			Math.sqrt(
				Math.pow(this.#nodesBuilder.getNodeWidth() / 2, 2) +
					Math.pow(this.#nodesBuilder.getNodeHeigth() / 2, 2)
			) + 10
		);
	}
}
function ticked(diagram) {
	return () => {
		diagram.update();
	};
}

export default Diagram;
