import { readFileSync } from 'node:fs';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function getPackageVersion(packageJsonPath: string) {
  let version = '0.0.0';
  try {
    // Read "Pure ESM package": https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c
    const filename = fileURLToPath(import.meta.url); // ESM style like __filename in CommonJS
    const dirname = path.dirname(filename); // ESM style like  __dirname in CommonJS
    version = JSON.parse(readFileSync(join(dirname, packageJsonPath), 'utf-8')).version;
  } catch {
    console.warn('Could not read version from package.json');
  }
  return version;
}

export const version = getPackageVersion('../../package.json');
