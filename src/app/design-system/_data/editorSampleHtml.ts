export const SAMPLE_HTML = [
  // ── Headings ──
  `<h1>Heading 1</h1>`,
  `<h2>Heading 2</h2>`,
  `<h3>Heading 3</h3>`,
  `<p>This is a <strong>live preview</strong> of the Plate editor. Every feature below is fully interactive.</p>`,

  // ── Text formatting ──
  `<h3>Text Formatting</h3>`,
  `<p><strong>Bold</strong>, <em>Italic</em>, <u>Underline</u>, <s>Strikethrough</s>, <code>Inline Code</code>, <mark>Highlight</mark>, <sup>Superscript</sup>, <sub>Subscript</sub>, <kbd>Kbd</kbd></p>`,
  `<p><span style="color: #ef4444">Red text</span>, <span style="color: #3b82f6">Blue text</span>, <span style="color: #22c55e">Green text</span>, <span style="background-color: #fef08a">Yellow BG</span>, <span style="background-color: #dbeafe">Blue BG</span></p>`,
  `<p><span style="font-family: 'JetBrains Mono', monospace">Monospace</span>, <span style="font-size: 20px">Large</span>, <span style="font-size: 12px">Small</span>, <span style="font-weight: 300">Light</span>, <span style="font-weight: 700">Bold weight</span>, <span style="letter-spacing: 3px">W i d e</span></p>`,
  `<p style="text-align: center">Center aligned paragraph</p>`,
  `<p style="text-align: right">Right aligned paragraph</p>`,

  // ── Blockquote ──
  `<h3>Blockquote</h3>`,
  `<blockquote><p>Blockquotes can contain <strong>rich text</strong>, <a href="#">links</a>, and multiple paragraphs.</p><p>— Design System Guide</p></blockquote>`,

  // ── Lists (indent-list model) ──
  `<h3>Lists</h3>`,
  `<ul><li style="list-style-type: disc" data-list-style-type="disc" data-indent="1">Disc list item</li></ul>`,
  `<ul><li style="list-style-type: circle" data-list-style-type="circle" data-indent="1">Circle list item</li></ul>`,
  `<ul><li style="list-style-type: square" data-list-style-type="square" data-indent="1">Square list item</li></ul>`,
  `<ul><li style="list-style-type: '- '" data-list-style-type="'- '" data-indent="1">Dash list item</li></ul>`,
  `<ul><li style="list-style-type: '→ '" data-list-style-type="'→ '" data-indent="1">Arrow list item</li></ul>`,
  `<ul><li style="list-style-type: '★ '" data-list-style-type="'★ '" data-indent="1">Star list item</li></ul>`,
  `<ol><li style="list-style-type: decimal" data-list-style-type="decimal" data-indent="1">Decimal ordered</li></ol>`,
  `<ol><li style="list-style-type: decimal" data-list-style-type="decimal" data-indent="1">Second item</li></ol>`,
  `<ol><li style="list-style-type: lower-alpha" data-list-style-type="lower-alpha" data-indent="1">Lower alpha</li></ol>`,
  `<ol><li style="list-style-type: upper-roman" data-list-style-type="upper-roman" data-indent="1">Upper roman</li></ol>`,
  `<ul data-list-style="todo"><li data-checked="true" style="list-style-type: disc" data-list-style-type="todo" data-indent="1">Completed todo item</li></ul>`,
  `<ul data-list-style="todo"><li data-checked="false" style="list-style-type: disc" data-list-style-type="todo" data-indent="1">Pending todo item</li></ul>`,
  `<ul><li style="list-style-type: disc" data-list-style-type="disc" data-indent="1">Nested list parent</li></ul>`,
  `<ul><li style="list-style-type: circle; margin-left: 24px" data-list-style-type="circle" data-indent="2">Nested child (indent 2)</li></ul>`,

  // ── Code block ──
  `<h3>Code Block</h3>`,
  `<div class="code-block-wrap"><pre><code class="language-typescript">import { useEffect, useState } from "react";

export function Counter({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() =&gt; {
    console.log(\`Count: \${count}\`);
  }, [count]);

  return &lt;button onClick={() =&gt; setCount(c =&gt; c + 1)}&gt;{count}&lt;/button&gt;;
}</code></pre></div>`,

  `<div class="code-block-wrap"><pre><code class="language-css">:root {
  --color-primary: #3b82f6;
  --radius-md: 8px;
}

.card {
  border-radius: var(--radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
}

.card:hover {
  transform: translateY(-2px);
}</code></pre></div>`,

  // ── Table ──
  `<h3>Table</h3>`,
  `<table data-col-sizes="180,200,160"><colgroup><col style="width: 180px" /><col style="width: 200px" /><col style="width: 160px" /></colgroup>`,
  `<tr><th>Feature</th><th>Description</th><th>Status</th></tr>`,
  `<tr><td>Text formatting</td><td>Bold, italic, color, font</td><td><strong>✓</strong> Complete</td></tr>`,
  `<tr><td>Code blocks</td><td>Syntax highlighting + wrap</td><td><strong>✓</strong> Complete</td></tr>`,
  `<tr><td>Math equations</td><td>KaTeX inline &amp; block</td><td><strong>✓</strong> Complete</td></tr>`,
  `<tr><td>Column layout</td><td>2–4 columns, resize, bg, divider</td><td><strong>✓</strong> Complete</td></tr>`,
  `<tr><td>Toggle &amp; Callout</td><td>Collapsible + highlighted blocks</td><td><strong>✓</strong> Complete</td></tr>`,
  `</table>`,

  // ── Math equations ──
  `<h3>Math Equations</h3>`,
  `<p>Inline: <span data-math-inline="true" data-latex="E = mc^2">E = mc^2</span> and <span data-math-inline="true" data-latex="\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}">sum</span> within text.</p>`,
  `<div data-math-block="true" data-latex="\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}">integral</div>`,
  `<div data-math-block="true" data-latex="\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\cdot \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}">matrix</div>`,

  // ── Column layout ──
  `<h3>Column Layout</h3>`,
  `<div data-column-group data-layout="2" style="display:flex;gap:16px;margin:16px 0">`,
  `<div data-column data-width="50%" style="flex:0 0 50%;min-width:0"><p><strong>Left Column</strong></p><p>Columns support all block elements. Resize by dragging the handle between columns.</p></div>`,
  `<div data-column data-width="50%" style="flex:0 0 50%;min-width:0"><p><strong>Right Column</strong></p><p>Use the toolbar to set background color, divider line, and adjust width ratios.</p></div>`,
  `</div>`,
  `<div data-column-group data-layout="3" data-column-bg="#f0f9ff" data-column-divider="#93c5fd" style="display:flex;gap:0;margin:16px 0;background:#f0f9ff;padding:8px;border-radius:6px">`,
  `<div data-column data-width="33%" style="flex:0 0 33%;min-width:0"><p><strong>Col 1</strong></p><p>With background</p></div>`,
  `<div data-column data-width="34%" style="flex:0 0 34%;min-width:0"><p><strong>Col 2</strong></p><p>And divider line</p></div>`,
  `<div data-column data-width="33%" style="flex:0 0 33%;min-width:0"><p><strong>Col 3</strong></p><p>3-column layout</p></div>`,
  `</div>`,

  // ── Toggle ──
  `<h3>Toggle</h3>`,
  `<div data-toggle data-open><h3>Expanded toggle with heading title</h3><p>Toggle content supports all block types: text, lists, code, math, and more.</p><ul><li style="list-style-type: disc" data-list-style-type="disc" data-indent="1">List inside toggle</li></ul><ul><li style="list-style-type: disc" data-list-style-type="disc" data-indent="1">Another item</li></ul></div>`,
  `<div data-toggle><p>Collapsed toggle (click to open)</p><p>Hidden content revealed on click. Great for FAQs or optional details.</p></div>`,

  // ── Callout ──
  `<h3>Callout</h3>`,
  `<div data-callout data-callout-bg="var(--bg-tertiary)" data-callout-icon="💡"><p>Tip: Callouts highlight important information with customizable icon and background.</p></div>`,
  `<div data-callout data-callout-bg="#fee2e2" data-callout-icon="⚠️"><p>Warning: This action cannot be undone.</p></div>`,
  `<div data-callout data-callout-bg="#dcfce7" data-callout-icon="✅"><p>Success: All changes have been saved.</p></div>`,
  `<div data-callout data-callout-bg="#dbeafe" data-callout-icon="ℹ️"><p>Info: Callouts support rich text, <strong>bold</strong>, <code>code</code>, and <a href="#">links</a>.</p></div>`,

  // ── Horizontal rule ──
  `<hr />`,

  // ── File & Audio embed ──
  `<h3>File &amp; Audio Embed</h3>`,
  `<div data-file-embed data-url="/docs/resume.pdf" data-filename="resume.pdf" data-filesize="0"></div>`,
  `<div data-audio-embed data-url="/sounds/Louie Zong - Ghost Duet.mp3" data-title="Louie Zong — Ghost Duet" style="max-width:480px;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;margin:8px 0"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:16px">🎵</span><span style="font-size:13px;font-weight:500">Louie Zong — Ghost Duet</span></div><audio controls preload="none" src="/sounds/Louie Zong - Ghost Duet.mp3" style="width:100%"></audio></div>`,

  // ── Links & Embed ──
  `<h3>Link &amp; Embed</h3>`,
  `<p>Links: <a href="https://nextjs.org">Next.js</a>, <a href="https://react.dev">React</a>, <a href="https://typescriptlang.org" target="_blank">TypeScript (new tab)</a></p>`,
  `<iframe src="https://www.youtube.com/embed/_CzSCWpF7TM" data-original-url="https://youtu.be/_CzSCWpF7TM" width="100%" height="400" frameborder="0" loading="lazy" allowfullscreen></iframe>`,

  // ── Image ──
  `<h3>Image</h3>`,
  `<figure style="display:flex;flex-direction:column;align-items:center;margin:1em 0"><img src="/images/profile_pic.webp" alt="Profile" style="width:240px;max-width:100%" data-width="240" data-caption="Profile picture" /><figcaption style="font-size:12px;color:#6b7280;margin-top:6px">Profile picture</figcaption></figure>`,
].join("");
