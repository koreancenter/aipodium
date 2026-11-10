import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { AIThinkingIndicator } from '../src/components/chat/AIThinkingIndicator';
import { AIThinkingExample } from '../src/components/chat/AIThinkingExample';

test('1. AIThinkingIndicator and AIThinkingExample are exported properly from chat module', () => {
  assert.equal(typeof AIThinkingIndicator, 'function', 'AIThinkingIndicator must be a React functional component');
  assert.equal(typeof AIThinkingExample, 'function', 'AIThinkingExample must be a React functional component');
});

test('2. Anti-Slop / Icon Restraint: No robot, star, sparkle, or blinking cursor icons in AIThinkingIndicator', () => {
  const componentSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/chat/AIThinkingIndicator.tsx'),
    'utf-8'
  );

  // Assert NO decorative icons are imported or rendered as elements
  assert.equal(
    /import\s*\{[^}]*\b(Bot|Sparkle|Sparkles|Star|Stars|Wand|Cpu|Terminal|RotateCw)\b[^}]*\}\s*from\s*['"]lucide-react['"]/.test(componentSource),
    false,
    'Must not import decorative bot, sparkle, or star icons from lucide-react'
  );
  assert.equal(
    /<(Bot|Sparkle|Sparkles|Star|Stars|Wand|Cpu|Terminal|RotateCw)\b/.test(componentSource),
    false,
    'Must not render decorative bot, sparkle, or star elements'
  );
  assert.equal(/blinking-cursor|cursor-bar|animate-blink/.test(componentSource), false, 'Must not use blinking cursor bar');

  // Assert only ChevronRight is imported from lucide-react
  assert.match(componentSource, /import\s*\{\s*ChevronRight\s*\}\s*from\s*['"]lucide-react['"]/);

  // Assert Chevron arrow is 14px max (size={14})
  assert.match(componentSource, /size=\{14\}/, 'Chevron icon must be constrained to 14px max');
});

test('3. Visual states and typography specifications match design guidelines', () => {
  const componentSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/chat/AIThinkingIndicator.tsx'),
    'utf-8'
  );

  // Active state shimmer class and label
  assert.match(componentSource, /thinking-shimmer-text/, 'Must apply thinking-shimmer-text class for active shimmer');
  assert.match(componentSource, /Thinking\.\.\./, 'Must display Thinking... label in active state');

  // Completed state neutral status text and text-zinc-400
  assert.match(componentSource, /text-zinc-400/, 'Must use text-zinc-400 for neutral status typography');
  assert.match(componentSource, /Reasoning complete/, 'Must support Reasoning complete fallback');
  assert.match(componentSource, /Thought for \$\{durationSeconds\} second/, 'Must format duration seconds');

  // Expanded reasoning content design specs
  assert.match(componentSource, /border-l border-zinc-800/, 'Must use thin left border border-l border-zinc-800');
  assert.match(componentSource, /text-\[0\.8125rem\]/, 'Must use precise font size text-[0.8125rem]');
  assert.match(componentSource, /leading-relaxed/, 'Must use leading-relaxed line height');
  assert.match(componentSource, /text-zinc-500/, 'Must use text-zinc-500 for reasoning content');
});

test('4. CSS Keyframes and smooth shimmer rules defined in index.css with accessibility', () => {
  const cssSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/index.css'),
    'utf-8'
  );

  // Verify @keyframes thinkingShimmer
  assert.match(cssSource, /@keyframes\s+thinkingShimmer/, 'Must define @keyframes thinkingShimmer in CSS');

  // Verify .thinking-shimmer-text with background gradient passing over text-zinc-400
  assert.match(cssSource, /\.thinking-shimmer-text\s*\{/, 'Must define .thinking-shimmer-text class');
  assert.match(cssSource, /-webkit-background-clip:\s*text;/, 'Must clip background to text');
  assert.match(cssSource, /color:\s*transparent;/, 'Must make text fill transparent for gradient reveal');

  // Verify prefers-reduced-motion compliance
  assert.match(cssSource, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/, 'Must provide prefers-reduced-motion fallback');
});

test('5. AIThinkingExample demonstrates chat message integration', () => {
  const exampleSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/chat/AIThinkingExample.tsx'),
    'utf-8'
  );

  assert.match(exampleSource, /<AIThinkingIndicator/, 'Example must render AIThinkingIndicator');
  assert.match(exampleSource, /isThinking=\{!!msg\.isThinking\}/, 'Example must bind isThinking');
  assert.match(exampleSource, /thinkingContent=\{msg\.thinkingContent\}/, 'Example must bind thinkingContent');
  assert.match(exampleSource, /durationSeconds=\{msg\.durationSeconds\}/, 'Example must bind durationSeconds');
});
