import test from "ava";
import * as parser from "../src/parser";

test("it works", (t) => {
  t.is(1 + 1, 2);
  const program = parser.parse("struct Foo { a: i32, b: i32 }");
  console.dir(program, { depth: null });
});
