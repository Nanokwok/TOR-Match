export type FormErrors = {
  budget?: string
  medianPrice?: string
  announcementDate?: string
  deadline?: string
  durationDays?: string
  milestones?: string
}

export type TorReviewValidationData = {
  budget: string | number
  medianPrice: string | number
  announcementDate: string
  deadline: string
  durationDays: string | number
  milestones: { percent: number }[]
}


export function validateForm(data: TorReviewValidationData): FormErrors {
  const errors: FormErrors = {}

  const budgetStr = String(data.budget ?? "").trim()
  const budgetVal = Number(budgetStr)
  if (!budgetStr) {
    errors.budget = "Total budget is required."
  } else if (Number.isNaN(budgetVal) || budgetVal <= 0) {
    errors.budget = "Budget must be greater than 0 THB."
  }

  const medianStr = String(data.medianPrice ?? "").trim()
  const medianVal = Number(medianStr)
  if (!medianStr) {
    errors.medianPrice = "Median price is required."
  } else if (Number.isNaN(medianVal) || medianVal < 0) {
    errors.medianPrice = "Median price cannot be negative."
  }

  const annStr = (data.announcementDate ?? "").trim()
  const annTime = annStr ? new Date(annStr).getTime() : NaN
  if (!annStr) {
    errors.announcementDate = "Announcement date is required."
  } else if (Number.isNaN(annTime)) {
    errors.announcementDate = "Invalid announcement date."
  }

  const deadlineStr = (data.deadline ?? "").trim()
  const deadlineTime = deadlineStr ? new Date(deadlineStr).getTime() : NaN
  if (!deadlineStr) {
    errors.deadline = "Submission deadline is required."
  } else if (Number.isNaN(deadlineTime)) {
    errors.deadline = "Invalid submission deadline."
  } else if (!Number.isNaN(annTime) && deadlineTime <= annTime) {
    errors.deadline = "Submission deadline must be after the announcement date."
  }

  const durationStr = String(data.durationDays ?? "").trim()
  const durationVal = Number(durationStr)
  if (!durationStr) {
    errors.durationDays = "Duration is required."
  } else if (Number.isNaN(durationVal) || durationVal <= 0 || !Number.isInteger(durationVal)) {
    errors.durationDays = "Duration must be an integer greater than 0."
  }

  if (data.milestones.length > 0) {
    const totalPercent = data.milestones.reduce(
      (sum, item) => sum + (Number(item.percent) || 0),
      0
    )
    if (Math.round(totalPercent) !== 100) {
      errors.milestones = `Milestone percentages must sum to 100% (currently ${totalPercent}%).`
    }
  }

  return errors
}
