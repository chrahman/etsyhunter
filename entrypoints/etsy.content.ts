import { MessageType, type ScrapeTabMessage } from '@/lib/messaging';
import { collectListing } from '@/lib/collectors/listing';
import { collectShopBlock, enrichShopWithPageData } from '@/lib/collectors/shop';
import { fetchSimilarListings } from '@/lib/collectors/similar-listings';
import { collectSearchResults } from '@/lib/collectors/search';
import { getPageType, extractSearchQuery } from '@/lib/collectors/utils';

export default defineContentScript({
  matches: ['*://*.etsy.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    let scrapeInFlight = false;
    let scrapeQueued = false;

    const scrapeAndSend = async () => {
      if (!ctx.isValid) return;

      if (scrapeInFlight) {
        scrapeQueued = true;
        return;
      }

      scrapeInFlight = true;

      try {
        const url = window.location.href;
        const pageType = getPageType(url);
        const query = extractSearchQuery(url);

        if (pageType === 'listing') {
          const listing = collectListing(url);
          let shop = collectShopBlock();
          try {
            shop = await enrichShopWithPageData(shop);
          } catch {
            // shop page fetch failed — keep listing-page shop block data
          }
          const competitors = await fetchSimilarListings(listing?.listingId);

          await browser.runtime.sendMessage({
            type: MessageType.COLLECTED_DATA,
            pageType,
            query,
            listing,
            shop,
            competitors,
          });
          return;
        }

        if (pageType === 'search') {
          const competitors = collectSearchResults();

          await browser.runtime.sendMessage({
            type: MessageType.COLLECTED_DATA,
            pageType,
            query,
            listing: null,
            shop: null,
            competitors,
          });
          return;
        }

        await browser.runtime.sendMessage({
          type: MessageType.COLLECTED_DATA,
          pageType: 'other',
          query: null,
          listing: null,
          shop: null,
          competitors: [],
        });
      } catch (error) {
        await browser.runtime.sendMessage({
          type: MessageType.SCRAPE_ERROR,
          error: error instanceof Error ? error.message : 'Scrape failed',
        });
      } finally {
        scrapeInFlight = false;
        if (scrapeQueued) {
          scrapeQueued = false;
          void scrapeAndSend();
        }
      }
    };

    browser.runtime.onMessage.addListener((message: ScrapeTabMessage) => {
      if (message.type === MessageType.SCRAPE_TAB) {
        scrapeAndSend();
      }
    });

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      scrapeAndSend();
    });

    scrapeAndSend();
  },
});
