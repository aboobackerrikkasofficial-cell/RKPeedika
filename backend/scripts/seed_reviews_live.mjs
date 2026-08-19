import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const customerNames = [
  "Rahul Sharma", "Nithin P.", "Priya Verma", "Ashraf K.", "Sneha R.", "Vishnu", "Aditya Singh", "Fasil", "Maria Joseph", "Rohit Kumar",
  "Kavya", "Arjun", "Lakshmi", "Vignesh", "Ramesh", "Deepa", "Anjali", "Suresh", "Ganesh", "Swati",
  "Kiran", "Divya", "Pooja", "Manoj", "Ajay", "Meera", "Akhil", "Harish", "Navya", "Sandeep"
];

const reviewsPool = [
  // Hindi
  { title: "Bahut badhiya", text: "प्रोडक्ट काफी अच्छा है, और क्वालिटी भी बढ़िया है। डिलीवरी टाइम पर हो गई।" },
  { title: "Paisa vasool", text: "मुझे यह बहुत पसंद आया। जो फोटो में दिखाया था बिल्कुल वैसा ही मिला है। एकदम पैसा वसूल।" },
  { title: "Achha hai", text: "काफी यूजफुल है और पैकेजिंग भी बहुत अच्छी थी। मैं इसे जरूर रेकमेंड करूंगा।" },
  { title: "Super product", text: "क्वालिटी बहुत ही बढ़िया है। इस्तेमाल करने में भी आसान है।" },
  // Hinglish
  { title: "Must buy", text: "Product bahut badhiya hai, delivery bhi fast thi. Definitely a must buy!" },
  { title: "Good quality", text: "Quality ekdum mast hai. Ghar pe sabko pasand aaya. Worth the price." },
  { title: "Nice packaging", text: "Packing bahut neat thi aur koi damage nahi tha. Bohot badiya experience." },
  { title: "Awesome", text: "Bhai kya sahi cheez hai! Price ke hisaab se bahut accha deal mila." },
  { title: "Good one", text: "Maine expect nahi kiya tha itna accha hoga, but sach me good quality hai." },
  // Malayalam
  { title: "Adipoli", text: "വളരെ നല്ല പ്രൊഡക്റ്റ് ആണ്. എനിക്ക് ഒരുപാട് ഇഷ്ടപ്പെട്ടു." },
  { title: "Nalla quality", text: "നല്ല ക്വാളിറ്റി ഉണ്ട്. പാക്കിങ് ഒക്കെ സൂപ്പർ ആയിരുന്നു." },
  { title: "Worth it", text: "കൊടുത്ത പൈസക്ക് മുതലാണ്. ധൈര്യമായിട്ട് വാങ്ങാം." },
  { title: "Superb", text: "വീട്ടിൽ എല്ലാവർക്കും ഇഷ്ടായി. ഡെലിവറി വേഗം തന്നെ കിട്ടി." },
  // Manglish
  { title: "Kidilan item", text: "Nalla quality und. Package um adipoli ayirunnu. Worth the money." },
  { title: "Super", text: "Ithu valare nalla oru product aanu. Use cheyyan nalla eluppam und." },
  { title: "Pwoli", text: "Enikku ishtapettu. Nalla standard aayittulla item aanu. Price um affordable aanu." },
  { title: "Good", text: "Kuzhappam illa, nalla sadhanam aanu. Delivery fast aayirunnu." },
  { title: "Adipoli", text: "Kidilan product. Pysakku muthalanu, doubt illathe vangaam." },
  // Tamil
  { title: "Super", text: "ரொம்ப நல்லா இருக்கு. கண்டிப்பா வாங்கலாம்." },
  { title: "Nalla quality", text: "பொருளின் தரம் மிக அருமை. பேக்கிங் சூப்பர்." },
  { title: "Worth money", text: "காசுக்கு ஏற்ற பொருள். நான் ரொம்ப திருப்தி அடைந்தேன்." },
  { title: "Arumai", text: "வீட்டுக்கு ரொம்ப யூஸ்ஃபுல்லா இருக்கு. நல்லா உழைக்கும்னு நம்புறேன்." },
  // Tanglish (Tamil English)
  { title: "Super product", text: "Romba nalla irukku. Quality pakka. Worth buying." },
  { title: "Nice", text: "Packing nalla irundhuchu. Delivery um speed dhan. Thank you." },
  // Kannada
  { title: "Channagide", text: "ಉತ್ತಮ ಗುಣಮಟ್ಟದ ಉತ್ಪನ್ನ. ಪ್ಯಾಕಿಂಗ್ ಚೆನ್ನಾಗಿತ್ತು." },
  { title: "Super quality", text: "ತುಂಬಾ ಚೆನ್ನಾಗಿದೆ, ನಾವು ನಿರೀಕ್ಷಿಸಿದಂತೆಯೇ ಇದೆ. ಹಣಕ್ಕೆ ತಕ್ಕ ಮೌಲ್ಯ." },
  { title: "Olle product", text: "ನನಗೆ ಇದು ತುಂಬಾ ಇಷ್ಟವಾಯಿತು. ಎಲ್ಲರೂ ಖರೀದಿಸಬಹುದು." },
  // Kanglish (Kannada English)
  { title: "Sakkath", text: "Thumbaa chennagide. Quality is really good. Packaging kooda mast ittu." },
  { title: "Good purchase", text: "Olle product. Use madakke easy ide. Fast delivery." },
  // English (Natural Indian English)
  { title: "Very useful", text: "Very useful product. Packing was neat and delivery was quick." },
  { title: "Good purchase", text: "Quality is good. Fits well in our home. Genuine product." },
  { title: "Nice quality", text: "Nice quality. Family liked it. Will definitely buy again." },
  { title: "Value for money", text: "Super product. Value for money. Recommended." },
  { title: "Happy with it", text: "Got it yesterday and it works great. Happy with the purchase." },
  { title: "Decent product", text: "Decent quality for this price range. Satisfied." }
];

async function main() {
  console.log('🚀 Starting to seed reviews for all products in the database...');

  // Get a default customer user to attach the reviews to (or create a dummy one if none exists)
  let customerUser = await prisma.user.findFirst({
    where: { role: 'customer' }
  });
  
  if (!customerUser) {
    customerUser = await prisma.user.create({
      data: {
        email: 'dummy_customer_reviews@kritimarketplace.com',
        name: 'Guest Reviewer',
        role: 'customer'
      }
    });
  }

  // Get all products
  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} products to process.`);

  for (const prod of products) {
    // Delete existing reviews for the product to prevent duplicates when running this script multiple times
    await prisma.review.deleteMany({
      where: { productId: prod.id }
    });

    const targetReviewCount = Math.floor(Math.random() * (85 - 20 + 1)) + 20; // 20 to 85 total reviews
    const manualBalance = Math.floor(Math.random() * 2) + 5; // 5 or 6 reviews reserved for manual entry with images
    const generatedReviewCount = targetReviewCount - manualBalance;

    let totalRating = 0;
    const reviewData = [];

    for (let i = 0; i < generatedReviewCount; i++) {
      const template = reviewsPool[Math.floor(Math.random() * reviewsPool.length)];
      const reviewer = customerNames[Math.floor(Math.random() * customerNames.length)];
      const rand = Math.random();
      const rating = rand < 0.6 ? 5 : (rand < 0.9 ? 4 : 3);
      totalRating += rating;

      reviewData.push({
        productId: prod.id,
        userId: customerUser.id,
        rating: rating,
        comment: template.text,
        customerName: reviewer,
        orderId: `ODR-MOCK-${Math.floor(Math.random()*100000)}`,
        title: template.title,
        status: 'approved',
        purchaseMonth: 'August 2026',
        createdAt: new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000))
      });
    }

    await prisma.review.createMany({
      data: reviewData
    });

    const avgRating = totalRating / generatedReviewCount;
    await prisma.product.update({
      where: { id: prod.id },
      data: { 
        reviewCount: generatedReviewCount, // UI typically uses this or counts related items
        rating: Number(avgRating.toFixed(1)),
        averageRating: Number(avgRating.toFixed(1))
      }
    });

    console.log(`✔ Generated ${generatedReviewCount} automated reviews for product: ${prod.name} (Reserved ${manualBalance} for manual entry)`);
  }

  console.log('✅ Review seeding completed successfully for all products.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
