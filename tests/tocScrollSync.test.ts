import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTocItems, TocItem } from '../src/utils/tocHelper';

test('1. parseTocItems extracts hierarchical headings H1-H6 in real-time', () => {
  const markdown = `# 대제목 1
소개 본문입니다.

## 중제목 2.1
세부 내용입니다.

### 소제목 2.1.1
더 작은 하위 항목입니다.

#### 상세 4단계
##### 상세 5단계
###### 상세 6단계
`;

  const items = parseTocItems(markdown);
  assert.equal(items.length, 6);
  assert.equal(items[0].text, '대제목 1');
  assert.equal(items[0].level, 1);
  assert.equal(items[0].lineIndex, 0);

  assert.equal(items[1].text, '중제목 2.1');
  assert.equal(items[1].level, 2);
  assert.equal(items[1].lineIndex, 3);

  assert.equal(items[2].text, '소제목 2.1.1');
  assert.equal(items[2].level, 3);
  assert.equal(items[2].lineIndex, 6);

  assert.equal(items[3].level, 4);
  assert.equal(items[4].level, 5);
  assert.equal(items[5].level, 6);
});

test('2. parseTocItems safely ignores lines inside code blocks', () => {
  const markdown = `# 시작 제목

\`\`\`python
# This is a python comment, not a markdown heading
def hello():
    # Another comment
    return "world"
\`\`\`

## 정상 다음 제목
본문 내용
`;

  const items = parseTocItems(markdown);
  assert.equal(items.length, 2);
  assert.equal(items[0].text, '시작 제목');
  assert.equal(items[0].level, 1);
  assert.equal(items[1].text, '정상 다음 제목');
  assert.equal(items[1].level, 2);
});

test('3. parseTocItems cleanly strips inline markdown formatting from heading titles', () => {
  const markdown = `# **굵은 제목** 및 *기울임*
## [링크 제목](https://example.com)
### \`인라인 코드\` 제목
`;

  const items = parseTocItems(markdown);
  assert.equal(items.length, 3);
  assert.equal(items[0].text, '굵은 제목 및 기울임');
  assert.equal(items[1].text, '링크 제목');
  assert.equal(items[2].text, '인라인 코드 제목');
});

test('4. scroll position calculation maps accurately to active TOC item', () => {
  const markdown = `# 서론
줄 1
줄 2
줄 3
## 본론 1
줄 5
줄 6
줄 7
## 본론 2
줄 9
줄 10
# 결론
줄 12
`;

  const items = parseTocItems(markdown);
  assert.equal(items.length, 4);

  // Helper simulating the scroll sync logic
  const findActiveToc = (currentLine: number, toc: TocItem[]): number => {
    let active = 0;
    for (let i = 0; i < toc.length; i++) {
      if (toc[i].lineIndex <= currentLine) {
        active = i;
      } else {
        break;
      }
    }
    return active;
  };

  // Line 0 (top): active is '서론' (idx 0)
  assert.equal(findActiveToc(0, items), 0);
  // Line 2 (still in '서론'): active is '서론' (idx 0)
  assert.equal(findActiveToc(2, items), 0);
  // Line 4 (at '본론 1'): active is '본론 1' (idx 1)
  assert.equal(findActiveToc(4, items), 1);
  // Line 6 (inside '본론 1'): active is '본론 1' (idx 1)
  assert.equal(findActiveToc(6, items), 1);
  // Line 8 (at '본론 2'): active is '본론 2' (idx 2)
  assert.equal(findActiveToc(8, items), 2);
  // Line 11 (at '결론'): active is '결론' (idx 3)
  assert.equal(findActiveToc(11, items), 3);
});
