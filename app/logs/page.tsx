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
  <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
    <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
      <h1 className="text-4xl font-bold mb-8">Payloads</h1>

      {files.length === 0 ? (
        <p>No files found under <code>logs/</code>.</p>
      ) : (
        <div className="grid grid-cols-2 gap-8 mt-12 w-full text-sm">
          <pre>
            {merged}
          </pre>
        </div>
      )}
    </main>
  </div>
  );
}
