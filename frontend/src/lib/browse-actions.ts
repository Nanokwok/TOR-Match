/**
 * Browse UI action stubs.
 * Replace console.log bodies with real navigation / mutations later.
 */
export const browseActions = {
  viewOriginalSource(torId: string, sourceUrl: string) {
    console.log("Action clicked: View Original Source Page", {
      torId,
      sourceUrl,
    });
  },
  bookmarkTor(torId: string) {
    console.log("Action clicked: Bookmark", { torId });
  },
  shareTor(torId: string) {
    console.log("Action clicked: Share", { torId });
  },
  companySetup() {
    console.log("Action clicked: Company Setup");
  },
  openCompanyProfile() {
    console.log("Action clicked: Company Profile");
  },
  openSettings() {
    console.log("Action clicked: Setting");
  },
  logout() {
    console.log("Action clicked: Logout");
  },
  openMoreFilters() {
    console.log("Action clicked: More Filters");
  },
  changeLanguage() {
    console.log("Action clicked: Change Language");
  },
  openNotifications() {
    console.log("Action clicked: Notifications");
  },
} as const;
