import { getApexClassKey } from "./apexClassKey";

export default class Node {
	public namespace?: string;
	public id?: string;
	public name?: string;
	public x?: number;
	public y?: number;

	constructor(namespace?: string, name?: string) {
		this.namespace = namespace;
		this.name = name;
		this.id = getApexClassKey(namespace, name);
	}
}
