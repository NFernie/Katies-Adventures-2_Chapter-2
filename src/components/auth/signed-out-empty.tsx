import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SignedOutEmpty({
  heading = "Your plan is hidden",
  showCta = true,
}: {
  heading?: string;
  showCta?: boolean;
}) {
  return (
    <section
      className="mt-4 border border-dashed border-hair px-3 py-3"
      role="status"
    >
      <h2 className="font-sans text-[1.05rem] font-bold">{heading}</h2>
      <p className="mt-2 font-sans text-[16px] leading-[1.45] text-iron-2">
        Personal rows live in Supabase behind a magic-link session. Signed-out
        visitors (including incognito) cannot read them. Onboarding can still
        start; saving needs the email link.
      </p>
      {showCta ? (
        <Link
          href="/lock"
          className={cn(buttonVariants(), "mt-3 inline-flex")}
        >
          Sign in with magic link
        </Link>
      ) : null}
    </section>
  );
}

export function MissingSupabaseNote() {
  return (
    <p
      role="note"
      className="mt-4 border border-dashed border-hair px-3 py-3 font-sans text-[14px] leading-snug text-iron-2"
    >
      No Supabase project is wired yet. Create one and paste the URL plus anon
      (publishable) key — click-by-click in docs/wizard/supabase-pages.md in
      this repo, or run{" "}
      <code className="font-semibold">bash scripts/wizard-supabase-pages.sh</code>.
      Never put a service_role key in the site.
    </p>
  );
}
