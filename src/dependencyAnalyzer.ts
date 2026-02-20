import { DiagrammModel } from "./DiagrammModel";
import { Link } from "./Link";
import Node from "./Node";
import { ApexClassMember } from "./salesforceAPI/ApexClassMember";
import { ExternalReference } from "./salesforceAPI/ExternalReference";
import { SymbolTable } from "./salesforceAPI/SymbolTable";

//todo refactor this method to separate on small pieces
function parseDependency(apexClassMembers: Array<ApexClassMember>) {
	console.log("input data", apexClassMembers);
	const keyToSymbolTableMap = apexClassMembers.reduce((previousValue: Record<string, { key: string; symbolTable: SymbolTable }>, currentValue) => {
		const key: string = getKey(currentValue.SymbolTable.namespace, currentValue.SymbolTable.name);
		previousValue[key] = {
			key: key,
			symbolTable: currentValue.SymbolTable,
		};

		return previousValue;
	}, {});
	const diagrammModel: DiagrammModel = new DiagrammModel();

	apexClassMembers.forEach((item: ApexClassMember) => {
		diagrammModel.nodes.push(new Node(item.SymbolTable.namespace, item.SymbolTable.name));
		// parent class
		if (item.SymbolTable.parentClass) {
			const refObject = keyToSymbolTableMap[item.SymbolTable.parentClass];
			if (refObject) {
				diagrammModel.links.push(new Link(item.SymbolTable.name, refObject.key, "Inheritance"));
			}
		}

		//interfaces
		item.SymbolTable.interfaces.forEach((interfaceName: string) => {
			const refObject = keyToSymbolTableMap[interfaceName];
			if (refObject) {
				diagrammModel.links.push(new Link(item.SymbolTable.name, refObject.key, "Realization"));
			}
		});

		item.SymbolTable.externalReferences.forEach((externalReference: ExternalReference) => {
			const refObject = keyToSymbolTableMap[getKey(externalReference.namespace, externalReference.name)];
			if (refObject) {
				diagrammModel.links.push(new Link(item.SymbolTable.name, refObject.key));
			}
		});
	});
	return diagrammModel;
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
			const filteredInterface = apexMember.SymbolTable.interfaces.filter(
				(item: string) => !loadedClassNames.includes(item)
			);
			if (filteredInterface.length > 0) {
				unloadedClassNames.push(...filteredInterface);
			}
		}
		let exteranlRef: string[] = apexMember.SymbolTable.externalReferences.map((item) => {
			return item.name;
		});
		exteranlRef = exteranlRef.filter((item: string) => !loadedClassNames.includes(item));
		if (exteranlRef.length > 0) {
			unloadedClassNames.push(...exteranlRef);
		}
	}

	return [...new Set<string>(unloadedClassNames)];
}
export { parseDependency, getUnloadedApexNames };
