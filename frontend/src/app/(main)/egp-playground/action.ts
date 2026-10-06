"use server"

export type EgpRssItem = {
  title: string
  link: string
  projectNo: string
  procurementMethod: string
  announcementType: string
  pubDate: string
  guid?: string
}

export type EgpRssChannel = {
  title: string
  link: string
  description: string
  language?: string
  lastBuildDate?: string
  countByDay?: number
}

export type EgpRssResponse = {
  channel: EgpRssChannel
  items: EgpRssItem[]
  rawXml: string
}

export type EgpRssQueryParams = {
  deptId?: string
  deptsubId?: string
  methodId?: string
  anounceType?: string
  announceDate?: string
  useSampleData?: boolean
}

export type EgpRssActionResult = {
  success: boolean
  url: string
  data?: EgpRssResponse
  error?: string
  isSampleData?: boolean
  serverWindow: {
    isOpen: boolean
    bangkokTime: string
    currentWindowMessage: string
  }
}

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

function extractTagContent(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i")
  const match = xml.match(regex)
  return match ? match[1].trim() : ""
}

function parseEgpRssXml(xml: string): EgpRssResponse {
  const channelTitle = extractTagContent(xml, "title")
  const channelLink = extractTagContent(xml, "link")
  const channelDescription = extractTagContent(xml, "description")
  const language = extractTagContent(xml, "language")
  const lastBuildDate = extractTagContent(xml, "lastBuildDate")
  const countByDayStr = extractTagContent(xml, "countbyday")
  const countByDay = countByDayStr ? parseInt(countByDayStr, 10) : undefined

  const channel: EgpRssChannel = {
    title: channelTitle,
    link: channelLink,
    description: channelDescription,
    language: language || undefined,
    lastBuildDate: lastBuildDate || undefined,
    countByDay: isNaN(countByDay as number) ? undefined : countByDay,
  }

  const items: EgpRssItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemBlock = match[1]
    const title = extractTagContent(itemBlock, "title")
    const link = extractTagContent(itemBlock, "link")
    const description = extractTagContent(itemBlock, "description")
    const pubDate = extractTagContent(itemBlock, "pubDate")
    const guid = extractTagContent(itemBlock, "guid")

    const parts = description.split(",").map((p) => p.trim())
    const projectNo = parts[0] || ""
    const procurementMethod = parts[1] || ""
    const announcementType = parts.slice(2).join(", ") || ""

    items.push({
      title,
      link,
      projectNo,
      procurementMethod,
      announcementType,
      pubDate,
      guid: guid || undefined,
    })
  }

  return {
    channel,
    items,
    rawXml: xml,
  }
}

function getEgpServerStatus() {
  const now = new Date()
  const bangkokDate = new Date(now.getTime() + 7 * 60 * 60 * 1000)
  const hours = bangkokDate.getUTCHours()
  const minutes = bangkokDate.getUTCMinutes()
  const timeInMinutes = hours * 60 + minutes

  const timeString = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} น. (ICT)`

  const isMiddayOpen = timeInMinutes >= 721 && timeInMinutes <= 779
  const isEveningOpen = timeInMinutes >= 1021 || timeInMinutes <= 509

  const isOpen = isMiddayOpen || isEveningOpen
  const currentWindowMessage = isOpen
    ? "🟢 ช่วงเวลาเปิดให้บริการ e-GP RSS (เปิด 12:01-12:59 และ 17:01-08:29)"
    : "🔴 นอกเวลาให้บริการ e-GP RSS (ระบบปิดช่วง 09:00-12:00 และ 13:00-17:00 น. เพื่อลดภาระระบบ)"

  return { isOpen, bangkokTime: timeString, currentWindowMessage }
}

export async function fetchEgpRssAction(
  params: EgpRssQueryParams
): Promise<EgpRssActionResult> {
  const serverWindow = getEgpServerStatus()

  const url = new URL("http://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml")
  if (params.deptId?.trim()) url.searchParams.set("deptId", params.deptId.trim())
  if (params.deptsubId?.trim()) url.searchParams.set("deptsubId", params.deptsubId.trim())
  if (params.methodId && params.methodId !== "all") url.searchParams.set("methodId", params.methodId)
  if (params.anounceType && params.anounceType !== "all") url.searchParams.set("anounceType", params.anounceType)
  if (params.announceDate?.trim()) url.searchParams.set("announceDate", params.announceDate.trim())

  const targetUrl = url.toString()

  if (params.useSampleData) {
    const data = parseEgpRssXml(SAMPLE_EGP_XML)
    return {
      success: true,
      url: targetUrl,
      data,
      isSampleData: true,
      serverWindow,
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TOR-Match/1.0)",
        Accept: "application/xml, text/xml, */*",
      },
      cache: "no-store",
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`e-GP server responded with status: ${response.status} ${response.statusText}`)
    }

    const xml = await response.text()
    if (!xml || !xml.includes("<rss")) {
      throw new Error("Received response is not a valid e-GP RSS feed XML")
    }

    const data = parseEgpRssXml(xml)
    return {
      success: true,
      url: targetUrl,
      data,
      isSampleData: false,
      serverWindow,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      url: targetUrl,
      error: `Connection timed out or failed (${message}). Note: The official e-GP RSS server closes access during working hours (09:00-12:00 and 13:00-17:00). You can toggle 'Sample Data' to test parsing and rendering right now.`,
      serverWindow,
    }
  }
}
