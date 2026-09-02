const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Imports
code = code.replace(
  `import { VibeCanvasConfig, DOC_TEMPLATES } from './components/CommandPalette';`,
  `import { VibeCanvasConfig, DOC_TEMPLATES } from './components/CommandPalette';\nimport { SSOTGeneratorModal } from './components/SSOTGeneratorModal';`
);

// 2. States
const stateCode = `
  // SSOT Generator Modal State
  const [isSSOTGeneratorModalOpen, setIsSSOTGeneratorModalOpen] = useState(false);
  const [ssotGeneratorInitialFolder, setSsotGeneratorInitialFolder] = useState<string>('');
  const [ssotGeneratorInitialTemplate, setSsotGeneratorInitialTemplate] = useState<string>('master_ssot');

  const handleOpenSSOTGeneratorModal = (folder = '', template = 'master_ssot') => {
    setSsotGeneratorInitialFolder(folder);
    setSsotGeneratorInitialTemplate(template);
    setIsSSOTGeneratorModalOpen(true);
  };
`;
code = code.replace(
  `// Vibe Canvas (SSOT Word Processor) State`,
  stateCode + `\n  // Vibe Canvas (SSOT Word Processor) State`
);

// 3. Update handleExecuteCommandPaletteAction
code = code.replace(
  `    if (actionType.startsWith('vibe-')) {
      const templateId = actionType.replace('vibe-', '');
      const config: VibeCanvasConfig = {
        selectedFolder: activeSession?.title || 'docs',
        selectedFiles: currentActiveFile ? [currentActiveFile] : [],
        templateFormat: templateId,
        designTone: 'professional',
        docTitle: 'project_SSOT.md'
      };
      await handleStartVibeCanvas(config);
      return;
    }`,
  `    if (actionType.startsWith('vibe-')) {
      const templateId = actionType.replace('vibe-', '');
      handleOpenSSOTGeneratorModal(activeSession?.title || 'docs', templateId);
      return;
    }`
);

// Also for 'word'
code = code.replace(
  `    } else if (actionType === 'word') {
      const config: VibeCanvasConfig = {
        selectedFolder: activeSession?.title || 'docs',
        selectedFiles: currentActiveFile ? [currentActiveFile] : [],
        templateFormat: 'master_ssot',
        designTone: 'professional',
        docTitle: 'project_SSOT.md'
      };
      handleStartVibeCanvas(config);
    }`,
  `    } else if (actionType === 'word') {
      handleOpenSSOTGeneratorModal(activeSession?.title || 'docs', 'master_ssot');
    }`
);

// 4. Add onContextMenu to Folder
code = code.replace(
  `<div className="flex items-center gap-1.5 flex-1 min-w-0">`,
  `<div 
      className="flex items-center gap-1.5 flex-1 min-w-0"
      onContextMenu={(e) => {
        e.preventDefault();
        handleOpenSSOTGeneratorModal(session.title);
      }}
    >`
);

// 5. Render Modal
const modalRender = `
      <SSOTGeneratorModal
        isOpen={isSSOTGeneratorModalOpen}
        onClose={() => setIsSSOTGeneratorModalOpen(false)}
        initialFolder={ssotGeneratorInitialFolder}
        initialTemplate={ssotGeneratorInitialTemplate}
        availableFolders={sessions.map(s => s.title)}
        filesByFolder={
          sessions.reduce((acc, s) => {
            acc[s.title] = [
              ...s.messages.filter(m => m.metadata?.attachments).flatMap(m => m.metadata!.attachments!.map(a => a.name)),
              ...Object.keys(files).filter(fname => !fname.startsWith('docs/') && !['project_SSOT.md', 'README.md'].includes(fname))
            ];
            return acc;
          }, {} as Record<string, string[]>)
        }
        onGenerate={(config) => {
          setIsSSOTGeneratorModalOpen(false);
          handleStartVibeCanvas(config);
        }}
      />
`;

code = code.replace(`    </div>\n  );\n}`, modalRender + `\n    </div>\n  );\n}`);

fs.writeFileSync('src/App.tsx', code);
