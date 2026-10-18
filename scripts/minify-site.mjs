import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import CleanCSS from 'clean-css';
import { minify as minifyHtml } from 'html-minifier-terser';
import { minify as minifyJavaScript } from 'terser';

const outputDirectory = resolve('_site');
const htmlOptions = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: {
    compress: false,
    mangle: false,
  },
};
const cleanCss = new CleanCSS({ level: 1 });
const counts = { html: 0, css: 0, js: 0 };

async function minifyFile(filePath) {
  const source = await readFile(filePath, 'utf8');
  const extension = extname(filePath).toLowerCase();
  let output;

  if (extension === '.html') {
    output = await minifyHtml(source, htmlOptions);
    counts.html += 1;
  } else if (extension === '.css') {
    const result = cleanCss.minify(source);
    if (result.errors.length > 0) {
      throw new Error(`CSS minification failed for ${filePath}: ${result.errors.join('; ')}`);
    }
    output = result.styles;
    counts.css += 1;
  } else {
    const result = await minifyJavaScript(source);
    if (result.error) {
      throw new Error(`JavaScript minification failed for ${filePath}: ${result.error.message}`);
    }
    output = result.code;
    counts.js += 1;
  }

  await writeFile(filePath, output, 'utf8');
}

async function processDirectory(directory) {
  for (const entry of await readdir(directory)) {
    const filePath = join(directory, entry);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      await processDirectory(filePath);
    } else if (['.html', '.css', '.js'].includes(extname(filePath).toLowerCase())) {
      await minifyFile(filePath);
    }
  }
}

await processDirectory(outputDirectory);
console.log(`Minified ${counts.html} HTML, ${counts.css} CSS, and ${counts.js} JavaScript files.`);
