/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n: {
    // Liste der unterstützten Sprachen
    locales: ['de', 'en'],
    // Standardsprache
    defaultLocale: 'de',
    // Automatische Spracherkennung im Browser deaktivieren
    localeDetection: false,
  }
}

// eslint-disable-next-line no-undef
module.exports = nextConfig
