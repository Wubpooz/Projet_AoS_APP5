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
const targetPath = new URL('../../docs/openapi.yml', import.meta.url);
await writeFile(targetPath, output);

console.log(`OpenAPI spec written to ${targetPath.pathname}`);
