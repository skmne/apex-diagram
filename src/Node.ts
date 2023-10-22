export default class Node {
	public namespace?: string;
	public id?: string;
	public name?: string;

	constructor(namespace?: string, name?: string) {
		this.namespace = namespace;
		this.name = name;
		this.id = namespace ? namespace + "." + name : name;
	}
}
