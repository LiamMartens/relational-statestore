import { Edge } from "./Edge.js";

const detachedSymbol = Symbol("detached");
const attachedSymbol = Symbol("attached");

interface IRelationship<T extends {}, Attached extends boolean> {
  attached: Attached;
  edge: Attached extends true ? Edge<T, Relationship<T, true>> : null;
}

export class Relationship<T extends {}, Attached extends boolean = false>
  implements IRelationship<T, Attached>
{
  protected $state: typeof attachedSymbol | typeof detachedSymbol =
    detachedSymbol;
  protected $edge: Edge<T, Relationship<T, true>> | null = null;

  public get attached(): Attached {
    return (this.$state === attachedSymbol) as Attached;
  }

  public get edge(): Attached extends true
    ? Edge<T, Relationship<T, true>>
    : null {
    return this.$edge as Attached extends true
      ? Edge<T, Relationship<T, true>>
      : null;
  }

  public upgrade(edge: Edge<T, Relationship<T, true>>) {
    this.$state = attachedSymbol;
    this.$edge = edge;
    return this as Relationship<T, true>;
  }
}
