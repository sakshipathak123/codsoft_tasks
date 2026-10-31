import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import Dash from './Dash';

export default function Page() {
  const user = getUser();
  if (!user) redirect('/login');
  return <Dash user={user} />;
}
