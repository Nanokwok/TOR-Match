# Backend TOR matching

Implements the four phases approved in the conversation: structured criteria, a single backend matching service, authenticated API integration, and removal of frontend matching.

Requirements retain localized display text and gain validated criteria. Existing documents without usable criteria yield insufficient-data. Seed data is owned by the backend and contains explicit numeric thresholds, any/all certificate requirements, e-GP checks, and manual requirements. Contract value and contract work scope are separate checks; titles cannot prove work scope.

One pure service evaluates a saved company against a TOR. Rows return passed, failed, insufficient-data, or manual-review plus localized reasons. `eligible` means all automated criteria pass, with no missing criteria; manual requirements remain explicitly pending. UI labels and the eligibility filter use that meaning. Overall status still reports manual-review until all requirements pass. No profile and empty criteria never qualify. Certificates expire at the end of their calendar expiration date in Asia/Bangkok. Values are evaluated on every request, so profile changes and expiration do not use stale cached results.

List, detail, and authenticated qualification endpoints share the service. Each request loads the authenticated owner's company; client-supplied company IDs or match results are not accepted. List filtering occurs before total calculation. The initial browse view shows all TORs so a company without matches can still inspect requirements. Next server services forward the JWT and use no-store API calls. API errors propagate rather than silently falling back to mock data.

Validation covers thresholds, partial data, any/all certificates and expiry boundaries, manual/legacy criteria, API auth and ownership, matching consistency and filters. Existing TOR documents are inspected before seeding; updates preserve IDs and seed operations never use --fresh. Workspace board persistence and admin review remain outside this migration, but TOR lookup used by workspace must use real IDs.
