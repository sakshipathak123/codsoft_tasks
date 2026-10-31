import './globals.css';
export const metadata = { title: 'DineDesk', description: 'Restaurant ordering platform' };
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
