"use client";

import { useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { captureAttribution } from "@/lib/tracking";
import { useStored, writeStored } from "@/lib/use-stored";

const CONSENT_KEY = "oasis_consent";
const GA4 = process.env.NEXT_PUBLIC_GA4_ID;
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ADS = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

type Consent = "granted" | "denied" | null;

/** Banner de cookies (Ley 29733) + carga diferida de GA4, Meta Pixel y Google Ads. */
export function Analytics() {
  const stored = useStored(CONSENT_KEY);
  const ready = stored !== undefined;
  const consent = (stored ?? null) as Consent;

  useEffect(() => {
    captureAttribution();
  }, []);

  const decide = (value: "granted" | "denied") => writeStored(CONSENT_KEY, value);

  const hasTrackers = Boolean(GA4 || PIXEL || ADS);

  return (
    <>
      {consent === "granted" && (GA4 || ADS) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4 ?? ADS}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());${GA4 ? `gtag('config','${GA4}');` : ""}${ADS ? `gtag('config','${ADS}');` : ""}`}
          </Script>
        </>
      )}
      {consent === "granted" && PIXEL && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL}');fbq('track','PageView');`}
        </Script>
      )}
      {ready && hasTrackers && consent === null && (
        <div
          role="dialog"
          aria-label="Preferencias de cookies"
          className="bg-card fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border p-4 shadow-lg md:inset-x-auto md:right-4"
        >
          <p className="text-sm">
            Usamos cookies de medición para saber cómo nos encuentras y mejorar la web. Puedes
            aceptarlas o seguir solo con las necesarias. Más detalle en el{" "}
            <Link href="/privacidad" className="underline">
              aviso de privacidad
            </Link>
            .
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => decide("granted")}>
              Aceptar
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide("denied")}>
              Solo necesarias
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
