import type { Metadata } from 'next';
import AboutView from '@/components/pages/AboutView';

export const metadata: Metadata = { title: 'About — BayouGuard' };

export default function AboutPage() {
  return <AboutView />;
}
