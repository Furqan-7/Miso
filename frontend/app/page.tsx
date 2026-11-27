import { Bento } from "@/app/components/landing/Bento";
import { Cta } from "@/app/components/landing/Cta";
import { Faq } from "@/app/components/landing/Faq";
import { Footer } from "@/app/components/landing/Footer";
import { Hero } from "@/app/components/landing/Hero";
import { HowItWorks } from "@/app/components/landing/HowItWorks";
import { Nav } from "@/app/components/landing/Nav";
import { Pricing } from "@/app/components/landing/Pricing";
import { Sources } from "@/app/components/landing/Sources";

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <Nav />
      <main>
        <Hero />
        <Sources />
        <Bento />
        <HowItWorks />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
