# TOR-Match — สรุปสิ่งที่ Project Owner ต้องรู้

## 1. โปรเจกต์นี้คืออะไร

แพลตฟอร์มที่ดึงประกาศจัดซื้อจัดจ้างภาครัฐ (TOR) มาอัตโนมัติ ให้ AI อ่าน PDF แล้วสรุปเป็นข้อมูลมีโครงสร้าง จับคู่กับโปรไฟล์บริษัทที่บันทึกไว้ในระบบ และแจ้งเตือนเฉพาะบริษัทที่มีคุณสมบัติตรงตามเงื่อนไขจริงๆ — ไม่ใช่แค่สรุปให้อ่านง่ายขึ้น แต่แปลงเงื่อนไขให้เป็นสิ่งที่ระบบเช็คอัตโนมัติได้

## 2. Tech Stack

- **Backend**: Node.js + Express, MongoDB Atlas, JWT auth, Zod validation
- **Frontend**: Next.js (App Router), Server Components/Server Actions
- **AI**: Claude (Anthropic) ผ่าน **Google Vertex AI** — ไม่ใช่ Gemini แม้จะรันบน Google Cloud (auth ผ่าน GCP Application Default Credentials ไม่ใช่ API key)
- **Scraper**: Playwright (ดึงข้อมูลจากเว็บ egp2.bangkok.go.th ของ กทม.)
- **Monorepo**: npm workspaces (`frontend/`, `backend/`)

## 3. Data Flow หลัก (Pipeline)

```
Scraper (Playwright) ดึงประกาศ + PDF จากเว็บ BMA
        ↓
AI Extraction (Claude ผ่าน Vertex) อ่าน PDF โดยตรง (ไม่ต้อง OCR แยก)
สกัดออกมาเป็น: ชื่อ, หน่วยงาน, งบประมาณ, กำหนดส่ง, milestone การจ่ายเงิน,
              เงื่อนไขคุณสมบัติแบบมีโครงสร้าง (ทุนจดทะเบียน/ผลงาน/certification/e-GP/blacklist),
              คะแนนความมั่นใจ (aiConfidence 0-100)
        ↓
TorDraft (คิวรอตรวจสอบ)
        ↓
  ├─ confidence สูงพอ (ตามเกณฑ์ที่ตั้งในหน้า Admin Settings) → Auto-publish ทันที
  └─ confidence ต่ำ → รอแอดมินตรวจที่ /admin/tor-review
        ↓
Tor (collection จริง ที่ผู้ใช้เห็นในหน้า Browse)
        ↓
เช็คทุกบริษัทในระบบว่ามีใครตรงเงื่อนไขใหม่บ้าง → สร้าง Notification อัตโนมัติ
```

## 4. ฟีเจอร์ที่ทำเสร็จแล้ว

| ฟีเจอร์ | สถานะ |
|---|---|
| Scraper ดึงประกาศ + PDF จากเว็บ BMA | ✅ โค้ดพร้อม (ติดปัญหาตัวกรองปี ดูข้อ 6) |
| AI extraction อ่าน PDF → ข้อมูลโครงสร้าง | ✅ โค้ดพร้อม (รอ quota ทดสอบจริง ดูข้อ 6) |
| เงื่อนไขคุณสมบัติแบบ machine-checkable | ✅ ทำงานจริง เช็คได้ 5 ประเภท (ทุนจดทะเบียน/ผลงาน/cert/e-GP/blacklist) |
| Matching engine (เช็คบริษัทกับ TOR) | ✅ คืนสถานะ 4 แบบ: passed/failed/ข้อมูลไม่พอ/ต้องรีวิวคน |
| Auto-publish เมื่อ confidence สูงพอ | ✅ อ่าน threshold จาก Admin Settings จริง ปรับได้โดยไม่ต้อง deploy |
| หน้ารีวิวแอดมิน (`/admin/tor-review`) | ✅ แก้ไขได้ทุก field รวมเงื่อนไขคุณสมบัติ |
| แจ้งเตือนอัตโนมัติเมื่อ TOR ตรงเงื่อนไข | ✅ deep-link ไปที่ TOR นั้นตรงๆ |
| ตั้งค่าการแจ้งเตือนส่วนตัว (`/settings/notifications`) | ✅ บันทึกจริงต่อ user |
| Admin System Settings | ✅ ปรับค่าระบบได้จากหน้าเว็บ ไม่ hardcode |
| Company setup wizard | ✅ บันทึกจริงต่อ user |
| Workspace / bookmark TOR | ✅ |

## 5. การตัดสินใจเชิงเทคนิคที่สำคัญ (และเหตุผล)

- **Claude ผ่าน Vertex AI ไม่ใช่ Gemini/Anthropic API ตรง** — ทีมเลือกใช้ Vertex (น่าจะเรื่อง GCP credit) แม้ task list เดิมจะเขียนว่า "Gemini prompt" ไว้
- **อ่าน PDF ตรงๆ ไม่ต้อง OCR** — Claude อ่านเอกสารได้เองทั้งแบบมี text layer และแบบสแกนเป็นภาพ
- **ไม่ hardcode threshold/setting** — ทุกค่าที่ควรปรับได้ (auto-approve threshold, enabled/disabled) ดึงจาก Admin Settings ใน DB สดๆ ทุกครั้ง ไม่ใช่ค่าคงที่ในโค้ด
- **ฟอร์มรีวิว TOR แก้เป็นภาษาไทยเป็นหลัก** — เพราะไทยเป็นภาษา default ของเว็บ อังกฤษเป็นข้อมูลเสริมที่ backend merge กลับให้เอง
- **Validation ตอน publish**: ต้องมี title + department อย่างน้อยภาษาใดภาษาหนึ่ง (ไม่บังคับอังกฤษ) — เพราะ TOR อาจมีแค่ภาษาไทยได้
- **TorDraft แยก collection จาก Tor จริง** — กันไม่ให้ข้อมูลที่ยังไม่ผ่านรีวิวหลุดไปแสดงในหน้า Browse โดยไม่ตั้งใจ

## 6. สถานะปัจจุบัน — ติดตรงไหน

1. **AI extraction ยังไม่เคยรันจบ end-to-end จริง** — โค้ดพร้อม ทดสอบแล้วว่า auth/logic ถูกต้อง แต่ติด **GCP quota** ของโมเดล Claude บน Vertex AI project `tor-match-508814` (ส่ง request ขอ quota ไปแล้ว รอ Google อนุมัติ — ควบคุมเวลาไม่ได้)
2. **Scraper เจอปัญหาตัวกรองปีของเว็บ BMA** — เว็บ default กรองปีงบประมาณ 2565-2568 (พ.ศ.) ไม่ครอบคลุมปีปัจจุบัน (2569) ทำให้ discovery ได้ 0 รายการ ต้องแก้โค้ดให้เลือกปีเองแทนพึ่ง default ของเว็บ
3. **PR รอเปิด** — งานทั้งหมดอยู่ที่ branch `feat/AI-summary` push ขึ้น GitHub แล้ว พร้อมเปิด PR เข้า `main` (compare link: `github.com/Nanokwok/TOR-Match/compare/main...feat/AI-summary`)

## 7. Known Gaps (งานที่ยังไม่ทำ/ทำไม่ครบ)

- ถ้า PDF อ่านไม่ได้ระหว่าง extraction → ตอนนี้ job แค่ fail ไม่มี draft ให้คนตรวจ (ควรเซฟ draft ไว้รีวิวแทน)
- Threshold ที่ scraper ใช้ตอน ingest เอง (`run-scrape.ts`) ยังไม่ได้อ่านจาก Admin Settings เหมือน auto-publish hook (คนละกลไกกัน เพราะใช้ `findOneAndUpdate` ซึ่งไม่ทริกเกอร์ hook)
- ยังไม่มี cron scheduler (แผนคือรันวันละ 2 รอบ 18:00 กับ 07:00 สำรอง)
- ยังไม่มีการส่ง digest email จริง (มีแค่ preference ให้ผู้ใช้ตั้งค่า)
- หน้า Admin Overview (แดชบอร์ด) บางส่วนยังเป็น mock data (กราฟ trend, activity feed)
- กำลังสำรวจ RSS feed ทางการของกรมบัญชีกลาง (e-GP) เป็นทางเลือกแทนการ scrape เว็บ — ยังเป็นแค่หน้าทดลอง (`/egp-playground`) ยังไม่เชื่อมเข้าระบบจริง

## 8. โครงสร้าง Branch (ตอนนี้)

- `main` — โค้ดที่ merge แล้วอย่างเป็นทางการ
- `feat/AI-summary` — งานทั้งหมดของ AI pipeline (รวม auto-publish, criteria editor fix, scraper) พร้อมเปิด PR เข้า main แล้ว
- `feat/tor-scraper` — งานเดิมของ BossPattadon (merge เข้า feat/AI-summary แล้ว)
- `feat/TOR-approval` — auto-publish + criteria fix (merge เข้า feat/AI-summary แล้ว)

## 9. ศัพท์ที่ควรรู้

- **TorDraft** — ประกาศที่ยังไม่ผ่านการอนุมัติ/รีวิว
- **Tor** — ประกาศที่เผยแพร่แล้ว ผู้ใช้ทั่วไปเห็นได้
- **aiConfidence** — คะแนนความมั่นใจของ AI ตอนอ่าน PDF (0-100)
- **autoApproveThreshold** — ค่า confidence ขั้นต่ำที่จะ auto-publish (ตั้งได้ที่ `/admin/settings`)
- **qualification criteria** — เงื่อนไขคุณสมบัติแบบมีโครงสร้าง ที่ matching engine เช็คได้อัตโนมัติ
- **e-GP** — ระบบจัดซื้อจัดจ้างภาครัฐทางอิเล็กทรอนิกส์ของกรมบัญชีกลาง
