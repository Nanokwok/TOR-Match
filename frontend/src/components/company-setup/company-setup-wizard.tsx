"use client"

import {
  useCallback,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"

import { saveCompanySetupProfileAction } from "@/actions/company-setup"
import { useCompanySetupDemoFill } from "@/components/company-setup/company-setup-demo-fill"
import { CompanySetupStepper } from "@/components/company-setup/company-setup-stepper"
import { useLocale } from "@/components/i18n/locale-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CERTIFICATION_OPTIONS,
  CLIENT_SECTOR_OPTIONS,
  COMPANY_SETUP_STEPS,
  COMPANY_SIZE_OPTIONS,
  COMPLETION_YEAR_OPTIONS,
  createDefaultCompanySetupProfile,
  createEmptyPastProject,
  SPECIALIZATION_OPTIONS,
} from "@/lib/company-setup"
import { cn } from "@/lib/utils"
import type {
  CertificationId,
  ClientSector,
  CompanySetupProfile,
  CompanySetupStepId,
  CompanySize,
  EgPRegistrationStatus,
  SpecializationId,
} from "@/types/company-setup"

type CompanySetupWizardProps = {
  initialProfile?: CompanySetupProfile | null
  mode?: "setup" | "edit"
}

export function CompanySetupWizard({
  initialProfile,
  mode = "setup",
}: CompanySetupWizardProps) {
  const router = useRouter()
  const { t } = useLocale()
  const isEdit = mode === "edit"
  const [stepIndex, setStepIndex] = useState(0)
  const [profile, setProfile] = useState<CompanySetupProfile>(
    () => initialProfile ?? createDefaultCompanySetupProfile()
  )
  const [techInput, setTechInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSave] = useTransition()

  // DEMO ONLY — remove with `company-setup-demo-fill.ts`
  useCompanySetupDemoFill(
    useCallback((nextProfile) => {
      setProfile(nextProfile)
      setTechInput("")
      setError(null)
    }, [])
  )

  const currentStep = COMPANY_SETUP_STEPS[stepIndex]
  const isLastStep = stepIndex === COMPANY_SETUP_STEPS.length - 1

  function updateProfile(
    updater: (current: CompanySetupProfile) => CompanySetupProfile
  ) {
    setProfile((current) => updater(current))
    setError(null)
  }

  function validateStep(stepId: CompanySetupStepId): string | null {
    switch (stepId) {
      case "general":
        if (!profile.companyNameThai.trim()) {
          return t("companySetup.validation.companyNameThaiRequired")
        }
        if (!profile.companySize) return t("companySetup.validation.companySizeRequired")
        if (!profile.contactEmail.trim()) return t("companySetup.validation.contactEmailRequired")
        return null
      case "financial":
        if (!profile.registeredCapitalThb.trim()) {
          return t("companySetup.validation.registeredCapitalRequired")
        }
        if (!profile.notBlacklisted) {
          return t("companySetup.validation.blacklistRequired")
        }
        return null
      case "certifications": {
        const selected = profile.certifications.filter((item) => item.selected)
        if (selected.length === 0) return null
        const incomplete = selected.find(
          (item) =>
            !item.certificateNumber.trim() || !item.expirationDate.trim()
        )
        if (incomplete) {
          return t("companySetup.validation.certificationIncomplete")
        }
        return null
      }
      case "past-performance":
        return null
      case "capabilities":
        if (profile.specializations.length === 0) {
          return t("companySetup.validation.specializationRequired")
        }
        return null
      default:
        return null
    }
  }

  function handleBack() {
    setError(null)
    setStepIndex((index) => Math.max(0, index - 1))
  }

  function handleNext() {
    const validationError = validateStep(currentStep.id)
    if (validationError) {
      setError(validationError)
      return
    }

    if (!isLastStep) {
      setStepIndex((index) => index + 1)
      return
    }

    startSave(async () => {
      const result = await saveCompanySetupProfileAction(profile)
      if (result.ok) {
        router.push("/company-profile")
        router.refresh()
      }
    })
  }

  function handleCancel() {
    router.push(isEdit ? "/company-profile" : "/browse")
  }

  const nextLabel =
    isLastStep && isEdit
      ? t("companySetup.saveChanges")
      : t(`companySetup.steps.${currentStep.id}.nextLabel`)

  function addTechTag(raw: string) {
    const tag = raw.trim()
    if (!tag) return
    updateProfile((current) => {
      if (current.techStack.some((item) => item.toLowerCase() === tag.toLowerCase())) {
        return current
      }
      return { ...current, techStack: [...current.techStack, tag] }
    })
    setTechInput("")
  }

  function handleTechKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      addTechTag(techInput)
    }
  }

  function toggleCertification(id: CertificationId) {
    updateProfile((current) => ({
      ...current,
      certifications: current.certifications.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      ),
    }))
  }

  function toggleSpecialization(id: SpecializationId) {
    updateProfile((current) => {
      const exists = current.specializations.includes(id)
      return {
        ...current,
        specializations: exists
          ? current.specializations.filter((item) => item !== id)
          : [...current.specializations, id],
      }
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-10 md:px-10">
      <CompanySetupStepper currentStepId={currentStep.id} />

      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
            {t(`companySetup.steps.${currentStep.id}.title`)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(`companySetup.steps.${currentStep.id}.description`)}
          </p>
        </div>

        <div className="space-y-5">
          {currentStep.id === "general" ? (
            <GeneralStep profile={profile} onChange={updateProfile} />
          ) : null}
          {currentStep.id === "financial" ? (
            <FinancialStep profile={profile} onChange={updateProfile} />
          ) : null}
          {currentStep.id === "certifications" ? (
            <CertificationsStep
              profile={profile}
              onChange={updateProfile}
              onToggle={toggleCertification}
            />
          ) : null}
          {currentStep.id === "past-performance" ? (
            <PastPerformanceStep profile={profile} onChange={updateProfile} />
          ) : null}
          {currentStep.id === "capabilities" ? (
            <CapabilitiesStep
              profile={profile}
              techInput={techInput}
              onTechInputChange={setTechInput}
              onTechKeyDown={handleTechKeyDown}
              onAddTech={() => addTechTag(techInput)}
              onRemoveTech={(tag) =>
                updateProfile((current) => ({
                  ...current,
                  techStack: current.techStack.filter((item) => item !== tag),
                }))
              }
              onToggleSpecialization={toggleSpecialization}
            />
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center justify-end gap-3">
          {stepIndex === 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="h-10 min-w-[96px] bg-muted text-foreground hover:bg-muted/80"
              onClick={handleCancel}
            >
              {t("common.cancel")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="h-10 min-w-[96px] bg-muted text-foreground hover:bg-muted/80"
              onClick={handleBack}
            >
              {t("common.back")}
            </Button>
          )}
          <Button
            type="button"
            className="h-10 bg-primary px-5 text-primary-foreground hover:bg-primary/90"
            disabled={isSaving}
            onClick={handleNext}
          >
            {isSaving ? t("companySetup.saving") : nextLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}

type StepProps = {
  profile: CompanySetupProfile
  onChange: (
    updater: (current: CompanySetupProfile) => CompanySetupProfile
  ) => void
}

function GeneralStep({ profile, onChange }: StepProps) {
  const { t } = useLocale()

  return (
    <div className="space-y-5">
      <Field label={t("companySetup.fields.companyNameThai")} required htmlFor="company-name-thai">
        <Input
          id="company-name-thai"
          value={profile.companyNameThai}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              companyNameThai: event.target.value,
            }))
          }
          placeholder={t("companySetup.placeholders.companyNameThai")}
          className="h-11 rounded-md bg-background"
        />
      </Field>

      <Field label={t("companySetup.fields.companyNameEnglish")} htmlFor="company-name-english">
        <Input
          id="company-name-english"
          value={profile.companyNameEnglish}
          onChange={(event) =>
            onChange((current) => ({
              ...current,
              companyNameEnglish: event.target.value,
            }))
          }
          placeholder={t("companySetup.placeholders.companyNameEnglish")}
          className="h-11 rounded-md bg-background"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("companySetup.fields.taxId")} htmlFor="tax-id">
          <Input
            id="tax-id"
            value={profile.taxId}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                taxId: event.target.value.replace(/\D/g, "").slice(0, 13),
              }))
            }
            placeholder={t("companySetup.placeholders.taxId")}
            inputMode="numeric"
            className="h-11 rounded-md bg-background"
          />
        </Field>

        <Field label={t("companySetup.fields.companySize")} required htmlFor="company-size">
          <Select
            value={profile.companySize || null}
            onValueChange={(value) => {
              if (!value) return
              onChange((current) => ({
                ...current,
                companySize: value as CompanySize,
              }))
            }}
          >
            <SelectTrigger
              id="company-size"
              className="h-11 w-full rounded-md bg-background data-[size=default]:h-11"
            >
              <SelectValue placeholder={t("companySetup.placeholders.selectSize")} />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`companySetup.companySize.${option.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("companySetup.fields.contactEmail")} required htmlFor="contact-email">
          <Input
            id="contact-email"
            type="email"
            value={profile.contactEmail}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                contactEmail: event.target.value,
              }))
            }
            placeholder={t("companySetup.placeholders.contactEmail")}
            className="h-11 rounded-md bg-background"
          />
        </Field>

        <Field label={t("companySetup.fields.phone")} htmlFor="phone">
          <Input
            id="phone"
            value={profile.phone}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                phone: event.target.value,
              }))
            }
            placeholder={t("companySetup.placeholders.phone")}
            className="h-11 rounded-md bg-background"
          />
        </Field>
      </div>
    </div>
  )
}

function FinancialStep({ profile, onChange }: StepProps) {
  const { t } = useLocale()

  return (
    <div className="space-y-5">
      <Field
        label={t("companySetup.fields.registeredCapital")}
        required
        htmlFor="registered-capital"
      >
        <div className="relative">
          <Input
            id="registered-capital"
            value={profile.registeredCapitalThb}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                registeredCapitalThb: event.target.value,
              }))
            }
            placeholder={t("companySetup.placeholders.registeredCapital")}
            className="h-10 pr-14"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
            THB
          </span>
        </div>
      </Field>

      <div className="space-y-2">
        <Label>
          {t("companySetup.fields.egpStatus")}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <div className="space-y-2">
          {(
            [
              { value: "registered", labelKey: "registered" },
              { value: "in-progress", labelKey: "in-progress" },
              { value: "not-registered", labelKey: "not-registered" },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
            >
              <input
                type="radio"
                name="egp-status"
                checked={profile.egpStatus === option.value}
                onChange={() =>
                  onChange((current) => ({
                    ...current,
                    egpStatus: option.value as EgPRegistrationStatus,
                  }))
                }
                className="size-4 accent-primary"
              />
              {t(`companySetup.egpStatus.${option.labelKey}`)}
            </label>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-snug text-foreground">
        <Checkbox
          checked={profile.notBlacklisted}
          onCheckedChange={(checked) =>
            onChange((current) => ({
              ...current,
              notBlacklisted: checked === true,
            }))
          }
          className="mt-0.5"
        />
        <span>{t("companySetup.fields.blacklistDeclaration")}</span>
      </label>
    </div>
  )
}

function CertificationsStep({
  profile,
  onChange,
  onToggle,
}: StepProps & { onToggle: (id: CertificationId) => void }) {
  const { t } = useLocale()

  return (
    <div className="space-y-3">
      {CERTIFICATION_OPTIONS.map((option) => {
        const entry = profile.certifications.find(
          (item) => item.id === option.id
        )!
        return (
          <div
            key={option.id}
            className="rounded-xl border border-border p-4"
          >
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
              <Checkbox
                checked={entry.selected}
                onCheckedChange={() => onToggle(option.id)}
              />
              {t(`companySetup.certification.${option.id}`)}
            </label>

            {entry.selected ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field
                  label={t("companySetup.fields.certificateNumber")}
                  required
                  htmlFor={`${option.id}-number`}
                >
                  <Input
                    id={`${option.id}-number`}
                    value={entry.certificateNumber}
                    onChange={(event) =>
                      onChange((current) => ({
                        ...current,
                        certifications: current.certifications.map((item) =>
                          item.id === option.id
                            ? {
                                ...item,
                                certificateNumber: event.target.value,
                              }
                            : item
                        ),
                      }))
                    }
                    placeholder={t("companySetup.placeholders.certificateNumber")}
                    className="h-10"
                  />
                </Field>
                <Field
                  label={t("companySetup.fields.expirationDate")}
                  required
                  htmlFor={`${option.id}-expiry`}
                >
                  <Input
                    id={`${option.id}-expiry`}
                    type="date"
                    value={entry.expirationDate}
                    onChange={(event) =>
                      onChange((current) => ({
                        ...current,
                        certifications: current.certifications.map((item) =>
                          item.id === option.id
                            ? {
                                ...item,
                                expirationDate: event.target.value,
                              }
                            : item
                        ),
                      }))
                    }
                    className="h-10"
                  />
                </Field>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function PastPerformanceStep({ profile, onChange }: StepProps) {
  const { t } = useLocale()

  return (
    <div className="space-y-6">
      {profile.pastProjects.map((project, index) => (
        <div key={project.id} className="space-y-4">
          {index > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {t("companySetup.fields.pastProject", { number: index + 1 })}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    pastProjects: current.pastProjects.filter(
                      (item) => item.id !== project.id
                    ),
                  }))
                }
              >
                {t("companySetup.actions.remove")}
              </Button>
            </div>
          ) : null}

          <Field
            label={t("companySetup.fields.projectTitle")}
            htmlFor={`project-title-${project.id}`}
          >
            <Input
              id={`project-title-${project.id}`}
              value={project.title}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  pastProjects: current.pastProjects.map((item) =>
                    item.id === project.id
                      ? { ...item, title: event.target.value }
                      : item
                  ),
                }))
              }
              placeholder={t("companySetup.placeholders.projectTitle")}
              className="h-10"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("companySetup.fields.clientSector")} htmlFor={`sector-${project.id}`}>
              <Select
                value={project.clientSector || null}
                onValueChange={(value) => {
                  if (!value) return
                  onChange((current) => ({
                    ...current,
                    pastProjects: current.pastProjects.map((item) =>
                      item.id === project.id
                        ? { ...item, clientSector: value as ClientSector }
                        : item
                    ),
                  }))
                }}
              >
                <SelectTrigger
                  id={`sector-${project.id}`}
                  className="h-10 w-full bg-background data-[size=default]:h-10"
                >
                  <SelectValue placeholder={t("companySetup.placeholders.selectSector")} />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_SECTOR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(`companySetup.clientSector.${option.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label={t("companySetup.fields.contractValue")}
              htmlFor={`value-${project.id}`}
            >
              <Input
                id={`value-${project.id}`}
                value={project.contractValueThb}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    pastProjects: current.pastProjects.map((item) =>
                      item.id === project.id
                        ? { ...item, contractValueThb: event.target.value }
                        : item
                    ),
                  }))
                }
                placeholder={t("companySetup.placeholders.contractValue")}
                className="h-10"
              />
            </Field>

            <Field
              label={t("companySetup.fields.completionYear")}
              htmlFor={`year-${project.id}`}
            >
              <Select
                value={project.completionYear || null}
                onValueChange={(value) => {
                  if (!value) return
                  onChange((current) => ({
                    ...current,
                    pastProjects: current.pastProjects.map((item) =>
                      item.id === project.id
                        ? { ...item, completionYear: value }
                        : item
                    ),
                  }))
                }}
              >
                <SelectTrigger
                  id={`year-${project.id}`}
                  className="h-10 w-full bg-background data-[size=default]:h-10"
                >
                  <SelectValue placeholder={t("companySetup.placeholders.selectYear")} />
                </SelectTrigger>
                <SelectContent>
                  {COMPLETION_YEAR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        className="mx-auto flex w-full max-w-xs gap-1.5 text-primary hover:text-primary/90"
        onClick={() =>
          onChange((current) => ({
            ...current,
            pastProjects: [...current.pastProjects, createEmptyPastProject()],
          }))
        }
      >
        <Plus className="size-4" />
        {t("companySetup.actions.addPastProject")}
      </Button>
    </div>
  )
}

function CapabilitiesStep({
  profile,
  techInput,
  onTechInputChange,
  onTechKeyDown,
  onAddTech,
  onRemoveTech,
  onToggleSpecialization,
}: {
  profile: CompanySetupProfile
  techInput: string
  onTechInputChange: (value: string) => void
  onTechKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onAddTech: () => void
  onRemoveTech: (tag: string) => void
  onToggleSpecialization: (id: SpecializationId) => void
}) {
  const { t } = useLocale()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="tech-stack">{t("companySetup.fields.techStack")}</Label>
        <Input
          id="tech-stack"
          value={techInput}
          onChange={(event) => onTechInputChange(event.target.value)}
          onKeyDown={onTechKeyDown}
          onBlur={onAddTech}
          placeholder={t("companySetup.placeholders.techStack")}
          className="h-10"
        />
        {profile.techStack.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {profile.techStack.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {tag}
                <button
                  type="button"
                  aria-label={t("companySetup.actions.removeTech", { tag })}
                  className="rounded-full p-0.5 hover:bg-primary/10"
                  onClick={() => onRemoveTech(tag)}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>{t("companySetup.fields.specializations")}</Label>
        <div className="space-y-2">
          {SPECIALIZATION_OPTIONS.map((option) => {
            const selected = profile.specializations.includes(option.id)
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-4 py-3 text-sm transition-colors",
                  selected && "border-primary/40 bg-primary/10"
                )}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggleSpecialization(option.id)}
                />
                <span className="font-medium text-foreground">
                  {t(`companySetup.specialization.${option.id}`)}
                </span>
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  htmlFor,
  children,
}: {
  label: string
  required?: boolean
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {children}
    </div>
  )
}
