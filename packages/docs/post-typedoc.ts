import { promises as fs } from 'fs';
import path from 'path';

const targetReadme: string[] = [
  'api/core/index.md',
  'api/env/index.md',
];

async function updateMarkdownHeaders() {
  for (const filepath of targetReadme) {
    try {
      const fullPath = path.resolve(filepath);
      const content = await fs.readFile(fullPath, 'utf8');

      const match = filepath.match(/api\/(.*?)\/index\.md$/);
      if (!match) {
        console.warn(`⚠️ Skip file with unexpected path format: ${filepath}`);
        continue;
      }

      const projectName = match[1]; // เช่น core หรือ env
      const linkLine = `[All Packages](../index.md) / @kubricate/${projectName}`;
      const newHeader = `# @kubricate/${projectName} API Documentation`;

      const updatedContent = content.replace(/^# Documentation\s*/m, `${linkLine}\n\n${newHeader}\n\n`);

      await fs.writeFile(fullPath, updatedContent, 'utf8');
      console.log(`✅ Updated header in ${filepath}`);
    } catch (err) {
      console.error(`❌ Failed to update ${filepath}:`, err);
    }
  }
}

updateMarkdownHeaders();
