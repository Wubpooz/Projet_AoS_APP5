import { writeFile } from 'node:fs/promises';
import app from '../src/index';

const request = new Request('http://localhost/openapi', {
  headers: {
    Accept: 'application/yaml',
  },
});

const response = await app.fetch(request);
if (!response.ok) {
  const body = await response.text();
  throw new Error(`OpenAPI generation failed: ${response.status} ${body}`);
}

const output = await response.text();
let formattedOutput = output;

try {
  const parsed = JSON.parse(output) as unknown;
  formattedOutput = `${JSON.stringify(parsed, null, 2)}\n`;
} catch {
  if (!output.endsWith('\n')) {
    formattedOutput = `${output}\n`;
  }
}
const targetPath = new URL('../../docs/openapi.yml', import.meta.url);
await writeFile(targetPath, formattedOutput);

console.log(`OpenAPI spec written to ${targetPath.pathname}`);
