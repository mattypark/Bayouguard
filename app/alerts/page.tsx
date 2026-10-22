import type { Metadata } from 'next';
import AlertsView from '@/components/pages/AlertsView';

export const metadata: Metadata = { title: 'Flood alerts — BayouGuard' };

export default function AlertsPage({ searchParams }: { searchParams: { address?: string; lat?: string; lng?: string } }) {
  const lat = Number(searchParams.lat);
  const lng = Number(searchParams.lng);
  const coords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  return <AlertsView initialAddress={searchParams.address?.slice(0, 200)} initialCoords={coords} />;
}
