import { expect, test, mock } from "bun:test";
import { Relationship, RelationalStatestore } from "../src";

test("RelationalStatestore - should work", async () => {
  const mockSubscriber = mock(() => {});

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
  datastore.subscribe('*', (...args) => {

  })
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
