export const downloadImage = async (url: string): Promise<Buffer> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};
