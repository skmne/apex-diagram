import { DiagrammModel } from "./DiagrammModel";
import { Link } from "./Link";
import Node from "./Node";
import { ApexClassMember } from "./salesforceAPI/ApexClassMember";
import { SymbolTable } from "./salesforceAPI/SymbolTable";

type KeyMap = Record<string, { key: string; symbolTable: SymbolTable }>;

function buildKeyMap(apexClassMembers: Array<ApexClassMember>): KeyMap {
	return apexClassMembers.reduce((map: KeyMap, member) => {
		const key = getKey(member.SymbolTable.namespace, member.SymbolTable.name);
		map[key] = { key, symbolTable: member.SymbolTable };
		return map;
	}, {});
}

function collectLinks(symbolTable: SymbolTable, keyMap: KeyMap): Link[] {
	const links: Link[] = [];

	if (symbolTable.parentClass) {
		const ref = keyMap[symbolTable.parentClass];
		if (ref) {
			links.push(new Link(symbolTable.name, ref.key, "Inheritance"));
		}
	}

	for (const interfaceName of symbolTable.interfaces) {
		const ref = keyMap[interfaceName];
		if (ref) {
			links.push(new Link(symbolTable.name, ref.key, "Realization"));
		}
	}

	for (const externalRef of symbolTable.externalReferences) {
		const ref = keyMap[getKey(externalRef.namespace, externalRef.name)];
		if (ref) {
			links.push(new Link(symbolTable.name, ref.key));
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

function getKey(namespace?: string, name?: string) {
	return String(namespace ? namespace + "." + name : name);
}

function getUnloadedApexNames(
	oldApexClassMembers: Array<ApexClassMember>,
	newApexClassMembers: Array<ApexClassMember>
) {
	const loadedClassNames = oldApexClassMembers.map((item) => item.SymbolTable.name);
	const unloadedClassNames: string[] = [];

	for (const apexMember of newApexClassMembers) {
		if (apexMember.SymbolTable.parentClass && !loadedClassNames.includes(apexMember.SymbolTable.parentClass)) {
			unloadedClassNames.push(apexMember.SymbolTable.parentClass);
		}
		if (apexMember.SymbolTable.interfaces.length > 0) {
			const filteredInterfaces = apexMember.SymbolTable.interfaces.filter(
				(item: string) => !loadedClassNames.includes(item)
			);
			if (filteredInterfaces.length > 0) {
				unloadedClassNames.push(...filteredInterfaces);
			}
		}
		const externalRefs = apexMember.SymbolTable.externalReferences
			.map((item) => item.name)
			.filter((item: string) => !loadedClassNames.includes(item));
		if (externalRefs.length > 0) {
			unloadedClassNames.push(...externalRefs);
		}
	}

	return [...new Set<string>(unloadedClassNames)];
}
export { parseDependency, getUnloadedApexNames };
