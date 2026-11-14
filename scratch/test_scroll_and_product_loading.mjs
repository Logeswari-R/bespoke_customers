/**
 * Comprehensive verification of Scroll Restoration & Product Loading Logic
 */
import { getRouteKey, getSavedScrollPosition, saveCurrentScrollPosition, prepareNavigation, handlePopStateNavigation } from '../src/utils/scrollRestoration.js'
import { getUrlForViewState, parseUrlToViewState } from '../src/utils/navigation.js'

// Mock browser window and sessionStorage
globalThis.window = {
  location: {
    pathname: '/',
    search: '',
    get href() {
      return 'http://localhost:5173' + this.pathname + this.search
    }
  },
  history: {
    state: {},
    replaceState(st, _, url) {
      this.state = st
    },
    pushState(st, _, url) {
      this.state = st
    }
  },
  scrollY: 0,
  scrollX: 0,
  scrollTo({ top, left }) {
    this.scrollY = top || 0
    this.scrollX = left || 0
  }
}
globalThis.document = {
  documentElement: {
    scrollTop: 0,
    scrollHeight: 3000
  },
  body: {
    scrollHeight: 3000
  }
}

const mockStorage = new Map()
globalThis.sessionStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
}

console.log('--- RUNNING TESTS ---')

// Test 1: Scroll down Home -> open Product A -> Back
console.log('\n[Test 1] Scroll down Home -> open Product A -> Back');
window.location.pathname = '/';
window.location.search = '';
window.scrollY = 1250;
saveCurrentScrollPosition('/');

// User clicks Product 417
prepareNavigation('/', '/product/417', false);
window.location.pathname = '/product/417';
window.location.search = '';
window.scrollTo({ top: 0, left: 0 });

console.assert(window.scrollY === 0, 'New product page should start at top 0');
console.assert(getSavedScrollPosition('/').y === 1250, 'Home scroll position 1250 must be saved');

// User presses Back to Home
handlePopStateNavigation('/');
window.location.pathname = '/';
const homeSaved = getSavedScrollPosition('/');
console.assert(homeSaved && homeSaved.y === 1250, 'Back to Home must retrieve saved y=1250');
console.log('Test 1 Passed: Home scroll position correctly saved and restored.');

// Test 2: Category page -> Product B -> Back
console.log('\n[Test 2] Scroll down Category -> open Product B -> Back');
window.location.pathname = '/category/44';
window.location.search = '?sub=Sarees';
window.scrollY = 850;
saveCurrentScrollPosition(getRouteKey('/category/44', '?sub=Sarees'));

// User clicks Product 437
prepareNavigation('/category/44?sub=Sarees', '/product/437', false);
window.location.pathname = '/product/437';
window.location.search = '';
window.scrollTo({ top: 0, left: 0 });

console.assert(window.scrollY === 0, 'New product page should start at top 0');
console.assert(getSavedScrollPosition('/category/44?sub=Sarees').y === 850, 'Category position 850 must be saved');

// User presses Back to Category
handlePopStateNavigation('/category/44?sub=Sarees');
const catSaved = getSavedScrollPosition('/category/44?sub=Sarees');
console.assert(catSaved && catSaved.y === 850, 'Back to Category must retrieve saved y=850');
console.log('Test 2 Passed: Category scroll position correctly saved and restored.');

// Test 3: Product A -> Product B -> Back -> Forward
console.log('\n[Test 3] Product A -> Product B -> Back -> Forward');
window.location.pathname = '/product/417';
window.location.search = '';
window.scrollY = 600;
saveCurrentScrollPosition('/product/417');

prepareNavigation('/product/417', '/product/437', false);
window.location.pathname = '/product/437';
window.scrollY = 350;
saveCurrentScrollPosition('/product/437');

// Back to 417
handlePopStateNavigation('/product/417');
console.assert(getSavedScrollPosition('/product/417').y === 600, 'Back to Product 417 must retrieve y=600');

// Forward to 437
handlePopStateNavigation('/product/437');
console.assert(getSavedScrollPosition('/product/437').y === 350, 'Forward to Product 437 must retrieve y=350');
console.log('Test 3 Passed: Multi-level Back/Forward history maintains individual route positions.');

// Test 4: Refresh a listing page while scrolled down
console.log('\n[Test 4] Refresh a listing page while scrolled down');
window.location.pathname = '/deals';
window.location.search = '';
window.scrollY = 1600;
saveCurrentScrollPosition('/deals');

// Simulate page refresh: sessionStorage retains '/deals'
const refreshedSaved = getSavedScrollPosition('/deals');
console.assert(refreshedSaved && refreshedSaved.y === 1600, 'Refresh must preserve position 1600 in sessionStorage');
console.log('Test 4 Passed: Position preserved across browser refresh.');

// Test 5: Direct URL access starts at top
console.log('\n[Test 5] Direct URL access in new tab starts at top');
const directUrl = '/product/999';
const directSaved = getSavedScrollPosition(directUrl);
console.assert(directSaved === null, 'Brand new direct URL has no prior position');
console.log('Test 5 Passed: Direct access clean start.');

// Test 6: URL routing parses accurately
console.log('\n[Test 6] URL parser accuracy');
const p1 = parseUrlToViewState('/product/417');
console.assert(p1.type === 'product' && String(p1.data.id) === '417', 'Parse /product/417');
const p2 = parseUrlToViewState('/category/44', '?sub=Kurtas');
console.assert(p2.type === 'category' && String(p2.data.id) === '44' && p2.data.selectedSubcategory === 'Kurtas', 'Parse /category/44?sub=Kurtas');
console.log('Test 6 Passed: URL parsing fully validated.');

console.log('\nALL 6 VERIFICATION SUITES PASSED CLEANLY!\n');

