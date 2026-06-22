import { CallToAction } from "@/components/home/call-to-action";
import { HeroSection } from "@/components/home/hero-section";
import { IntegrationsSection } from "@/components/home/integrations-section";

export function HomePage() {
  return (
    <>
      <HeroSection />
      <IntegrationsSection />
      <CallToAction />
    </>
  );
}
