import { readFileSync, writeFileSync } from "fs";

const packageJsonPath: string = "./package.json";

// Read package.json
const packageJson: Record<string, unknown> = JSON.parse(
  readFileSync(packageJsonPath, "utf8")
);

// Remove "type" key
delete packageJson["type"];

// Write back package.json without "type"
writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");

console.log("✅ Removed 'type' from package.json before publishing.");
