import type { Tor } from "@/types/tor"

export const LOCAL_OFFICE_TH: Record<string, string> = {
  "Phra Nakhon District": "เขตพระนคร",
  "Chatuchak District": "เขตจตุจักร",
  "Traffic & Transportation Dept": "กองการจราจรและขนส่ง",
  "Bang Kapi District": "เขตบางกะปิ",
  "Pathum Wan District": "เขตปทุมวัน",
  "Huai Khwang District": "เขตห้วยขวาง",
  "Lat Phrao District": "เขตลาดพร้าว",
  "Din Daeng District": "เขตดินแดง",
  "Ratchathewi District": "เขตราชเทวี",
  "Khlong Toei District": "เขตคลองเตย",
  "Sathon District": "เขตสาทร",
  "Bang Rak District": "เขตบางรัก",
  "Watthana District": "เขตวัฒนา",
  "Bang Sue District": "เขตบางซื่อ",
  "Public Works District Office": "สำนักงานเขตโยธา",
}

export const DEPARTMENT_TH: Record<string, string> = {
  "Strategy and Evaluation Department": "สำนักการวางแผนและประเมินผล",
  "Traffic and Transportation Department": "สำนักการจราจรและขนส่ง",
  "Public Health Department": "สำนักการแพทย์",
  "Education Department": "สำนักการศึกษา",
  "Environment Department": "สำนักสิ่งแวดล้อม",
  "Finance Department": "สำนักการคลัง",
  "Drainage and Sewerage Department": "สำนักการระบายน้ำ",
  "Social Development Department": "สำนักการพัฒนาสังคม",
  "Culture, Sports and Tourism Department": "สำนักการวัฒนธรรม กีฬา และการท่องเที่ยว",
  "Law and Litigation Office": "สำนักกฎหมายและคดี",
  "Human Resource Development Department": "สำนักการพัฒนาทรัพยากรบุคคล",
  "Public Works Department": "สำนักการโยธา",
  "Information Technology Department": "สำนักเทคโนโลยีสารสนเทศ",
  "City Law Enforcement Department": "สำนักการบังคับใช้กฎหมาย",
  "City Planning Department": "สำนักการวางผังและพัฒนาเมือง",
}

const QUALIFICATION_TH = {
  "Registered Capital": {
    requirementTh: "ทุนจดทะเบียน",
    torCriteriaTh: (min: number) =>
      `≥ ${min.toLocaleString("th-TH")} บาท`,
  },
  "Past Performance": {
    requirementTh: "ผลงานที่ผ่านมา",
    torCriteriaTh: (min: number) =>
      `สัญญา Web App ≥ ${min.toLocaleString("th-TH")} บาท`,
  },
  Certifications: {
    requirementTh: "ใบรับรอง",
    torCriteriaTh: "ISO/IEC 29110 หรือ CMMI Level 2+",
  },
  "Deal-Breaker Clauses": {
    requirementTh: "ข้อกำหนดตัดสิทธิ์",
    torCriteriaTh: "ต้องเป็นผู้ค้าอิเล็กทรอนิกส์ที่ลงทะเบียน e-GP",
  },
  "Government System Experience": {
    requirementTh: "ประสบการณ์ระบบภาครัฐ",
    torCriteriaTh:
      "ต้องมีประสบการณ์ส่งมอบระบบจัดซื้อจัดจ้างหรือระบบงบประมาณให้หน่วยงานภาครัฐ",
  },
  "Dedicated Project Team": {
    requirementTh: "ทีมโครงการเฉพาะ",
    torCriteriaTh:
      "ต้องมีผู้จัดการโครงการเต็มเวลาและนักพัฒนาระดับอาวุโสอย่างน้อย 2 คนตลอดสัญญา",
  },
} as const

const MILESTONE_DELIVERABLES_TH = [
  "ส่งมอบ Project Charter และข้อกำหนดสถาปัตยกรรมระบบ",
  "ส่งมอบระบบ OCR สคีมาฐานข้อมูล และ UI/UX ส่วนหน้า",
  "พัฒนา API และทดสอบการเชื่อมต่อ",
  "ทดสอบระบบขั้นสุดท้ายและ UAT",
  "ส่งมอบโครงการและเอกสารครบถ้วน",
]

export const TOR_TRANSLATIONS: Record<
  string,
  {
    titleTh: string
    summaryTh: string
    durationLabelTh: string
    deliverablesTh: string[]
  }
> = {
  "tor-001": {
    titleTh:
      "พัฒนาระบบติดตามการจัดซื้อจัดจ้างและงบประมาณ กทม. (BMA Procurement Tracker)",
    summaryTh:
      "พัฒนาเว็บแอปพลิเคชันติดตามการจัดซื้อจัดจ้างและงบประมาณ กทม. รวมระบบ OCR สำหรับใบแจ้งหนี้ PDF แดชบอร์ดวิเคราะห์แบบเรียลไทม์ และไปป์ไลน์กระทบยอดงบประมาณอัตโนมัติ",
    durationLabelTh: "180 วัน (6 เดือน)",
    deliverablesTh: [
      "ระบบแปลง PDF และ OCR",
      "แดชบอร์ดวิเคราะห์แบบเรียลไทม์",
      "ไปป์ไลน์กระทบยอดงบประมาณอัตโนมัติ",
      "โมดูลควบคุมสิทธิ์ตามบทบาท",
      "พอร์ทัลผู้ดูแลและรายงาน",
    ],
  },
  "tor-002": {
    titleTh: "แพลตฟอร์มวิเคราะห์การจราจร Smart City สำหรับกรุงเทพมหานคร",
    summaryTh:
      "สร้างแพลตฟอร์มวิเคราะห์การจราจรทั่วเมือง รับข้อมูลจากเซนเซอร์ IoT คาดการณ์ความแออัด และให้แดชบอร์ดปฏิบัติการแก่สำนักงานเขต",
    durationLabelTh: "365 วัน (12 เดือน)",
    deliverablesTh: [
      "ชั้นรับข้อมูล IoT",
      "โมเดลคาดการณ์ความแออัด",
      "แดชบอร์ดปฏิบัติการระดับเขต",
      "บริการแจ้งเตือน",
      "Open Data API สาธารณะ",
    ],
  },
  "tor-003": {
    titleTh: "ระบบบูรณาการเวชระเบียนดิจิทัลสำหรับโรงพยาบาล กทม.",
    summaryTh:
      "บูรณาการระบบเวชระเบียนที่กระจัดกระจายให้เป็นแพลตฟอร์มสุขภาพดิจิทal เดียว รองรับ HL7/FHIR และการยินยอมผู้ป่วยอย่างปลอดภัย",
    durationLabelTh: "270 วัน (9 เดือน)",
    deliverablesTh: [
      "เกตเวย์เชื่อมต่อ FHIR",
      "ดัชนีผู้ป่วยรวม",
      "โมดูลจัดการความยินยอม",
      "UI ดูข้อมูลทางคลินิก",
      "รายงานตรวจสอบและกำกับดูแล",
    ],
  },
  "tor-004": {
    titleTh: "ระบบจัดการเนื้อหา E-Learning สำหรับโรงเรียน กทม.",
    summaryTh:
      "ส่งมอบ CMS เบาๆ ให้ครูสร้าง จัดการ และเผยแพร่สื่อการเรียนรู้ดิจิทal ไปยังโรงเรียน กทม.",
    durationLabelTh: "120 วัน (4 เดือน)",
    deliverablesTh: [
      "พื้นที่สร้างเนื้อหา",
      "คลังสื่อดิจิทal",
      "พอร์ทัลเผยแพร่สู่โรงเรียน",
      "รายงานการใช้งาน",
    ],
  },
  "tor-005": {
    titleTh: "แดชบอร์ดเซนเซอร์สิ่งแวดล้อมและระบบแจ้งเตือน",
    summaryTh:
      "สร้างแดชบอร์ดคุณภาพอากาศและน้ำแบบเรียลไทม์ พร้อมแจ้งเตือนผ่าน LINE และอีเมลเมื่อเกินเกณฑ์",
    durationLabelTh: "150 วัน (5 เดือน)",
    deliverablesTh: [
      "API รับข้อมูลเซนเซอร์",
      "แดชบอร์ดเรียลไทม์",
      "ระบบแจ้งเตือนตามเกณฑ์",
      "เชื่อมต่อ LINE Notify",
    ],
  },
  "tor-006": {
    titleTh: "ออกแบบใหม่แอปมือถือชำระภาษีท้องถิ่น",
    summaryTh:
      "ออกแบบและพัฒนาแอปมือถือชำระภาษีท้องถิ่นใหม่ รองรับ e-Payment และใบเสร็จดิจิทal",
    durationLabelTh: "150 วัน (5 เดือน)",
    deliverablesTh: [
      "UI/UX แอปมือถือ",
      "เชื่อมต่อช่องทางชำระเงิน",
      "ใบเสร็จดิจิทal",
      "ระบบแจ้งเตือน",
    ],
  },
  "tor-007": {
    titleTh: "ระบบระบายน้ำอัจฉริยะและเตือนภัยน้ำท่วมล่วงหน้า",
    summaryTh:
      "พัฒนาระบบติดตามระดับน้ำและพยากรณ์น้ำท่วม แจ้งเตือนประชาชนและหน่วยงานล่วงหน้า",
    durationLabelTh: "210 วัน (7 เดือน)",
    deliverablesTh: [
      "ระบบติดตามระดับน้ำ",
      "โมเดลพยากรณ์น้ำท่วม",
      "แดชบอร์ดสถานการณ์",
      "ระบบแจ้งเตือนหลายช่องทาง",
    ],
  },
  "tor-008": {
    titleTh: "เว็บแอปจัดการเคสสวัสดิการสังคม",
    summaryTh:
      "พัฒนาระบบจัดการเคสสวัสดิการสังคม ติดตามสิทธิ เอกสาร และการให้บริการ",
    durationLabelTh: "180 วัน (6 เดือน)",
    deliverablesTh: [
      "ระบบลงทะเบียนเคส",
      "ติดตามเอกสารและสิทธิ",
      "แดชบอร์ติดตาม",
      "รายงานสรุป",
    ],
  },
  "tor-009": {
    titleTh: "คลังมรดกทางวัฒนธรรมดิจิทal และทัวร์เสมือนจริง",
    summaryTh:
      "สร้างคลังข้อมูลมรดกทางวัฒนธรรมดิจิทal พร้อมทัวร์เสมือนจริงสำหรับประชาชน",
    durationLabelTh: "240 วัน (8 เดือน)",
    deliverablesTh: [
      "คลังข้อมูลมรดก",
      "ทัวร์เสมือนจริง",
      "พอร์ทal สาธารณะ",
      "ระบบจัดการเนื้อหา",
    ],
  },
  "tor-010": {
    titleTh: "ระบบอัตโนมัติเอกสารทางกฎหมายและพอร์ทal ลายเซ็นอิเล็กทรอนิกส์",
    summaryTh:
      "พัฒนาระบบจัดการเอกสารทางกฎหมายและลงนามอิเล็กทรอนิกส์อย่างปลอดภัย",
    durationLabelTh: "180 วัน (6 เดือน)",
    deliverablesTh: [
      "ระบบจัดการเอกสาร",
      "ลายเซ็นอิเล็กทรอนิกส์",
      "เวิร์กโฟลว์อนุมัติ",
      "ระบบตรวจสอบย้อนกลับ",
    ],
  },
  "tor-011": {
    titleTh: "พอร์ทal HR Self-Service และระบบจัดการลา",
    summaryTh:
      "พัฒนาพอร์ทal บริการตนเองสำหรับพนักงาน กทม. และระบบจัดการลา",
    durationLabelTh: "150 วัน (5 เดือน)",
    deliverablesTh: [
      "พอร์ทal บริการตนเอง",
      "ระบบจัดการลา",
      "แดชบอร์ HR",
      "รายงานบุคลากร",
    ],
  },
  "tor-012": {
    titleTh: "แพลตฟอร์มมือถือบำรุงรักษาทรัพย์สินโยธา",
    summaryTh:
      "พัฒนาแอปมือถือสำหรับบันทึกและติดตามการบำรุงรักษาทรัพย์สินโยธา",
    durationLabelTh: "180 วัน (6 เดือน)",
    deliverablesTh: [
      "แอปมือถือสำหรับภาคสนาม",
      "ระบบติดตามงานซ่อม",
      "แดชบอร์ติดตาม",
      "รายงานสรุป",
    ],
  },
  "tor-013": {
    titleTh: "แชทบอทประชาชนและระบบ Service Desk อัตโนมัติ กทม.",
    summaryTh:
      "พัฒนาแชทบอทตอบคำถามประชาชนและระบบ Service Desk อัตโนมัติ",
    durationLabelTh: "210 วัน (7 เดือน)",
    deliverablesTh: [
      "แชทบอทประชาชน",
      "ระบบ Service Desk",
      "ฐานความรู้",
      "แดชบอร์ติดตาม",
    ],
  },
  "tor-014": {
    titleTh: "ระบบวิเคราะห์วิดีโอ CCTV และตรวจจับเหตุการณ์",
    summaryTh:
      "พัฒนาระบบวิเคราะห์ภาพจาก CCTV เพื่อตรวจจับเหตุการณ์และแจ้งเตือน",
    durationLabelTh: "270 วัน (9 เดือน)",
    deliverablesTh: [
      "ระบบวิเคราะห์วิดีโอ",
      "ตรวจจับเหตุการณ์",
      "แดชบอร์ติดตาม",
      "ระบบแจ้งเตือน",
    ],
  },
  "tor-015": {
    titleTh: "พื้นที่ทำงานร่วม GIS สำหรับการวางผังเมือง",
    summaryTh:
      "สร้างพื้นที่ทำงานร่วม GIS สำหรับทีมวางผังเมือง กทม.",
    durationLabelTh: "240 วัน (8 เดือน)",
    deliverablesTh: [
      "พื้นที่ทำงาน GIS ร่วม",
      "เครื่องมือวิเคราะห์",
      "ระบบจัดการเลเยอร์",
      "พอร์ทal รายงาน",
    ],
  },
}

export function applyTorTranslations(tor: Tor): Tor {
  const translation = TOR_TRANSLATIONS[tor.id]

  return {
    ...tor,
    departmentTh: DEPARTMENT_TH[tor.department],
    localOfficeTh: LOCAL_OFFICE_TH[tor.localOffice],
    ...(translation ?? {}),
    qualificationRequirements: tor.qualificationRequirements.map((req) => {
      const qualTh =
        QUALIFICATION_TH[req.requirement as keyof typeof QUALIFICATION_TH]
      if (!qualTh) return req

      return {
        ...req,
        requirementTh: qualTh.requirementTh,
        torCriteriaTh:
          typeof qualTh.torCriteriaTh === "function"
            ? qualTh.torCriteriaTh(
                parseInt(req.torCriteria.replace(/[^\d]/g, ""), 10) || 0
              )
            : qualTh.torCriteriaTh,
      }
    }),
    financials: {
      ...tor.financials,
      milestones: tor.financials.milestones.map((milestone, index) => ({
        ...milestone,
        deliverableTh:
          MILESTONE_DELIVERABLES_TH[index] ?? milestone.deliverable,
      })),
    },
  }
}
