import { Node } from "./Node.js";
import { Edge } from "./Edge.js";
import { Relationship } from "./Relationship.js";
import { TwoWayMap } from "./TwoWayMap.js";
import { Operation } from "fast-json-patch";

interface DetachedRelationshipStub<T extends {}> {
  relationship: Relationship<T, false>;
}

export type EventTypes<T extends {}> =
  | ["node:added", Node<T>]
  | ["node:removed", Node<T>, Set<Edge<T, Relationship<T, true>>>]
  | ["node:data:updated", Node<T>]
  | ["edge:added", Edge<T, Relationship<T, true>>]
  | ["edge:removed", Edge<T, Relationship<T, true>>];
export type Subscriber<
  T extends {},
  E extends EventTypes<T>[0] = EventTypes<T>[0]
> = ((...args: Extract<EventTypes<T>, [E, ...any[]]>) => void) & {
  sync?: boolean;
};

export class RelationalStatestore<T extends {}> {
  protected subscribers = new Map<"*" | EventTypes<T>[0], Set<Subscriber<T>>>();
  protected nodeUnsubscribers = new Map<Node<T>, () => void>();

  /** maps original object to Node */
  protected nodes = new Map<T, Node<T>>();
  /** maps key to Node object */
  protected keyAssignments = new TwoWayMap<string, T>();
  protected nodeEdges = new Map<Node<T>, Set<Edge<T, Relationship<T, true>>>>();

  /**
   * Internally emits an event and calls the subscribers (sync or async)
   * @param args
   */
  protected emit = (...args: EventTypes<T>) => {
    const anySubscribers = this.subscribers.get("*");
    const eventSubscribers = this.subscribers.get(args[0]);

    if (anySubscribers) {
      for (const sub of anySubscribers) {
        if (sub.sync) {
          sub(...args);
        } else {
          Promise.resolve().then(() => () => sub(...args));
        }
      }
    }

    if (eventSubscribers) {
      for (const sub of eventSubscribers) {
        if (sub.sync) {
          sub(...args);
        } else {
          Promise.resolve().then(() => () => sub(...args));
        }
      }
    }
  };

  /**
   * Attaches a subscriber to the datastore
   * @param subscriber
   */
  public subscribe = (
    event: "*" | EventTypes<T>[0],
    subscriber: Subscriber<T>,
    sync = false
  ) => {
    subscriber.sync = sync;
    const subscriberSet =
      this.subscribers.get(event) ??
      this.subscribers.set(event, new Set()).get(event)!;
    subscriberSet.add(subscriber);
    return () => subscriberSet.delete(subscriber);
  };

  /**
   * Adds a data node to the graph. A node can also be added with a string key if desired
   * @param data
   * @param key
   * @returns The node itself
   */
  public addNode = (data: T, key?: string) => {
    const has = this.nodes.has(data);
    if (!has) {
      const nodeObject = new Node(data);
      this.nodes.set(data, nodeObject);
      this.nodeEdges.set(nodeObject, new Set());
      if (key) this.keyAssignments.set(key, data);
      // subscribe to node data changes
      this.nodeUnsubscribers.set(
        nodeObject,
        nodeObject.subscribe(() => {
          console.log("updateeeed");
          this.emit("node:data:updated", nodeObject);
        }, false)
      );
      this.emit("node:added", nodeObject);
      return nodeObject;
    }
    return this.nodes.get(data)!;
  };

  /**
   * Tries to find a node in the graph
   * @param dataNodeOrKey
   * @returns the node or null
   */
  public getNode = (dataNodeOrKey: T | Node<T> | string) => {
    // this is more of a stub
    if (dataNodeOrKey instanceof Node) {
      return dataNodeOrKey;
    }

    // get node if available
    const dataKey =
      typeof dataNodeOrKey === "string"
        ? this.keyAssignments.get(dataNodeOrKey)
        : dataNodeOrKey;
    return dataKey ? this.nodes.get(dataKey) ?? null : null;
  };

  /**
   *
   * @param dataNodeOrKey
   * @returns whether the node was successfully removed
   */
  public removeNode = (dataNodeOrKey: T | Node<T> | string) => {
    const node = this.getNode(dataNodeOrKey);
    if (node) {
      // get edges for node -> they need to be removed from the related nodes
      const edges = this.nodeEdges.get(node);
      if (edges) {
        for (const edge of edges) {
          const relatedObject =
            edge.source === node ? edge.target : edge.source;
          const edgesForRelatedObject = this.nodeEdges.get(relatedObject);
          if (edgesForRelatedObject) edgesForRelatedObject.delete(edge);
        }

        const unsubscribe = this.nodeUnsubscribers.get(node);
        // unsubscribe from proxy listener
        if (unsubscribe) unsubscribe();

        // remove node itself + remove own edges entry
        const edgesRemoved = this.nodeEdges.delete(node);
        const nodeRemoved = this.nodeEdges.delete(node);
        const reverseEntryRemoved = this.keyAssignments.deleteByValue(
          node.data
        );
        const unsubscribeRemoved = this.nodeUnsubscribers.delete(node);
        this.emit("node:removed", node, edges);
        return (
          edgesRemoved &&
          nodeRemoved &&
          reverseEntryRemoved &&
          unsubscribeRemoved
        );
      }
    }
    return false;
  };

  public patchNode = (
    dataNodeOrKey: T | Node<T> | string,
    operation: readonly Operation[]
  ) => {
    const node = this.getNode(dataNodeOrKey);
    if (node) return node.patch(operation);
    return node;
  };

  /**
   * Adds an edge to the graph @TODO support keys?
   * @returns the added edge
   */
  public addEdge<R extends Relationship<T, boolean>>(
    source: T | Node<T> | string,
    target: T | Node<T> | string,
    relationship: R
  ) {
    const sourceNode = this.getNode(source);
    const targetNode = this.getNode(target);
    if (sourceNode && targetNode) {
      const sourceEdges = this.nodeEdges.get(sourceNode);
      const targetEdges = this.nodeEdges.get(targetNode);
      if (sourceEdges && targetEdges) {
        const edge = new Edge(sourceNode, targetNode, relationship);
        sourceEdges.add(edge);
        targetEdges.add(edge);
        this.emit("edge:added", edge);
        return edge;
      }
    }
    return null;
  }

  /**
   * Removes a known edge or all
   * @param edge
   */
  public removeEdge(
    edgeOrSource: Edge<T, Relationship<T, true>> | T | Node<T> | string,
    target?: T | Node<T> | string,
    relationship?: Relationship<T, true>
  ) {
    let sourceNode: Node<T> | null = null;
    let targetNode: Node<T> | null = null;
    let edge: Edge<T, Relationship<T, true>> | null = null;

    // find source and target nodes depending on incoming arguments
    if (edgeOrSource instanceof Edge) {
      sourceNode = edgeOrSource.source;
      targetNode = edgeOrSource.target;
    } else if (target) {
      const src = this.getNode(edgeOrSource);
      const trgt = this.getNode(target);
      sourceNode = src;
      targetNode = trgt;
    }

    if (!sourceNode || !targetNode) {
      return false;
    }

    const edgesForSrc = this.nodeEdges.get(sourceNode);
    const edgesForTarget = this.nodeEdges.get(targetNode);
    // find edge if not an edge instance
    if (edgeOrSource instanceof Edge) {
      edge = edgeOrSource;
    } else if (edgesForSrc && relationship) {
      for (const srcEdge of edgesForSrc) {
        if (srcEdge.relationship === relationship) {
          edge = srcEdge;
          break;
        }
      }
    }

    if (!edge) {
      return false;
    }

    let edgesRemovedCount = 0;
    if (edgesForSrc) {
      edgesRemovedCount += Number(edgesForSrc.delete(edge));
    }
    if (edgesForTarget) {
      edgesRemovedCount += Number(edgesForTarget.delete(edge));
    }

    this.emit("edge:removed", edge);
    // return true if 2 edges have been removed
    return edgesRemovedCount === 2;
  }

  /**
   * Finds all the edges for a node
   * @param dataNodeOrKey
   * @returns returns an array of edges or null if node didn't exist
   */
  public edgesFor = (dataNodeOrKey: T | Node<T> | string) => {
    const node = this.getNode(dataNodeOrKey);
    if (node) {
      const edges = this.nodeEdges.get(node);
      if (edges) return Array.from(edges);
    }
    return null;
  };

  /**
   * Finds all the edges for a node which have a specific type of relationship
   * @param dataNodeOrKey
   * @returns returns an array of edges or null if node didn't exist
   */
  public relationshipsFor = (
    dataNodeOrKey: T | Node<T> | string,
    relationshipConstructor: {
      new (...args: any[]): DetachedRelationshipStub<T>["relationship"];
    }
  ) => {
    const node = this.getNode(dataNodeOrKey);
    if (node) {
      const edges = this.nodeEdges.get(node);
      if (edges) {
        const matches: Edge<T, Relationship<T, true>>[] = [];
        for (const edge of edges) {
          if (edge.relationship instanceof relationshipConstructor) {
            matches.push(edge);
          }
        }
        return matches;
      }
    }
    return null;
  };
}
