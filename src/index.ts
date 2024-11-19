import { Command } from "commander";
import fs from "node:fs";
import * as parser from "./parser";
import { Module } from "./module";

const program = new Command();

program.argument("<source>", "source file");

program.action((source) => {
  const sourceCode = fs.readFileSync(source, "utf-8");
  const parseResult = parser.parse(sourceCode);
  if (parseResult.ast === null) {
    console.error("Failed to parse the source code");
    console.error(parseResult.errs);
    return;
  }
  const module = Module.fromAst(parseResult.ast);
  const js = module.emitJs();
  fs.writeFileSync("out.js", js);
});

program.parse(process.argv);
