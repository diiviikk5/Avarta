import HeroSection from "@/components/HeroSection";
import EditorialLandingFeatures from "@/components/EditorialLandingFeatures";

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <HeroSection />
      <EditorialLandingFeatures />
    </main>
  );
}
