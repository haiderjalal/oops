import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { buttonStyles } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";

export default function PlaceNotFound() {
  return (
    <Container size="prose" className="py-24 text-center">
      <p className="text-6xl" aria-hidden="true">
        🧭
      </p>
      <h1 className="mt-4 text-4xl">That postcard got lost in the mail</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        This place isn&rsquo;t published (yet), or it was taken down. Plenty of others are still on
        the map.
      </p>
      <Link
        href={ROUTES.home}
        className={buttonStyles({ variant: "primary", size: "lg", className: "mt-8" })}
      >
        Back to the globe
      </Link>
    </Container>
  );
}
