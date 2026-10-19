// Recorrido recursivo de un bucket de Supabase Storage (sin dependencias: se inyecta `list`).
// En la API de Storage, una entrada sin `id` es una carpeta.

export type StorageEntry = { name: string; id: string | null };
export type ListFn = (prefix: string, offset: number) => Promise<StorageEntry[]>;

export async function walkBucket(list: ListFn, prefix = "", pageSize = 100): Promise<string[]> {
  const files: string[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await list(prefix, offset);
    for (const e of page) {
      const key = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.id === null) files.push(...(await walkBucket(list, key, pageSize)));
      else if (e.name !== ".emptyFolderPlaceholder") files.push(key);
    }
    if (page.length < pageSize) break;
  }
  return files;
}
