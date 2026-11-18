import React, { lazy, Suspense } from "react"
import { Route, Redirect, Switch } from "wouter"
import Home from "@/pages/Home"
import { CONTACT_ROUTE, FAQ_ROUTE } from "@/lib/publicRoutes"
import SeoPageOverrideHydrator from "@/components/seo/SeoPageOverrideHydrator"

const Blog = lazy(() => import("@/pages/Blog"))
const BlogPost = lazy(() => import("@/pages/BlogPost"))
const AboutPage = lazy(() => import("@/pages/AboutPage"))
const ContactPage = lazy(() => import("@/pages/ContactPage"))
const PartnersPage = lazy(() => import("@/pages/PartnersPage"))
const PackagesPage = lazy(() => import("@/pages/PackagesPage"))
const PackageDetail = lazy(() => import("@/pages/PackageDetail"))
const ServiceDetail = lazy(() => import("@/pages/ServiceDetail"))
const ServicesPage = lazy(() => import("@/pages/ServicesPage"))
const CallNowPage = lazy(() => import("@/pages/CallNowPage"))
const WhyUsLeadership = lazy(() => import("@/pages/WhyUsLeadership"))
const WhyUsWhatWe = lazy(() => import("@/pages/WhyUsWhatWe"))
const WhyUsCommitment = lazy(() => import("@/pages/WhyUsCommitment"))
const WhyUsExperience = lazy(() => import("@/pages/WhyUsExperience"))
const OffersPage = lazy(() => import("@/pages/OffersPage"))
const NeighborhoodPage = lazy(() => import("@/pages/NeighborhoodPage"))
const AreasIndexPage = lazy(() => import("@/pages/AreasIndexPage"))
const FaqPage = lazy(() => import("@/pages/FaqPage"))
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"))
const TermsPage = lazy(() => import("@/pages/TermsPage"))
const Chat = lazy(() => import("@/pages/Chat"))
const SeoPage = lazy(() => import("@/pages/SeoPage"))
const RootSlugRouter = lazy(() => import("@/pages/RootSlugRouter"))
const NotFound = lazy(() => import("@/pages/not-found"))

export function PublicRoutes() {
  return (
    <>
      <SeoPageOverrideHydrator />
      <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" /></div>}>
        <Switch>
        <Route path="/" component={Home} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/blog" component={Blog} />
        <Route path="/المدونة/:slug">
          {(params) => <Redirect to={`/blog/${encodeURIComponent(decodeURIComponent(params?.slug ?? ""))}`} />}
        </Route>
        <Route path="/المدونة"><Redirect to="/blog" /></Route>
        <Route path="/news/:slug">
          {(params) => <Redirect to={`/blog/${params?.slug ?? ""}`} />}
        </Route>
        <Route path="/news"><Redirect to="/blog" /></Route>

        <Route path="/about" component={AboutPage} />
        <Route path="/about/"><Redirect to="/about" /></Route>
        <Route path="/من-نحن"><Redirect to="/about" /></Route>

        <Route path="/contact/:slug" component={ContactPage} />
        <Route path="/contact/:slug/"><Redirect to={CONTACT_ROUTE} /></Route>
        <Route path="/contact"><Redirect to={CONTACT_ROUTE} /></Route>
        <Route path="/contact/"><Redirect to={CONTACT_ROUTE} /></Route>
        <Route path="/اتصل-بنا"><Redirect to={CONTACT_ROUTE} /></Route>
        <Route path="/اتصل-الآن"><Redirect to="/call-now" /></Route>
        <Route path="/call-now" component={CallNowPage} />

        <Route path="/faq/:slug" component={FaqPage} />
        <Route path="/faq/:slug/"><Redirect to={FAQ_ROUTE} /></Route>
        <Route path="/faq"><Redirect to={FAQ_ROUTE} /></Route>
        <Route path="/faq/"><Redirect to={FAQ_ROUTE} /></Route>
        <Route path="/الأسئلة-الشائعة"><Redirect to={FAQ_ROUTE} /></Route>

        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/privacy/"><Redirect to="/privacy" /></Route>
        <Route path="/سياسة-الخصوصية"><Redirect to="/privacy" /></Route>

        <Route path="/terms" component={TermsPage} />
        <Route path="/terms/"><Redirect to="/terms" /></Route>
        <Route path="/الشروط-والأحكام"><Redirect to="/terms" /></Route>

        <Route path="/partners" component={PartnersPage} />
        <Route path="/partners/"><Redirect to="/partners" /></Route>

        <Route path="/services" component={ServicesPage} />
        <Route path="/services/"><Redirect to="/services" /></Route>
        <Route path="/services/:slug" component={ServiceDetail} />
        <Route path="/services/:slug/">
          {(params) => <Redirect to={`/services/${encodeURIComponent(decodeURIComponent(params?.slug ?? ""))}`} />}
        </Route>
        <Route path="/خدماتنا/:slug">
          {(params) => <Redirect to={`/services/${encodeURIComponent(decodeURIComponent(params?.slug ?? ""))}`} />}
        </Route>

        {/* Keep the former URL useful without exposing the retired pricing page. */}
        <Route path="/pricing"><Redirect to="/cleaning-packages" /></Route>
        <Route path="/pricing/"><Redirect to="/cleaning-packages" /></Route>
        <Route path="/الأسعار"><Redirect to="/cleaning-packages" /></Route>
        <Route path="/offers" component={OffersPage} />
        <Route path="/offers/"><Redirect to="/offers" /></Route>
        <Route path="/العروض"><Redirect to="/offers" /></Route>

        <Route path="/cleaning-packages" component={PackagesPage} />
        <Route path="/cleaning-packages/fire-safety" component={PackagesPage} />
        <Route path="/cleaning-packages/:slug" component={PackageDetail} />
        <Route path="/packages"><Redirect to="/cleaning-packages" /></Route>
        <Route path="/packages/"><Redirect to="/cleaning-packages" /></Route>

        <Route path="/areas" component={AreasIndexPage} />
        <Route path="/areas/"><Redirect to="/areas" /></Route>
        <Route path="/المناطق"><Redirect to="/areas" /></Route>
        <Route path="/areas/:slug" component={NeighborhoodPage} />
        <Route path="/areas/:slug/">
          {(params) => <Redirect to={`/areas/${encodeURIComponent(decodeURIComponent(params?.slug ?? ""))}`} />}
        </Route>
        <Route path="/الأحياء/:slug">
          {(params) => <Redirect to={`/areas/${encodeURIComponent(decodeURIComponent(params?.slug ?? ""))}`} />}
        </Route>

        <Route path="/page/:slug" component={SeoPage} />
        <Route path="/page/:slug/">
          {(params) => <Redirect to={`/page/${encodeURIComponent(decodeURIComponent(params?.slug ?? ""))}`} />}
        </Route>
        <Route path="/pages/:slug">
          {(params) => <Redirect to={`/page/${encodeURIComponent(decodeURIComponent(params?.slug ?? ""))}`} />}
        </Route>
        <Route path="/pages/:slug/">
          {(params) => <Redirect to={`/page/${encodeURIComponent(decodeURIComponent(params?.slug ?? ""))}`} />}
        </Route>
        <Route path="/صفحة/:slug">
          {(params) => <Redirect to={`/page/${encodeURIComponent(decodeURIComponent(params?.slug ?? ""))}`} />}
        </Route>
        <Route path="/صفحات/:slug">
          {(params) => <Redirect to={`/page/${encodeURIComponent(decodeURIComponent(params?.slug ?? ""))}`} />}
        </Route>

        <Route path="/why-us/leadership" component={WhyUsLeadership} />
        <Route path="/why-us/what-we-do" component={WhyUsWhatWe} />
        <Route path="/why-us/commitment" component={WhyUsCommitment} />
        <Route path="/why-us/experience" component={WhyUsExperience} />

        <Route path="/chat" component={Chat} />
        {/* Root-level Arabic title slugs for services, packages, articles, and SEO pages. */}
        <Route path="/:slug" component={RootSlugRouter} />
        <Route path="/:slug/" component={RootSlugRouter} />
        <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  )
}
