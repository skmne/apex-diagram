import { DiagrammModel } from "./DiagrammModel";
import { Link } from "./Link";
import Node from "./Node";
import { ApexClassMember } from "./salesforceAPI/ApexClassMember";
import { ExternalReference } from "./salesforceAPI/ExternalReference";

//todo refactor this method to separate on small pieces
function parseDependency(apexClassMembers: Array<ApexClassMember>) {
	console.log("input data", apexClassMembers);
	let keyToSymbolTableMap = apexClassMembers.reduce((previousValue: any, currentValue, index) => {
		const key: string = getKey(currentValue.SymbolTable.namespace, currentValue.SymbolTable.name);
		previousValue[key] = {
			key: key,
			sybmolTable: currentValue.SymbolTable,
		};

		return previousValue;
	}, {});
	let diagrammModel: DiagrammModel = new DiagrammModel();

	apexClassMembers.forEach((item: any, index: any) => {
		diagrammModel.nodes.push(new Node(item.SymbolTable.namespace, item.SymbolTable.name));
		// parent class
		if (item.SymbolTable.parentClass) {
			const refObject = keyToSymbolTableMap[item.SymbolTable.parentClass];
			if (refObject) {
				diagrammModel.links.push(new Link(item.SymbolTable.name, refObject.key, "Inheritance"));
			}
		}

		//interfaces
		item.SymbolTable.interfaces.forEach((interfaceName: any) => {
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
	let unloadedClassNames: Array<String> = [];

	for (let apexMember of newApexClassMembers) {
		if (apexMember.SymbolTable.parentClass && !loadedClassNames.includes(apexMember.SymbolTable.parentClass)) {
			unloadedClassNames.push(apexMember.SymbolTable.parentClass);
		}
		if (apexMember.SymbolTable.interfaces.length > 0) {
			let filteredInterface = apexMember.SymbolTable.interfaces.filter(
				(item: any) => !loadedClassNames.includes(item)
			);
			if (filteredInterface.length > 0) {
				unloadedClassNames.push(...filteredInterface);
			}
		}
		let exteranlRef: Array<String> = apexMember.SymbolTable.externalReferences.map((item) => {
			return item.name;
		});
		exteranlRef = exteranlRef.filter((item: any) => !loadedClassNames.includes(item));
		if (exteranlRef.length > 0) {
			unloadedClassNames.push(...exteranlRef);
		}
	}

	return [...new Set<String>(unloadedClassNames)];
}
export { parseDependency, getUnloadedApexNames };
