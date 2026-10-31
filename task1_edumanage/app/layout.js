import './globals.css';
export const metadata = { title: 'EduManage', description: 'Student management system' };
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
