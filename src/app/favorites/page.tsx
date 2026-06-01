import { PracticeClient } from "@/components/PracticeClient";

export default function FavoritesPage() {
  return <PracticeClient favoritesOnly mode="ordered" scope="mixed" />;
}
