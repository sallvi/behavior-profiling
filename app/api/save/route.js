import { list, put } from '@vercel/blob';

const FILE_NAME = 'data.2.txt';

export async function POST(req) {
    function escapeCsvField(text) {
        return `"${String(text).replace(/"/g, '""')}"`;
    }
    const data = await req.json();
    const line = Object.values(data).map(escapeCsvField).join(",") + "\n";
    console.log("Received request to /api/save with text " + line);
 
    const existing = await list();
    const file = existing.blobs.find(b => b.pathname === FILE_NAME)

    let csvContent = Object.keys(data).join(",") + "\n";
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
    console.log("Saving new text:\n" + csvContent);

    await put(FILE_NAME, csvContent, {
        contentType: 'text/plain',
        access: 'public',
        allowOverwrite: true,
    });

    return Response.json(JSON.stringify({ ok: true }), { status: 200 });
}