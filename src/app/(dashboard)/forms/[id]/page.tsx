import { FormBuilder } from "@/features/forms/components/form-builder";

export const dynamic = "force-dynamic";

export default async function FormBuilderRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FormBuilder id={id} />;
}
