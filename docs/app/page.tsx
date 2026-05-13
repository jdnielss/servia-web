import { Hero } from "../components/Hero";
import { About } from "../components/About";
import { HowItWorks } from "../components/HowItWorks";
import { Features } from "../components/Features";
import { Cta } from "../components/Cta";
import "./page.css";
import { PreviewImage } from "../components/PreviewImage";
import { Metadata } from "next";
import { Head } from "nextra/components";

export const metadata: Metadata = {
  title: "Casa Familia Padel Club | Open-source tournament system",
  description:
    "Casa Familia Padel Club is a free and open source tournament system. Set up a tournament, add teams, schedule matches, track scores and present live rankings.",
  openGraph: {
    title: "Casa Familia Padel Club | Open-source tournament system",
    description:
      "Casa Familia Padel Club is a free and open source tournament system. Set up a tournament, add teams, schedule matches, track scores and present live rankings.",
    locale: "en_US",
    url: "https://docs.bracketapp.nl",
    siteName: "Casa Familia Padel Club",
    images: [{ url: "https://docs.bracketapp.nl/bracket-social-image.png" }],
  },
};
export default function Page() {
  return (
    <>
      <Head>
        {
          // https://developers.google.com/search/docs/appearance/site-names#json-ld_1
        }
        <script type="application/ld+json">
          {"{" +
            '"@context": "https://schema.org",' +
            '"@type": "WebSite",' +
            '"name": "Casa Familia Padel Club",' +
            '"alternativeName": ["Casa Familia Padel Club | Open-source tournament system", "Casa Familia Padel Club documentation", "docs.bracketapp.nl"],' +
            '"url": "https://docs.bracketapp.nl"' +
            "}"}
        </script>
      </Head>
      <Hero />
      <PreviewImage />
      <About />
      <HowItWorks />
      <Features />
      {/*<AdvancedFeatures />*/}
      <Cta />
      {/*<FAQ />*/}
    </>
  );
}
