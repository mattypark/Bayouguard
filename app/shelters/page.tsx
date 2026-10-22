import type { Metadata } from 'next';
import SheltersView from '@/components/pages/SheltersView';

export const metadata: Metadata = { title: 'Shelters — BayouGuard' };

export default function SheltersPage() {
  return <SheltersView />;
}
