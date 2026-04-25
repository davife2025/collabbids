import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-50 font-sans">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="text-sm font-semibold tracking-tight text-zinc-900">
            CollabBids
          </div>
          <nav className="flex items-center gap-3">
            <Link
              className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              href="/auctions"
            >
              Explore
            </Link>
            <Link
              className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              href="/profile"
            >
              Profile
            </Link>
            <Link
              className="rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              href="/admin"
            >
              Admin
            </Link>
            <Link
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              href="/auth"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Auctions for the creator economy.
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-600">
            Creators list unique crafts and experiences. Fans bid live. Highest bid wins.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/auctions"
              className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Browse auctions
            </Link>
            <Link
              href="/sell/new"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              List a craft
            </Link>
          </div>
        </div>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">Featured (demo)</h2>
            <span className="text-sm text-zinc-500">Hardcoded for now</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Custom hand-painted jacket",
                endsIn: "2h 14m",
                current: "$120",
                badge: "Unverified creator",
              },
              {
                title: "1:1 TikTok growth audit (30 mins)",
                endsIn: "6h 02m",
                current: "$45",
                badge: "Verified creator",
              },
              {
                title: "Signed art print + behind-the-scenes video",
                endsIn: "1d 3h",
                current: "$80",
                badge: "Unverified creator",
              },
            ].map((a) => (
              <div
                key={a.title}
                className="rounded-2xl border border-zinc-200 bg-white p-5"
              >
                <div className="text-xs font-medium text-zinc-600">{a.badge}</div>
                <div className="mt-2 text-base font-semibold text-zinc-900">
                  {a.title}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-zinc-600">Ends in {a.endsIn}</span>
                  <span className="font-medium text-zinc-900">{a.current}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
