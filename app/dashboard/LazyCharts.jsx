"use client";

import dynamic from "next/dynamic";

export const ProgressChart = dynamic(() => import("./ProgressChart"), {
  ssr: false,
  loading: () => <div className="w-full h-full min-h-[300px] animate-pulse rounded-2xl bg-lavender/30" />,
});

export const RadarChartClient = dynamic(() => import("./RadarChartClient"), {
  ssr: false,
  loading: () => <div className="h-full w-full absolute inset-0 pb-6 animate-pulse rounded-2xl bg-lavender/30" />,
});
