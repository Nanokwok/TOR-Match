"use client"

import type { LucideIcon } from "lucide-react"
import {
  Award,
  BookOpen,
  Building2,
  Check,
  FileSpreadsheet,
  History,
} from "lucide-react"

import { COMPANY_SETUP_STEPS } from "@/lib/company-setup"
import { cn } from "@/lib/utils"
import type { CompanySetupStepId } from "@/types/company-setup"

const STEP_ICONS: Record<CompanySetupStepId, LucideIcon> = {
  general: Building2,
  financial: FileSpreadsheet,
  certifications: Award,
  "past-performance": History,
  capabilities: BookOpen,
}

type CompanySetupStepperProps = {
  currentStepId: CompanySetupStepId
}

export function CompanySetupStepper({
  currentStepId,
}: CompanySetupStepperProps) {
  const currentIndex = COMPANY_SETUP_STEPS.findIndex(
    (step) => step.id === currentStepId
  )

  return (
    <ol className="flex w-full items-start">
      {COMPANY_SETUP_STEPS.map((step, index) => {
        const completed = index < currentIndex
        const active = index === currentIndex
        const Icon = STEP_ICONS[step.id]
        const isLast = index === COMPANY_SETUP_STEPS.length - 1

        return (
          <li
            key={step.id}
            className="relative flex min-w-0 flex-1 flex-col items-center"
          >
            {!isLast ? (
              <div
                aria-hidden
                className={cn(
                  "absolute top-5 left-[calc(50%+24px)] h-px w-[calc(100%-48px)]",
                  index < currentIndex ? "bg-[#0088C9]" : "bg-neutral-200"
                )}
              />
            ) : null}

            <div
              className={cn(
                "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                completed && "border-emerald-500 bg-emerald-500 text-white",
                active && "border-[#0088C9] bg-[#0088C9] text-white",
                !completed &&
                  !active &&
                  "border-neutral-300 bg-white text-neutral-400"
              )}
            >
              {completed ? (
                <Check className="size-5" strokeWidth={2.5} />
              ) : (
                <Icon className="size-[18px]" strokeWidth={1.75} />
              )}
            </div>

            <div className="mt-3 space-y-1 px-1 text-center">
              <p
                className={cn(
                  "text-[10px] font-medium tracking-[0.12em] uppercase",
                  active ? "text-neutral-500" : "text-neutral-400"
                )}
              >
                STEP {index + 1}
              </p>
              <p
                className={cn(
                  "text-xs leading-snug sm:text-[13px]",
                  active && "font-semibold text-neutral-950",
                  completed && "font-medium text-neutral-700",
                  !active && !completed && "font-medium text-neutral-400"
                )}
              >
                {step.label}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
