"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getCertificationLabel,
  getClientSectorLabel,
  getCompanySizeLabel,
  getEgPStatusLabel,
  getSpecializationLabel,
} from "@/lib/company-setup"
import type { CompanySetupProfile } from "@/types/company-setup"

type CompanyProfileViewProps = {
  profile: CompanySetupProfile
}

export function CompanyProfileView({ profile }: CompanyProfileViewProps) {
  const selectedCerts = profile.certifications.filter((item) => item.selected)
  const projects = profile.pastProjects.filter((project) => project.title.trim())

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">
            Company Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Your company information used for TOR eligibility matching.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/company-setup?edit=1" />}
          className="h-10 shrink-0 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Pencil className="size-4" />
          Edit Company Info
        </Button>
      </header>

      <ProfileSection title="General Company Info">
        <dl className="grid gap-4 sm:grid-cols-2">
          <ProfileField
            label="Company Name (Thai)"
            value={profile.companyNameThai}
            className="sm:col-span-2"
          />
          <ProfileField
            label="Company Name (English)"
            value={profile.companyNameEnglish || "—"}
            className="sm:col-span-2"
          />
          <ProfileField label="Corporate Tax ID" value={profile.taxId || "—"} />
          <ProfileField
            label="Company Size"
            value={getCompanySizeLabel(profile.companySize)}
          />
          <ProfileField label="Contact Email" value={profile.contactEmail} />
          <ProfileField label="Phone" value={profile.phone || "—"} />
        </dl>
      </ProfileSection>

      <ProfileSection title="Financial & Legal Eligibility">
        <dl className="grid gap-4 sm:grid-cols-2">
          <ProfileField
            label="Paid-up Registered Capital (THB)"
            value={profile.registeredCapitalThb}
          />
          <ProfileField
            label="e-GP Status"
            value={getEgPStatusLabel(profile.egpStatus)}
          />
          <ProfileField
            label="Blacklist Declaration"
            value={
              profile.notBlacklisted
                ? "Confirmed — not blacklisted"
                : "Not confirmed"
            }
            className="sm:col-span-2"
          />
        </dl>
      </ProfileSection>

      <ProfileSection title="Certifications & Standards">
        {selectedCerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No certifications selected.</p>
        ) : (
          <ul className="space-y-3">
            {selectedCerts.map((cert) => (
              <li
                key={cert.id}
                className="rounded-lg border border-border bg-background/60 px-4 py-3"
              >
                <p className="text-sm font-semibold text-foreground">
                  {getCertificationLabel(cert.id)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No. {cert.certificateNumber || "—"} · Expires{" "}
                  {cert.expirationDate || "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>

      <ProfileSection title="Past Performance Contracts">
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past projects added.</p>
        ) : (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li
                key={project.id}
                className="rounded-lg border border-border bg-background/60 px-4 py-3"
              >
                <p className="text-sm font-semibold text-foreground">
                  {project.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getClientSectorLabel(project.clientSector)} ·{" "}
                  {project.contractValueThb
                    ? `THB ${project.contractValueThb}`
                    : "Value —"}{" "}
                  · {project.completionYear || "Year —"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </ProfileSection>

      <ProfileSection title="Capabilities & Tech Stack">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Specializations
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.specializations.map((id) => (
                <Badge
                  key={id}
                  variant="secondary"
                  className="bg-primary/10 text-primary hover:bg-primary/10"
                >
                  {getSpecializationLabel(id)}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Tech Stack
            </p>
            {profile.techStack.length === 0 ? (
              <p className="text-sm text-muted-foreground">No technologies listed.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.techStack.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-border text-foreground"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </ProfileSection>
    </div>
  )
}

function ProfileSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function ProfileField({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}
