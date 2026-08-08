import { fetchProductFromUrl, importProductFromHtml } from '../services/import.service.js';
import { BadRequestError } from '../utils/appError.js';

export const importFromMeesho = async (req, res, next) => {
  let { url, html, markupType, markupValue } = req.body;

  // Auto-detect if the user pasted HTML in the URL field
  const trimmedUrl = url ? url.trim() : "";
  if (trimmedUrl.startsWith("<") || trimmedUrl.startsWith("<!DOCTYPE") || trimmedUrl.length > 500) {
    html = trimmedUrl;
    url = "";
  }

  if (!url && !html) {
    return next(new BadRequestError("Meesho product link URL or raw HTML is required."));
  }

  if (url) {
    try {
      new URL(url);
    } catch (e) {
      return next(new BadRequestError("Invalid URL format. Please paste a valid Meesho product link."));
    }
  }

  const adminMarkup = {
    type: markupType || 'percentage',
    value: markupValue !== undefined ? Number(markupValue) : 15
  };

  try {
    let productDetails;
    if (html && html.trim()) {
      productDetails = await importProductFromHtml(html, url, adminMarkup);
    } else {
      productDetails = await fetchProductFromUrl(url, adminMarkup);
    }
    
    res.status(200).json({
      success: true,
      message: "Product details fetched and processed successfully from Meesho.",
      data: productDetails
    });
  } catch (error) {
    next(error);
  }
};
