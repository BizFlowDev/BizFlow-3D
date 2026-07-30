import { IProductRepository } from '../../repositories/IProductRepository.js';
import { ValidationError } from '../../errors/ValidationError.js';

/** Abstract AI service interface — decoupled from specific provider (OpenAI, Gemini). */
export interface IAIService {
  /**
   * Parse natural language input into structured order data.
   * Example: "cho tôi 2 cái áo xanh và 3 đôi giày" → [{ name: "áo xanh", qty: 2 }, { name: "giày", qty: 3 }]
   */
  parseOrderFromText(text: string): Promise<ParsedOrderItem[]>;
}

export interface ParsedOrderItem {
  productNameOrCode: string;
  quantity: number;
  unitName?: string;
}

export interface ProcessNLOrderInput {
  storeId: string;
  rawInput: string;
}

export interface MatchedOrderItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  productUnitId?: string;
  confidence: number; // 0-1 matching confidence
}

export interface ProcessNLOrderOutput {
  matchedItems: MatchedOrderItem[];
  unmatchedItems: ParsedOrderItem[];
  rawInput: string;
}

export class ProcessNaturalLanguageOrderUseCase {
  constructor(
    private readonly aiService: IAIService,
    private readonly productRepo: IProductRepository,
  ) {}

  async execute(input: ProcessNLOrderInput): Promise<ProcessNLOrderOutput> {
    if (!input.rawInput.trim()) {
      throw new ValidationError('Vui lòng nhập nội dung đơn hàng');
    }

    // 1. Parse natural language → structured items via AI
    const parsedItems = await this.aiService.parseOrderFromText(input.rawInput);

    // 2. Match parsed items against store products
    const matchedItems: MatchedOrderItem[] = [];
    const unmatchedItems: ParsedOrderItem[] = [];

    for (const parsed of parsedItems) {
      // Try to find product by code first, then by name search
      let product = await this.productRepo.findByCode(input.storeId, parsed.productNameOrCode);

      if (!product) {
        // Search by name
        const searchResult = await this.productRepo.search({
          storeId: input.storeId,
          search: parsed.productNameOrCode,
          isActive: true,
          limit: 1,
        });

        if (searchResult.data.length > 0) {
          product = searchResult.data[0];
        }
      }

      if (product) {
        // Get default unit price
        const units = await this.productRepo.findUnitsByProductId(product.id);
        const defaultUnit = units.find((u) => u.isDefault) ?? units[0];

        matchedItems.push({
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity: parsed.quantity,
          unitPrice: defaultUnit?.price ?? 0,
          productUnitId: defaultUnit?.id,
          confidence: product.code === parsed.productNameOrCode ? 1.0 : 0.7,
        });
      } else {
        unmatchedItems.push(parsed);
      }
    }

    return { matchedItems, unmatchedItems, rawInput: input.rawInput };
  }
}
