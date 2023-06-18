import * as d3 from "d3";
import NodesBuilder from "./NodesBuilder.js";
import LinksBuilder from "./LinksBuilder.js";
import drag from "./drag.js";
import initZoom from "./zoom.js";

class Diagram {
	#nodesBuilder;
	#linksBuilder;

	#data = [];
	#svg;

	#width = 800;
	#height = 600;
	constructor(svgElement) {
		this.#svg = d3.select(svgElement);
		this.#width = svgElement.getAttribute("width");
		this.#height = svgElement.getAttribute("height");
		console.log(this.#width, this.#height);
		this.#nodesBuilder = new NodesBuilder(); //todo rename... maybe will use builder pattern
	}
	setData(data) {
		this.#data = data;
		this.#nodesBuilder.setData(this.#data);
	}
	setNodeSize(nodeWidth, nodeHeigth) {
		this.#nodesBuilder.setSize(nodeWidth, nodeHeigth);
	}

	setStyle(style) {
		this.#nodesBuilder.setStyle(style);
	}
	build() {
		const rootGroupContainer = this.#createGroupContainer(this.#svg);
		this.#nodesBuilder.build(rootGroupContainer);
		this.#nodesBuilder.setDragRectangle(drag(d3, this));

		this.#linksBuilder = new LinksBuilder(
			this.#nodesBuilder.getNodeWidth(),
			this.#nodesBuilder.getNodeHeigth(),
			this.#data
		);
		this.#linksBuilder.build(rootGroupContainer);
		this.#generateSimulation();

		initZoom(d3, this.#width, this.#height);
	}

	update() {
		this.#linksBuilder.update();
		this.#nodesBuilder.update();
	}

	#generateSimulation() {
		return d3
			.forceSimulation()
			.nodes(this.#data.nodes)
			.force("charge", d3.forceManyBody().strength(110))
			.force(
				"center",
				d3.forceCenter(
					this.#width / 2 - this.#nodesBuilder.getNodeWidth(),
					this.#height / 2 - this.#nodesBuilder.getNodeHeigth()
				)
			)
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
			.force("link", d3.forceLink().links(this.#data.links))
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
