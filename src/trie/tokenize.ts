/** Split pasted text into lowercase words; anything that is not a letter, apostrophe or hyphen separates words. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}'-]+/u)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ''))
    .filter((w) => w.length > 0)
}
