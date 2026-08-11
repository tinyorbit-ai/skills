import { listProductsAction } from "./listProductsAction";

/** Maximum options supported by the static picker component. */
export const STATIC_PICKER_OPTION_LIMIT = 100;

/** Load the labels and values rendered by the catalog picker. */
export async function loadProductPickerOptions(): Promise<
  Array<{ label: string; value: string }>
> {
  const products = await listProductsAction.execute({
    limit: STATIC_PICKER_OPTION_LIMIT,
  });
  return products.map((product) => ({
    label: product.name,
    value: product.id,
  }));
}
