"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { useLocale } from "@/components/i18n/locale-provider"

export function PrivacyView() {
  const { locale } = useLocale()
  const isThai = locale === "th"

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
      {/* Header and Back Link */}
      <div className="space-y-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {isThai ? "กลับไปหน้าการตั้งค่า" : "Back to Settings"}
        </Link>

        <header className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-foreground">
            {isThai ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isThai
              ? "แนวทางการคุ้มครองข้อมูลส่วนบุคคลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA) และขั้นตอนการขอใช้สิทธิของเจ้าของข้อมูล"
              : "How TOR Match collects, uses, and protects personal data under Thailand's PDPA, and procedures for data subject requests."}
          </p>
        </header>
      </div>

      {/* 1. SOP FOR DATA ACCESS & DELETION */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {isThai
              ? "ขั้นตอนการขอใช้สิทธิของเจ้าของข้อมูล (ขอลบหรือขอเข้าถึงข้อมูล)"
              : "How to request data access or deletion"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isThai
              ? "ขั้นตอนการดำเนินงานมาตรฐาน (SOP) ตามมาตรา 30 และมาตรา 33 แห่ง พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล"
              : "Standard operating procedures (SOP) under Sections 30 and 33 of the Personal Data Protection Act."}
          </p>
        </div>

        <div className="divide-y divide-border text-sm">
          {/* Deletion SOP */}
          <div className="px-5 py-4 space-y-2">
            <h3 className="font-medium text-foreground">
              {isThai ? "1. การขอลบข้อมูลบัญชีและโปรไฟล์ (Right to Erasure)" : "1. Request account and data deletion"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "หากท่านต้องการลบบัญชี ข้อมูลบริษัท และข้อมูลส่วนบุคคลทั้งหมดออกจากระบบ กรุณาส่งอีเมลจากที่อยู่อีเมลที่ท่านใช้ลงทะเบียนมาที่ tormatch1234@gmail.com โดยระบุหัวข้อ:"
                : "To permanently delete your user account, company profile, and personal data, send an email from your registered email address to tormatch1234@gmail.com with the subject:"}
            </p>
            <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground select-all">
              {isThai
                ? "ขอลบข้อมูลส่วนบุคคล - [ระบุอีเมลของท่าน]"
                : "Data Deletion Request - [Your Email]"}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "ผู้ดูแลระบบจะยืนยันความเป็นเจ้าของบัญชีและดำเนินการลบข้อมูลทั้งหมดออกจากระบบภายใน 30 วัน จากนั้นจะส่งอีเมลแจ้งยืนยันผลการดำเนินการให้ท่านทราบ"
                : "We will verify account ownership and delete all associated records within 30 calendar days, followed by written email confirmation."}
            </p>
          </div>

          {/* Access SOP */}
          <div className="px-5 py-4 space-y-2">
            <h3 className="font-medium text-foreground">
              {isThai ? "2. การขอเข้าถึงหรือรับสำเนาข้อมูล (Right of Access)" : "2. Request a copy of your personal data"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "หากท่านต้องการรับสำเนาข้อมูลส่วนบุคคลที่ระบบจัดเก็บไว้ กรุณาส่งอีเมลมาที่ tormatch1234@gmail.com โดยระบุหัวข้อ:"
                : "To receive an export of your stored account and profile data, send an email to tormatch1234@gmail.com with the subject:"}
            </p>
            <div className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground select-all">
              {isThai
                ? "ขอสำเนาข้อมูลส่วนบุคคล - [ระบุอีเมลของท่าน]"
                : "Data Access Request - [Your Email]"}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "เราจะจัดส่งข้อมูลในรูปแบบไฟล์ที่เปิดอ่านได้ (เช่น JSON หรือ CSV) ให้ท่านทางอีเมลภายใน 30 วัน โดยไม่มีค่าใช้จ่าย"
                : "We will provide an export file (such as JSON or CSV) within 30 calendar days at no charge."}
            </p>
          </div>

          {/* Direct Rectification */}
          <div className="px-5 py-4 space-y-1.5">
            <h3 className="font-medium text-foreground">
              {isThai ? "3. การแก้ไขข้อมูลด้วยตนเอง (Right to Rectification)" : "3. Updating your information"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "ท่านสามารถแก้ไขข้อมูลบริษัท ข้อมูลติดต่อ และผลงานย้อนหลังได้โดยตรงที่หน้า "
                : "You can update company details, contact info, and past projects directly on the "}
              <Link href="/company-profile" className="text-primary hover:underline font-medium">
                {isThai ? "โปรไฟล์บริษัท" : "Company Profile"}
              </Link>
              {isThai ? " และปรับการรับอีเมลแจ้งเตือนได้ที่ " : " and configure email notifications under "}
              <Link href="/settings/notifications" className="text-primary hover:underline font-medium">
                {isThai ? "การตั้งค่าการแจ้งเตือน" : "Notification Settings"}
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* 2. DATA COLLECTED */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {isThai ? "ข้อมูลที่เราเก็บรวบรวม" : "Personal data we collect"}
          </h2>
        </div>

        <div className="divide-y divide-border text-sm">
          <div className="px-5 py-3.5 space-y-1">
            <div className="font-medium text-foreground">
              {isThai ? "ข้อมูลบัญชีผู้ใช้งาน" : "Account credentials"}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "ชื่อ ที่อยู่อีเมล และรหัสผ่านที่เข้ารหัสทางเดียว (bcrypt 10 salt rounds) หรือ Google account id สำหรับผู้ใช้ที่เข้าสู่ระบบผ่าน Google โดยระบบไม่มีการจัดเก็บรหัสผ่านในรูปแบบข้อความธรรมดา (Plaintext)"
                : "Name, email address, and one-way hashed passwords (bcrypt, 10 salt rounds) or Google account id. Raw passwords are never stored in plaintext."}
            </p>
          </div>

          <div className="px-5 py-3.5 space-y-1">
            <div className="font-medium text-foreground">
              {isThai ? "ข้อมูลโปรไฟล์บริษัทและผู้ติดต่อ" : "Company profile and contact details"}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "ชื่อบริษัท เลขประจำตัวผู้เสียภาษี 13 หลัก (สำหรับบุคคลธรรมดาหรือเจ้าของคนเดียวคือเลขบัตรประชาชน) อีเมล เบอร์โทรศัพท์ ทุนจดทะเบียน สถานะ e-GP หนังสือรับรอง และมูลค่าผลงานย้อนหลัง ข้อมูลเหล่านี้ใช้เพื่อตรวจสอบคุณสมบัติตามประกาศจัดซื้อจัดจ้างภาครัฐเท่านั้น"
                : "Company name, 13-digit tax ID (Citizen ID for sole proprietorships), email, phone, registered capital, e-GP status, certifications, and past project values. Used solely to match eligibility against government procurement criteria."}
            </p>
          </div>

          <div className="px-5 py-3.5 space-y-1">
            <div className="font-medium text-foreground">
              {isThai ? "ข้อมูลการใช้งานและการแจ้งเตือน" : "Workspace activity and notification preferences"}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "คำตอบในการประเมินคุณสมบัติเบื้องต้น (Self-Check) รายการโครงการที่ติดตามใน Workspace และการตั้งค่ารอบการรับอีเมลแจ้งเตือน"
                : "Self-check qualification responses, tracked tender cards in your Workspace, and digest notification schedules."}
            </p>
          </div>

          <div className="px-5 py-3.5 space-y-1">
            <div className="font-medium text-foreground">
              {isThai ? "ไม่มีการจัดเก็บข้อมูลอ่อนไหวตามมาตรา 26" : "Zero sensitive personal data (Section 26)"}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "TOR Match ไม่มีการเก็บข้อมูลชีวภาพ (เช่น ลายนิ้วมือ ใบหน้า) ข้อมูลสุขภาพ ข้อมูลพันธุกรรม ศาสนา หรือความคิดเห็นทางการเมือง"
                : "TOR Match does not collect biometric, health, genetic, religious, or political data."}
            </p>
          </div>
        </div>
      </section>

      {/* 3. LAWFUL BASES & SECURITY */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            {isThai ? "ฐานทางกฎหมายและมาตรการความปลอดภัย" : "Lawful bases and security measures"}
          </h2>
        </div>

        <div className="divide-y divide-border text-sm">
          <div className="px-5 py-3.5 space-y-1">
            <div className="font-medium text-foreground">
              {isThai ? "ฐานการประมวลผลข้อมูล (มาตรา 24)" : "Processing bases (Section 24)"}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "การประมวลผลข้อมูลบัญชีและโปรไฟล์ดำเนินการตามฐานสัญญา (มาตรา 24(3)) เพื่อให้บริการคำนวณความเข้ากันได้ของ TOR การบันทึก IP address ในระบบจำกัดการเรียกใช้งานเป็นไปตามฐานประโยชน์โดยชอบด้วยกฎหมาย (มาตรา 24(5)) เพื่อความมั่นคงปลอดภัย และข้อมูลประกาศจัดซื้อจัดจ้างประมวลผลจากข้อมูลเปิดภาครัฐ (มาตรา 24(4))"
                : "Account and profile data are processed for contract performance (Section 24(3)) to provide matching services. IP rate limiting runs under legitimate interest (Section 24(5)) for platform defense, and tender announcements are processed as official public open data (Section 24(4))."}
            </p>
          </div>

          <div className="px-5 py-3.5 space-y-1">
            <div className="font-medium text-foreground">
              {isThai ? "มาตรการรักษาความปลอดภัย (มาตรา 37)" : "Security safeguards (Section 37)"}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "การรับส่งข้อมูลทั้งหมดเข้ารหัสผ่าน HTTPS/TLS 1.3 ข้อมูลเซสชันและ JWT จัดเก็บในคุกกี้ที่มีคุณสมบัติ httpOnly, Secure และ SameSite เพื่อป้องกันการเข้าถึงจากสคริปต์หน้าเว็บ (XSS) และไม่อนุญาตให้จัดเก็บโทเค็นใน LocalStorage พร้อมทั้งตรวจสอบรหัสผ่านรั่วไหลด้วยวิธี k-anonymity โดยไม่เปิดเผยรหัสผ่านจริง"
                : "All communications use TLS 1.3 encryption. Session tokens and JWTs are kept in httpOnly, Secure, SameSite cookies to mitigate XSS attacks and are never written to LocalStorage. Password breach checks use k-anonymity without exposing raw passwords."}
            </p>
          </div>

          <div className="px-5 py-3.5 space-y-1">
            <div className="font-medium text-foreground">
              {isThai ? "ระยะเวลาการจัดเก็บข้อมูล" : "Data retention"}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isThai
                ? "ข้อมูลบัญชีและโปรไฟล์จะถูกจัดเก็บตราบเท่าที่บัญชีผู้ใช้ยังคงเปิดใช้งานอยู่ เมื่อท่านส่งคำร้องขอลบข้อมูล ข้อมูลทั้งหมดจะถูกลบออกจากฐานข้อมูลหลักภายใน 30 วัน ส่วนบันทึกการเข้าใช้งานระบบเพื่อการตรวจสอบความปลอดภัยจะถูกเก็บไว้ไม่เกิน 90 วัน"
                : "Account and profile data are retained while your account remains active. Upon receiving a valid deletion request, data is deleted within 30 days. System access logs for security auditing are rotated after 90 days."}
            </p>
          </div>
        </div>
      </section>

      {/* 4. CONTACT */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">
          {isThai ? "ข้อมูลติดต่อผู้ควบคุมข้อมูลส่วนบุคคล" : "Data controller contact"}
        </div>
        <p className="mt-1 text-xs leading-relaxed">
          {isThai
            ? "หากท่านมีข้อสงสัยเกี่ยวกับนโยบายนี้ หรือประสงค์จะใช้สิทธิของเจ้าของข้อมูล สามารถติดต่อเราได้ที่:"
            : "If you have questions regarding this privacy policy or wish to exercise your data subject rights, contact us at:"}
        </p>
        <p className="mt-2 text-xs font-mono text-foreground">
          Email:{" "}
          <a
            href="mailto:tormatch1234@gmail.com"
            className="text-primary hover:underline underline-offset-2"
          >
            tormatch1234@gmail.com
          </a>
        </p>
      </div>
    </div>
  )
}
