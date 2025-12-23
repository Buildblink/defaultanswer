import "server-only";

export async function getEntitlements(): Promise<{ isPro: boolean }> {
  return { isPro: process.env.DEFAULTANSWER_FORCE_PRO === "true" };
}
