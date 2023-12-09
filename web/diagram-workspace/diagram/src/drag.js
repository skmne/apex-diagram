export default function drag(d3, diagram) {
	function dragstarted(event) {
		d3.select(this).attr("stroke", "var(--vscode-editorLink-activeForeground)");
	}

	function dragged(event, d) {
		const mouseX = event.x;
		const mouseY = event.y;

		// const offsetX = mouseX - d.x;
		// const offsetY = mouseY - d.y;

		d3.select(this.parentNode)
			.raise()
			.attr("x", (d.x = mouseX))
			.attr("y", (d.y = mouseY));

		diagram.update();
	}

	function dragended() {
		d3.select(this).attr("stroke", "var(--vscode-editor-foreground)"); //todo move to another place
	}

	return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
}
