import { SymbolTable } from "./SymbolTable";

export type ApexClassMember = {
	Id: string | undefined;
	SymbolTable: SymbolTable;
	LastSyncDate: Date;
};
