// Builds dist/shiftmate.html: the whole prototype in one file that runs in
// any modern browser with no server, no install and no internet.
//   npm run build:static

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');

async function bundle(entry, format) {
  const out = await esbuild.build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    format,
    platform: 'browser',
    target: ['es2020'],
    external: ['@anthropic-ai/sdk'],
    minify: true,
    write: false,
    logLevel: 'warning',
  });
  return out.outputFiles[0].text;
}

function inlineScript(code) {
  return `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`;
}

(async () => {
  const localApi = await bundle('static/local-api.js', 'iife');
  const app = await bundle('public/js/app.js', 'iife');
  const css = fs.readFileSync(path.join(root, 'public/css/app.css'), 'utf8');
  let html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  html = html
    .replace('<link rel="stylesheet" href="/css/app.css">', () => `<style>${css}</style>`)
    .replace('<script type="module" src="/js/app.js"></script>', () => `${inlineScript(localApi)}\n${inlineScript(app)}`);
  if (html.includes('/js/app.js') || html.includes('/css/app.css')) throw new Error('Inlining failed');
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  const file = path.join(root, 'dist', 'shiftmate.html');
  fs.writeFileSync(file, html);
  console.log(`Wrote ${path.relative(root, file)} (${Math.round(html.length / 1024)} KB)`);

  // Hosted (claude.ai Artifact) variant: the host adds the document skeleton.
  const head = /<head>([\s\S]*?)<\/head>/.exec(html)[1]
    .replace(/<meta charset[^>]*>\s*/, '')
    .replace(/<meta name="viewport"[^>]*>\s*/, '');
  const bodyMatch = /<body>([\s\S]*?)<\/body>/.exec(html);
  const fragment = `${head.trim()}\n${bodyMatch[1].trim()}\n`;
  const fragFile = path.join(root, 'dist', 'shiftmate-hosted.html');
  fs.writeFileSync(fragFile, fragment);
  console.log(`Wrote ${path.relative(root, fragFile)} (${Math.round(fragment.length / 1024)} KB)`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
