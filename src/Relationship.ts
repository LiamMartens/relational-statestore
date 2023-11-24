import { Edge } from "./Edge.js";

interface IRelationship<T extends {}, R extends Relationship<T>> {
  edge: Edge<T, R> | null;
}

export class Relationship<T extends {}>
  implements IRelationship<T, Relationship<T>>
{
  protected $edge: Edge<T, this> | null = null;

  public get edge() {
    return this.$edge;
  }

  public upgrade(edge: Edge<T, Relationship<T>>) {
    this.$edge = edge;
    return this;
  }
}
