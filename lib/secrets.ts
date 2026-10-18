import "server-only";

/**
 * Secreto de servidor. En Vercel es obligatorio (sin valor por defecto que pueda falsificarse);
 * en local/CI usa un valor de desarrollo para no exigir configuración.
 */
export function serverSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.VERCEL) throw new Error(`${name} no está configurada`);
  return devFallback;
}
