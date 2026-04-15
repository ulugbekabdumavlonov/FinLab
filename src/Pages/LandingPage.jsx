import Header from "../Components/Header";
import Hero from "../Components/Hero";
import Features from "../Components/Features";
import Logos from "../Components/Logos";
import CTA from "../Components/CTA";
import RegisterBlock from "../Components/RegisterBlock";
import Footer from "../Components/Footer";

export default function LandingPage() {
  return (
    <div className="font-sans">
      <Header />
      <Hero />
      <Features />
      <Logos />
      <CTA />
      <RegisterBlock />
      <Footer />
    </div>
  );
}