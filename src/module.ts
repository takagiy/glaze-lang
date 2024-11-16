import { ASTKinds, type PROGRAM } from "./parser";

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
      }));
    return new Module(structDefinitions, functionDefinitions);
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
