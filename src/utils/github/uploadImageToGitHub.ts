export const uploadImageToGitHub = async (
  token: string,
  owner: string,
  repo: string,
  image: Buffer,
): Promise<string> => {
  const res = await fetch(`https://uploads.github.com/repos/${owner}/${repo}/issues/assets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'image/jpeg',
    },
    body: image,
  });
  if (!res.ok) throw new Error(`GitHub image upload ${res.status}: ${await res.text()}`);
  const { url } = (await res.json()) as { url: string };
  return url;
};
