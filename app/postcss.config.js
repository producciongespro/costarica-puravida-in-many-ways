import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compile } from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tailwindPkgDir = path.join(__dirname, 'node_modules/tailwindcss');

function collectCandidates(dir, out = new Set()) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectCandidates(full, out);
    } else if (/\.(js|jsx|ts|tsx|html)$/.test(entry.name)) {
      const content = fs.readFileSync(full, 'utf8');
      const tokens = content.split(/[\s'"`{}()[\];,<>+=|&?!]+/);
      for (const t of tokens) {
        if (t && t.length > 1 && t.length < 80) {
          out.add(t);
        }
      }
    }
  }
  return out;
}

const tailwindV4InlinePostcssPlugin = () => ({
  postcssPlugin: 'tailwindcss-v4-inline',
  async Once(root, { result, parse }) {
    const cssInput = root.toString();
    if (!cssInput.includes('tailwindcss')) return;

    const compiler = await compile(cssInput, {
      base: __dirname,
      loadStylesheet: async (id, base) => {
        if (id === 'tailwindcss' || id === 'tailwindcss/index.css') {
          const p = path.join(tailwindPkgDir, 'index.css');
          return { path: p, base: tailwindPkgDir, content: fs.readFileSync(p, 'utf8') };
        }
        const resolved = path.resolve(base, id);
        return { path: resolved, base: path.dirname(resolved), content: fs.readFileSync(resolved, 'utf8') };
      }
    });

    const candidates = collectCandidates(path.join(__dirname, 'src'));
    const indexHtml = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexHtml)) {
      const htmlTokens = fs.readFileSync(indexHtml, 'utf8').split(/[\s'"`{}()[\];,<>+=|&?!]+/);
      htmlTokens.forEach((t) => {
        if (t) candidates.add(t);
      });
    }

    const builtCss = compiler.build(Array.from(candidates));
    const newRoot = parse(builtCss, { from: result.opts.from });
    root.removeAll();
    root.append(newRoot.nodes);
  }
});
tailwindV4InlinePostcssPlugin.postcss = true;

export default {
  plugins: [tailwindV4InlinePostcssPlugin(), autoprefixer()]
};
