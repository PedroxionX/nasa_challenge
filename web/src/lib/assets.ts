/**
 * URL de un archivo de `web/public/`, válida también cuando el sitio se publica
 * bajo una subruta (p. ej. GitHub Pages: /nasa_challenge/). Usar siempre esto en
 * lugar de rutas absolutas como '/data/...'.
 */
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\/+/, '')
}
