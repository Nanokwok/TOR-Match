export const browseActions = {
  viewOriginalSource(torId: string, sourceUrl: string) {
    console.log("Action clicked: View Original Source Page", {
      torId,
      sourceUrl,
    })
  },
  shareTor(torId: string) {
    console.log("Action clicked: Share", { torId })
  },
  companySetup() {
    console.log("Action clicked: Company Setup")
  },
  openCompanyProfile() {
    console.log("Action clicked: Company Profile")
  },
  openSettings() {
    console.log("Action clicked: Setting")
  },
  openMoreFilters() {
    console.log("Action clicked: More Filters")
  },
  changeLanguage() {
    console.log("Action clicked: Change Language")
  },
  openNotifications() {
    console.log("Action clicked: Notifications")
  },
} as const
