// Entidades HTML nombradas frecuentes en textos en español que pudieran haber
// quedado almacenadas codificadas. Es un set acotado a propósito: no pretende
// cubrir todo HTML, solo lo que aparece de forma realista en los datos.
const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  iquest: '¿',
  iexcl: '¡',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ntilde: 'ñ',
  uuml: 'ü',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  Ntilde: 'Ñ',
  Uuml: 'Ü',
};

/**
 * Normaliza un texto SOLO PARA PRESENTACIÓN. Convierte a texto legible en
 * español valores que hayan quedado codificados en el backend:
 *  - escapes Unicode `\uXXXX`;
 *  - entidades numéricas (`&#243;`, `&#xF3;`);
 *  - entidades nombradas comunes (`&amp;`, `&aacute;`, `&iquest;`, …);
 *  - tags HTML simples de presentación (`<br>` → salto de línea, `<p>`/`</p>`,
 *    y el resto de tags sueltos se eliminan).
 *
 * NO modifica los datos almacenados, ni los IDs, ni lo que escribe el paciente,
 * ni el valor original de las opciones. Se usa únicamente al renderizar.
 */
export function normalizarTextoVisible(value: unknown): string {
  if (value == null) return '';
  let str = typeof value === 'string' ? value : String(value);

  // 1. Escapes Unicode \uXXXX.
  if (str.includes('\\u')) {
    str = str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
  }

  // 2. Tags simples: <br> → salto, <p>/</p> → salto, resto de tags → nada.
  str = str
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/?\s*p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  // 3. Entidades numéricas (hex y decimal).
  str = str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));

  // 4. Entidades nombradas conocidas (las desconocidas se dejan intactas).
  str = str.replace(/&([a-zA-Z]+);/g, (match, name) => ENTIDADES[name] ?? match);

  // Colapsa saltos de línea excesivos que hayan quedado de los tags.
  return str.replace(/\n{3,}/g, '\n\n').trim();
}
