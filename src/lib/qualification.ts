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
