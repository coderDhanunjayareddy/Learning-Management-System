export type PackWorkspaceTab = 'overview' | 'builder' | 'review';

const TABS: Array<{ id: PackWorkspaceTab; label: string; description: string }> = [
  { id: 'overview', label: 'Overview', description: 'Health and quick actions' },
  { id: 'builder', label: 'Builder', description: 'Browse courses and add items' },
  { id: 'review', label: 'Review', description: 'Inspect attached items and summary' },
];

interface PackWorkspaceTabsProps {
  activeTab: PackWorkspaceTab;
  onChange: (tab: PackWorkspaceTab) => void;
}

export default function PackWorkspaceTabs({ activeTab, onChange }: PackWorkspaceTabsProps) {
  return (
    <div className="border-b border-slate-200">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative pb-4 text-left transition ${
                isActive ? 'text-slate-950' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="text-sm font-semibold tracking-tight">{tab.label}</div>
              <div className={`mt-1 text-xs transition ${isActive ? 'text-slate-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                {tab.description}
              </div>
              <span
                className={`absolute bottom-0 left-0 h-0.5 rounded-full bg-slate-950 transition-all ${
                  isActive ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-30'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
