"use client";

import { useEffect, useRef, useCallback } from "react";

/** CoinGecko IDs for our tokens */
const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  WETH: "ethereum",
  USDC: "usd-coin",
  USDT: "tether",
  MATIC: "matic-network",
  WMATIC: "matic-network",
  BNB: "binancecoin",
  WBNB: "binancecoin",
};

interface PriceChartProps {
  /** Token symbol (e.g. ETH, USDC) */
  symbol: string;
  /** Chart height in pixels */
  height?: number;
  className?: string;
}

export function PriceChart({ symbol, height = 120, className = "" }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<{ remove: () => void } | null>(null);

  const coingeckoId = COINGECKO_IDS[symbol] ?? symbol.replace(/^W/, "").toLowerCase();

  const initChart = useCallback(async () => {
    if (!containerRef.current || !coingeckoId) return;
    const container = containerRef.current;
    container.innerHTML = "";

    try {
      const { createChart } = await import("lightweight-charts");
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=7`
      );
      const data = await res.json();
      const prices = (data.prices as [number, number][]) ?? [];
      if (prices.length === 0) return;

      const chart = createChart(container, {
        width: container.clientWidth,
        height,
        layout: {
          background: { color: "transparent" },
          textColor: "#8b8fa1",
          fontFamily: "system-ui, sans-serif",
        },
        grid: {
          vertLines: { color: "rgba(255,255,255,0.06)" },
          horzLines: { color: "rgba(255,255,255,0.06)" },
        },
        rightPriceScale: {
          borderColor: "rgba(255,255,255,0.1)",
          scaleMargins: { top: 0.1, bottom: 0.2 },
        },
        timeScale: {
          borderColor: "rgba(255,255,255,0.1)",
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          vertLine: { color: "rgba(252,114,255,0.5)" },
          horzLine: { color: "rgba(252,114,255,0.5)" },
        },
      });

      const lineSeries = chart.addAreaSeries({
        lineColor: "#fc72ff",
        topColor: "rgba(252,114,255,0.3)",
        bottomColor: "rgba(252,114,255,0)",
        lineWidth: 2,
      });

      const chartData = prices.map(([ts, price]) => ({
        time: Math.floor(ts / 1000) as any,
        value: price,
      }));
      lineSeries.setData(chartData);
      chart.timeScale().fitContent();

      const handleResize = () => chart.applyOptions({ width: container.clientWidth });
      window.addEventListener("resize", handleResize);
      chartRef.current = {
        remove: () => {
          window.removeEventListener("resize", handleResize);
          chart.remove();
        },
      };
    } catch (e) {
      container.innerHTML = `<p class="text-slate-500 text-xs p-4">Chart unavailable for ${symbol}</p>`;
    }
  }, [coingeckoId, height]);

  useEffect(() => {
    initChart();
    return () => chartRef.current?.remove();
  }, [initChart]);

  if (!coingeckoId) return null;

  return (
    <div className={className}>
      <p className="text-xs text-[var(--delta-text-muted)] mb-1">{symbol} / USD (7d)</p>
      <div ref={containerRef} style={{ height }} className="rounded-lg overflow-hidden" />
    </div>
  );
}
