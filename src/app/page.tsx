const stages = [
  { number: "01", title: "Read with purpose", description: "Understand the mechanism, with a path back to the source." },
  { number: "02", title: "Explain it yourself", description: "Turn a familiar phrase into an idea you can actually defend." },
  { number: "03", title: "Make the call", description: "Work through a production scenario. Name the trade-offs." },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 sm:px-12 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#182b2b]/15 pb-6">
        <p className="text-lg font-bold tracking-tight">SystemDesign<span className="font-normal"> / Tutor</span></p>
        <span className="rounded-full border border-[#182b2b]/20 px-3 py-1 text-xs font-medium uppercase tracking-widest">Local learning space</span>
      </header>
      <section className="max-w-3xl py-16 sm:py-24" aria-labelledby="introduction">
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-[#4b6848]">A little deeper. Every day.</p>
        <h1 id="introduction" className="text-5xl leading-[1.08] font-semibold tracking-tight sm:text-7xl">Build understanding<br />you can stand behind.</h1>
        <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#53605b]">From JavaScript intuition to distributed systems. Study the foundations, explain your reasoning, and learn to make better engineering decisions.</p>
        <div className="mt-10 border-l-2 border-[#4b6848] pl-5">
          <p className="font-semibold">Your study space is taking shape.</p>
          <p className="mt-1 text-sm leading-relaxed text-[#53605b]">Lessons are not available yet. The next milestone is your first book chapter, with explanations you can trace to the page.</p>
        </div>
      </section>
      <section aria-label="The daily learning loop" className="grid gap-8 border-t border-[#182b2b]/15 py-8 sm:grid-cols-3">
        {stages.map((stage) => (
          <article key={stage.number}>
            <p className="mb-3 font-mono text-xs text-[#657560]">{stage.number} /</p>
            <h2 className="text-lg font-semibold">{stage.title}</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#53605b]">{stage.description}</p>
          </article>
        ))}
      </section>
      <footer className="mt-auto pt-8 text-xs text-[#53605b]">System design & distributed systems · One concept at a time.</footer>
    </main>
  );
}
