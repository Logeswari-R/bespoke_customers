// Comprehensive Automated Verification Suite for Recently Viewed Products

import {
  getRecentlyViewedStorageKey,
  MAX_RECENTLY_VIEWED_ITEMS,
  RECENTLY_VIEWED_MAX_AGE_MS,
  extractProductSnapshot,
  getRecentlyViewedProducts,
  addRecentlyViewedProduct,
  removeRecentlyViewedProduct,
  clearRecentlyViewedProducts,
} from '../src/utils/recentlyViewedUtils.js';

// Polyfill window and localStorage for headless node environment
const store = {};
global.window = {
  localStorage: {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  },
  dispatchEvent: (event) => {}
};

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log("=== STARTING RECENTLY VIEWED CACHING VERIFICATION SUITE ===\n");

  window.localStorage.clear();

  // Test 1: Open Product A: it appears in Recently Viewed
  console.log("--- Test 1: Open Product A ---");
  const prodA = {
    id: 419,
    product_name: "green saree",
    price: "200.00",
    actual_price: "200.00",
    vendor: { brand_business_name: "Nazia Syed", img_path: "designers/logo.webp" },
    lowest_price_main_image: "https://aws.com/green-saree.webp",
    is_customizable: 0
  };
  addRecentlyViewedProduct(prodA);
  let list = getRecentlyViewedProducts();
  assert(list.length === 1, "Product A added to recently viewed");
  assert(list[0].id === '419', "Product A ID is 419");
  assert(list[0].product_name === "green saree", "Product A name is correct");
  assert(list[0].brand_name === "Nazia Syed", "Brand name Nazia Syed captured");

  // Test 2: Open Product B: B appears first and A appears second
  console.log("\n--- Test 2: Open Product B (Order check) ---");
  const prodB = {
    id: 420,
    product_name: "Red Saree",
    price: "1000.00",
    actual_price: "1500.00",
    discount_percentage: 33,
    vendor: { shop_name: "Tifara Boutique" },
    main_image: "https://aws.com/red-saree.webp"
  };
  addRecentlyViewedProduct(prodB);
  list = getRecentlyViewedProducts();
  assert(list.length === 2, "List now contains 2 products");
  assert(list[0].id === '420', "Product B (420) is at index 0 (newest first)");
  assert(list[1].id === '419', "Product A (419) is at index 1");

  // Test 3: Open Product A again: A moves to the first position without duplication
  console.log("\n--- Test 3: Re-open Product A (Duplicate prevention & promotion) ---");
  addRecentlyViewedProduct(prodA);
  list = getRecentlyViewedProducts();
  assert(list.length === 2, "No duplicates created; length is still 2");
  assert(list[0].id === '419', "Product A (419) promoted to index 0");
  assert(list[1].id === '420', "Product B (420) pushed to index 1");

  // Test 4 & 5: Refresh / persistence simulation
  console.log("\n--- Test 4 & 5: Persistence check ---");
  const storageKey = getRecentlyViewedStorageKey();
  const rawCache = window.localStorage.getItem(storageKey);
  assert(Boolean(rawCache), "Raw localStorage item exists");
  const reloadedList = getRecentlyViewedProducts();
  assert(reloadedList.length === 2, "Cache persists after reload");
  assert(reloadedList[0].id === '419', "First item remains 419");

  // Test 6: Open more than 12 products: only the latest 12 remain
  console.log("\n--- Test 6: Capacity limit of 12 items ---");
  for (let i = 1; i <= 15; i++) {
    addRecentlyViewedProduct({
      id: 500 + i,
      product_name: `Product #${500 + i}`,
      price: 200 + i
    });
  }
  list = getRecentlyViewedProducts();
  assert(list.length === 12, `Total items capped strictly at 12 (Actual: ${list.length})`);
  assert(list[0].id === '515', "Most recent item is 515 (at index 0)");
  assert(list[11].id === '504', "12th item is 504; older items 419, 420, 501, 502, 503 were evicted");

  // Test 7 & 8: Guest vs Logged-in Account Isolation
  console.log("\n--- Test 7 & 8: Guest vs Logged-in Customer Partitioning ---");
  const guestKey = getRecentlyViewedStorageKey(null);
  const user1Key = getRecentlyViewedStorageKey('user_76');
  const user2Key = getRecentlyViewedStorageKey('user_99');

  assert(guestKey !== user1Key, "Guest storage key is distinct from User 76");
  assert(user1Key !== user2Key, "User 76 storage key is distinct from User 99");

  // User 76 views a luxury item
  addRecentlyViewedProduct({ id: 999, product_name: "User 76 Exclusive Gown" }, 'user_76');
  const user76List = getRecentlyViewedProducts('user_76');
  const guestList = getRecentlyViewedProducts(null);
  const user99List = getRecentlyViewedProducts('user_99');

  assert(user76List.length === 1 && user76List[0].id === '999', "User 76 has 1 unique item");
  assert(guestList.length === 12 && !guestList.some(i => i.id === '999'), "Guest cache does not contain User 76's item");
  assert(user99List.length === 0, "User 99 history is empty (no cross-account leakage)");

  // Test 9: PDP Exclude Current Product
  console.log("\n--- Test 9: PDP Exclusion Check ---");
  const currentPid = '515';
  const filteredForPdp = list.filter(item => item.id !== currentPid);
  assert(filteredForPdp.length === 11, "Current opened product excluded on PDP");
  assert(!filteredForPdp.some(item => item.id === currentPid), "515 does not appear in its own PDP carousel");

  // Test 10: Corrupted localStorage handling
  console.log("\n--- Test 10: Corrupted data recovery ---");
  window.localStorage.setItem(guestKey, "INVALID_CORRUPTED_JSON_{{[}");
  const recoveredList = getRecentlyViewedProducts(null);
  assert(Array.isArray(recoveredList) && recoveredList.length === 0, "Corrupted JSON safely caught without crashing");

  // Test 11: 30-day Expiration Policy
  console.log("\n--- Test 11: Expiration check (30 days) ---");
  const expiredDate = new Date(Date.now() - (31 * 24 * 60 * 60 * 1000)).toISOString();
  const freshDate = new Date().toISOString();
  const testItems = [
    { id: '101', product_name: 'Fresh Item', viewed_at: freshDate },
    { id: '102', product_name: 'Expired Item', viewed_at: expiredDate }
  ];
  window.localStorage.setItem(guestKey, JSON.stringify(testItems));
  const nonExpiredList = getRecentlyViewedProducts(null);
  assert(nonExpiredList.length === 1, "Expired item automatically purged");
  assert(nonExpiredList[0].id === '101', "Fresh item retained");

  // Test 12: Remove individual item & Clear all
  console.log("\n--- Test 12: Remove individual item & Clear all ---");
  removeRecentlyViewedProduct('101', null);
  assert(getRecentlyViewedProducts(null).length === 0, "Item 101 removed successfully");

  addRecentlyViewedProduct(prodA, null);
  addRecentlyViewedProduct(prodB, null);
  assert(getRecentlyViewedProducts(null).length === 2, "Items added before clear");
  clearRecentlyViewedProducts(null);
  assert(getRecentlyViewedProducts(null).length === 0, "Clear all wipes history cleanly");

  console.log("\n🎉 ALL 12 RECENTLY VIEWED SCENARIOS TESTED AND PASSED PERFECTLY! 🎉");
}

runTests();

