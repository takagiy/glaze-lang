import binaryen from "binaryen";
import {
  ASTKinds,
  type STATEMENT,
  type PROGRAM,
  type SUM,
  type FAC,
  type DOT,
  type VARREF,
} from "./parser";

export class StructDefinition {
  constructor(
    public name: string,
    public fields: FieldDefinition[],
  ) {}
}

export class FieldDefinition {
  constructor(
    public name: string,
    public type: string,
  ) {}
}

export class FunctionDefinition {
  constructor(
    public name: string,
    public parameters: ParameterDefinition[],
    public returnType: string,
    public body: STATEMENT[],
  ) {}
}

export class ParameterDefinition {
  constructor(
    public name: string,
    public type: string,
  ) {}
}

export class Module {
  constructor(
    public structDefinitions: StructDefinition[],
    public functionDefinitions: FunctionDefinition[],
  ) {}

  static fromAst(ast: PROGRAM): Module {
    const structDefinitions = ast.toplevels
      .filter((d) => d.kind === ASTKinds.STRUCTDEF)
      .map((d) => ({
        name: d.name,
        fields: d.fields.map((f) => new FieldDefinition(f.name, f.type.name)),
      }));
    const functionDefinitions = ast.toplevels
      .filter((d) => d.kind === ASTKinds.FUNCDEF)
      .map((d) => ({
        name: d.name,
        parameters: d.params.map(
          (p) => new ParameterDefinition(p.name, p.type.name),
        ),
        returnType: d.returnType.name,
        body: d.body,
      }));
    return new Module(structDefinitions, functionDefinitions);
  }

  emitBinary() {
    const module = binaryen.parseText(this.emitWat());
    module.optimize();
    module.validate();
    return module.emitBinary();
  }

  emitWat() {
    return sExprToString(this.emit());
  }

  emit() {
    return ["module", ...this.emitTypes(), ...this.emitFunctions()];
  }

  emitTypes() {
    return this.structDefinitions.map((s) => [
      "type",
      `$${s.name}`,
      ["struct", ...s.fields.map((f) => ["field", `$${f.name}`, f.type])],
    ]);
  }

  emitFunctions() {
    return this.functionDefinitions.map((f) => [
      "func",
      `$${f.name}`,
      ...f.parameters.map((p) => ["param", `$${p.name}`, p.type]),
      ["result", f.returnType],
      ...f.body.flatMap(emitLocals),
      ...f.body.map(emitStatement),
    ]);
  }
}

type SExprArray = SExprArray[] | string;

function sExprToString(sExpr: SExprArray): string {
  if (Array.isArray(sExpr)) {
    return `(${sExpr.map(sExprToString).join(" ")})`;
  }
  return sExpr;
}

function emitLocals(statement: STATEMENT): SExprArray[] {
  if (statement.kind === ASTKinds.LET) {
    return [["local", `$${statement.name}`, "i32"]];
  }
  return [];
}

function emitStatement(statement: STATEMENT): SExprArray {
  switch (statement.kind) {
    case ASTKinds.LET:
      return [
        "local.set",
        `$${statement.name}`,
        emitExpression(statement.expr),
      ];
    case ASTKinds.RETURN:
      return ["return", emitExpression(statement.expr)];
  }
}

function emitExpression(expr: SUM | FAC | DOT | VARREF): SExprArray {
  if (expr.kind === ASTKinds.SUM) {
    return expr.operands
      .map(emitExpression)
      .reduce((acc, e) => ["i32.add", acc, e]);
  }
  if (expr.kind === ASTKinds.FAC) {
    return expr.operands
      .map(emitExpression)
      .reduce((acc, e) => ["i32.mul", acc, e]);
  }
  if (expr.kind === ASTKinds.DOT) {
    return expr.accessors.reduce<SExprArray>(
      (acc, a) => ["struct.get", acc, `$${a}`],
      emitExpression(expr.receiver),
    );
  }
  if (expr.kind === ASTKinds.VARREF) {
    return ["local.get", `$${expr.name}`];
  }
  throw new Error("Unknown expression kind");
}
