export const project = {
  name:"Gems",
  gemsPerRuble:2,
  steamFeePercent:5,
  preview: process.env.NEXT_PUBLIC_CATALOG_MODE !== "live",
} as const;
