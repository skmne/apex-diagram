const counter = document.getElementById("lines-of-code-counter");
			// Handle the message inside the webview
			window.addEventListener("message", (event) => {
				const message = event.data; // The JSON data our extension sent
				console.log(message);
				switch (message.command) {
					case "Add":
						counter.textContent = message.value;
						break;
					case "Remove":
						counter.textContent = message.value;
						break;
				}
			});