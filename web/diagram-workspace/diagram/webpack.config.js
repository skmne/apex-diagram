import path from "path";
var __dirname = "./";
export default {
	entry: "./src/diagram.js",
	output: {
		filename: "main.js",
		path: path.resolve(__dirname, "dist"),
		library: "MyLibrary", // Name of your library
		libraryTarget: "umd", // Universal Module Definition (UMD) format
		umdNamedDefine: true, // Use named AMD module format (optional)
	},
	mode: "development",
};
