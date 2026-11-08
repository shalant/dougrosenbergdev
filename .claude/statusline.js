// Orange repo label so this repo's Claude session is easy to tell apart from others.
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let model = '';
  try { model = JSON.parse(input).model?.display_name ?? ''; } catch {}
  const orange = '\x1b[38;5;208m';
  const reset = '\x1b[0m';
  console.log(`${orange}■ dougrosenbergdev${reset}${model ? ' ' + model : ''}`);
});
