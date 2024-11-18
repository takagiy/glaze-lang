import test from "ava";
import * as parser from "../src/parser";
import { Module } from "../src/module";

test("struct", (t) => {
  const ast = parser.parse("struct Foo { a: i32, b: i32 }");
  t.not(ast.ast, null);

  if (ast.ast === null) {
    return;
  }

  const module = Module.fromAst(ast.ast);
  const wat = module.emitWat();

  t.is(wat, "(module (type $Foo (struct (field $a i32) (field $b i32))))");

  module.emitBinary();
});

test("function", (t) => {
  const ast = parser.parse(
    "fn foo(a: i32, b: i32) -> i32 { let c = a + b; return c; }",
  );
  t.not(ast.ast, null);

  if (ast.ast === null) {
    return;
  }

  console.dir(ast.ast, { depth: null });

  const module = Module.fromAst(ast.ast);
  const wat = module.emitWat();

  t.is(
    wat,
    "(module (func $foo (param $a i32) (param $b i32) (result i32) (local $c i32) (local.set $c (i32.add (local.get $a) (local.get $b))) (return (local.get $c))))",
  );

  module.emitBinary();
});

test("public function", (t) => {
  const ast = parser.parse(
    "pub fn foo(a: i32, b: i32) -> i32 { let c = a + b; return c; }",
  );
  t.not(ast.ast, null);

  if (ast.ast === null) {
    return;
  }

  console.dir(ast.ast, { depth: null });

  const module = Module.fromAst(ast.ast);
  const wat = module.emitWat();

  t.is(
    wat,
    '(module (func $foo (param $a i32) (param $b i32) (result i32) (local $c i32) (local.set $c (i32.add (local.get $a) (local.get $b))) (return (local.get $c))) (export "foo" (func $foo)))',
  );

  module.emitBinary();
});
