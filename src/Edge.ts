import { Node } from "./Node.js";
import { Relationship } from "./Relationship.js";

export class Edge<T extends {}, R extends Relationship<T>> {
  public relationship: Relationship<T>;

  constructor(public source: Node<T>, public target: Node<T>, relationship: R) {
    this.relationship = relationship.upgrade(this);
  }
}
