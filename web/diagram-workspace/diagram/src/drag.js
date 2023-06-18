export default function drag(d3, diagram) {
	function dragstarted(event) {
		d3.select(this).attr("stroke", "var(--vscode-editorLink-activeForeground)");
	}

	function dragged(event, d) {
		d3.select(this.parentNode)
			.raise()
			.attr("x", (d.x = event.x))
			.attr("y", (d.y = event.y));

		diagram.update();
	}

	function dragended() {
		d3.select(this).attr("stroke", "var(--vscode-editor-foreground)"); //todo move to another place
	}

	return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
}
