import Link from "next/link";
import AssetCard from "@/components/AssetCard";
import TopicCard from "@/components/TopicCard";

const STEPS = [
  { n: "1", title: "Pay with any token", desc: "$1 unlocks a research run" },
  { n: "2", title: "Enter your keywords", desc: "5–20 topics you care about" },
  { n: "3", title: "Get trends + assets", desc: "Social mindshare meets on-chain data" },
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-zinc-950 to-zinc-950" />
          <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              See where the chatter is. Pay $1. Act on the trend.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400">
              Social mindshare across Reddit, HN, GitHub, Polymarket — matched
              against live on-chain market data.
            </p>
            <Link
              href="/research"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500"
            >
              Start researching — $1
            </Link>
            <p className="mt-4 text-sm text-zinc-500">
              No wallet? Sign in with email — we create one for you.
            </p>
          </div>
        </section>

        <section className="border-y border-zinc-800 bg-zinc-900/30">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="text-center sm:text-left">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-300">
                  {step.n}
                </span>
                <h3 className="mt-3 font-semibold text-white">{step.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <p className="mb-6 text-center text-sm font-medium uppercase tracking-wider text-zinc-500">
            Sample report preview
          </p>
          <div className="relative grid gap-4 md:grid-cols-2">
            <div className="pointer-events-none select-none opacity-90">
              <TopicCard
                result={{
                  keyword: "Nvidia AI chips",
                  ok: true,
                  markdown: "",
                  stderr: "",
                  exit_code: 0,
                }}
                summary={{
                  themes: [
                    "Blackwell chip performance",
                    "AI PC demand",
                    "Export controls",
                  ],
                  sentiment: "bullish",
                  momentum_score: 78,
                  assets: [],
                }}
                status="done"
              />
            </div>
            <div className="pointer-events-none select-none opacity-90">
              <AssetCard
                ticker="NVDA"
                name="NVIDIA"
                kind="equity"
                confidence={0.98}
                onChainMomentum={82}
                priceDeltaPercent={4.2}
                agreementLabel="Confirmed trend"
              />
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
          </div>
        </section>

        <section className="border-t border-zinc-800 py-10">
          <p className="text-center text-xs uppercase tracking-widest text-zinc-600">
            Built on Dynamic · Uniswap · ENS
          </p>
        </section>
      </main>
    </div>
  );
}
