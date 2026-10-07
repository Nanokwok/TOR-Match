"use client"

import { useState, useTransition } from "react"
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCode,
  FileText,
  Filter,
  Info,
  Loader2,
  Search,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react"

import {
  fetchEgpRssAction,
  type EgpRssActionResult,
  type EgpRssItem,
} from "./action"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

const DEPT_PRESETS = [
  { id: "0304", name: "กรมบัญชีกลาง (CGD)" },
  { id: "1500", name: "กรุงเทพมหานคร (BMA)" },
  { id: "0307", name: "กรมสรรพากร" },
  { id: "0200", name: "สำนักงานปลัดกระทรวงการคลัง" },
]

const ANNOUNCE_TYPES = [
  { id: "all", name: "ทั้งหมด (All Types)" },
  { id: "B0", name: "B0 - ร่างเอกสารประกวดราคา / ร่าง TOR (e-Bidding)", highlight: true },
  { id: "D0", name: "D0 - ประกาศเชิญชวน", highlight: true },
  { id: "P0", name: "P0 - แผนการจัดซื้อจัดจ้าง" },
  { id: "15", name: "15 - ประกาศราคากลาง" },
  { id: "W0", name: "W0 - ประกาศรายชื่อผู้ชนะการเสนอราคา" },
  { id: "D1", name: "D1 - ยกเลิกประกาศเชิญชวน" },
  { id: "W1", name: "W1 - ยกเลิกรายชื่อผู้ชนะ" },
  { id: "D2", name: "D2 - เปลี่ยนแปลงประกาศเชิญชวน" },
  { id: "W2", name: "W2 - เปลี่ยนแปลงรายชื่อผู้ชนะ" },
]

const PROCUREMENT_METHODS = [
  { id: "all", name: "ทุกวิธีการจัดหา (All Methods)" },
  { id: "16", name: "16 - e-bidding" },
  { id: "15", name: "15 - e-market" },
  { id: "02", name: "02 - สอบราคา" },
  { id: "18", name: "18 - คัดเลือก" },
  { id: "19", name: "19 - เฉพาะเจาะจง" },
  { id: "20", name: "20 - จ้างที่ปรึกษาโดยวิธีประกาศเชิญชวนทั่วไป" },
  { id: "23", name: "23 - จ้างออกแบบหรือควบคุมงานก่อสร้างทั่วไป" },
]

const DELETE_COMMAND = `Remove-Item -Recurse -Force "frontend\\src\\app\\(main)\\egp-playground"; Remove-Item -Recurse -Force "backend\\src\\playground"`

export function EgpPlaygroundView() {
  const [deptId, setDeptId] = useState("0304")
  const [deptsubId, setDeptsubId] = useState("")
  const [anounceType, setAnounceType] = useState("B0")
  const [methodId, setMethodId] = useState("all")
  const [announceDate, setAnnounceDate] = useState("")
  const [useSampleData, setUseSampleData] = useState(true)
  const [activeTab, setActiveTab] = useState<"items" | "xml" | "comparison">("items")

  const [copied, setCopied] = useState(false)
  const [cmdCopied, setCmdCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<EgpRssActionResult | null>(null)

  const copyDeleteCommand = () => {
    navigator.clipboard.writeText(DELETE_COMMAND)
    setCmdCopied(true)
    setTimeout(() => setCmdCopied(false), 2000)
  }

  const handleFetch = (overrideSample?: boolean) => {
    startTransition(async () => {
      const res = await fetchEgpRssAction({
        deptId,
        deptsubId,
        anounceType,
        methodId,
        announceDate,
        useSampleData: overrideSample !== undefined ? overrideSample : useSampleData,
      })
      setResult(res)
    })
  }

  const copyXml = () => {
    if (result?.data?.rawXml) {
      navigator.clipboard.writeText(result.data.rawXml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const previewUrl = (() => {
    const params = new URLSearchParams()
    if (deptId.trim()) params.set("deptId", deptId.trim())
    if (deptsubId.trim()) params.set("deptsubId", deptsubId.trim())
    if (methodId && methodId !== "all") params.set("methodId", methodId)
    if (anounceType && anounceType !== "all") params.set("anounceType", anounceType)
    if (announceDate.trim()) params.set("announceDate", announceDate.trim())
    return `http://process3.gprocurement.go.th/EPROCRssFeedWeb/egpannouncerss.xml?${params.toString()}`
  })()

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">
              Official e-GP RSS Service
            </Badge>
            <Badge variant="secondary" className="font-mono text-xs">
              process3.gprocurement.go.th
            </Badge>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            e-GP RSS Feed API Playground
          </h1>
          <p className="text-muted-foreground">
            ทดสอบการดึงประกาศจัดซื้อจัดจ้างและร่าง TOR จากระบบ e-GP (กรมบัญชีกลาง) ในรูปแบบ RSS/XML
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleFetch(true)}
          className="gap-2 self-start"
          disabled={isPending}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          โหลดตัวอย่าง XML ทันที
        </Button>
      </div>

      {/* How to Delete This Playground Guide */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-destructive/10 p-2 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground flex items-center gap-2">
                วิธีลบ Playground นี้ออก (How to Delete This Playground)
                <Badge variant="outline" className="text-xs border-destructive/40 text-destructive">
                  2 โฟลเดอร์เท่านั้น
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                เมื่อทดสอบเสร็จแล้ว สามารถลบไฟล์ Playground ทั้งหมดได้ทันทีโดยไม่กระทบโค้ดส่วนอื่นของโปรเจกต์
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={copyDeleteCommand}
            className="shrink-0 gap-1.5 border-destructive/30 text-xs hover:bg-destructive/10"
          >
            {cmdCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                คัดลอกคำสั่งลบแล้ว!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                คัดลอกคำสั่งลบ (Copy Delete Command)
              </>
            )}
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-background p-2.5 border font-mono text-xs text-muted-foreground">
            <span className="font-semibold text-foreground block mb-1">
              💻 รันคำสั่งนี้ใน PowerShell เพื่อลบ:
            </span>
            <code className="text-destructive select-all">
              {DELETE_COMMAND}
            </code>
          </div>

          <div className="rounded-lg bg-background p-2.5 border font-mono text-xs text-muted-foreground">
            <span className="font-semibold text-foreground block mb-1">
              📁 หรือลบด้วยตนเอง 2 โฟลเดอร์นี้:
            </span>
            <ul className="space-y-0.5 text-[11px]">
              <li>• <code>frontend/src/app/(main)/egp-playground/</code></li>
              <li>• <code>backend/src/playground/</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Operating Hours Info Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <div className="font-semibold">
              รอบเวลาเปิด-ปิดการเชื่อมโยงระบบ e-GP RSS ตามคู่มือกรมบัญชีกลาง
            </div>
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              กรมบัญชีกลางกำหนดให้ระบบ RSS เปิดให้บริการ 2 ช่วงเวลา:{" "}
              <span className="font-semibold underline">12:01 - 12:59 น.</span> และ{" "}
              <span className="font-semibold underline">17:01 - 08:29 น.</span>{" "}
              (ระบบจะปิดช่วง 09:00 - 12:00 และ 13:00 - 17:00 เพื่อลดภาระเซิร์ฟเวอร์ e-GP). หากทดสอบนอกเวลาเปิด ให้ใช้โหมด{" "}
              <strong>Sample Data</strong> เพื่อทดลองโครงสร้างข้อมูลและปุ่มเปิดไฟล์ TOR ได้ทันที
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Controls / Parameters Column */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5 text-primary" />
                ตั้งค่าพารามิเตอร์ (Query Parameters)
              </CardTitle>
              <CardDescription>
                กำหนดค่าตัวแปรตามคู่มือการเชื่อมโยงข้อมูล e-GP RSS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* deptId */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. รหัสหน่วยงานหลัก (deptId)
                </label>
                <Input
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  placeholder="เช่น 0304 (กรมบัญชีกลาง), 1500 (กทม.)"
                  className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {DEPT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setDeptId(preset.id)}
                      className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
                        deptId === preset.id
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {preset.id} {preset.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* deptsubId */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  รหัสหน่วยจัดซื้อย่อย (deptsubId - 10 หลัก ไม่บังคับ)
                </label>
                <Input
                  value={deptsubId}
                  onChange={(e) => setDeptsubId(e.target.value)}
                  placeholder="เช่น 0300400070"
                  className="font-mono text-sm"
                />
              </div>

              {/* anounceType */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2. ประเภทประกาศ (anounceType)
                </label>
                <select
                  value={anounceType}
                  onChange={(e) => setAnounceType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:border-primary focus:outline-hidden"
                >
                  {ANNOUNCE_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  * ใช้ <strong>B0</strong> เพื่อดึงเฉพาะ <em>ร่างเอกสารประกวดราคา / ร่าง TOR</em>
                </p>
              </div>

              {/* methodId */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  3. วิธีการจัดหา (methodId)
                </label>
                <select
                  value={methodId}
                  onChange={(e) => setMethodId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:border-primary focus:outline-hidden"
                >
                  {PROCUREMENT_METHODS.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* announceDate */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  4. วันที่ประกาศ (announceDate - YYYYMMDD ไม่บังคับ)
                </label>
                <Input
                  value={announceDate}
                  onChange={(e) => setAnnounceDate(e.target.value)}
                  placeholder="เช่น 20241126 (หากเว้นว่างจะดึง 20 รายการล่าสุด)"
                  className="font-mono text-sm"
                />
              </div>

              {/* Sample Data vs Live Switch */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSampleData}
                    onChange={(e) => setUseSampleData(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>ใช้โหมด Sample Data (ไม่ต้องรอรอบเปิดเซิร์ฟเวอร์)</span>
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  {useSampleData
                    ? "จำลองข้อมูล XML จริงจากเอกสารคู่มือของกรมบัญชีกลาง เพื่อทดสอบการ parse และดูลิงก์เอกสาร"
                    : "จะส่งคำขอไปยังเซิร์ฟเวอร์จริง http://process3.gprocurement.go.th (ต้องอยู่ในช่วงเวลาเปิด 12:01-12:59 หรือ 17:01-08:29)"}
                </p>
              </div>

              {/* URL Preview */}
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  URL โครงสร้างคำขอ:
                </div>
                <div className="break-all rounded-md bg-muted p-2 font-mono text-xs text-foreground/80">
                  {previewUrl}
                </div>
              </div>

              {/* Fetch Action Button */}
              <Button
                onClick={() => handleFetch()}
                disabled={isPending}
                className="w-full gap-2 py-6 text-base font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    กำลังเรียกข้อมูล e-GP...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    ทดสอบยิงคำขอ (Fetch e-GP Feed)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results & Inspection Column */}
        <div className="space-y-6 lg:col-span-7">
          {/* Status or Error Box */}
          {result && (
            <div
              className={`rounded-xl border p-4 ${
                result.success
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">
                    {result.success
                      ? result.isSampleData
                        ? "โหลดข้อมูลตัวอย่าง (Sample Mode) สำเร็จ"
                        : "ดึงข้อมูลจาก e-GP สำเร็จ!"
                      : "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ e-GP ได้"}
                  </div>
                  <p className="text-xs">
                    {result.error ||
                      `พบประกาศทั้งหมด ${result.data?.items.length ?? 0} รายการ (ปรับปรุงล่าสุด: ${
                        result.data?.channel.lastBuildDate ?? "-"
                      })`}
                  </p>
                  <div className="text-xs font-mono opacity-80 pt-1">
                    {result.serverWindow.currentWindowMessage}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">ผลลัพธ์การเรียกข้อมูล (Feed Results)</CardTitle>
                <CardDescription>
                  {result?.data?.items.length
                    ? `แสดง ${result.data.items.length} รายการประกาศ`
                    : "กด 'ทดสอบยิงคำขอ' เพื่อดูผลลัพธ์"}
                </CardDescription>
              </div>

              {/* Navigation Tabs */}
              <div className="flex rounded-lg border bg-muted p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("items")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                    activeTab === "items"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  รายการประกาศ ({result?.data?.items.length ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("xml")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                    activeTab === "xml"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5" />
                  Raw XML
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("comparison")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                    activeTab === "comparison"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Info className="h-3.5 w-3.5" />
                  เปรียบเทียบกับ Scraper
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {/* Tab 1: Items List */}
              {activeTab === "items" && (
                <div className="space-y-4">
                  {!result?.data?.items || result.data.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                      <FileText className="mb-2 h-10 w-10 stroke-1 text-muted-foreground/50" />
                      <p className="text-sm font-medium">ยังไม่มีข้อมูล</p>
                      <p className="mt-1 text-xs">
                        กดปุ่ม &quot;ทดสอบยิงคำขอ&quot; หรือ &quot;โหลดตัวอย่าง XML ทันที&quot; ด้านบน
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {result.data.items.map((item: EgpRssItem, index: number) => (
                        <div
                          key={index}
                          className="group relative flex flex-col justify-between gap-3 rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-xs"
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.projectNo && (
                                <Badge variant="outline" className="font-mono text-xs">
                                  โครงการ #{item.projectNo}
                                </Badge>
                              )}
                              {item.procurementMethod && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.procurementMethod}
                                </Badge>
                              )}
                              {item.announcementType && (
                                <Badge
                                  className={`text-xs ${
                                    item.announcementType.includes("ร่าง")
                                      ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200"
                                      : "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200"
                                  }`}
                                  variant="outline"
                                >
                                  {item.announcementType}
                                </Badge>
                              )}
                              {item.pubDate && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                  ประกาศเมื่อ: {item.pubDate}
                                </span>
                              )}
                            </div>

                            <h3 className="text-base font-semibold leading-snug text-foreground">
                              {item.title}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between border-t border-border/50 pt-3">
                            <span className="truncate text-xs font-mono text-muted-foreground max-w-[280px] sm:max-w-md">
                              {item.link}
                            </span>
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                            >
                              <span>เปิดไฟล์ TOR / เอกสาร</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Raw XML */}
              {activeTab === "xml" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      XML Payload จาก e-GP Server
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyXml}
                      className="h-8 gap-1.5 text-xs"
                      disabled={!result?.data?.rawXml}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? "คัดลอกแล้ว!" : "คัดลอก XML"}
                    </Button>
                  </div>
                  <ScrollArea className="max-h-[500px] rounded-lg bg-muted p-4">
                    <pre className="font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {result?.data?.rawXml || "ไม่มีข้อมูล XML"}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {/* Tab 3: Comparison View */}
              {activeTab === "comparison" && (
                <div className="space-y-4 text-sm">
                  <h3 className="font-semibold text-foreground">
                    เปรียบเทียบ: e-GP RSS Feed API vs. BMA Playwright Scraper
                  </h3>

                  <ScrollArea orientation="horizontal" className="rounded-lg border">
                    <table className="w-full min-w-[540px] text-left text-xs">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="p-3">หัวข้อ</th>
                          <th className="p-3 text-emerald-600 dark:text-emerald-400">
                            e-GP RSS Feed API (คู่มือนี้)
                          </th>
                          <th className="p-3 text-blue-600 dark:text-blue-400">
                            BMA Scraper (Playwright)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="p-3 font-medium">ประเภท</td>
                          <td className="p-3">Official XML/RSS Feed (กรมบัญชีกลาง)</td>
                          <td className="p-3">Headless Browser DOM Scraping (BMA Portal)</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">ความเร็ว & ทรัพยากร</td>
                          <td className="p-3 text-emerald-600 font-medium">
                            เร็วมาก (HTTP GET ธรรมดา ไม่ต้องเปิดเบราว์เซอร์)
                          </td>
                          <td className="p-3 text-amber-600">
                            กินทรัพยากรสูง (ต้องรัน Chromium headless)
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">เวลาให้บริการ</td>
                          <td className="p-3 text-amber-600">
                            จำกัดเวลา: เปิดเฉพาะ 12:01-12:59 และ 17:01-08:29
                          </td>
                          <td className="p-3 text-emerald-600 font-medium">
                            เปิดตลอด 24 ชม. ผ่านเว็บหน้าบ้าน
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">จำนวนข้อมูลย้อนหลัง</td>
                          <td className="p-3">
                            ส่งให้ 20 รายการล่าสุดต่อวัน (ย้อนหลังไม่เกิน 7 วัน)
                          </td>
                          <td className="p-3">
                            ค้นหาย้อนหลังได้หลายหน้าผ่าน UI หน้าเว็บ
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-medium">การดึงไฟล์ TOR PDF</td>
                          <td className="p-3">
                            ส่งลิงก์ไฟล์ PDF ผ่านแท็ก <code>&lt;link&gt;</code> โดยตรง
                          </td>
                          <td className="p-3">
                            ต้องคลิกเข้าหน้ารายละเอียดเพื่อหาลิงก์ดาวน์โหลด
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </ScrollArea>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground">💡 ข้อสรุปสำหรับทีมพัฒนา:</p>
                    <p>
                      หากใช้ e-GP RSS Feed เป็นตัวดึงข้อมูลหลัก สามารถตั้ง Cron Job (เช่น ทุกเย็น 17:30 น. และเช้า 08:00 น.) 
                      เพื่อดึงประกาศร่าง TOR (<code>anounceType=B0</code>) ของหน่วยงาน เช่น กรมบัญชีกลาง (<code>0304</code>) หรือ กทม. (<code>1500</code>) 
                      และนำลิงก์ PDF ไปส่งให้ AI Claude บน Vertex AI ประมวลผลต่อได้เลย โดยไม่ต้องพึ่ง Playwright Chromium!
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
