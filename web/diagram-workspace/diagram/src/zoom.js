export default function initZoom(d3, width, height) {
	let zoom = d3
		.zoom()
		.scaleExtent([0.25, 10])
		.on("zoom", handleZoom)
		.on("start", function () {
			document.getElementsByTagName("svg")[0].style.cursor = "grab"; //todo move to css class
		})
		.on("end", function () {
			document.getElementsByTagName("svg")[0].style.cursor = "pointer";
		});

	d3.select("svg").call(zoom); //todo move to another place
	// document.getElementById("zoomIn").addEventListener("click", zoomIn);
	// document.getElementById("zoomOut").addEventListener("click", zoomOut);
	// document.getElementById("resetZoom").addEventListener("click", resetZoom);
	// document.getElementById("center").addEventListener("click", center);
	// document.getElementById("panLeft").addEventListener("click", panLeft);
	// document.getElementById("panRight").addEventListener("click", panRight);

	function handleZoom(e) {
		d3.select("svg g").attr("transform", e.transform);
	}
	function zoomIn() {
		d3.select("svg").transition().call(zoom.scaleBy, 2);
	}
	function zoomOut() {
		d3.select("svg").transition().call(zoom.scaleBy, 0.5);
	}

	function resetZoom() {
		d3.select("svg").transition().call(zoom.scaleTo, 1);
	}

	function center() {
		d3.select("svg")
			.transition()
			.call(zoom.translateTo, 0.5 * width, 0.5 * height);
	}

	function panLeft() {
		d3.select("svg").transition().call(zoom.translateBy, -50, 0);
	}

	function panRight() {
		d3.select("svg").transition().call(zoom.translateBy, 50, 0);
	}
}
