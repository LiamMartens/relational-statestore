import { Node } from "./Node.js";
import { Relationship } from "./Relationship.js";

export class Edge<T extends {}, R extends Relationship<T, boolean>> {
  public relationship: Relationship<T, true>;

  constructor(public source: Node<T>, public target: Node<T>, relationship: R) {
    this.relationship = relationship.upgrade(this);
  }
}
