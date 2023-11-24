import * as jsonpatch from "fast-json-patch";

type Subscriber<T extends {}> = ((data: T) => void) & {
  sync?: boolean;
};

export class Node<T extends {}> {
  protected subscribers = new Set<Subscriber<T>>();

  constructor(public data: T) {}

  public patch(operation: readonly jsonpatch.Operation[]) {
    jsonpatch.applyPatch(this.data, operation);
    for (const sub of this.subscribers) {
      if (sub.sync) {
        sub(this.data);
      } else {
        Promise.resolve().then(() => sub(this.data));
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
