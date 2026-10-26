import type { MarketType } from "./types";

export type ExchangeOption = { id: string; label: string };

export const EXCHANGES: Record<MarketType, ExchangeOption[]> = {
  forex: [
    { id: "OANDA", label: "OANDA" },
    { id: "FOREXCOM", label: "FOREX.com" },
    { id: "FXCM", label: "FXCM" },
    { id: "ICEEUR", label: "ICE EUR" },
    { id: "SAXO", label: "Saxo Bank" },
    { id: "BLACKBULL", label: "BlackBull" },
  ],
  crypto: [
    { id: "BINANCE", label: "Binance" },
    { id: "BYBIT", label: "Bybit" },
    { id: "COINBASE", label: "Coinbase" },
    { id: "KRAKEN", label: "Kraken" },
    { id: "OKX", label: "OKX" },
    { id: "MEXC", label: "MEXC" },
  ],
  stocks: [
    { id: "NASDAQ", label: "NASDAQ" },
    { id: "NYSE", label: "NYSE" },
    { id: "LSE", label: "London Stock Exchange" },
    { id: "NSE", label: "NSE India" },
    { id: "BSE", label: "BSE India" },
    { id: "TSX", label: "TSX" },
  ],
  indices: [
    { id: "CAPITALCOM", label: "Capital.com" },
    { id: "OANDA", label: "OANDA" },
    { id: "TVC", label: "TradingView CFD" },
    { id: "SPREADEX", label: "SpreadEX" },
  ],
  commodities: [
    { id: "TVC", label: "TradingView CFD" },
    { id: "OANDA", label: "OANDA" },
    { id: "CAPITALCOM", label: "Capital.com" },
  ],
  etf: [
    { id: "NASDAQ", label: "NASDAQ" },
    { id: "NYSE", label: "NYSE" },
    { id: "ARCA", label: "NYSE Arca" },
  ],
};

export type SymbolEntry = {
  symbol: string;
  label: string;
  base: string;
  quote?: string;
};

export const SYMBOL_CATALOG: Record<MarketType, SymbolEntry[]> = {
  forex: [
    { symbol: "EUR/USD", label: "Euro / US Dollar", base: "EUR", quote: "USD" },
    { symbol: "GBP/USD", label: "British Pound / US Dollar", base: "GBP", quote: "USD" },
    { symbol: "USD/JPY", label: "US Dollar / Japanese Yen", base: "USD", quote: "JPY" },
    { symbol: "AUD/USD", label: "Australian Dollar / US Dollar", base: "AUD", quote: "USD" },
    { symbol: "USD/CAD", label: "US Dollar / Canadian Dollar", base: "USD", quote: "CAD" },
    { symbol: "USD/CHF", label: "US Dollar / Swiss Franc", base: "USD", quote: "CHF" },
    { symbol: "NZD/USD", label: "New Zealand Dollar / US Dollar", base: "NZD", quote: "USD" },
    { symbol: "EUR/GBP", label: "Euro / British Pound", base: "EUR", quote: "GBP" },
    { symbol: "EUR/JPY", label: "Euro / Japanese Yen", base: "EUR", quote: "JPY" },
    { symbol: "GBP/JPY", label: "British Pound / Japanese Yen", base: "GBP", quote: "JPY" },
    { symbol: "AUD/JPY", label: "Australian Dollar / Japanese Yen", base: "AUD", quote: "JPY" },
    { symbol: "EUR/AUD", label: "Euro / Australian Dollar", base: "EUR", quote: "AUD" },
    { symbol: "EUR/CHF", label: "Euro / Swiss Franc", base: "EUR", quote: "CHF" },
    { symbol: "GBP/CHF", label: "British Pound / Swiss Franc", base: "GBP", quote: "CHF" },
    { symbol: "USD/MXN", label: "US Dollar / Mexican Peso", base: "USD", quote: "MXN" },
    { symbol: "USD/ZAR", label: "US Dollar / South African Rand", base: "USD", quote: "ZAR" },
    { symbol: "USD/TRY", label: "US Dollar / Turkish Lira", base: "USD", quote: "TRY" },
    { symbol: "XAU/USD", label: "Gold / US Dollar", base: "XAU", quote: "USD" },
    { symbol: "XAG/USD", label: "Silver / US Dollar", base: "XAG", quote: "USD" },
  ],
  crypto: [
    { symbol: "BTC/USDT", label: "Bitcoin / Tether", base: "BTC", quote: "USDT" },
    { symbol: "ETH/USDT", label: "Ethereum / Tether", base: "ETH", quote: "USDT" },
    { symbol: "SOL/USDT", label: "Solana / Tether", base: "SOL", quote: "USDT" },
    { symbol: "BNB/USDT", label: "BNB / Tether", base: "BNB", quote: "USDT" },
    { symbol: "XRP/USDT", label: "XRP / Tether", base: "XRP", quote: "USDT" },
    { symbol: "ADA/USDT", label: "Cardano / Tether", base: "ADA", quote: "USDT" },
    { symbol: "DOGE/USDT", label: "Dogecoin / Tether", base: "DOGE", quote: "USDT" },
    { symbol: "AVAX/USDT", label: "Avalanche / Tether", base: "AVAX", quote: "USDT" },
    { symbol: "MATIC/USDT", label: "Polygon / Tether", base: "MATIC", quote: "USDT" },
    { symbol: "LINK/USDT", label: "Chainlink / Tether", base: "LINK", quote: "USDT" },
    { symbol: "DOT/USDT", label: "Polkadot / Tether", base: "DOT", quote: "USDT" },
    { symbol: "LTC/USDT", label: "Litecoin / Tether", base: "LTC", quote: "USDT" },
    { symbol: "ATOM/USDT", label: "Cosmos / Tether", base: "ATOM", quote: "USDT" },
    { symbol: "TRX/USDT", label: "TRON / Tether", base: "TRX", quote: "USDT" },
    { symbol: "ARB/USDT", label: "Arbitrum / Tether", base: "ARB", quote: "USDT" },
    { symbol: "OP/USDT", label: "Optimism / Tether", base: "OP", quote: "USDT" },
    { symbol: "BTC/USD", label: "Bitcoin / US Dollar", base: "BTC", quote: "USD" },
    { symbol: "ETH/USD", label: "Ethereum / US Dollar", base: "ETH", quote: "USD" },
    { symbol: "SOL/USD", label: "Solana / US Dollar", base: "SOL", quote: "USD" },
  ],
  stocks: [
    { symbol: "AAPL", label: "Apple Inc.", base: "AAPL" },
    { symbol: "MSFT", label: "Microsoft Corporation", base: "MSFT" },
    { symbol: "NVDA", label: "NVIDIA Corporation", base: "NVDA" },
    { symbol: "AMZN", label: "Amazon.com Inc.", base: "AMZN" },
    { symbol: "GOOGL", label: "Alphabet Inc.", base: "GOOGL" },
    { symbol: "META", label: "Meta Platforms Inc.", base: "META" },
    { symbol: "TSLA", label: "Tesla Inc.", base: "TSLA" },
    { symbol: "AMD", label: "Advanced Micro Devices", base: "AMD" },
    { symbol: "NFLX", label: "Netflix Inc.", base: "NFLX" },
    { symbol: "AVGO", label: "Broadcom Inc.", base: "AVGO" },
    { symbol: "JPM", label: "JPMorgan Chase", base: "JPM" },
    { symbol: "V", label: "Visa Inc.", base: "V" },
    { symbol: "WMT", label: "Walmart Inc.", base: "WMT" },
    { symbol: "SPY", label: "SPDR S&P 500 ETF Trust", base: "SPY" },
    { symbol: "QQQ", label: "Invesco QQQ Trust", base: "QQQ" },
    { symbol: "COIN", label: "Coinbase Global", base: "COIN" },
    { symbol: "PLTR", label: "Palantir Technologies", base: "PLTR" },
    { symbol: "DIS", label: "The Walt Disney Company", base: "DIS" },
    { symbol: "BA", label: "The Boeing Company", base: "BA" },
    { symbol: "INTC", label: "Intel Corporation", base: "INTC" },
  ],
  indices: [
    { symbol: "US30", label: "Dow Jones 30", base: "US30" },
    { symbol: "US500", label: "S&P 500", base: "US500" },
    { symbol: "US100", label: "Nasdaq 100", base: "US100" },
    { symbol: "DE40", label: "Germany 40", base: "DE40" },
    { symbol: "UK100", label: "UK 100", base: "UK100" },
    { symbol: "JP225", label: "Japan 225", base: "JP225" },
    { symbol: "AUS200", label: "Australia 200", base: "AUS200" },
    { symbol: "NAS100", label: "Nasdaq 100 CFD", base: "NAS100" },
    { symbol: "US2000", label: "Russell 2000", base: "US2000" },
    { symbol: "VIX", label: "CBOE Volatility Index", base: "VIX" },
  ],
  commodities: [
    { symbol: "XAUUSD", label: "Gold Spot", base: "XAUUSD" },
    { symbol: "XAGUSD", label: "Silver Spot", base: "XAGUSD" },
    { symbol: "WTI", label: "Crude Oil WTI", base: "WTI" },
    { symbol: "BRENT", label: "Brent Crude", base: "BRENT" },
    { symbol: "NG", label: "Natural Gas", base: "NG" },
    { symbol: "COPPER", label: "Copper", base: "COPPER" },
    { symbol: "COCOA", label: "Cocoa", base: "COCOA" },
    { symbol: "SUGAR", label: "Sugar", base: "SUGAR" },
  ],
  etf: [
    { symbol: "SPY", label: "SPDR S&P 500 ETF", base: "SPY" },
    { symbol: "QQQ", label: "Invesco QQQ Trust", base: "QQQ" },
    { symbol: "IWM", label: "iShares Russell 2000", base: "IWM" },
    { symbol: "DIA", label: "SPDR Dow Jones Industrial Average", base: "DIA" },
    { symbol: "TLT", label: "iShares 20+ Year Treasury Bond", base: "TLT" },
    { symbol: "GLD", label: "SPDR Gold Shares", base: "GLD" },
    { symbol: "SLV", label: "iShares Silver Trust", base: "SLV" },
    { symbol: "USO", label: "United States Oil Fund", base: "USO" },
    { symbol: "EEM", label: "iShares MSCI Emerging Markets", base: "EEM" },
    { symbol: "VOO", label: "Vanguard S&P 500 ETF", base: "VOO" },
  ],
};

export function findSymbol(market: MarketType, symbol: string): SymbolEntry | undefined {
  const list = SYMBOL_CATALOG[market] ?? [];
  const upper = symbol.toUpperCase();
  return (
    list.find((s) => s.symbol.toUpperCase() === upper) ??
    list.find((s) => s.base.toUpperCase() === upper) ??
    list.find((s) => s.label.toUpperCase() === upper)
  );
}
