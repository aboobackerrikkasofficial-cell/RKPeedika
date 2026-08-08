export default class BaseImporter {
  validateURL(url) {
    throw new Error("validateURL must be implemented");
  }

  async fetchHTML(url) {
    throw new Error("fetchHTML must be implemented");
  }

  parseProduct(html, url) {
    throw new Error("parseProduct must be implemented");
  }

  async downloadImages(imageUrls) {
    throw new Error("downloadImages must be implemented");
  }

  mapCategory(scrapedCategory, categories) {
    throw new Error("mapCategory must be implemented");
  }

  calculatePricing(originalPrice, sellingPrice, adminMarkup = { type: 'flat', value: 0 }) {
    throw new Error("calculatePricing must be implemented");
  }
}
