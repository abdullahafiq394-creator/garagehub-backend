import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ExtractedProductData {
  name: string;
  description: string;
  category: string;
  partCategory: 'engine' | 'transmission' | 'brake' | 'suspension' | 'electrical' | 'cooling' | 'body' | 'interior' | 'exterior' | 'wheel_tyre' | 'fluids' | 'service';
  price: string;
  stockQuantity: number;
  imageUrl?: string;
}

export class GeminiProductService {
  private genAI: GoogleGenerativeAI | null = null;

  /**
   * Lazy initialization of Gemini client using Replit AI Integrations
   * Uses AI_INTEGRATIONS_GEMINI_API_KEY and AI_INTEGRATIONS_GEMINI_BASE_URL
   */
  private ensureClient() {
    if (this.genAI) {
      return this.genAI;
    }

    const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("AI_INTEGRATIONS_GEMINI_API_KEY environment variable is required for AI features");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    return this.genAI;
  }

  /**
   * Retry helper with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on client errors (4xx)
        if (error.status && error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Calculate backoff delay
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(`[GeminiProductService] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error("All retry attempts failed");
  }

  /**
   * Analyze product image and extract details using Gemini AI
   * @param imageData Base64 encoded image data
   * @param mimeType Image MIME type (e.g., 'image/jpeg', 'image/png')
   * @returns Extracted product information
   */
  async analyzeProductImage(imageData: string, mimeType: string): Promise<ExtractedProductData> {
    const genAI = this.ensureClient();
    
    return this.retryWithBackoff(async () => {
      try {
      const prompt = `
You are a product recognition AI for an automotive parts marketplace. 
Analyze this automotive product image and extract the following information in JSON format:

{
  "name": "Product name (e.g., 'Brake Pads Front', 'Oil Filter')",
  "description": "Detailed product description (2-3 sentences about features, compatibility, quality)",
  "category": "Product category (e.g., 'Brakes', 'Filters', 'Engine Parts', 'Electrical', 'Suspension')",
  "price": "Estimated price in RM (Malaysian Ringgit as decimal string, e.g., '89.90')",
  "stockQuantity": "Estimated typical stock quantity as integer (e.g., 50, 100, 200)"
}

Important guidelines:
- Be specific with product names (include part position like Front/Rear if visible)
- Price should be realistic for Malaysian automotive market
- Description should highlight key features and compatibility
- If you cannot identify the product clearly, provide best estimates based on visible details
- Return ONLY valid JSON, no additional text or explanation
`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType,
            data: imageData,
          },
        },
      ]);

      const response = result.response;
      const text = response.text() || "";

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Failed to extract JSON from AI response");
      }

      const extractedData = JSON.parse(jsonMatch[0]);

      // Validate and normalize data
      const price = parseFloat(extractedData.price || '0');
      const stockQuantity = parseInt(extractedData.stockQuantity || '0');

      // Validate numeric fields
      if (isNaN(price) || price < 0) {
        throw new Error("AI returned invalid price value");
      }
      if (isNaN(stockQuantity) || stockQuantity < 0) {
        throw new Error("AI returned invalid stock quantity");
      }

      // Smart mapping for partCategory
      const partCategory = this.mapCategoryToPartCategory(extractedData.category || "service");

      // Ensure non-empty category (required by schema)
      const category = (extractedData.category && extractedData.category.trim().length > 0) 
        ? extractedData.category.trim()
        : "General";

      return {
        name: extractedData.name || "Unknown Product",
        description: extractedData.description || "Product details extracted by AI",
        category,
        partCategory,
        price: price.toFixed(2),
        stockQuantity,
        imageUrl: extractedData.imageUrl || "",
      };
    } catch (error) {
      console.error("[GeminiProductService] Image analysis failed:", error);
      throw new Error("Failed to analyze product image with AI");
    }
    });
  }

  /**
   * Map category string to partCategory enum
   */
  private mapCategoryToPartCategory(category: string): 'engine' | 'transmission' | 'brake' | 'suspension' | 'electrical' | 'cooling' | 'body' | 'interior' | 'exterior' | 'wheel_tyre' | 'fluids' | 'service' {
    const lower = category.toLowerCase();
    
    if (lower.includes('engine') || lower.includes('motor')) return 'engine';
    if (lower.includes('transmission') || lower.includes('gearbox')) return 'transmission';
    if (lower.includes('brake') || lower.includes('pad')) return 'brake';
    if (lower.includes('suspension') || lower.includes('shock')) return 'suspension';
    if (lower.includes('electrical') || lower.includes('battery') || lower.includes('alternator')) return 'electrical';
    if (lower.includes('cooling') || lower.includes('radiator')) return 'cooling';
    if (lower.includes('body')) return 'body';
    if (lower.includes('interior') || lower.includes('seat')) return 'interior';
    if (lower.includes('exterior') || lower.includes('bumper')) return 'exterior';
    if (lower.includes('wheel') || lower.includes('tyre') || lower.includes('tire')) return 'wheel_tyre';
    if (lower.includes('fluid') || lower.includes('oil') || lower.includes('coolant')) return 'fluids';
    if (lower.includes('service') || lower.includes('filter')) return 'service';
    
    return 'service'; // Default
  }

  /**
   * Extract text from product label/packaging image (OCR)
   * Useful for extracting SKU, part numbers, specifications
   */
  async extractProductText(imageData: string, mimeType: string): Promise<string> {
    const genAI = this.ensureClient();
    
    return this.retryWithBackoff(async () => {
      try {
        const prompt = "Extract all visible text from this product image, including SKU, part numbers, and specifications. Return only the extracted text.";

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: imageData,
            },
          },
        ]);

        const response = result.response;
        return response.text();
      } catch (error) {
        console.error("[GeminiProductService] Text extraction failed:", error);
        throw new Error("Failed to extract text from image");
      }
    });
  }
}

export const geminiProductService = new GeminiProductService();
