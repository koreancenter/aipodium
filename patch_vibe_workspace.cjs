const fs = require('fs');

let code = fs.readFileSync('src/components/VibeCanvasWorkspace.tsx', 'utf-8');

// Replace VibePromptModal with InlineContextMenu
code = code.replace(
  `import { VibePromptModal } from './VibePromptModal';`,
  `import { InlineContextMenu } from './InlineContextMenu';`
);

// We still have `isVibeModalOpen` state, we can rename or just use it.
// Let's replace `<VibePromptModal` with `<InlineContextMenu`
// And we also need to change the floating button inside textarea!
// Before, there was a floating badge that when clicked opened VibePromptModal.
// We should remove the badge and directly open InlineContextMenu on text select!

// The badge code:
/*
          {/* Floating Vibe Selection Action Badge *}
          {selectionPosition && selectedText && (
            <div
              style={{ top: \`\${selectionPosition.y}px\`, left: \`\${selectionPosition.x}px\` }}
              className="absolute z-30 animate-fade-in"
            >
              <button
                type="button"
                onClick={() => setIsVibeModalOpen(true)}
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-600 via-indigo-600 to-violet-600 hover:from-amber-500 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xl shadow-indigo-600/50 border border-amber-300/40 active:scale-95 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>선택 영역 바이브로 편집 ({selectedText.length}자)</span>
                <span className="text-[0.625rem] bg-black/40 px-1 rounded font-mono">Alt+V</span>
              </button>
            </div>
          )}
*/

const badgeRegex = /\{\/\* Floating Vibe Selection Action Badge \*\/\}[\s\S]*?<\/div>\n\s*\)\}/;
code = code.replace(badgeRegex, '');

// The VibePromptModal at the end of the file
const modalRegex = /\{\/\* 4\. GLOBAL IN-PLACE VIBE AI PROMPT MODAL \*\/\}[\s\S]*?<\/VibePromptModal>/;
const inlineContextHtml = `{/* 4. INLINE CONTEXT MENU */}
      <InlineContextMenu
        isOpen={isVibeModalOpen}
        position={selectionPosition}
        selectedText={selectedText}
        onClose={() => {
          setIsVibeModalOpen(false);
          setSelectionPosition(null);
        }}
        onAction={(type, result) => {
          handleApplyVibeResult(result);
        }}
      />`;
code = code.replace(modalRegex, inlineContextHtml);

// Now, handleTextareaSelect used to just show the badge, but now it should show the InlineContextMenu directly.
// And it used `setSelectionPosition({ x: 20, y: 40 });` which is hardcoded. 
// Let's modify handleTextareaSelect to give a better position or keep it simple.
code = code.replace(
  `setSelectionPosition({ x: 20, y: 40 });`,
  `setSelectionPosition({ x: 20, y: 40 });\n      setIsVibeModalOpen(true);`
);

// We should also handle the case where selection goes away to close the menu.
// handleMouseUp could be modified, but right now handleTextareaSelect is bound to `onMouseUp` on textarea!
// Let's check handleTextareaSelect binding:
// `<textarea ... onMouseUp={handleTextareaSelect} onKeyUp={handleTextareaSelect}`
// It's already there.

fs.writeFileSync('src/components/VibeCanvasWorkspace.tsx', code);
