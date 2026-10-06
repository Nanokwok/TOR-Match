/**
 * CLI Playground for testing the official e-GP RSS Feed (Comptroller General's Dept)
 *
 * Usage:
 *   npx tsx src/playground/egp-rss-playground.ts
 *   npx tsx src/playground/egp-rss-playground.ts --deptId 0304 --anounceType B0
 *   npx tsx src/playground/egp-rss-playground.ts --sample
 */

const SAMPLE_EGP_XML = `<?xml version="2.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ประกาศจัดซื้อจัดจ้างภาครัฐ</title>
    <link>https://egp5uat.cgd.go.th/egp2procminweb/procsearch.sch?homeFlag=A&amp;proc_id=FPROD2005&amp;servlet=FFPRO2005Servlet&amp;methodId=&amp;anounceType=2</link>
    <description>ประกาศจัดซื้อจัดจ้างภาครัฐ</description>
    <language>th</language>
    <lastBuildDate>Tue, 26 Nov 2024 07:45:41 ICT</lastBuildDate>
    <copyright>Copyright © 2008 All Rights Reserved.</copyright>
    <image>
      <title>ประกาศจัดซื้อจัดจ้างภาครัฐ</title>
      <url>https://egp5uat.cgd.go.th/EPROCRssFeedWeb/images/header_egp1.jpg</url>
      <link>http://www.gprocurement.go.th</link>
    </image>
    <countbyday>3</countbyday>
    <item>
      <title>ร่างเอกสารประกวดราคาจ้างพัฒนาระบบบริหารจัดการข้อมูลและการวิเคราะห์ชั้นสูง (e-Bidding)</title>
      <link>https://egp5uat.cgd.go.th/egp-upload-service/v1/downloadFileTest?fileId=5d008a5432aa44689520de462a244201</link>
      <description>67119000332, ประกวดราคาอิเล็กทรอนิกส์ (e-bidding), ร่างเอกสารประกวดราคา (e-Bidding) และร่างเอกสารซื้อหรือจ้างด้วยวิธีสอบราคา</description>
      <pubDate>2024-11-26</pubDate>
      <guid></guid>
    </item>
    <item>
      <title>ประกวดราคาจ้างทำความสะอาดสำนักงาน ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)</title>
      <link>https://egp5uat.cgd.go.th/egp-template-service/dwnt/view-pdf-file?templateId=d09c45dd-65c7-4f4b-802a-ef40dcb123e1</link>
      <description>67119000333, ประกวดราคาอิเล็กทรอนิกส์ (e-bidding), ประกาศเชิญชวน</description>
      <pubDate>2024-11-26</pubDate>
      <guid></guid>
    </item>
    <item>
      <title>ประกวดราคาซื้อครุภัณฑ์ยานพาหนะและขนส่ง ประเภทรถยนต์บรรทุก (ดีเซล) ขับเคลื่อน 2 ล้อ แบบดับเบิ้ลแค็บ ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)</title>
      <link>https://egp5uat.cgd.go.th/egp-template-service/dwnt/view-pdf-file?templateId=dc1bfe34-6e5b-447a-a122-fe6898d4dee7</link>
      <description>67119000332, ประกวดราคาอิเล็กทรอนิกส์ (e-bidding), ประกาศเชิญชวน</description>
      <pubDate>2024-11-26</pubDate>
      <guid></guid>
    </item>
    <item>
      <title>ประกวดราคาซื้อครุภัณฑ์ยานพาหนะและขนส่ง ประเภทรถยนต์บรรทุก (ดีเซล) ขับเคลื่อน 2 ล้อ แบบดับเบิ้ลแค็บ ด้วยวิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)</title>
      <link>https://egp5uat.cgd.go.th/egp-template-service/dwnt/view-pdf-file?templateId=74df7ca2-9223-4a15-befa-93eb0576f6aa</link>
      <description>67119000332, ประกวดราคาอิเล็กทรอนิกส์ (e-bidding), ประกาศรายชื่อผู้ชนะการเสนอราคา / ประกาศผู้ได้รับการคัดเลือก</description>
      <pubDate>2024-11-26</pubDate>
      <guid></guid>
    </item>
  </channel>
</rss>`

function extractTag(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"))
  return match ? match[1].trim() : ""
}

function parseItems(xml: string) {
  const items: Array<{
    title: string
    link: string
    projectNo: string
    method: string
    type: string
    pubDate: string
  }> = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = extractTag(block, "title")
    const link = extractTag(block, "link")
    const description = extractTag(block, "description")
    const pubDate = extractTag(block, "pubDate")

    const parts = description.split(",").map((p) => p.trim())
    items.push({
      title,
      link,
      projectNo: parts[0] || "",
      method: parts[1] || "",
      type: parts.slice(2).join(", ") || "",
      pubDate,
    })
  }

  return items
}

async function main() {
  const args = process.argv.slice(2)
  const isSample = args.includes("--sample")

  const getArg = (name: string, fallback = "") => {
    const idx = args.indexOf(`--${name}`)
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback
  }

  const deptId = getArg("deptId", "0304")
  const anounceType = getArg("anounceType", "B0")
  const methodId = getArg("methodId", "16")
  const announceDate = getArg("announceDate", "")

  console.log("\n=======================================================")
  console.log("   e-GP RSS Feed API CLI Playground")
  console.log("   (Comptroller General's Department / กรมบัญชีกลาง)")
  console.log("=======================================================\n")

  // Check Bangkok time (UTC+7)
  const bangkokDate = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const hours = bangkokDate.getUTCHours()
  const minutes = bangkokDate.getUTCMinutes()
  const timeInMinutes = hours * 60 + minutes
  const isMiddayOpen = timeInMinutes >= 721 && timeInMinutes <= 779
  const isEveningOpen = timeInMinutes >= 1021 || timeInMinutes <= 509
  const isOpen = isMiddayOpen || isEveningOpen

  console.log(`Current Bangkok Time: ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} น.`)
  if (!isOpen) {
    console.log("⚠️  STATUS: Outside official e-GP operating window.")
    console.log("    Official Open Hours: 12:01-12:59 and 17:01-08:29 ICT.")
    console.log("    (Closed 09:00-12:00 and 13:00-17:00 to reduce load)\n")
  } else {
    console.log("🟢 STATUS: Inside official e-GP operating window.\n")
  }

  const url = new URL("http://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml")
  if (deptId) url.searchParams.set("deptId", deptId)
  if (anounceType) url.searchParams.set("anounceType", anounceType)
  if (methodId) url.searchParams.set("methodId", methodId)
  if (announceDate) url.searchParams.set("announceDate", announceDate)

  console.log(`Target URL: ${url.toString()}`)

  let xml = ""
  if (isSample || !isOpen) {
    if (!isSample) {
      console.log("\n[Notice] System is closed; automatically demonstrating with Sample XML.")
      console.log("To force live query when server opens, run without --sample.\n")
    } else {
      console.log("\n[Mode] Running in Sample XML mode.\n")
    }
    xml = SAMPLE_EGP_XML
  } else {
    try {
      console.log("Fetching live feed...")
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/xml, text/xml, */*" },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      xml = await res.text()
    } catch (err: unknown) {
      console.error(`Failed to fetch live feed: ${err instanceof Error ? err.message : String(err)}`)
      console.log("Falling back to Sample XML for demonstration...\n")
      xml = SAMPLE_EGP_XML
    }
  }

  const channelTitle = extractTag(xml, "title")
  const items = parseItems(xml)

  console.log(`Channel Title: ${channelTitle}`)
  console.log(`Total Items:   ${items.length}\n`)

  items.forEach((item, index) => {
    console.log(`--- [Item #${index + 1}] ---`)
    console.log(`Title:       ${item.title}`)
    console.log(`Project No:  ${item.projectNo}`)
    console.log(`Method:      ${item.method}`)
    console.log(`Type:        ${item.type}`)
    console.log(`Pub Date:    ${item.pubDate}`)
    console.log(`Doc Link:    ${item.link}\n`)
  })
}

main().catch(console.error)
