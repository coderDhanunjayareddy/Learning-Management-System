import type { RuntimeSection } from "@/features/exam-runtime/types";

interface SectionTabsProps {
  sections: RuntimeSection[];
  activeSectionId: number | null;
  onSelect: (sectionId: number) => void;
}

export default function SectionTabs({ sections, activeSectionId, onSelect }: SectionTabsProps) {
  return (
    <div className="border-b border-slate-300 bg-[#f6f6f6]">
      <div className="flex overflow-x-auto">
        {sections.map((section) => {
          const active = section.id === activeSectionId;

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={`inline-flex shrink-0 items-center gap-2 border-r border-slate-300 px-4 py-3 text-sm md:text-base font-semibold uppercase tracking-wide transition-colors ${active
                ? "bg-[#4f86c6] text-white"
                : "bg-[#f1f1f1] text-[#258ed8] hover:bg-[#e7eef5]"
                }`}
            >
              <span>{section.title}</span>
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600"
                  }`}
              >
                i
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}


