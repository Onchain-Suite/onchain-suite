/** The trimmed string, or undefined when there is nothing in it. */
export const nonEmpty = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
};
