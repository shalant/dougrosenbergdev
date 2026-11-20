// Orange repo label so this repo's Claude session is easy to tell apart from others. Shows the git branch after the label.
const { execFileSync } = process.getBuiltinModule('node:child_process'); // works whether the repo is ESM or CJS
let input = '';
process.stdin.on('data', (c) => (input += c));
process.stdin.on('end', () => {
  let model = '';
  let dir = process.cwd();
  try {
    const j = JSON.parse(input);
    model = j.model?.display_name ?? '';
    dir = j.workspace?.current_dir ?? j.cwd ?? dir;
  } catch {}
  let branch = '';
  try {
    branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 1000 }).trim();
  } catch {}
  const color = '\x1b[38;2;255;165;70m';
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  console.log(`${color}■ dougrosenbergdev${reset}${branch ? ' ' + dim + '(' + branch + ')' + reset : ''}${model ? ' ' + model : ''}`);
});
