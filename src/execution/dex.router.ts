import { OrderPayload } from '../domain/order.types';
import { DexAdapter } from '../dex/dex.interface';
import { raydiumAdapter } from '../dex/raydium.adapter';
import { meteoraAdapter } from '../dex/meteora.adapter';

export async function routeDex(payload: OrderPayload): Promise<DexAdapter> {
  const results = await Promise.allSettled([
    raydiumAdapter.getQuote(payload).then(quote => ({ adapter: raydiumAdapter, quote })),
    meteoraAdapter.getQuote(payload).then(quote => ({ adapter: meteoraAdapter, quote }))
  ]);

  const validRoutes = results
    .filter((result): result is PromiseFulfilledResult<{ adapter: DexAdapter; quote: { price: number; fee: number } }> => result.status === 'fulfilled')
    .map(result => result.value);

  if (validRoutes.length === 0) {
    throw new Error('All DEX adapters failed to provide a quote');
  }

  validRoutes.sort((a, b) => {
    const costA = a.quote.price + a.quote.fee;
    const costB = b.quote.price + b.quote.fee;
    return costA - costB;
  });

  return validRoutes[0].adapter;
}