export class SymbolTable {
  public id: string | undefined;
  public constructors: Array<any> = [];
  public externalReferences: Array<any> = [];
  public innerClasses: Array<any> = [];
  public interfaces: Array<any> = [];
  public key: string | undefined;
  public methods: Array<any> = [];
  public name?: string;
  public namespace?: string;
  public parentClass: string | undefined;
  public tableDeclaration: any;
  public variables: Array<any> = [];
}
