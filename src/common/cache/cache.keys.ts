export const CacheKeys = {
  userState: (userId: string) => `user:state:${userId}`,
  consentTypeBySlug: (slug: string) => `consentType:slug:${slug}`,
};
