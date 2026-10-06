import { fetchFeed, ANNOUNCE_TYPES, METHOD_IDS } from "@/scraper/egp-rss"
import { env } from "@/config/env"

async function main() {
  console.log("=== ทุก anounceType ของ กทม. ===\n")
  for (const [name, type] of Object.entries(ANNOUNCE_TYPES)) {
    try {
      const r = await fetchFeed({ deptId: env.egpDeptId, announceType: type })
      console.log(`${type.padEnd(3)} ${name.padEnd(20)} -> ${String(r.items.length).padStart(2)} รายการ (countByDay=${r.countByDay})`)
      if (r.items.length) {
        const s = r.items[0]
        console.log(`      ตัวอย่าง: ${s.title.slice(0, 48)}`)
        console.log(`      ประเภท  : ${s.announceLabel}`)
        console.log(`      link    : ${s.pdfUrl.slice(0, 72)}`)
      }
    } catch (e) {
      console.log(`${type.padEnd(3)} ${name.padEnd(20)} -> ❌ ${(e as Error).message.slice(0, 40)}`)
    }
  }

  console.log("\n=== B0 แยกตาม methodId (เผื่อ 20-item cap ซ่อนไว้) ===")
  for (const [name, id] of Object.entries(METHOD_IDS).slice(0, 5)) {
    const r = await fetchFeed({ deptId: env.egpDeptId, announceType: ANNOUNCE_TYPES.draft, methodId: id })
    console.log(`  methodId=${id} ${name.padEnd(20)} -> ${r.items.length} รายการ`)
  }
}
main().catch((e) => console.error("ERROR:", (e as Error).message.slice(0, 150)))
