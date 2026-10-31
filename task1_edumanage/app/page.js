import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
export default function Home() { redirect(getUser() ? '/dashboard' : '/login'); }
