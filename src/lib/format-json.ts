export function formatJson(input: string, indentation: string | null): string {
  // Validate syntax, then format tokens so large numbers and duplicate keys survive.
  JSON.parse(input);
  const tokens = input.match(/"(?:[^"\\]|\\[\s\S])*"|[{}\[\],:]|[^\s{}\[\],:"]+/g) ?? [];
  if (indentation === null) return tokens.join('');
  const parts: string[] = [];
  let depth = 0;
  let whitespace = 0;
  const newline = () => {
    whitespace += depth * indentation.length + 1;
    if (whitespace > 2_000_000) throw new Error('Formatted output is too large. Try minifying or use a smaller input.');
    return '\n' + indentation.repeat(depth);
  };
  for (const [index, token] of tokens.entries()) {
    const previous = tokens[index - 1];
    const next = tokens[index + 1];
    if (token === '{' || token === '[') {
      parts.push(token);
      depth++;
      if (next !== '}' && next !== ']') parts.push(newline());
    } else if (token === '}' || token === ']') {
      depth--;
      if (previous !== '{' && previous !== '[') parts.push(newline());
      parts.push(token);
    } else if (token === ',') parts.push(',', newline());
    else if (token === ':') parts.push(': ');
    else parts.push(token);
  }
  return parts.join('');
}
