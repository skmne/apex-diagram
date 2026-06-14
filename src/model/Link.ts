export class Link {
  public source?: string | number;
  public target?: string | number;
  public type?: string;

  constructor(source?: string | number, target?: string | number, type?: string) {
    this.source = source;
    this.target = target;
    this.type = type ? type : "Directed Association";
  }
}
