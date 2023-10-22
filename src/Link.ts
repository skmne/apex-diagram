export class Link {
  public source?: number;
  public target?: number;
  public type?: string;

  constructor(source?: number, target?: number, type?: string) {
    this.source = source;
    this.target = target;
    this.type = type ? type : "Directed Association";
  }
}
