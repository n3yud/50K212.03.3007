import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";
const traverse = traverseModule.default ?? traverseModule,
  generate = generateModule.default ?? generateModule;
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) walk(file);
    else if (file.endsWith(".jsx")) {
      const ast = parse(fs.readFileSync(file, "utf8"), {
        sourceType: "module",
        plugins: ["jsx"],
      });
      let changed = false;
      traverse(ast, {
        ImportSpecifier(p) {
          if (p.node.imported.name === "t" && p.node.local.name === "t") {
            p.node.local.name = "translate";
            changed = true;
          }
        },
        CallExpression(p) {
          if (
            p.node.callee.type === "Identifier" &&
            p.node.callee.name === "t"
          ) {
            p.node.callee.name = "translate";
            changed = true;
          }
        },
      });
      if (changed) fs.writeFileSync(file, generate(ast).code + "\n");
    }
  }
}
walk("src");
