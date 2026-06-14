import { DiagrammModel } from "../model/DiagrammModel";
import { Link } from "../model/Link";
import Node from "../model/Node";
import { getApexClassKey } from "../model/apexClassKey";
import { ApexClassMember } from "../salesforceAPI/ApexClassMember";
import { SymbolTable } from "../salesforceAPI/SymbolTable";

type KeyMap = Record<string, { key: string; symbolTable: SymbolTable }>;

function buildKeyMap(apexClassMembers: Array<ApexClassMember>): KeyMap {
	return apexClassMembers.reduce((map: KeyMap, member) => {
		const key = getApexClassKey(member.SymbolTable.namespace, member.SymbolTable.name);
		if (key) {
			map[key] = { key, symbolTable: member.SymbolTable };
		}
		return map;
	}, {});
}

function collectLinks(symbolTable: SymbolTable, keyMap: KeyMap): Link[] {
	const links: Link[] = [];
	const source = getApexClassKey(symbolTable.namespace, symbolTable.name);

	if (!source) {
		return links;
	}

	if (symbolTable.parentClass) {
		const ref = keyMap[symbolTable.parentClass];
		if (ref) {
			links.push(new Link(source, ref.key, "Inheritance"));
		}
	}

	for (const interfaceName of symbolTable.interfaces) {
		const ref = keyMap[interfaceName];
		if (ref) {
			links.push(new Link(source, ref.key, "Realization"));
		}
	}

	for (const externalRef of symbolTable.externalReferences) {
		const ref = keyMap[getApexClassKey(externalRef.namespace, externalRef.name) ?? ""];
		if (ref) {
			links.push(new Link(source, ref.key));
		}
	}

	return links;
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
