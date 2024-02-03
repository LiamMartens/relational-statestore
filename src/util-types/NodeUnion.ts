import type { Node } from "../Node.js";

export type NodeUnion<T> = T extends unknown ? Node<T> : never;
