const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Remove CommandPalette imports, make sure SSOTGeneratorModal is imported with VibeCanvasConfig and DOC_TEMPLATES
content = content.replace(
  /import\s*\{\s*CommandPalette\s*\}\s*from\s*['"]\.\/components\/CommandPalette['"];?\r?\n?/g,
  ''
);

content = content.replace(
  /import\s*\{\s*VibeCanvasConfig,\s*DOC_TEMPLATES\s*\}\s*from\s*['"]\.\/components\/CommandPalette['"];?\r?\n?/g,
  ''
);

content = content.replace(
  /import\s*\{\s*SSOTGeneratorModal\s*\}\s*from\s*['"]\.\/components\/SSOTGeneratorModal['"];?\r?\n?/g,
  "import { SSOTGeneratorModal, VibeCanvasConfig, DOC_TEMPLATES } from './components/SSOTGeneratorModal';\n"
);

// 2. Remove isCommandPaletteOpen state
content = content.replace(
  /const\s*\[isCommandPaletteOpen,\s*setIsCommandPaletteOpen\]\s*=\s*useState<boolean>\(false\);?\r?\n?/g,
  ''
);

// 3. Update keyboard shortcut for Ctrl+K
content = content.replace(
  /\/\/\s*Global Command Palette \(Ctrl\+K or Cmd\+K\)[\s\S]*?setIsCommandPaletteOpen\(\(prev\)\s*=>\s*!prev\);[\s\S]*?return;\s*\}/g,
  `// SSOT Generator Modal (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        handleOpenSSOTGeneratorModal(activeSession?.title || 'Main Project');
        return;
      }`
);

// 4. Update shortcut dependency array
content = content.replace(
  /setIsCommandPaletteOpen,/g,
  'handleOpenSSOTGeneratorModal,'
);

// 5. Header button: Dedicated SSOT Generator button
const oldHeaderBtnPattern = /<button[\s\S]*?title="Global Command Palette \(Ctrl\+K or Cmd\+K\)"[\s\S]*?<\/button>/;
const newHeaderBtn = `<button
            type="button"
            onClick={() => handleOpenSSOTGeneratorModal(activeSession?.title || 'Main Project')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 hover:border-indigo-400/60 transition text-xs shadow-xs group cursor-pointer"
            title="✨ SSOT 마스터 문서 생성 (Ctrl+K)"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white animate-pulse" />
            <span className="font-semibold text-xs">✨ SSOT 생성</span>
            <kbd className="text-[0.625rem] bg-slate-900/90 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400 group-hover:text-indigo-200 font-mono">
              Ctrl+K
            </kbd>
          </button>`;

if (oldHeaderBtnPattern.test(content)) {
  content = content.replace(oldHeaderBtnPattern, newHeaderBtn);
}

// 6. Add right-click and quick button on folder items in File Explorer
content = content.replace(
  `className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800/80 cursor-pointer text-slate-200 font-semibold group"`,
  `onContextMenu={(e) => {
                      e.preventDefault();
                      handleOpenSSOTGeneratorModal(session.title);
                    }}
                    className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-slate-800/80 cursor-pointer text-slate-200 font-semibold group"`
);

const pencilBtnPattern = `<button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newTitle = prompt(\`'\${session.title}' 프로젝트 및 폴더 이름을 변경합니다:\`, session.title);
                            if (newTitle) handleRenameProject(session.id, newTitle);
                          }}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-amber-300 transition"
                          title="프로젝트 & 폴더 동시 이름 변경"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>`;

const enhancedFolderButtons = `<button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSSOTGeneratorModal(session.title);
                          }}
                          className="p-1 rounded hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-300 transition"
                          title="✨ SSOT 마스터 문서 생성"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-400" />
                        </button>
                        ` + pencilBtnPattern;

if (content.includes(pencilBtnPattern)) {
  content = content.replace(pencilBtnPattern, enhancedFolderButtons);
}

// 7. Remove <CommandPalette ... /> component JSX from App.tsx
const oldPalettePattern = /\{?\/\* Global Command Palette \(Quick Prompt Modal\) \*\/\}\s*<CommandPalette[\s\S]*?\/>/g;
content = content.replace(oldPalettePattern, '');

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx updated successfully');
