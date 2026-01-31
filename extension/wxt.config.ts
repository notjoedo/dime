import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Dime',
    description: 'Get the best credit card recommendation at checkout',
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    permissions: ['storage', 'activeTab', 'tabs'],
    host_permissions: [
      // Shopping
      'https://amazon.com/*',
      'https://*.amazon.com/*',
      'https://walmart.com/*',
      'https://*.walmart.com/*',
      'https://target.com/*',
      'https://*.target.com/*',
      'https://bestbuy.com/*',
      'https://*.bestbuy.com/*',
      'https://macys.com/*',
      'https://*.macys.com/*',
      'https://chewy.com/*',
      'https://*.chewy.com/*',

      // Streaming
      'https://netflix.com/*',
      'https://*.netflix.com/*',
      'https://hulu.com/*',
      'https://*.hulu.com/*',
      'https://disneyplus.com/*',
      'https://*.disneyplus.com/*',
      'https://max.com/*',
      'https://*.max.com/*',
      'https://peacocktv.com/*',
      'https://*.peacocktv.com/*',
      'https://tv.youtube.com/*',
      'https://primevideo.com/*',
      'https://*.primevideo.com/*',
      'https://crunchyroll.com/*',
      'https://*.crunchyroll.com/*',
      'https://spotify.com/*',
      'https://*.spotify.com/*',
      'https://music.amazon.com/*',
      'https://siriusxm.com/*',
      'https://*.siriusxm.com/*',
      'https://starz.com/*',
      'https://*.starz.com/*',
      'https://audible.com/*',
      'https://*.audible.com/*',

      // Food Delivery
      'https://doordash.com/*',
      'https://*.doordash.com/*',
      'https://ubereats.com/*',
      'https://*.ubereats.com/*',
      'https://grubhub.com/*',
      'https://*.grubhub.com/*',
      'https://postmates.com/*',
      'https://*.postmates.com/*',
      'https://trycaviar.com/*',
      'https://*.trycaviar.com/*',
      'https://instacart.com/*',
      'https://*.instacart.com/*',

      // Rideshare
      'https://uber.com/*',
      'https://*.uber.com/*',
      'https://lyft.com/*',
      'https://*.lyft.com/*',

      // Dining
      'https://bk.com/*',
      'https://*.bk.com/*',

      // Backend API
      'http://localhost:8000/*',
    ],
  },
});
