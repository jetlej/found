/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import schema from "./schema";

export const modules = import.meta.glob("./**/!(*.*.*)*.*s");

export function setupTest() {
  return convexTest(schema, modules);
}
