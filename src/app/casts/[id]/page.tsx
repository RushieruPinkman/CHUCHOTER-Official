import { redirect } from "next/navigation";
import { getAllCasts } from "@/lib/data";

interface CastDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const casts = await getAllCasts();
  return casts.map((cast) => ({ id: cast.id }));
}

export default async function CastDetailPage({ params }: CastDetailPageProps) {
  const { id } = await params;
  redirect(`/casts?cast=${id}`);
}
