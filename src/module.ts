import binaryen from "binaryen";
import {
  ASTKinds,
  type STATEMENT,
  type PROGRAM,
  type SUM,
  type FAC,
  type DOT,
  type CALL,
  type ATOM,
  EXPR,
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
    public isPublic: boolean,
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

export class ExternDefinition {
  constructor(
    public externalName: string,
    public importName: string,
    public parameters: ParameterDefinition[],
    public returnType: string,
  ) {}
}

export class Module {
  constructor(
    public structDefinitions: StructDefinition[],
    public functionDefinitions: FunctionDefinition[],
    public externDefinitions: ExternDefinition[],
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
        isPublic: d.isPublic,
        name: d.name,
        parameters: d.params.map(
          (p) => new ParameterDefinition(p.name, p.type.name),
        ),
        returnType: d.returnType.name,
        body: d.body,
      }));
    const externDefinitions = ast.toplevels
      .filter((d) => d.kind === ASTKinds.EXTERNFUNC)
      .map((d) => ({
        externalName: d.externalName,
        importName: d.importName,
        parameters: d.params.map(
          (p) => new ParameterDefinition(p.name, p.type.name),
        ),
        returnType: d.returnType.name,
      }));
    return new Module(
      structDefinitions,
      functionDefinitions,
      externDefinitions,
    );
  }

  emitJs() {
    const wasm = this.emitBinary();
    const wasmBuffer = Buffer.from(wasm);
    const wasmBase64 = wasmBuffer.toString("base64");
    return `const wasmBase64 = "${wasmBase64}"
const wasmBuffer = Buffer.from(wasmBase64, "base64");
const mod = new WebAssembly.Module(wasmBuffer);
const importObject = ${this.emitJsImportObject()};
const instance = new WebAssembly.Instance(mod, importObject);
module.exports = instance.exports;
`;
  }

  emitJsImportObject() {
    const emit = (e: ExternDefinition) => {
      return `${e.importName}: function(${e.parameters.map((p) => p.name).join(", ")}) { return ${e.externalName}(${e.parameters.map((p) => p.name).join(", ")}); },`;
    };
    return `{ env: { ${this.externDefinitions.map(emit).join(" ")} } }`;
  }

  emitBinary(): Uint8Array {
    const module = binaryen.parseText(this.emitWat());
    module.optimize();
    module.validate();
    return module.emitBinary();
  }

  emitWat() {
    return sExprToString(this.emit());
  }

  emit() {
    return [
      "module",
      ...this.emitTypes(),
      ...this.emitImports(),
      ...this.emitFunctions(),
      ...this.emitExports(),
      ...this.emitStart(),
    ];
  }

  emitTypes() {
    return this.structDefinitions.map((s) => [
      "type",
      `$${s.name}`,
      ["struct", ...s.fields.map((f) => ["field", `$${f.name}`, f.type])],
    ]);
  }

  emitImports() {
    return this.externDefinitions.map((e) => [
      "import",
      `"env"`,
      `"${e.importName}"`,
      [
        "func",
        `$${e.importName}`,
        ...e.parameters.map((p) => ["param", p.type]),
        ...(e.returnType === "unit" ? [] : [["result", e.returnType]]),
      ],
    ]);
  }

  emitFunctions() {
    return this.functionDefinitions.map((f) => [
      "func",
      `$${f.name}`,
      ...f.parameters.map((p) => ["param", `$${p.name}`, p.type]),
      ...(f.returnType === "unit" ? [] : [["result", f.returnType]]),
      ...f.body.flatMap(emitLocals),
      ...f.body.map(emitStatement),
    ]);
  }

  emitExports() {
    return this.functionDefinitions
      .filter((f) => f.isPublic)
      .map((f) => ["export", `"${f.name}"`, ["func", `$${f.name}`]]);
  }

  emitStart() {
    if (this.functionDefinitions.some((f) => f.name === "main")) {
      return [["start", "$main"]];
    }
    return [];
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
    case ASTKinds.CALL:
      return emitExpression(statement);
  }
}

function emitExpression(expr: EXPR): SExprArray {
  switch (expr.kind) {
    case ASTKinds.SUM:
      return ["i32.add", emitExpression(expr.left), emitExpression(expr.right)];
    case ASTKinds.FAC:
      return ["i32.mul", emitExpression(expr.left), emitExpression(expr.right)];
    case ASTKinds.DOT:
      if (expr.right.kind !== ASTKinds.VARREF) {
        throw new Error("Unknown dot right kind");
      }
      return ["struct.get", `$${expr.right.name}`, emitExpression(expr.left)];
    case ASTKinds.CALL:
      if (expr.callee.kind !== ASTKinds.VARREF) {
        throw new Error("Unknown callee kind");
      }
      return ["call", `$${expr.callee.name}`, ...expr.args.map(emitExpression)];
    case ASTKinds.VARREF:
      return ["local.get", `$${expr.name}`];
    case ASTKinds.INTCONST:
      return ["i32.const", expr.value.toString()];
  }
}
