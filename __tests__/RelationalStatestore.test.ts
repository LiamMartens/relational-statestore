import { expect, test, vi } from "vitest";
import { Relationship, RelationalStatestore } from "../src";

test("RelationalStatestore - should work", async () => {
  const mockSubscriber = vi.fn();

  // add some nodes
  type UserType = { name: string; email: string };
  const datastore = new RelationalStatestore<UserType>();
  datastore.subscribe("*", mockSubscriber, true);
  const userJohn = { name: "John Doe", email: "john.doe@example.com" };
  const userSmith = { name: "John Smith", email: "john.smith@example.com" };
  datastore.addNode(userJohn);
  datastore.addNode(userSmith, "smith");
  expect(datastore.getNode(userJohn)?.data).toEqual(userJohn);
  expect(datastore.getNode(userSmith)?.data).toEqual(userSmith);
  expect(datastore.getNode("smith")?.data).toEqual(userSmith);

  // make them friends
  class IsFriendOfRelationship extends Relationship<UserType> {}
  class LivesInSameTownRelationship extends Relationship<UserType> {}
  datastore.addEdge(userJohn, userSmith, new IsFriendOfRelationship());
  datastore.addEdge(userJohn, userSmith, new LivesInSameTownRelationship());
  const johnsEdges = datastore.edgesFor(userJohn);
  expect(johnsEdges?.length).toEqual(2);
  const johnsFriends = datastore.relationshipsFor(
    userJohn,
    IsFriendOfRelationship
  );
  expect(johnsFriends?.length).toEqual(1);
  // called 3 times -> node:added * 2, edge:added
  expect(mockSubscriber).toHaveBeenCalledTimes(4);
  datastore.patchNode(userJohn, [
    { op: "replace", path: "/email", value: "john.doe.2@domain.com" },
  ]);
  await Promise.resolve();
  expect(mockSubscriber).toHaveBeenCalledTimes(5);
});

test("RelationalStatestore - edge conditions should work", async () => {
  const mockSubscriber = vi.fn();

  // add some nodes
  type UserType = { name: string; email: string };
  const datastore = new RelationalStatestore<UserType>();
  datastore.subscribe("*", mockSubscriber, true);
  const userJohn = { name: "John Doe", email: "john.doe@example.com" };
  const userSmith = { name: "John Smith", email: "john.smith@example.com" };
  datastore.addNode(userJohn);
  datastore.addNode(userSmith, "smith");
  expect(datastore.getNode(userJohn)?.data).toEqual(userJohn);
  expect(datastore.getNode(userSmith)?.data).toEqual(userSmith);
  expect(datastore.getNode("smith")?.data).toEqual(userSmith);

  // make them friends
  class IsFriendOfRelationship extends Relationship<UserType> {}
  class LivesInSameTownRelationship extends Relationship<UserType> {}
  datastore.addEdge(userJohn, userSmith, new LivesInSameTownRelationship());
  // automatically remove IsFriendOfRelationship edge if not living in same town
  datastore.addEdge(
    userJohn,
    userSmith,
    new IsFriendOfRelationship(),
    (store) => {
      const areStillClose = store
        .edgesFor(userJohn, LivesInSameTownRelationship)
        ?.find((edge) => edge.target.data === userSmith);
      return !!areStillClose;
    }
  );
  expect(datastore.edgesFor(userJohn)?.length).toEqual(2);
  datastore.removeEdge(userJohn, userSmith, LivesInSameTownRelationship);
  await Promise.resolve();
  expect(datastore.edgesFor(userJohn)?.length).toEqual(0);
});

test("RelationalStatestore - can iterate over nodes", async () => {
  const mock = vi.fn();

  // add some nodes
  type UserType = { name: string; email: string };
  const datastore = new RelationalStatestore<UserType>();
  const userJohn = { name: "John Doe", email: "john.doe@example.com" };
  const userSmith = { name: "John Smith", email: "john.smith@example.com" };
  datastore.addNode(userJohn);
  datastore.addNode(userSmith, "smith");
  for (const node of datastore.iterate()) {
    mock(node);
  }
  expect(mock).toBeCalledTimes(2);

  // expect to be callled one more time with a condition
  for (const node of datastore.iterate((node) => node.data === userJohn)) {
    mock(node);
  }
  expect(mock).toBeCalledTimes(3);
});
