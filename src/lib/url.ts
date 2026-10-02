// Decoding URL text that visitors control: a malformed escape ("%zz", a cut-off "%E0%A4%A") is left as
// it is instead of throwing, so it ends in Not found rather than a server error.
export function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
