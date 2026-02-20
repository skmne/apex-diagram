import { ExternalReference } from "./ExternalReference";

export class SymbolTable {
  public id: string | undefined;
  public constructors: unknown[] = [];
  public externalReferences: ExternalReference[] = [];
  public innerClasses: SymbolTable[] = [];
  public interfaces: string[] = [];
  public key: string | undefined;
  public methods: unknown[] = [];
  public name?: string;
  public namespace?: string;
  public parentClass: string | undefined;
  public tableDeclaration: unknown;
  public variables: unknown[] = [];
}
