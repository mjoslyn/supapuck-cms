// Text formatting: texturize() (smart quotes, dashes, ellipses) and autop() (paragraphs and line breaks
// from plain text), run over rendered pages and section markup (scripts/checks/formatting.ts).

const SPACES = '[\\r\\n\\t ]|\\u00A0|&nbsp;';

const COMMENT = '!(?:-(?!->)[^\\-]*)*(?:-->)?';
const CDATA = '!\\[CDATA\\[[^\\]]*(?:\\](?!\\]>)[^\\]]*)*(?:\\]\\]>)?';

/** get_html_split_regex() */
const HTML_SPLIT = new RegExp(`(<(?:(?=!--)${COMMENT}|(?=!\\[CDATA\\[)${CDATA}|[^>]*>?))`);
/** Splits text into tags, comments and text for texturize. */
const TEXTURIZE_SPLIT = new RegExp(`(<(?:(?=!--)${COMMENT}|[^>]*>?))`);

export function htmlSplit(input: string): string[] {
  return input.split(HTML_SPLIT);
}

const OPEN_Q = '&#8220;', CLOSE_Q = '&#8221;', APOS = '&#8217;', PRIME = '&#8242;', DOUBLE_PRIME = '&#8243;';
const OPEN_SQ = '&#8216;', CLOSE_SQ = '&#8217;', EN_DASH = '&#8211;', EM_DASH = '&#8212;';
const OPEN_Q_FLAG = '<!--oq-->', OPEN_SQ_FLAG = '<!--osq-->', APOS_FLAG = '<!--apos-->';

const COCKNEY = ["'tain't", "'twere", "'twas", "'tis", "'twill", "'til", "'bout", "'nuff", "'round", "'cause", "'em"];
const COCKNEY_REPL = ['&#8217;tain&#8217;t', '&#8217;twere', '&#8217;twas', '&#8217;tis', '&#8217;twill', '&#8217;til', '&#8217;bout', '&#8217;nuff', '&#8217;round', '&#8217;cause', '&#8217;em'];
const STATIC_CHARS = ['...', '``', "''", ' (tm)', ...COCKNEY];
const STATIC_REPL = ['&#8230;', OPEN_Q, CLOSE_Q, ' &#8482;', ...COCKNEY_REPL];

const DYN_APOS: [RegExp, string][] = [
  [new RegExp(`'(\\d\\d)'(?=$|[.,:;!?)}\\-\\]]|&gt;|${SPACES})`, 'g'), `${APOS_FLAG}$1${CLOSE_SQ}`],
  [new RegExp(`'(\\d\\d)"(?=$|[.,:;!?)}\\-\\]]|&gt;|${SPACES})`, 'g'), `${APOS_FLAG}$1${CLOSE_Q}`],
  [/'(?=\d\d(?:$|(?![%\d]|[.,]\d)))/g, APOS_FLAG],
  [new RegExp(`(?<=^|${SPACES})'(\\d[.,\\d]*)'`, 'g'), `${OPEN_SQ_FLAG}$1${CLOSE_SQ}`],
  [new RegExp(`(?<=^|[(\\[{"\\-]|&lt;|${SPACES})'`, 'g'), OPEN_SQ_FLAG],
  [new RegExp(`(?<!${SPACES})'(?!$|[.,:;!?"'(){}[\\]\\-]|&[lg]t;|${SPACES})`, 'g'), APOS_FLAG],
];
const DYN_QUOTE: [RegExp, string][] = [
  [new RegExp(`(?<=^|${SPACES})"(\\d[.,\\d]*)"`, 'g'), `${OPEN_Q_FLAG}$1${CLOSE_Q}`],
  [new RegExp(`(?<=^|[(\\[{\\-]|&lt;|${SPACES})"(?!${SPACES})`, 'g'), OPEN_Q_FLAG],
];
const DYN_DASH: [RegExp, string][] = [
  [/---/g, EM_DASH],
  [new RegExp(`(?<=^|${SPACES})--(?=$|${SPACES})`, 'g'), EM_DASH],
  [/(?<!xn)--/g, EN_DASH],
  [new RegExp(`(?<=^|${SPACES})-(?=$|${SPACES})`, 'g'), EN_DASH],
];

// PHP preg_replace with an array of patterns applies each pattern in turn to the result.
const applyAll = (s: string, rules: [RegExp, string][]) => rules.reduce((acc, [re, r]) => acc.replace(re, r), s);
const strReplaceAll = (s: string, from: string[], to: string[]) => from.reduce((acc, f, i) => acc.split(f).join(to[i]), s);
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function texturizePrimes(haystack: string, needle: string, prime: string, openQuote: string, closeQuote: string) {
  const flag = '<!--c-prime-or-quote-->';
  const n = escRe(needle);
  const quotePattern = new RegExp(`${n}(?=$|[.,:;!?)}\\-\\]]|&gt;|${SPACES})`, 'g');
  const primePattern = new RegExp(`(?<=\\d)${n}`, 'g');
  const flagAfterDigit = new RegExp(`(?<=\\d)${escRe(flag)}`, 'g');
  const flagNoDigit = new RegExp(`(?<!\\d)${escRe(flag)}`, 'g');
  const sentences = haystack.split(openQuote);
  for (let key = 0; key < sentences.length; key++) {
    let sentence = sentences[key];
    if (!sentence.includes(needle)) continue;
    if (key !== 0 && !sentence.includes(closeQuote)) {
      let count = 0;
      sentence = sentence.replace(quotePattern, () => (count++, flag));
      if (count > 1) {
        let count2 = 0;
        sentence = sentence.replace(flagNoDigit, () => (count2++, closeQuote));
        if (count2 === 0) {
          const dotted = sentence.split(`${flag}.`).length - 1;
          const pos = dotted > 0 ? sentence.lastIndexOf(`${flag}.`) : sentence.lastIndexOf(flag);
          sentence = sentence.slice(0, pos) + closeQuote + sentence.slice(pos + flag.length);
        }
        sentence = sentence.replace(primePattern, prime).replace(flagAfterDigit, prime).split(flag).join(closeQuote);
      } else if (count === 1) {
        sentence = sentence.split(flag).join(closeQuote).replace(primePattern, prime);
      } else {
        sentence = sentence.replace(primePattern, prime);
      }
    } else {
      sentence = sentence.replace(primePattern, prime).replace(quotePattern, closeQuote);
    }
    if (needle === '"' && sentence.includes('"')) sentence = sentence.split('"').join(closeQuote);
    sentences[key] = sentence;
  }
  return sentences.join(openQuote);
}

const NO_TEXTURIZE = ['pre', 'code', 'kbd', 'style', 'script', 'tt'];
const AMP = /&(?!#(?:\d+|x[a-f0-9]+);|[a-z1-4]{1,8};)/gi;

function pushPop(text: string, stack: string[]) {
  let opening: boolean, offset: number;
  if (text[1] !== undefined && text[1] !== '/') { opening = true; offset = 1; }
  else if (!stack.length) return;
  else { opening = false; offset = 2; }
  const sp = text.indexOf(' ');
  const tag = sp === -1 ? text.slice(offset, -1) : text.slice(offset, sp);
  if (NO_TEXTURIZE.includes(tag)) {
    if (opening) stack.push(tag);
    else if (stack[stack.length - 1] === tag) stack.pop();
  }
}

export function texturize(text: string): string {
  if (!text) return text;
  // Scripts and styles are code: a "<" in them ("a < b") would read as a tag and "&&" would be
  // escaped. They go through untouched; only the text around them is texturized.
  if (/<(script|style)\b/i.test(text)) {
    return text
      .split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/i)
      .map((part, i) => (i % 2 ? part : texturizeText(part)))
      .join('');
  }
  return texturizeText(text);
}

function texturizeText(text: string): string {
  if (!text) return text;
  const parts = text.split(TEXTURIZE_SPLIT).filter((p) => p !== '');
  const tagStack: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    let curl = parts[i];
    if (curl[0] === '<') {
      if (curl.startsWith('<!--')) continue;
      curl = curl.replace(AMP, '&#038;');
      pushPop(curl, tagStack);
    } else if (curl.trim() === '') {
      continue;
    } else if (!tagStack.length) {
      curl = strReplaceAll(curl, STATIC_CHARS, STATIC_REPL);
      if (curl.includes("'")) {
        curl = applyAll(curl, DYN_APOS);
        curl = texturizePrimes(curl, "'", PRIME, OPEN_SQ_FLAG, CLOSE_SQ);
        curl = curl.split(APOS_FLAG).join(APOS).split(OPEN_SQ_FLAG).join(OPEN_SQ);
      }
      if (curl.includes('"')) {
        curl = applyAll(curl, DYN_QUOTE);
        curl = texturizePrimes(curl, '"', DOUBLE_PRIME, OPEN_Q_FLAG, CLOSE_Q);
        curl = curl.split(OPEN_Q_FLAG).join(OPEN_Q);
      }
      if (curl.includes('-')) curl = applyAll(curl, DYN_DASH);
      if (/(?<=\d)x\d/.test(curl)) curl = curl.replace(/\b(\d(?:(?<=0)[\d.,]+|[\d.,]*))x(\d[\d.,]*)\b/g, '$1&#215;$2');
      curl = curl.replace(AMP, '&#038;');
    }
    parts[i] = curl;
  }
  return parts.join('');
}

const ALLBLOCKS = '(?:table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|map|area|blockquote|address|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|hgroup|header|footer|nav|figure|figcaption|details|menu|summary)';

function replaceInHtmlTags(haystack: string, needle: string, replace: string) {
  const arr = htmlSplit(haystack);
  let changed = false;
  for (let i = 1; i < arr.length; i += 2) {
    if (arr[i].includes(needle)) {
      arr[i] = arr[i].split(needle).join(replace);
      changed = true;
    }
  }
  return changed ? arr.join('') : haystack;
}

export function autop(input: string, br = true): string {
  const preTags: Record<string, string> = {};
  if (input.trim() === '') return '';
  let text = input + '\n';
  if (text.includes('<pre')) {
    const parts = text.split('</pre>');
    const last = parts.pop()!;
    text = '';
    let i = 0;
    for (const part of parts) {
      const start = part.indexOf('<pre');
      if (start === -1) { text += part; continue; }
      const name = `<pre c-pre-tag-${i}></pre>`;
      preTags[name] = part.slice(start) + '</pre>';
      text += part.slice(0, start) + name;
      i++;
    }
    text += last;
  }
  text = text.replace(/<br\s*\/?>\s*<br\s*\/?>/g, '\n\n');
  text = text.replace(new RegExp(`(<${ALLBLOCKS}[\\s/>])`, 'g'), '\n\n$1');
  text = text.replace(new RegExp(`(</${ALLBLOCKS}>)`, 'g'), '$1\n\n');
  text = text.replace(/(<hr\s*?\/?>)/g, '$1\n\n');
  text = text.replace(/\r\n|\r/g, '\n');
  text = replaceInHtmlTags(text, '\n', ' <!-- wpnl --> ');
  if (text.includes('<option')) {
    text = text.replace(/\s*<option/g, '<option').replace(/<\/option>\s*/g, '</option>');
  }
  if (text.includes('</object>')) {
    text = text.replace(/(<object[^>]*>)\s*/g, '$1').replace(/\s*<\/object>/g, '</object>').replace(/\s*(<\/?(?:param|embed)[^>]*>)\s*/g, '$1');
  }
  if (text.includes('<source') || text.includes('<track')) {
    text = text.replace(/([<[](?:audio|video)[^>\]]*[>\]])\s*/g, '$1').replace(/\s*([<[]\/(?:audio|video)[>\]])/g, '$1').replace(/\s*(<(?:source|track)[^>]*>)\s*/g, '$1');
  }
  if (text.includes('<figcaption')) {
    text = text.replace(/\s*(<figcaption[^>]*>)/g, '$1').replace(/<\/figcaption>\s*/g, '</figcaption>');
  }
  text = text.replace(/\n\n+/g, '\n\n');
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p !== '');
  text = '';
  for (const p of paragraphs) text += `<p>${p.replace(/^\n+|\n+$/g, '')}</p>\n`;
  text = text.replace(/<p>\s*<\/p>/g, '');
  text = text.replace(/<p>([^<]+)<\/(div|address|form)>/g, '<p>$1</p></$2>');
  text = text.replace(new RegExp(`<p>\\s*(</?${ALLBLOCKS}[^>]*>)\\s*</p>`, 'g'), '$1');
  text = text.replace(/<p>(<li.+?)<\/p>/g, '$1');
  text = text.replace(/<p><blockquote([^>]*)>/gi, '<blockquote$1><p>');
  text = text.split('</blockquote></p>').join('</p></blockquote>');
  text = text.replace(new RegExp(`<p>\\s*(</?${ALLBLOCKS}[^>]*>)`, 'g'), '$1');
  text = text.replace(new RegExp(`(</?${ALLBLOCKS}[^>]*>)\\s*</p>`, 'g'), '$1');
  if (br) {
    text = text.replace(/<(script|style|svg|math)[\s\S]*?<\/\1>/g, (m) => m.split('\n').join('<WPPreserveNewline />'));
    text = text.split('<br>').join('<br />').split('<br/>').join('<br />');
    text = text.replace(/(?<!<br \/>)\s*\n/g, '<br />\n');
    text = text.split('<WPPreserveNewline />').join('\n');
  }
  text = text.replace(new RegExp(`(</?${ALLBLOCKS}[^>]*>)\\s*<br />`, 'g'), '$1');
  text = text.replace(/<br \/>(\s*<\/?(?:p|li|div|dl|dd|dt|th|pre|td|ul|ol)[^>]*>)/g, '$1');
  text = text.replace(/\n<\/p>$/, '</p>');
  for (const [k, v] of Object.entries(preTags)) text = text.split(k).join(v);
  if (text.includes('<!-- wpnl -->')) text = text.split(' <!-- wpnl --> ').join('\n').split('<!-- wpnl -->').join('\n');
  return text;
}
