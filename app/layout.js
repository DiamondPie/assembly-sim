import { Google_Sans_Code, Fira_Code, Google_Sans_Flex } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'react-hot-toast';
import "./globals.css";
import TourProviders from '@/features/asm/components/Tour/TourProviders';

const googleSansCode = Google_Sans_Code({
  variable: "--font-geist-mono",
  display: 'swap',
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  display: 'swap',
  subsets: ["latin"],
});

const googleSansFlex = Google_Sans_Flex({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata = {
  title: "COMPSCI 110 Playground",
  description: "A page containing some utilities of COMPSCI 110.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${googleSansCode.variable} ${firaCode.variable} ${googleSansFlex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TourProviders>
          {children}
        </TourProviders>
        <Analytics />
        <Toaster
          position="bottom-left"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '10px',
              background: 'rgba(15, 15, 20, 0.92)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color-1)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(233,160,255,0.08)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              fontSize: '13px',
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              padding: '10px 14px',
              maxWidth: '380px',
            },
            success: {
              iconTheme: {
                primary: 'var(--accent-primary)',     // #e9a0ff
                secondary: '#0a0a0f',
              },
            },
            error: {
              iconTheme: {
                primary: '#ff7a90',
                secondary: '#0a0a0f',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
