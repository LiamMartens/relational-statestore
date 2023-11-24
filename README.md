# Relational Statestore

[![npm](https://img.shields.io/npm/v/relational-statestore)](https://www.npmjs.com/package/relational-statestore) [![npm](https://img.shields.io/npm/l/relational-statestore)](https://www.npmjs.com/package/relational-statestore)

This is an in-memory graph like datastore for managing relationships between nodes.
The purpose of this library is not persistent data storage but rather a relational state which can be useful for certain use cases such as:

- Keeping track of child/parent relationships
- Keeping track of related DOM elements

## Usage

```typescript
import { RelationalStatestore, Relationship } from "relational-statestore";

type UserType = {
  id: string;
  name: string;
};

// create the local store
export const store = new RelationalStatestore<UserType>();

// add nodes
const userA = { id: "a", name: "User A" };
const userB = { id: "b", name: "User B" };
const nodeA = store.addNode(userA);
const nodeB = store.addNode(userB);

// add relationship
class AreFriends extends Relationship<UserType> {}
// it is possible to use the original data objects to refer to the nodes
store.addEdge(userA, userB, new AreFriends());
// it is also possible to use the nodes itself
store.addEdge(nodeA, nodeB, new AreFriends());

// we can now find all the edges for our users
const allEdges = store.edgesFor(userA);
// the result is an array with 1 edge: Edge<UserType, AreFriends>
// we can also look for specific relationships
const friends = store.relationshipsFor(userA, AreFriends);
// this will return the same list - filtered by AreFriends
```

## Subscribing to events

It is also possible to subscribe to the store to run side-effects.

```typescript
import { RelationalStatestore, Relationship } from "relational-statestore";

type UserType = {
  id: string;
  name: string;
};

// create the local store
export const store = new RelationalStatestore<UserType>();
store.subscribe("*", (...event) => {});
store.subscribe("node:added", (eventname, node) => {});
store.subscribe("node:data:updated", (eventname, node) => {});
```
