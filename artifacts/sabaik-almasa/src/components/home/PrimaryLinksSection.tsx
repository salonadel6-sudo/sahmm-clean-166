import { ArrowLeft, BookOpen, Building2, CircleHelp, PhoneCall, Sparkles, UserRound, MapPinned } from "lucide-react"
import { CONTACT_ROUTE, FAQ_ROUTE } from "@/lib/publicRoutes"

const primaryLinks = [
  {
    href: "/services",
    label: "خدمات التنظيف بالرياض",
    description: "استعرض جميع خدمات التنظيف المتخصصة للمنازل والمنشآت.",
    Icon: Sparkles,
  },
  {
    href: "/cleaning-packages",
    label: "باقات التنظيف بالرياض",
    description: "اختر الباقة المناسبة للمنزل أو الفيلا أو المنشأة.",
    Icon: Building2,
  },
  {
    href: "/call-now",
    label: "اتصل الآن بشركة التنظيف",
    description: "تواصل مباشرة مع فريق الخدمة لحجز موعدك.",
    Icon: PhoneCall,
  },
  {
    href: CONTACT_ROUTE,
    label: "اطلب خدمة تنظيف",
    description: "أرسل تفاصيل طلبك ليتم التواصل معك بسرعة.",
    Icon: UserRound,
  },
  {
    href: "/areas",
    label: "مناطق تغطية خدمات التنظيف",
    description: "تعرف على الأحياء والمناطق التي نخدمها في الرياض.",
    Icon: MapPinned,
  },
  {
    href: "/about",
    label: "من نحن",
    description: "تعرف على خبرتنا وطريقة عمل فريقنا.",
    Icon: UserRound,
  },
  {
    href: "/blog",
    label: "دليل التنظيف والمقالات",
    description: "نصائح وأدلة عملية للعناية بالمنزل والمنشأة.",
    Icon: BookOpen,
  },
  {
    href: FAQ_ROUTE,
    label: "الأسئلة الشائعة",
    description: "إجابات واضحة عن الخدمات والحجز والتنفيذ.",
    Icon: CircleHelp,
  },
]

export function PrimaryLinksSection() {
  return (
    <section
      id="primary-site-links"
      className="border-t border-[color:var(--home-line)] bg-white py-16 sm:py-20"
      aria-labelledby="primary-site-links-heading"
      dir="rtl"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <span className="home-kicker mb-5">روابط الموقع الأساسية</span>
          <h2 id="primary-site-links-heading" className="home-heading mb-4 text-3xl font-black md:text-4xl">
            أهم صفحات خدمات التنظيف بالرياض
          </h2>
          <div className="home-rule mb-6" />
          <p className="home-copy mx-auto max-w-2xl text-base leading-8 sm:text-lg">
            ابدأ من الصفحة المناسبة: استعرض الخدمات والباقات، تعرف على مناطق التغطية، أو تواصل معنا مباشرة.
          </p>
        </div>

        <nav aria-label="أهم صفحات الموقع" className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {primaryLinks.map(({ href, label, description, Icon }) => (
            <a
              key={href}
              href={href}
              className="group flex min-h-36 flex-col rounded-2xl border border-[color:var(--home-line)] bg-[color:var(--home-mist)] p-5 text-right shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[color:var(--home-water)]/50 hover:bg-white hover:shadow-[0_14px_30px_rgba(18,56,75,.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--home-gold)] focus-visible:ring-offset-2"
            >
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--home-water-soft)] text-[color:var(--home-water)] transition-colors group-hover:bg-[color:var(--home-water)] group-hover:text-white">
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className="flex items-center justify-between gap-2 text-base font-black text-[color:var(--home-ink)] group-hover:text-[color:var(--home-water)]">
                {label}
                <ArrowLeft size={16} aria-hidden="true" className="shrink-0 transition-transform group-hover:-translate-x-1" />
              </span>
              <span className="mt-2 text-sm leading-6 text-[color:var(--home-ink-soft)]">{description}</span>
            </a>
          ))}
        </nav>
      </div>
    </section>
  )
}