import Link from "next/link";

const STEPS = [
  { n: "1", title: "Pay with any token", desc: "$1 unlocks a research run", bg: "bg-accent-orange" },
  { n: "2", title: "Enter your keywords", desc: "5–20 topics you care about", bg: "bg-accent-green" },
  { n: "3", title: "Get trends + assets", desc: "Social mindshare meets on-chain data", bg: "bg-accent-yellow" },
];

const STICKERS = [
  { src: "/stickers/sticker-megaphone.png?v=2", alt: "Megaphone", className: "top-2 left-2 w-36 sm:w-44 lg:w-52", motion: "sticker-motion--megaphone" },
  { src: "/stickers/sticker-phone-chat.png?v=2", alt: "Phone with chat bubbles", className: "top-6 right-2 w-28 sm:w-32 lg:w-40", motion: "sticker-motion--phone" },
  { src: "/stickers/sticker-woman-phone.png?v=2", alt: "Woman on phone", className: "bottom-2 left-2 w-40 sm:w-48 lg:w-60", motion: "sticker-motion--woman" },
  { src: "/stickers/sticker-lips.png?v=2", alt: "Lips", className: "bottom-6 right-4 w-28 sm:w-32 lg:w-40", motion: "sticker-motion--lips" },
];

export default function LandingPage() {
  return (
    <div className="min-h-full text-ink">
      <main className="paper-texture">
        {/* Hero collage */}
        <section className="relative overflow-hidden">
          {STICKERS.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.src}
              src={s.src}
              alt={s.alt}
              className={`pointer-events-none absolute z-10 hidden select-none drop-shadow-[3px_3px_0_rgba(0,0,0,0.25)] md:block ${s.motion} ${s.className}`}
            />
          ))}

          <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 py-20">
            {/* Pink window chrome */}
            <div className="win-chrome hard-shadow w-full max-w-xl bg-[#e9e2d6]">
              <div className="win-chrome-bar bg-signal">
                <span className="win-chrome-dot win-chrome-dot--red" />
                <span className="win-chrome-dot win-chrome-dot--yellow" />
                <span className="win-chrome-dot win-chrome-dot--green" />
              </div>
              <div className="px-8 py-10 text-center">
                <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
                  $1 To Catch The Trends
                </h1>
                <p className="mx-auto mt-4 max-w-md text-sm text-ink/70">
                  Social mindshare across YouTube, X, TikTok, Reddit, Hacker News,
                  GitHub and Polymarket; matched against live onchain market data.
                </p>

                <Link
                  href="/research"
                  className="mt-7 inline-block rounded-lg border-[3px] border-ink bg-signal px-10 py-3 font-display text-lg font-black text-ink transition hover:bg-white"
                >
                  Let&apos;s Go!
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 3-step strip — color blocked */}
        <section className="px-6 py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-5">
            <div className="flex justify-center">
              <div className="inline-block border-[3px] border-ink bg-signal px-5 py-2.5 text-center hard-shadow-sm">
                <h2 className="font-display text-xl font-black tracking-tight text-ink sm:text-2xl">
                  Don&apos;t Fade The Chatter
                </h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className={`${step.bg} border-[3px] border-ink px-8 py-9 hard-shadow-sm`}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-ink bg-paper font-display text-lg font-black text-ink">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-black uppercase tracking-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm font-medium text-ink/70">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample preview */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex justify-center">
              <div className="inline-block border-[3px] border-ink bg-signal px-5 py-2.5 text-center hard-shadow-sm">
                <h2 className="font-display text-xl font-black tracking-tight text-ink sm:text-2xl">
                  The Trend Is Your Friend
                </h2>
              </div>
            </div>
            <div className="select-none rounded border-[3px] border-ink bg-accent-orange p-5 hard-shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-black tracking-tight text-ink">
                  Nvidia AI chips
                </h3>
                <span className="rounded border-2 border-ink bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink">
                  Done
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <p className="font-display text-6xl font-black leading-none text-ink">78</p>
                <span className="rounded border-2 border-ink bg-white px-2.5 py-0.5 text-xs font-black uppercase text-ink">
                  Bullish
                </span>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink/60">
                Mindshare strength / 100
              </p>
              <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-ink bg-white">
                <div className="h-full w-[78%] bg-ink" />
              </div>
              <div className="mt-4 flex flex-col gap-1.5">
                {[
                  "RTX Spark and personal AI PCs",
                  "Blackwell chip performance claims",
                  "China export-control and supply-chain risk",
                  "Developer interest in NVIDIA AI tooling",
                ].map((theme) => (
                  <span
                    key={theme}
                    className="rounded border-2 border-ink bg-white px-3 py-1.5 text-xs font-bold text-ink"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-t-[3px] border-ink bg-ink py-6">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.25em] text-white/60">
            Built on Dynamic &middot; Uniswap &middot; ENS
          </p>
        </section>
      </main>
    </div>
  );
}
