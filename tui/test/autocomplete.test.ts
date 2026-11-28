import { expect, test } from "bun:test";
import { suggestions } from "../src/autocomplete";

test("slash commands are filtered by prefix", () => {
  expect(suggestions("/mod")).toEqual(["/model"]);
  expect(suggestions("/")).toContain("/help");
  expect(suggestions("/")).toContain("/quit");
});

test("at-file references are filtered by prefix", () => {
  expect(suggestions("@sr")).toEqual(["@src/"]);
  expect(suggestions("plain text")).toEqual([]);
});
