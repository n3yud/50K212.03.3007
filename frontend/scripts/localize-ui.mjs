import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";
const traverse = traverseModule.default ?? traverseModule;
const generate = generateModule.default ?? generateModule;
const keys = new Set();
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
        JSXText(p) {
          const value = p.node.value.trim();
          if (!value || !/[A-Za-zÀ-ỹ]/u.test(value)) return;
          keys.add(value);
          p.replaceWith({
            type: "JSXExpressionContainer",
            expression: {
              type: "CallExpression",
              callee: { type: "Identifier", name: "t" },
              arguments: [{ type: "StringLiteral", value }],
            },
          });
          changed = true;
        },
        StringLiteral(p) {
          if (/[À-ỹ]/u.test(p.node.value) && p.node.value.length < 250)
            keys.add(p.node.value);
        },
      });
      if (
        changed &&
        !ast.program.body.some(
          (n) =>
            n.type === "ImportDeclaration" && n.source.value.endsWith("/i18n"),
        )
      ) {
        const source =
          file.includes(path.join("src", "pages")) ||
          file.includes(path.join("src", "components"))
            ? "../lib/i18n"
            : "./lib/i18n";
        ast.program.body.unshift({
          type: "ImportDeclaration",
          source: { type: "StringLiteral", value: source },
          specifiers: [
            {
              type: "ImportSpecifier",
              imported: { type: "Identifier", name: "t" },
              local: { type: "Identifier", name: "t" },
            },
          ],
        });
      }
      fs.writeFileSync(file, generate(ast, { retainLines: false }).code + "\n");
    }
  }
}
walk("src");
fs.writeFileSync(
  "../docs/ui-text-keys.json",
  JSON.stringify([...keys].sort(), null, 2),
);
console.log(`${keys.size} UI strings inventoried.`);
