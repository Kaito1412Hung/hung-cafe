import type { Metadata } from "next";
import { FavoritesList } from "@/components/product/FavoritesList";

export const metadata: Metadata = { title: "Món yêu thích" };

export default function FavoritesPage() {
  return <FavoritesList />;
}
