import type { DigestTor } from "@/domain/digest-email"
import { parseThaiDateTime } from "@/utils/thai-time"

type SummarizableTor = {
  _id: unknown
  title: { en?: string; th?: string }
  department: { en?: string; th?: string }
  budgetBaht: number
  deadline?: string
}

/** Pure: a TOR as the emails describe it. A deadline is shown in Bangkok time, or left empty when the TOR states none. */
export function summarizeTor(tor: SummarizableTor): DigestTor {
  const deadline = parseThaiDateTime(tor.deadline)
  return {
    id: String(tor._id),
    titleTh: tor.title.th || tor.title.en || "",
    titleEn: tor.title.en || tor.title.th || "",
    department: tor.department.en || tor.department.th || "",
    budgetBaht: tor.budgetBaht,
    deadline: deadline
      ? deadline.toLocaleString("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" })
      : "",
  }
}
