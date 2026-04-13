export const buildIncludedMap = <I extends { id: string }>(included: I[] = []): Map<string, I> => {
  return new Map(included.map((r) => [r.id, r]));
};
