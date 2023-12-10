import * as d3 from "d3";
import NodesBuilder from "./NodesBuilder.js";
import LinksBuilder from "./LinksBuilder.js";
import drag from "./drag.js";
import Zoom from "./zoom.js";

import state from "./GlobalState.js";
import Link from "./Link.js";
import Node from "./Node.js";

class Diagram {
	#nodesBuilder;
	#linksBuilder;
	#svg;
	#width; //default value
	#height;
	#zoom;

	constructor(svgElement) {
		this.#svg = d3.select(svgElement);
		this.#width = svgElement.getAttribute("width");
		this.#height = svgElement.getAttribute("height");
		state.width = this.#width;
		state.height = this.#height;
		console.log(this.#width, this.#height);
		this.#nodesBuilder = new NodesBuilder(this.#width);
		this.#zoom = new Zoom(d3, this.#svg, this.#width, this.#height);
		// initZoom(d3, this.#width, this.#height);
	}
	addItems(newData) {
		this.setData(newData);
		this.recreateDiagram();
	}

	removeItems(itemIds) {
		state.nodes = state.nodes.filter((node) => !itemIds.includes(node.id));
		state.links = state.links.filter(
			(link) => !itemIds.includes(link.source) || !itemIds.includes(link.target)
		);
		this.recreateDiagram();
	}

	recreateDiagram() {
		this.#nodesBuilder.createNodes();
		this.#linksBuilder.createLinks();
		this.#nodesBuilder.setDragRectangle(drag(d3, this));
	}

	setData(data) {
		for (const node of data.nodes) {
			state.nodes.push(new Node(node));
		}
		for (const link of data.links) {
			state.links.push(new Link(link));
		}
	}

	setStyle(style) {
		state.style.nodeForeground = style.nodeForeground ? style.nodeForeground : state.style.nodeForeground;
		state.style.nodeBackground = style.nodeBackground ? style.nodeBackground : state.style.nodeBackground;
		state.style.fontFamily = style.fontFamily ? style.fontFamily : state.style.fontFamily;
		state.style.fontSize = style.fontSize ? style.fontSize : state.style.fontSize;
		state.style.fontColor = style.fontColor ? style.fontColor : state.style.fontColor;
		state.style.nodeWidth = style.nodeWidth ? style.nodeWidth : state.style.nodeWidth;
		state.style.nodeHeight = style.nodeHeight ? style.nodeHeight : state.style.nodeHeight;
	}

	build() {
		const rootGroupContainer = this.#createGroupContainer(this.#svg);
		this.#nodesBuilder.build(rootGroupContainer);
		this.#nodesBuilder.setDragRectangle(drag(d3, this));
		this.#linksBuilder = new LinksBuilder();
		this.#linksBuilder.build(rootGroupContainer);

		// this.#generateSimulation(state.nodes);
	}

	update() {
		console.log("update");
		this.#nodesBuilder.update();
		this.#linksBuilder.update();
	}

	getZoom() {
		return this.#zoom;
	}

	#generateSimulation(nodes) {
		return d3
			.forceSimulation()
			.nodes(nodes)
			.force(
				"link",
				d3
					.forceLink()
					.id(function (d) {
						return d.id;
					})
					.distance(10)
			)
			.force("charge", d3.forceManyBody().strength(-200))
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
					return this.#getRectangleRadius() / 2;
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
		return Math.sqrt(Math.pow(state.style.nodeWidth, 2) + Math.pow(state.style.nodeHeight, 2));
	}
}
function ticked(diagram) {
	return () => {
		diagram.update();
	};
}

export default Diagram;
