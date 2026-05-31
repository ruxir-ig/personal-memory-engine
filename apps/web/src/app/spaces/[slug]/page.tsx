import { SpaceDetailClient } from "./space-detail-client";

export function generateStaticParams() {
  return [{ slug: "placeholder" }];
}

export default function SpaceDetailPage() {
  return <SpaceDetailClient />;
}
