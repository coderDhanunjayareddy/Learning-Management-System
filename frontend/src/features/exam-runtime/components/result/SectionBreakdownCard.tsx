import type { SectionBreakdownItem } from "@/features/exam-runtime/components/result/resultUtils";
import { formatPercent } from "@/features/exam-runtime/components/result/resultUtils";

interface SectionBreakdownCardProps {
  sections: SectionBreakdownItem[];
  showScore: boolean;
}

export default function SectionBreakdownCard({ sections, showScore }: SectionBreakdownCardProps) {
  if (!sections.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Section Breakdown</h2>
        <p className="mt-3 text-sm text-slate-600">No section data available.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Section Breakdown</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Section</th>
              <th className="px-3 py-2">Questions</th>
              <th className="px-3 py-2">Attempted</th>
              <th className="px-3 py-2">Unattempted</th>
              {showScore ? <th className="px-3 py-2">Correct</th> : null}
              {showScore ? <th className="px-3 py-2">Wrong</th> : null}
              {showScore ? <th className="px-3 py-2">Marks</th> : null}
              {showScore ? <th className="px-3 py-2">Accuracy</th> : null}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <tr key={section.section_id} className="border-b border-slate-100 text-slate-800">
                <td className="px-3 py-2 font-medium">{section.section_title}</td>
                <td className="px-3 py-2">{section.total_questions}</td>
                <td className="px-3 py-2">{section.attempted}</td>
                <td className="px-3 py-2">{section.unattempted}</td>
                {showScore ? <td className="px-3 py-2">{section.correct ?? "--"}</td> : null}
                {showScore ? <td className="px-3 py-2">{section.wrong ?? "--"}</td> : null}
                {showScore ? (
                  <td className="px-3 py-2">
                    {section.marks_obtained ?? "--"}
                    {section.max_marks !== null ? ` / ${section.max_marks}` : ""}
                  </td>
                ) : null}
                {showScore ? (
                  <td className="px-3 py-2">{formatPercent(section.accuracy_percentage)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
