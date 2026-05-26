export interface Currency {
  code: string;
  name: string;
  symbol: string;
  popular?: boolean;
}

export const CURRENCIES: Currency[] = [
  { code: "GEL", name: "Georgian Lari", symbol: "₾", popular: true },
  { code: "USD", name: "US Dollar", symbol: "$", popular: true },
  { code: "EUR", name: "Euro", symbol: "€", popular: true },
  { code: "GBP", name: "British Pound", symbol: "£", popular: true },
  { code: "RUB", name: "Russian Ruble", symbol: "₽", popular: true },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", popular: true },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", popular: true },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", popular: true },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸" },
  { code: "AMD", name: "Armenian Dram", symbol: "֏" },
  { code: "AZN", name: "Azerbaijani Manat", symbol: "₼" },
];

export const POPULAR_CURRENCIES = CURRENCIES.filter((c) => c.popular);

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function formatAmount(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
