import type { Metadata } from "next";
import { Covered_By_Your_Grace, Geist_Mono, Google_Sans } from "next/font/google";

import { LocaleProvider } from "@/components/i18n/locale-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n";
import { THEME_STORAGE_KEY } from "@/lib/theme";

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

const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var path=location.pathname;var auth=path==="/login"||path==="/signup"||path.indexOf("/login/")===0||path.indexOf("/signup/")===0;var admin=path==="/admin"||path.indexOf("/admin/")===0;var r=document.documentElement;if(auth||admin){r.setAttribute("data-force-light","true");r.classList.remove("dark");r.style.colorScheme="light";return;}var t=localStorage.getItem(k)||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

const localeInitScript = `(function(){try{var k=${JSON.stringify(LOCALE_STORAGE_KEY)};var l=localStorage.getItem(k);var locale=l==="en"||l==="th"?l:"th";document.documentElement.lang=locale==="th"?"th":"en";document.documentElement.dataset.locale=locale;}catch(e){}})();`;

export const metadata: Metadata = {
  title: "TOR Match",
  description:
    "Extract key TOR criteria and automate eligibility matching for BMA government projects.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={`${googleSans.variable} ${coveredByYourGrace.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playpen+Sans+Thai:wght@400&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <LocaleProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
