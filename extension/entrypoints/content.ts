import { detectMerchant, detectMerchantSite, type MerchantConfig } from '../utils/merchants';
import logoSvg from '../assets/LOGO-02.svg';
import chipSvg from '../assets/CHIP.svg';

// Backend API URL
const API_BASE_URL = 'http://localhost:5001';
const USER_ID = 'aman';

interface BackendCard {
  card_id: string;
  card_type: string;
  last_four: string;
  benefits?: string;
  cardholder?: string;
  expiry_date?: string;
}

export default defineContentScript({
  matches: [
    // Active merchants from active_merchants.csv
    '*://*.uber.com/*',           // ID: 10 - Uber
    '*://*.spotify.com/*',        // ID: 13 - Spotify
    '*://*.doordash.com/*',       // ID: 19 - DoorDash
    '*://*.grubhub.com/*',        // ID: 38 - Grubhub
    '*://*.amazon.com/*',         // ID: 44 - Amazon
    '*://*.apple.com/*',          // ID: 60 - Apple
  ],
  main() {
    console.log('Dime content script loaded');

    let overlayInjected = false;

    // Check initial URL
    checkForCheckout(window.location.href);

    // Throttle function to prevent excessive calls
    let lastUrl = window.location.href;
    let throttleTimeout: ReturnType<typeof setTimeout> | null = null;

    function throttledCheckForCheckout() {
      const currentUrl = window.location.href;
      if (currentUrl === lastUrl) return;
      lastUrl = currentUrl;
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        checkForCheckout(currentUrl);
      }, 500);
    }

    // Watch for URL changes (SPA navigation)
    const observer = new MutationObserver(() => {
      throttledCheckForCheckout();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.addEventListener('popstate', () => {
      checkForCheckout(window.location.href);
    });

    function checkForCheckout(url: string) {
      const checkoutMerchant = detectMerchant(url);
      if (checkoutMerchant && !overlayInjected) {
        fetchAndShowRecommendation(checkoutMerchant);
      } else if (!checkoutMerchant && overlayInjected) {
        removeOverlay();
      }
    }

    async function fetchAndShowRecommendation(merchant: MerchantConfig) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cards?user_id=${USER_ID}`);
        const data = await response.json();
        const cards: BackendCard[] = data.cards || [];

        if (cards.length === 0) {
          console.log('Dime: No cards found');
          return;
        }

        const bestCard = findBestCardForCategory(cards, merchant.category);

        if (bestCard) {
          injectOverlay(bestCard, merchant);
        }
      } catch (error) {
        console.error('Dime: Failed to fetch cards:', error);
      }
    }

    function getCashbackRate(benefits: string | undefined, category: string): number {
      if (!benefits) return 1.0;
      const categoryMatch = benefits.toLowerCase().includes(category.toLowerCase());
      const percentMatch = benefits.match(/(\d+(?:\.\d+)?)\s*%/);
      if (categoryMatch && percentMatch) return parseFloat(percentMatch[1]);
      if (percentMatch) return parseFloat(percentMatch[1]);
      return 1.5;
    }

    function findBestCardForCategory(cards: BackendCard[], category: string): BackendCard | null {
      if (cards.length === 0) return null;
      let bestCard = cards[0];
      let bestRate = getCashbackRate(cards[0].benefits, category);
      for (const card of cards) {
        const rate = getCashbackRate(card.benefits, category);
        if (rate > bestRate) {
          bestRate = rate;
          bestCard = card;
        }
      }
      return bestCard;
    }

    function mapCardType(type: string): 'visa' | 'mastercard' | 'discover' | 'american_express' {
      const normalized = type?.toLowerCase() || '';
      if (normalized.includes('visa')) return 'visa';
      if (normalized.includes('mastercard') || normalized.includes('master')) return 'mastercard';
      if (normalized.includes('discover')) return 'discover';
      if (normalized.includes('amex') || normalized.includes('american')) return 'american_express';
      return 'visa';
    }

    function injectOverlay(bestCard: BackendCard, merchant: MerchantConfig) {
      if (overlayInjected) return;

      const overlay = createOverlayElement(bestCard, merchant);
      document.body.appendChild(overlay);
      overlayInjected = true;

      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.style.transform = 'translateY(0)';
      });
    }

    function createOverlayElement(bestCard: BackendCard, merchant: MerchantConfig): HTMLElement {
      const overlay = document.createElement('div');
      overlay.id = 'dime-overlay';

      const cashbackRate = getCashbackRate(bestCard.benefits, merchant.category);
      const cardType = mapCardType(bestCard.card_type);
      const lastFour = bestCard.last_four || '0000';
      const cardHolderName = bestCard.cardholder || USER_ID;
      const expiryDate = bestCard.expiry_date || '12/28';

      // Format card number display
      const maskedPart = '* * * *   * * * *   * * * *';
      const lastFourSpaced = lastFour.split('').join(' ');
      const displayNumber = `${maskedPart}   ${lastFourSpaced}`;

      // Card type badge HTML
      let cardTypeBadge = '';
      if (cardType === 'visa') {
        cardTypeBadge = `<span style="font-size: 20px; font-weight: bold; font-style: italic; color: #1a1f71;">VISA</span>`;
      } else if (cardType === 'mastercard') {
        cardTypeBadge = `<div style="display: flex; align-items: center;">
          <div style="width: 28px; height: 28px; background: #eb001b; border-radius: 50%;"></div>
          <div style="width: 28px; height: 28px; background: #f79e1b; border-radius: 50%; margin-left: -10px; opacity: 0.9;"></div>
        </div>`;
      } else if (cardType === 'american_express') {
        cardTypeBadge = `<span style="font-size: 18px; font-weight: bold; color: #006fcf;">AMEX</span>`;
      } else if (cardType === 'discover') {
        cardTypeBadge = `<span style="font-size: 18px; font-weight: bold; color: #ff6000;">DISCOVER</span>`;
      }

      // Main overlay container - matches popup exactly
      overlay.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 500px;
        background: #121212;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        opacity: 0;
        transform: translateY(-10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        overflow: hidden;
      `;

      overlay.innerHTML = `
        <!-- Header - matches popup header -->
        <header style="
          background: #121212;
          padding: 24px 40px 16px 40px;
          border-bottom: 1px solid #454545;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <!-- Logo -->
            <img src="${logoSvg}" alt="Dime" style="height: 56px; filter: invert(1);" />
            
            <!-- Close Button -->
            <button id="dime-close" style="
              background: none;
              border: none;
              font-size: 28px;
              cursor: pointer;
              color: #666;
              padding: 0 0 0 16px;
              line-height: 1;
            ">&times;</button>
          </div>
        </header>

        <!-- Content - matches popup layout -->
        <div style="padding: 40px;">
          <!-- Section Header -->
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
            <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <span style="color: white; font-size: 22px; font-weight: bold;">there's a better card available for ${merchant.name.toLowerCase()}!</span>
          </div>

          <!-- Card and Info Row -->
          <div style="display: flex; align-items: stretch; justify-content: space-between; gap: 32px;">
            <!-- Left side - Card (matches popup card component exactly) -->
            <div style="width: 280px; flex-shrink: 0; position: relative;">
              <!-- Ideal card pill -->
              <div style="
                position: absolute;
                top: -16px;
                right: 4px;
                z-index: 10;
                background: white;
                border: 2px solid #BB86FC;
                border-radius: 9999px;
                padding: 4px 20px;
                display: flex;
                align-items: center;
                gap: 8px;
              ">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#BB86FC">
                  <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
                  <path d="M19 2L19.94 4.06L22 5L19.94 5.94L19 8L18.06 5.94L16 5L18.06 4.06L19 2Z" />
                  <path d="M5 16L5.63 17.37L7 18L5.63 18.63L5 20L4.37 18.63L3 18L4.37 17.37L5 16Z" />
                </svg>
                <span style="color: #BB86FC; font-size: 14px; font-weight: 500;">ideal card!</span>
              </div>
              

              
              <!-- Card -->
              <div style="
                position: relative;
                width: 100%;
                aspect-ratio: 1.7 / 1;
                background: white;
                border-radius: 16px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                overflow: hidden;
              ">
                <!-- Top row: Chip and Card Type -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <!-- Chip -->
                  <img src="${chipSvg}" alt="Chip" style="width: 40px; height: 32px; flex-shrink: 0;" />
                  
                  <!-- Card Type Logo -->
                  <div style="width: 80px; height: 28px; display: flex; align-items: center; justify-content: flex-end; flex-shrink: 0;">
                    ${cardTypeBadge}
                  </div>
                </div>

                <!-- Card Number -->
                <div style="font-size: 13px; letter-spacing: 1.5px; color: #A09D9D; white-space: nowrap;">
                  ${displayNumber}
                </div>

                <!-- Bottom row: Name and Expiry -->
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                  <div>
                    <div style="font-size: 10px; color: #A09D9D; margin-bottom: 2px;">Card Holder Name</div>
                    <div style="font-size: 14px; color: #A09D9D; font-weight: 500;">${cardHolderName}</div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 10px; color: #A09D9D; margin-bottom: 2px;">Expiry Date</div>
                    <div style="font-size: 14px; color: #A09D9D; font-weight: 500;">${expiryDate}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right side - Cashback info (matches popup) -->
            <div style="display: flex; flex-direction: column; justify-content: flex-end; flex: 1;">
              <div style="color: white; font-size: 32px; font-weight: bold;">${cashbackRate}%</div>
              <div style="color: white; font-size: 20px;">cashback</div>
              <div style="color: #9ca3af; font-size: 14px; margin-top: 8px;">${bestCard.benefits || 'General rewards card'}</div>

          </div>
        </div>
      `;

      // Event listeners
      const closeBtn = overlay.querySelector('#dime-close');
      closeBtn?.addEventListener('click', () => removeOverlay());

      return overlay;
    }

    function removeOverlay() {
      const overlay = document.getElementById('dime-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          overlay.remove();
          overlayInjected = false;
        }, 300);
      }
    }

    // Listen for messages from popup
    browser.runtime.onMessage.addListener((message: { type: string; merchantId?: string }) => {
      if (message.type === 'SHOW_RECOMMENDATION') {
        const merchant = detectMerchantSite(window.location.href);
        if (merchant && !overlayInjected) {
          fetchAndShowRecommendation(merchant);
        }
      }
    });
  },
});
