import './globals.css';
export const metadata = { title: 'MarketHub', description: 'Multi-vendor marketplace' };
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
