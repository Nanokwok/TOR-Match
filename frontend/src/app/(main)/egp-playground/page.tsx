import type { Metadata } from "next"

import { EgpPlaygroundView } from "./view"

export const metadata: Metadata = {
  title: "e-GP RSS Feed Playground | TOR Match",
  description: "Test and explore the official e-GP procurement RSS feed API from Comptroller General's Department",
}

export default function EgpPlaygroundPage() {
  return <EgpPlaygroundView />
}
