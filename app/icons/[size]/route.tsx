/* PWA icons at /icons/192 and /icons/512, generated at build time. */

import { ImageResponse } from 'next/og';
import { DropIcon } from '@/lib/brandIcon';

export const dynamic = 'force-static';
const SIZES = [192, 512];

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export function GET(_: Request, { params }: { params: { size: string } }) {
  const size = SIZES.includes(Number(params.size)) ? Number(params.size) : 192;
  return new ImageResponse(<DropIcon size={size} />, { width: size, height: size });
}
