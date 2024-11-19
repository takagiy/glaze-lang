import { Command } from "commander";
import fs from "node:fs";
import * as parser from "./parser";
import { Module } from "./module";

const program = new Command();

program.argument("<source>", "source file").argument("<output>", "output file");

program.action((source, output) => {
  const sourceCode = fs.readFileSync(source, "utf-8");
  const parseResult = parser.parse(sourceCode);
  if (parseResult.ast === null) {
    console.error("Failed to parse the source code");
    console.error(parseResult.errs);
    return;
  }
  const module = Module.fromAst(parseResult.ast);
  const script = module.emitJs();
  fs.writeFileSync(output, script);
});

program.parse(process.argv);
