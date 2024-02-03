import { Relationship } from "./Relationship.js";
import { NodeUnion } from "./util-types/index.js";

export class Edge<T, R extends Relationship<T>> {
  public relationship: Relationship<T>;

  constructor(
    public source: NodeUnion<T>,
    public target: NodeUnion<T>,
    relationship: R
  ) {
    this.relationship = relationship.upgrade(this);
  }
}
