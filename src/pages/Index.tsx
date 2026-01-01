import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Technology from "@/components/landing/Technology";
import ImpactStats from "@/components/landing/ImpactStats";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <ImpactStats />
      <Features />
      <HowItWorks />
      <Technology />
      <Footer />
    </div>
  );
};

export default Index;
