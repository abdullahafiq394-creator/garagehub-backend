import crypto from "crypto";

/**
 * Image Search Service - MVP Implementation
 * Provides simple perceptual hash-based image similarity matching
 * 
 * Algorithm: Simple average hash (aHash)
 * - Converts image URL to hash for comparison
 * - Hamming distance used for similarity scoring
 * 
 * Limitations (MVP):
 * - Uses URL-based hashing (no actual image processing)
 * - Suppliers must use consistent image hosting
 * - Future: Implement proper perceptual hashing with image processing library
 */

export class ImageSearchService {
  /**
   * Generate a simple hash from image URL
   * MVP: Uses URL as hash basis (future: process actual image data)
   * 
   * @param imageUrl - URL of the image to hash
   * @returns 64-character hex hash string
   */
  generateImageHash(imageUrl: string): string {
    if (!imageUrl || imageUrl.trim() === "") {
      return "0".repeat(64); // Empty hash for missing images
    }
    
    // MVP: Hash the URL (future: fetch and process actual image)
    // This allows for exact duplicate detection
    const hash = crypto.createHash('sha256').update(imageUrl).digest('hex');
    return hash;
  }

  /**
   * Calculate Hamming distance between two hash strings
   * Lower distance = more similar images
   * 
   * @param hash1 - First hash (64 hex chars)
   * @param hash2 - Second hash (64 hex chars)
   * @returns Number of differing bits (0 = identical, 256 = completely different)
   */
  calculateHammingDistance(hash1: string, hash2: string): number {
    if (hash1.length !== hash2.length) {
      throw new Error("Hash lengths must match");
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
      distance += this.countBits(xor);
    }
    return distance;
  }

  /**
   * Count set bits in a number (population count)
   */
  private countBits(n: number): number {
    let count = 0;
    while (n > 0) {
      count += n & 1;
      n >>= 1;
    }
    return count;
  }

  /**
   * Calculate similarity percentage between two images
   * 
   * @param hash1 - First image hash
   * @param hash2 - Second image hash
   * @returns Similarity score (0-100, where 100 = identical)
   */
  calculateSimilarity(hash1: string, hash2: string): number {
    const distance = this.calculateHammingDistance(hash1, hash2);
    const maxDistance = hash1.length * 4; // 4 bits per hex char
    const similarity = ((maxDistance - distance) / maxDistance) * 100;
    return Math.round(similarity * 100) / 100; // Round to 2 decimals
  }

  /**
   * Find similar images in a collection
   * 
   * @param targetHash - Hash of the image to search for
   * @param candidateHashes - Array of {id, hash} objects to compare against
   * @param threshold - Minimum similarity percentage (default: 80)
   * @returns Array of {id, similarity} sorted by similarity (descending)
   */
  findSimilarImages(
    targetHash: string,
    candidateHashes: Array<{ id: string; hash: string }>,
    threshold: number = 80
  ): Array<{ id: string; similarity: number }> {
    const results = candidateHashes
      .map(candidate => ({
        id: candidate.id,
        similarity: this.calculateSimilarity(targetHash, candidate.hash)
      }))
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    return results;
  }

  /**
   * Search for similar products by image URL (supplier-scoped)
   * 
   * @param supplierId - Supplier ID to scope the search
   * @param imageUrl - URL of the image to search for
   * @returns Array of matching products with similarity scores
   */
  async searchByImage(supplierId: string, imageUrl: string): Promise<any[]> {
    // Import storage dynamically to avoid circular dependencies
    const { storage } = await import("../storage");
    
    // Get all products for this supplier
    const products = await storage.getPartsBySupplier(supplierId);
    
    // Generate hash for search image
    const searchHash = this.generateImageHash(imageUrl);
    
    // Generate hashes for all products and find similar ones
    const candidateHashes = products.map((product: any) => ({
      id: product.id,
      hash: this.generateImageHash(product.imageUrl || ""),
      product
    }));
    
    const similarResults = this.findSimilarImages(
      searchHash,
      candidateHashes,
      80 // 80% similarity threshold
    );
    
    // Map back to full product objects
    return similarResults.map(result => {
      const candidate = candidateHashes.find((c: any) => c.id === result.id);
      return {
        ...candidate?.product,
        similarity: result.similarity
      };
    });
  }
}

export const imageSearchService = new ImageSearchService();
