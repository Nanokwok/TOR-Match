import { getCertificationLabel } from "@/lib/company-setup"
import type { CertificationEntry, CertificationId, CompanySetupProfile } from "@/types/company-setup"
import type {
  CompanyProfile,
  CompanyProfileMatch,
  Tor,
  TorQualificationCheck,
} from "@/types/tor"

// Every default TOR's "certifications" requirement asks for one of these
// (see defaultQualifications() in server/db/mock/tors.ts: "ISO/IEC 29110 or
// CMMI Level 2+") — holding either one, unexpired, satisfies the requirement.
const CERTIFICATIONS_REQUIREMENT_IDS: CertificationId[] = ["iso-29110", "cmmi-2"]

function isCertificationCurrentlyValid(cert: CertificationEntry): boolean {
  if (!cert.selected || !cert.certificateNumber.trim() || !cert.expirationDate.trim()) {
    return false
  }
  const expiresAt = new Date(cert.expirationDate)
  if (Number.isNaN(expiresAt.getTime())) return false
  return expiresAt.getTime() >= Date.now()
}

/**
 * Real "certifications" qualification row, backed by the company's actual
 * certificate number + expiration date instead of mock data — an expired
 * certification does not count as passing.
 */
export function buildCertificationsMatch(
  profile: CompanySetupProfile | null
): CompanyProfileMatch {
  const validCert = profile?.certifications.find(
    (cert) =>
      CERTIFICATIONS_REQUIREMENT_IDS.includes(cert.id) &&
      isCertificationCurrentlyValid(cert)
  )

  return {
    requirementId: "certifications",
    displayValue: validCert
      ? `${getCertificationLabel(validCert.id)} (${validCert.certificateNumber})`
      : "",
    passed: Boolean(validCert),
  }
}

/** Swaps the mock "certifications" match for a real one computed from the
 *  company's saved profile. Other requirement types are left as-is. */
export function withRealCertifications(
  mockProfile: CompanyProfile | null,
  companyProfile: CompanySetupProfile | null
): CompanyProfile | null {
  if (!mockProfile) return null
  const certMatch = buildCertificationsMatch(companyProfile)
  return {
    ...mockProfile,
    matches: mockProfile.matches.map((match) =>
      match.requirementId === "certifications" ? certMatch : match
    ),
  }
}

export function buildQualificationCheck(
  tor: Tor,
  profile: CompanyProfile | null
): TorQualificationCheck {
  const profileSetup = profile !== null

  return {
    profileSetup,
    rows: tor.qualificationRequirements.map((requirement) => {
      // Manual / self-assessment rows are never auto-scored from the profile.
      if (!requirement.autoCheckable) {
        return {
          id: requirement.id,
          requirement: requirement.requirement,
          torCriteria: requirement.torCriteria,
          companyValue: null,
          passed: null,
          autoCheckable: false,
        }
      }

      const match = profile?.matches.find(
        (item) => item.requirementId === requirement.id
      )

      return {
        id: requirement.id,
        requirement: requirement.requirement,
        torCriteria: requirement.torCriteria,
        companyValue: match?.displayValue ?? null,
        passed: match?.passed ?? null,
        autoCheckable: true,
      }
    }),
  }
}
