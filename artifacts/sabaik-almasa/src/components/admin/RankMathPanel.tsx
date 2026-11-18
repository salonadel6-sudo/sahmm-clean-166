import { analyzeRankMathSeo, type RankMathInput, type RankMathStatus } from "@workspace/seo-rank-math"
import { AlertCircle, CheckCircle2, CircleHelp, Info } from "lucide-react"

const statusStyles: Record<RankMathStatus, string> = {
  pass: "text-emerald-700",
  warning: "text-amber-700",
  fail: "text-red-700",
  unknown: "text-slate-500",
}

export function getRankMathStatusClass(status: RankMathStatus): string {
  return statusStyles[status]
}

function StatusIcon({ status }: { status: RankMathStatus }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  if (status === "warning") return <Info className="h-4 w-4 text-amber-600" />
  if (status === "fail") return <AlertCircle className="h-4 w-4 text-red-600" />
  return <CircleHelp className="h-4 w-4 text-slate-400" />
}

export function RankMathPanel({ input, className = "" }: { input: RankMathInput; className?: string }) {
  const analysis = analyzeRankMathSeo(input)
  const scoreTone = analysis.publishable ? "text-emerald-700" : "text-red-700"

  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`} aria-label="تحليل Rank Math الداخلي">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">تحليل Rank Math الداخلي</h3>
          <p className="mt-1 text-xs text-slate-600">
            بوابة داخلية موحدة بمعايير المشروع؛ ليست إضافة Rank Math الرسمية لـWordPress. الدرجة تقيس اجتياز الفحوص فقط ولا تضمن ترتيب Google.
          </p>
        </div>
        <div className="text-left">
          <div className={`text-2xl font-bold tabular-nums ${scoreTone}`}>{analysis.score}<span className="text-sm">/100</span></div>
          <div className={`text-xs font-medium ${analysis.publishable ? "text-emerald-700" : "text-red-700"}`}>
            {analysis.publishable ? "مستوفٍ لبوابة النشر" : `غير مستوفٍ للنشر (الحد ${analysis.minimumPublishScore})`}
          </div>
        </div>
      </div>
      {analysis.blockingIssues.length > 0 && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>يمنع النشر:</strong> {analysis.blockingIssues.join("، ")}
        </div>
      )}
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {analysis.checks.map(check => (
          <li key={check.id} className="flex items-start gap-2 text-xs">
            <StatusIcon status={check.status} />
            <span className={statusStyles[check.status]}>
              <strong>{check.label}:</strong> {check.detail}
              {check.recommendation && check.status !== "pass" && (
                <span className="mt-0.5 block text-slate-500">{check.recommendation}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
