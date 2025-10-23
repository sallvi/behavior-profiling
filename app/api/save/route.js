import { writeFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data.csv');

export async function POST(req) {
    const { text } = await req.json();
    console.log("Received request to /api/save with text " + text);

    if (!existsSync(filePath)) await writeFile(filePath, 'text\n');
    await appendFile(filePath, `"${text.replace(/"/g, '""')}"\n`);

    return Response.json({ ok: true });
}