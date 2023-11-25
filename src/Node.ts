import * as jsonpatch from "fast-json-patch";

type Subscriber<T extends {}> = ((
  data: T,
  operation: jsonpatch.Operation[]
) => void) & {
  sync?: boolean;
};

export class Node<T extends {}> {
  protected subscribers = new Set<Subscriber<T>>();

  constructor(public data: T) {}

  public patch(operation: jsonpatch.Operation[]) {
    jsonpatch.applyPatch(this.data, operation);
    for (const sub of this.subscribers) {
      if (sub.sync) {
        sub(this.data, operation);
      } else {
        Promise.resolve().then(() => sub(this.data, operation));
      }
    }
    return this;
  }

  public subscribe = (fn: Subscriber<T>, sync: boolean = false) => {
    fn.sync = sync;
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  };
}
