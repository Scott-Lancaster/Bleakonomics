import Image from "next/image";
import bleaksBrewsButton from "../../BleaksBrewsButton.png";
import SiteHeader from "../../components/SiteHeader";

export default function BleaksBrewsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeader active="brews" />

      <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-4xl flex-col items-center justify-center px-6 py-20 text-center">
        <Image
          src={bleaksBrewsButton}
          alt="Bleak's Brews"
          className="h-24 w-24 object-contain"
          priority
        />
        <h1 className="mt-6 font-mono text-4xl font-bold tracking-wide text-white md:text-6xl">
          Bleak&apos;s Brews
        </h1>
        <p className="mt-5 text-lg text-neutral-400">Coming Soon</p>
      </section>
    </main>
  );
}
