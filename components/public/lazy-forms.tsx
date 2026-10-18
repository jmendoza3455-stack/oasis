"use client";

import dynamic from "next/dynamic";

const skeleton = () => <div className="bg-muted h-72 animate-pulse rounded-lg" aria-hidden />;

export const LazyQuoteWidget = dynamic(() => import("./quote-widget").then((m) => m.QuoteWidget), {
  loading: skeleton,
});
export const LazyLeadForm = dynamic(() => import("./lead-form").then((m) => m.LeadForm), {
  loading: skeleton,
});
