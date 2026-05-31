"use client";

import { Suspense } from "react";
import { ItemDetailClient } from "./item-detail-client";

export default function ItemPage() {
  return (
    <Suspense fallback={<div className="faint">Loading item…</div>}>
      <ItemDetailClient />
    </Suspense>
  );
}
