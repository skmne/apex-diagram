import { DiagrammModel } from "../model/DiagrammModel";
import { Link } from "../model/Link";
import Node from "../model/Node";
import { getApexClassKey } from "../model/apexClassKey";
import { ApexClassMember } from "../salesforceAPI/ApexClassMember";
import { SymbolTable } from "../salesforceAPI/SymbolTable";

type KeyMap = Record<string, { key: string; symbolTable: SymbolTable }>;

function setKeyMapEntry(keyMap: KeyMap, key: string | undefined, value: { key: string; symbolTable: SymbolTable }): void {
	if (key && !keyMap[key]) {
		keyMap[key] = value;
	}
}

function buildKeyMap(apexClassMembers: Array<ApexClassMember>): KeyMap {
	return apexClassMembers.reduce((map: KeyMap, member) => {
		const key = getApexClassKey(member.SymbolTable.namespace, member.SymbolTable.name);
		if (key) {
			map[key] = { key, symbolTable: member.SymbolTable };
			mapInnerClassAliases(map, member.SymbolTable, key, member.SymbolTable.name);
		}
		return map;
	}, {});
}

function mapInnerClassAliases(
	keyMap: KeyMap,
	owner: SymbolTable,
	ownerKey: string,
	ownerQualifiedName: string | undefined
): void {
	for (const innerClass of owner.innerClasses) {
		const value = { key: ownerKey, symbolTable: owner };
		const qualifiedName = getInnerClassQualifiedName(ownerQualifiedName, innerClass.name);

		setKeyMapEntry(keyMap, getApexClassKey(owner.namespace, qualifiedName), value);
		setKeyMapEntry(keyMap, getApexClassKey(owner.namespace, innerClass.name), value);
		setKeyMapEntry(keyMap, qualifiedName, value);

		mapInnerClassAliases(keyMap, innerClass, ownerKey, qualifiedName);
	}
}

function getInnerClassQualifiedName(ownerName: string | undefined, innerClassName: string | undefined): string | undefined {
	if (!innerClassName) {
		return undefined;
	}

	return ownerName && !innerClassName.includes(".") ? `${ownerName}.${innerClassName}` : innerClassName;
}

function collectLinks(symbolTable: SymbolTable, keyMap: KeyMap, source = getApexClassKey(symbolTable.namespace, symbolTable.name)): Link[] {
	const links: Link[] = [];

	if (!source) {
		return links;
	}

	if (symbolTable.parentClass) {
		const ref = keyMap[symbolTable.parentClass];
		if (ref) {
			addLink(links, source, ref.key, "Inheritance");
		}
	}

	for (const interfaceName of symbolTable.interfaces) {
		const ref = keyMap[interfaceName];
		if (ref) {
			addLink(links, source, ref.key, "Realization");
		}
	}

	for (const externalRef of symbolTable.externalReferences) {
		const ref = keyMap[getApexClassKey(externalRef.namespace, externalRef.name) ?? ""];
		if (ref) {
			addLink(links, source, ref.key);
		}
	}

	for (const innerClass of symbolTable.innerClasses) {
		for (const link of collectLinks(innerClass, keyMap, source)) {
			if (typeof link.source === "string" && typeof link.target === "string") {
				addLink(links, link.source, link.target, link.type);
			}
		}
	}

	return links;
}

function addLink(links: Link[], source: string, target: string, type?: string): void {
	if (source === target) {
		return;
	}

	const linkType = type ?? "Directed Association";
	if (links.some((link) => link.source === source && link.target === target && link.type === linkType)) {
		return;
	}

	links.push(new Link(source, target, type));
}

function parseDependency(apexClassMembers: Array<ApexClassMember>): DiagrammModel {
	const keyMap = buildKeyMap(apexClassMembers);
	const model = new DiagrammModel();

	for (const item of apexClassMembers) {
		model.nodes.push(new Node(item.SymbolTable.namespace, item.SymbolTable.name));
		model.links.push(...collectLinks(item.SymbolTable, keyMap));
	}

	return model;
}

export { parseDependency };
