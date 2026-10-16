import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitMarkdownIntoBlocks,
  estimateBlockHeight,
  renderCachedBlockHtml,
  clearBlockHtmlCache
} from '../src/utils/markdownBlockParser.js';
import { renderMarkdownToHtml } from '../src/utils/markdownParser.js';

test('splitMarkdownIntoBlocks correctly decomposes diverse markdown document structures', () => {
  const markdown = `# Main Title

Introductory paragraph with **bold** and *italic* formatting.
Second line of the introductory paragraph.

## Section 1: Code and Tables

\`\`\`typescript
interface User {
  id: string;
  name: string;
}
\`\`\`

| Metric | Target | Actual |
| :--- | :---: | ---: |
| Speed | 60fps | 60fps |
| Memory | < 50MB | 12MB |

> Blockquote line 1
> Blockquote line 2

- List item 1
- List item 2
  - Nested sub-item

$$
E = mc^2
$$

---

Final closing paragraph with a [reference link][ref1].

[ref1]: https://example.com/reference "Example Reference"
[^1]: First footnote note
`;

  const { blocks, referenceDefs, totalLines } = splitMarkdownIntoBlocks(markdown);

  assert.ok(blocks.length >= 8, `Expected at least 8 blocks, got ${blocks.length}`);
  assert.ok(totalLines > 25, `Expected total lines > 25, got ${totalLines}`);
  assert.ok(referenceDefs.includes('https://example.com/reference'));

  const types = blocks.map((b) => b.type);
  assert.ok(types.includes('heading'), 'Should detect headings');
  assert.ok(types.includes('paragraph'), 'Should detect paragraphs');
  assert.ok(types.includes('code'), 'Should detect code block');
  assert.ok(types.includes('table'), 'Should detect table');
  assert.ok(types.includes('quote'), 'Should detect quote');
  assert.ok(types.includes('list'), 'Should detect list');
  assert.ok(types.includes('math'), 'Should detect math');
  assert.ok(types.includes('hr'), 'Should detect horizontal rule');
  assert.ok(types.includes('footnotes'), 'Should detect footnotes block');
});

test('handles unclosed code and math fences gracefully without crashing', () => {
  const unclosedCode = '```javascript\nconst a = 10;\nconst b = 20;';
  const resCode = splitMarkdownIntoBlocks(unclosedCode);
  assert.equal(resCode.blocks.length, 1);
  assert.equal(resCode.blocks[0].type, 'code');
  assert.equal(resCode.blocks[0].startLine, 1);

  const unclosedMath = '$$\n\\sum_{i=1}^n i';
  const resMath = splitMarkdownIntoBlocks(unclosedMath);
  assert.equal(resMath.blocks.length, 1);
  assert.equal(resMath.blocks[0].type, 'math');
});

test('estimates realistic heights based on block type and line count', () => {
  const h1Height = estimateBlockHeight('heading', ['# Title']);
  const h3Height = estimateBlockHeight('heading', ['### Subtitle']);
  assert.ok(h1Height > h3Height, 'H1 should estimate taller than H3');

  const codeLines = ['```', 'line 1', 'line 2', 'line 3', '```'];
  const codeHeight = estimateBlockHeight('code', codeLines);
  assert.ok(codeHeight >= 120, 'Code block height should account for header and code lines');

  const tableLines = ['| A | B |', '|---|---|', '| 1 | 2 |', '| 3 | 4 |'];
  const tableHeight = estimateBlockHeight('table', tableLines);
  assert.ok(tableHeight >= 140, 'Table block height should account for header and rows');

  const hrHeight = estimateBlockHeight('hr', ['---']);
  assert.equal(hrHeight, 24);
});

test('renderCachedBlockHtml caches HTML and resolves global reference links', () => {
  clearBlockHtmlCache();

  const rawBlock = 'Paragraph referencing [link][ref1].';
  const referenceDefs = '[ref1]: https://example.com/target "Target Title"';

  const t0 = performance.now();
  const html1 = renderCachedBlockHtml(rawBlock, renderMarkdownToHtml, referenceDefs);
  const t1 = performance.now();

  assert.ok(html1.includes('href="https://example.com/target"'));
  assert.ok(html1.includes('title="Target Title"'));

  // Second call must return identical cached HTML instantly
  const t2 = performance.now();
  const html2 = renderCachedBlockHtml(rawBlock, renderMarkdownToHtml, referenceDefs);
  const t3 = performance.now();

  assert.equal(html1, html2);
  assert.ok(t3 - t2 <= t1 - t0, 'Cached lookup should be as fast or faster than initial render');
});

test('simulates virtual windowing calculations with binary search on 1,000 blocks', () => {
  // Generate 1,000 blocks
  const blockCount = 1000;
  const heights = new Float32Array(blockCount);
  for (let i = 0; i < blockCount; i++) {
    heights[i] = 40 + (i % 5) * 15; // Varying heights between 40px and 100px
  }

  // Prefix sums positions array
  const positions = new Float32Array(blockCount + 1);
  positions[0] = 0;
  for (let i = 0; i < blockCount; i++) {
    positions[i + 1] = positions[i] + heights[i];
  }

  const totalHeight = positions[blockCount];
  assert.ok(totalHeight > 50000, 'Total height should be > 50,000px');

  // Binary search function
  function findBlockIndexAtOffset(offset: number): number {
    let low = 0;
    let high = blockCount - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (positions[mid + 1] <= offset) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return Math.max(0, Math.min(blockCount - 1, low));
  }

  // Scroll to middle (e.g. scrollTop = 30,000, viewportHeight = 800)
  const scrollTop = 30000;
  const viewportHeight = 800;
  const overscan = 6;

  const firstVisible = findBlockIndexAtOffset(scrollTop);
  const lastVisible = findBlockIndexAtOffset(scrollTop + viewportHeight);

  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(blockCount - 1, lastVisible + overscan);

  const topSpacer = positions[start];
  const bottomSpacer = Math.max(0, totalHeight - positions[end + 1]);

  let renderedBlocksHeight = 0;
  for (let i = start; i <= end; i++) {
    renderedBlocksHeight += heights[i];
  }

  // Mathematical invariant: topSpacer + renderedBlocksHeight + bottomSpacer === totalHeight
  const sumHeight = topSpacer + renderedBlocksHeight + bottomSpacer;
  assert.equal(Math.round(sumHeight), Math.round(totalHeight), 'Total virtual scroll height must match sum');

  // Verify that only a small fraction of blocks are rendered in DOM
  const renderedCount = end - start + 1;
  assert.ok(
    renderedCount >= 10 && renderedCount <= 35,
    `Rendered count (${renderedCount}) should be a tiny window out of 1000 blocks`
  );
});

test('benchmarks 10,000-line markdown document processing speed', () => {
  // Generate a large 10,000-line markdown document
  const sections: string[] = [];
  for (let i = 0; i < 550; i++) {
    sections.push(`## Section ${i}

Paragraph ${i} line 1 with text and inline \`code\`.
Paragraph ${i} line 2 with **bold** text and list below.

- Task 1 for section ${i}
- Task 2 for section ${i}
- [x] Done item ${i}

| Key | Val |
|---|---|
| A_${i} | ${i * 10} |

\`\`\`javascript
function compute_${i}() {
  return ${i};
}
\`\`\`
`);
  }

  const largeDoc = sections.join('\n\n');
  const lineCount = largeDoc.split('\n').length;
  assert.ok(lineCount >= 9000, `Line count should be ~10,000 lines, got ${lineCount}`);

  const startTime = performance.now();
  const { blocks, totalLines } = splitMarkdownIntoBlocks(largeDoc);
  const duration = performance.now() - startTime;

  assert.ok(blocks.length > 1000, `Should parse over 1,000 blocks, got ${blocks.length}`);
  assert.equal(totalLines, lineCount);
  assert.ok(duration < 250, `10,000 lines should be split in < 250ms, took ${duration.toFixed(2)}ms`);
});
