import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { verifyNpsToken } from "@/lib/nps";
import { NpsForm } from "./nps-form";

export const metadata: Metadata = { title: "Encuesta", robots: { index: false } };

async function Survey({ params }: { params: PageProps<"/encuesta/[token]">["params"] }) {
  const { token } = await params;
  if (!verifyNpsToken(token)) notFound();
  return <NpsForm token={token} />;
}

export default function NpsPage(props: PageProps<"/encuesta/[token]">) {
  return (
    <div className="mx-auto grid max-w-2xl gap-6 px-4 py-12">
      <h1 className="font-display text-4xl">¿Cómo te fue en tu evento?</h1>
      <Suspense fallback={<div className="bg-muted h-48 animate-pulse rounded-xl" />}>
        <Survey params={props.params} />
      </Suspense>
    </div>
  );
}
