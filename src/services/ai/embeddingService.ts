import { pipeline, env } from '@xenova/transformers';

// Skip local model checks since we are running in the browser
env.allowLocalModels = false;
env.useBrowserCache = true;

class EmbeddingService {
  static instance: any = null;
  static modelName = 'Xenova/clip-vit-base-patch32';
  static pipe: any = null;

  static async getInstance() {
    if (!this.pipe) {
      console.log('Loading CLIP model...');
      this.pipe = await pipeline('feature-extraction', this.modelName);
      console.log('CLIP model loaded.');
    }
    return this.pipe;
  }

  static async generateImageEmbedding(imageUrl: string): Promise<number[]> {
    const extractor = await this.getInstance();
    
    // The extractor can take a URL directly
    const output = await extractor(imageUrl, { pooling: 'mean', normalize: true });
    
    // Convert Tensor to regular array
    return Array.from(output.data);
  }

  static async generateTextEmbedding(text: string): Promise<number[]> {
    const extractor = await this.getInstance();
    
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    
    return Array.from(output.data);
  }
}

export default EmbeddingService;
