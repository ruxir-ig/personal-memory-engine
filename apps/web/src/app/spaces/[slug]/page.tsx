import { staticSpaceParams } from "@/lib/space-routes";
import { SpaceDetailClient } from "./space-detail-client";

export function generateStaticParams() {
  return staticSpaceParams();
}

export default function SpaceDetailPage() {
  return <SpaceDetailClient />;
}
