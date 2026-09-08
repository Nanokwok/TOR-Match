import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Covered_By_Your_Grace, Geist_Mono, Google_Sans } from "next/font/google";

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { DEFAULT_LOCALE, isLocale, localeToHtmlLang } from "@/lib/i18n";
import {
  LOCALE_COOKIE,
  RESOLVED_THEME_COOKIE,
  THEME_COOKIE,
} from "@/lib/preferences";
import { isThemePreference, type ResolvedTheme } from "@/lib/theme";

import "./globals.css";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin", "thai"],
});

const coveredByYourGrace = Covered_By_Your_Grace({
  variable: "--font-covered-by-your-grace",
  subsets: ["latin"],
  weight: "400",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TOR Match",
  description:
    "Extract key TOR criteria and automate eligibility matching for BMA government projects.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Preferences come from cookies, so the first render on the server already
  // has the right language and theme — no init script, no flash.
  const cookieStore = await cookies();

  const storedLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;

  const storedTheme = cookieStore.get(THEME_COOKIE)?.value;
  const theme = isThemePreference(storedTheme) ? storedTheme : "system";

  // The server cannot evaluate `prefers-color-scheme`; the client records what
  // "system" resolved to on this device, and we trust it on the next render.
  const storedResolved = cookieStore.get(RESOLVED_THEME_COOKIE)?.value;
  const resolvedTheme: ResolvedTheme =
    theme === "system"
      ? storedResolved === "dark"
        ? "dark"
        : "light"
      : theme;

  return (
    <html
      lang={localeToHtmlLang(locale)}
      data-locale={locale}
      suppressHydrationWarning
      className={`${googleSans.variable} ${coveredByYourGrace.variable} ${geistMono.variable} h-full antialiased${resolvedTheme === "dark" ? " dark" : ""}`}
      style={{ colorScheme: resolvedTheme }}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playpen+Sans+Thai:wght@400&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <LocaleProvider initialLocale={locale}>
          <ThemeProvider
            initialTheme={theme}
            initialResolvedTheme={resolvedTheme}
          >
            {children}
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
