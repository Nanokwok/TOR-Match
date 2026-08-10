import type {
  CompanyProfile,
  Tor,
  TorQualificationCheck,
} from "@/types/tor"

export function buildQualificationCheck(
  tor: Tor,
  profile: CompanyProfile | null
): TorQualificationCheck {
  const profileSetup = profile !== null

  return {
    profileSetup,
    rows: tor.qualificationRequirements.map((requirement) => {
      const match = profile?.matches.find(
        (item) => item.requirementId === requirement.id
      )

      return {
        requirement: requirement.requirement,
        torCriteria: requirement.torCriteria,
        companyValue: match?.displayValue ?? null,
        passed: match?.passed ?? null,
      }
    }),
  }
}
