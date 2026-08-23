import { getMockTors } from "@/server/db/mock/tors"
import { getMockWorkspaceCards } from "@/server/db/mock/workspace"
import { getDaysUntilDeadline } from "@/lib/format"
import type { DashboardData } from "@/types/dashboard"

const BANGKOK_DISTRICTS = [
  "Phra Nakhon",
  "Dusit",
  "Nong Chok",
  "Bang Rak",
  "Bang Khen",
  "Bang Kapi",
  "Pathum Wan",
  "Pom Prap Sattru Phai",
  "Phra Khanong",
  "Min Buri",
  "Lat Krabang",
  "Yan Nawa",
  "Samphanthawong",
  "Phaya Thai",
  "Thon Buri",
  "Bangkok Yai",
  "Huai Khwang",
  "Khlong San",
  "Taling Chan",
  "Bangkok Noi",
  "Bang Khun Thian",
  "Phasi Charoen",
  "Nong Khaem",
  "Rat Burana",
  "Bang Phlat",
  "Din Daeng",
  "Bueng Kum",
  "Sathon",
  "Bang Sue",
  "Chatuchak",
  "Bang Kho Laem",
  "Prawet",
  "Khlong Toei",
  "Suan Luang",
  "Chom Thong",
  "Don Mueang",
  "Ratchathewi",
  "Lat Phrao",
  "Watthana",
  "Bang Khae",
  "Lak Si",
  "Sai Mai",
  "Khan Na Yao",
  "Saphan Sung",
  "Wang Thonglang",
  "Khlong Sam Wa",
  "Bang Na",
  "Thawi Watthana",
  "Thung Khru",
  "Bang Bon",
] as const

function buildMonthlyTrend() {
  const now = new Date()
  const points = []

  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const seed = (date.getFullYear() * 12 + date.getMonth()) % 9
    const announcementCount = 18 + seed * 3 + ((11 - offset) % 4) * 2
    const budgetBaht =
      38_000_000 + seed * 7_500_000 + (11 - offset) * 2_200_000

    points.push({
      monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "2-digit",
      }).format(date),
      announcementCount,
      budgetBaht,
    })
  }

  return points
}

function buildDistrictDistribution() {
  return BANGKOK_DISTRICTS.map((district, index) => {
    const projectCount = 2 + ((index * 7) % 11) + (index % 3)
    const budgetBaht = projectCount * (1_800_000 + (index % 5) * 650_000)
    return { district, projectCount, budgetBaht }
  }).sort((a, b) => b.projectCount - a.projectCount)
}

/**
 * Dashboard aggregates. Swap mock sources for real DB/API later.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const workspaceCards = getMockWorkspaceCards()
  const activeBids = workspaceCards.filter(
    (card) => card.column === "todo" || card.column === "in-progress"
  ).length

  const upcomingDeadlines = workspaceCards.filter((card) => {
    const days = getDaysUntilDeadline(card.deadline)
    return days >= 0 && days <= 7
  }).length

  const recommendedTors = getMockTors()
    .filter((tor) => tor.eligible)
    .slice(0, 4)
    .map((tor, index) => ({
      id: tor.id,
      title: tor.title,
      department: tor.department,
      localOffice: tor.localOffice,
      budgetBaht: tor.budgetBaht,
      deadline: tor.deadline,
      projectScale: tor.projectScale,
      matchScore: 96 - index * 3,
    }))

  return {
    metrics: [
      {
        id: "active-bids",
        label: "Active Bids",
        value: activeBids,
        description:
          "Projects currently under active proposal preparation in Team Workspace",
      },
      {
        id: "upcoming-deadlines",
        label: "Upcoming Deadlines",
        value: upcomingDeadlines,
        description:
          "Tracked projects with e-GP submission windows closing within 7 days",
      },
    ],
    recommendedTors,
    monthlyTrend: buildMonthlyTrend(),
    districtDistribution: buildDistrictDistribution(),
  }
}
