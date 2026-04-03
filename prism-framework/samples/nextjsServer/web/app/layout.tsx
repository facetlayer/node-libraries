export const metadata = {
  title: 'Prism + Next.js Sample',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif', background: '#f5f5f5', color: '#333', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
