import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import { ServicesSection } from "@/components/home/ServicesSection"
import { useDocumentSEO } from "@/hooks/useDocumentSEO"
import { siteUrl } from "@/lib/siteUrl"
import { Link } from "wouter"
import { ChevronLeft } from "lucide-react"
import { useSiteSettings } from "@/context/SiteSettingsContext"

export default function ServicesPage() {
  const { companyName } = useSiteSettings()
  const resolvedCompanyName = companyName || "شركة تنظيف بالرياض"
  useDocumentSEO({
    title: `خدمات التنظيف بالرياض | ${resolvedCompanyName}`,
    description: `خدمات التنظيف بالرياض لدى ${resolvedCompanyName}: تنظيف المنازل والفلل وجلي الرخام وغسيل المكيفات والمجالس والخزانات، مع تغطية ميدانية داخل الرياض.`,
    keywords: "خدمات التنظيف بالرياض, تنظيف منازل, تنظيف فلل, جلي رخام, غسيل مكيفات, تنظيف مجالس",
    canonical: siteUrl("/services"),
  })

  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <Navbar />
      <div className="bg-primary text-white pt-28 pb-12 px-4">
        <div className="container mx-auto">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
            <Link href="/" className="hover:text-white">الرئيسية</Link>
            <ChevronLeft size={14} />
            <span className="text-white">الخدمات</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black">خدمات التنظيف بالرياض</h1>
          <p className="text-white/75 mt-3 text-lg max-w-3xl leading-relaxed">
            حلول تنظيف متخصصة للمنازل والفلل والمنشآت، ينفذها فريق {resolvedCompanyName} بمواعيد واضحة وخدمة موثوقة.
          </p>
        </div>
      </div>
      <main className="flex-1">
        <section className="container mx-auto px-4 py-8" aria-label="تعريف خدمات التنظيف بالرياض">
          <p className="max-w-4xl mx-auto text-slate-700 leading-8">
            تعرض خدمات التنظيف بالرياض خيارات لمواقع واحتياجات مختلفة، وتوضح البطاقات أدناه تفاصيل الخدمات المتاحة. تشمل القائمة تنظيف المنازل والفلل، وجلي الرخام، وغسيل المكيفات، وتنظيف المجالس والخزانات. تختلف متطلبات كل موقع بحسب المساحة وحالة الأسطح ونطاق العمل المطلوب؛ لذلك راجع وصف الخدمة المعنية وحدد احتياجك قبل التواصل. نطاق الخدمات الميدانية لدى {resolvedCompanyName} داخل مدينة الرياض فقط، وتنسيق الموعد والتقدير يكون بعد مراجعة تفاصيل الطلب وتوفر الفريق.
          </p>
        </section>
        <ServicesSection />
      </main>
      <Footer />
    </div>
  )
}