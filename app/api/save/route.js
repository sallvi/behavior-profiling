import { list, put } from '@vercel/blob';

const FILE_NAME = 'data.txt';

export async function POST(req) {
    const { username, password } = await req.json();
    function escapeCsvField(text) {
        return `"${String(text).replace(/"/g, '""')}"`;
    }
    const line = escapeCsvField(username) + "," + escapeCsvField(password) + "\n";
    console.log("Received request to /api/save with text " + line);
 
    const existing = await list();
    const file = existing.blobs.find(b => b.pathname === FILE_NAME)

    let csvContent = 'username,password\n';
    if (file) {
        const url = `${file.url}?t=${Date.now()}`;
        const res = await fetch(file.url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch existing CSV: ${res.status}');
        console.log("Found existing res " + res);
        const existingText = await res.text();
        console.log("Found existing text " + existingText);
        csvContent = existingText;
    }

    csvContent += line;
    console.log("Saving new text " + csvContent);

    await put(FILE_NAME, csvContent, {
        contentType: 'text/plain',
        access: 'public',
        allowOverwrite: true,
    });

    return Response.json(JSON.stringify({ ok: true }), { status: 200 });
}