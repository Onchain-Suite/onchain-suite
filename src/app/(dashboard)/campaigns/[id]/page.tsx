import { CampaignDetailPage } from "@/features/campaigns/pages/detail";

export const dynamic = "force-dynamic";

export default async function CampaignDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignDetailPage id={id} />;
}
