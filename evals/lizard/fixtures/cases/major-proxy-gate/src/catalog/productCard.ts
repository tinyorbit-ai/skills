export enum ProductCardLocation {
  Dashboard = "dashboard",
  Storefront = "storefront",
}

export interface ProductCardProps {
  highlighted: boolean;
  location: ProductCardLocation;
}

export const switcherCard: ProductCardProps = {
  highlighted: true,
  location: ProductCardLocation.Dashboard,
};

export const repeatProductPreviewCard: ProductCardProps = {
  highlighted: true,
  location: ProductCardLocation.Dashboard,
};

export const storefrontCard: ProductCardProps = {
  highlighted: true,
  location: ProductCardLocation.Storefront,
};

export function shouldAutoSelectProduct(props: ProductCardProps): boolean {
  return props.highlighted && props.location === ProductCardLocation.Dashboard;
}

export function renderRepeatProductPreview(): { autoSelected: boolean } {
  return {
    autoSelected: shouldAutoSelectProduct(repeatProductPreviewCard),
  };
}
