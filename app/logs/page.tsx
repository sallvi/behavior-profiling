// app/logs/page.tsx
import { list } from "@vercel/blob";

type BlobEntry = {
  pathname: string;
  url: string;
  // other props returned by @vercel/blob are OK
};

export default async function LogsPage() {
  // get all blobs and filter for "logs/" folder
  const existing = await list();
  const files: BlobEntry[] = (existing.blobs || []).filter((b: any) =>
    String(b.pathname).startsWith("logs/")
  );

  // optional: sort by pathname (or by name/date if you have that)
  files.sort((a, b) => a.pathname.localeCompare(b.pathname));

  // fetch and merge contents (no cache)
  let merged = "";
  for (const file of files) {
    try {
      const res = await fetch(file.url, { cache: "no-store" });
      if (!res.ok) {
        merged += `\n\n--- ${file.pathname} (failed to fetch: ${res.status}) ---\n`;
        continue;
      }
      const text = await res.text();
      merged += `\n\n--- ${file.pathname} ---\n${text}`;
    } catch (err: any) {
      merged += `\n\n--- ${file.pathname} (error) ---\n${String(err)}`;
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Logs (merged)</h1>

      {files.length === 0 ? (
        <p>No files found under <code>logs/</code>.</p>
      ) : (
        <div className="prose max-w-none">
          <pre className="whitespace-pre-wrap bg-zinc-50 p-4 rounded">
            {merged}
          </pre>
        </div>
      )}
    </main>
  );
}
