export const FEATURE_FLAGS = {
  SEO_META_TAGS: import.meta.env.VITE_ENABLE_SEO_META_TAGS !== 'false',
  SEO_STRUCTURED_DATA: import.meta.env.VITE_ENABLE_SEO_STRUCTURED_DATA !== 'false',
  SEO_FRIENDLY_URLS: import.meta.env.VITE_ENABLE_SEO_FRIENDLY_URLS !== 'false',
  GOOGLE_ANALYTICS: import.meta.env.VITE_ENABLE_GOOGLE_ANALYTICS !== 'false',
  SEO_MONITORING: import.meta.env.NODE_ENV === 'development'
}; 