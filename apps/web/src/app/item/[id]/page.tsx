import { ItemDetailClient } from "./item-detail-client";

export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function ItemPage() {
  return <ItemDetailClient />;
}
