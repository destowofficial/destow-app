import { Header } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { Vision } from "@/components/site/vision";
import { ComingSoon } from "@/components/site/coming-soon";
import { Footer } from "@/components/site/footer";

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Vision />
        <ComingSoon />
      </main>
      <Footer />
    </>
  );
}
