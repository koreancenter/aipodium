const fs = require('fs');

let code = fs.readFileSync('src/components/CommandPalette.tsx', 'utf-8');

// Replace the section from `{/* Quick Action Chips Section */}` down to just before `{/* Footer info bar */}`

const startMarker = '{/* Quick Action Chips Section */}';
const endMarker = '{/* Footer info bar */}';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error("Markers not found");
    process.exit(1);
}

const newSection = `{/* Quick Action Chips Section */}
        <div className="p-2 bg-slate-950/40 flex flex-col">
          {/* TEMPLATES */}
          <div className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-2 px-3">
            TEMPLATES
          </div>
          <div className="flex flex-col gap-0.5">
            {DOC_TEMPLATES.map((tmpl) => {
              // Note: using Icon directly might fail if it's string. Let's fix icon rendering if it's a string, or component.
              // We'll import all necessary icons in CommandPalette.tsx if we didn't already. But wait, DOC_TEMPLATES has icon as string right now due to earlier patch?
              // Wait, the previous patch set iconName in DOC_TEMPLATES and then icon: 'Cpu' etc. That might be a variable reference to the imported icon component.
              const Icon = tmpl.icon;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  disabled={isExecuting}
                  onClick={() => handleExecute('vibe-' + tmpl.id, tmpl.defaultPrompt)}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-800/80 transition-colors group disabled:opacity-50 text-slate-300 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" />
                    <span className="text-[0.8125rem] font-medium">
                      {tmpl.name}
                    </span>
                  </div>
                  <span className="text-[0.625rem] text-slate-500 font-mono group-hover:text-slate-400 transition-colors">
                    {tmpl.tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* QUICK ACTIONS */}
          <div className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-4 px-3">
            QUICK ACTIONS
          </div>
          <div className="flex flex-col gap-0.5">
            {QUICK_CHIPS.map((chip, idx) => {
              const Icon = chip.icon;
              return (
                <button
                  key={chip.id}
                  type="button"
                  disabled={isExecuting}
                  onClick={() => handleExecute(chip.id, chip.defaultPrompt)}
                  className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-800/80 transition-colors group disabled:opacity-50 text-slate-300 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" />
                    <span className="text-[0.8125rem] font-medium">
                      {chip.enLabel}
                    </span>
                  </div>
                  <span className="text-[0.625rem] text-slate-500 font-mono group-hover:text-slate-400 transition-colors uppercase">
                    {chip.id}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Recent Commands / Suggestions */}
          {recentCommands.length > 0 && (
            <div className="mt-4">
              <div className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-wider mb-1 px-3">
                RECENT PROMPTS
              </div>
              <div className="flex flex-col gap-0.5">
                {recentCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isExecuting}
                    onClick={() => {
                      setPrompt(cmd);
                      inputRef.current?.focus();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-800/80 transition-colors group disabled:opacity-50 text-slate-300 hover:text-white text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Clock className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors" />
                      <span className="text-[0.8125rem] font-medium truncate">
                        {cmd}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        `;

code = code.substring(0, startIndex) + newSection + code.substring(endIndex);

fs.writeFileSync('src/components/CommandPalette.tsx', code);
