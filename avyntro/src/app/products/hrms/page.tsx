import { ProductPage } from '@/components/sections/ProductPage';
import { getProduct } from '@/content/products';
import { pageMetadata } from '@/lib/seo';

const product = getProduct('hrms');

export const metadata = pageMetadata({
  title: product.seo!.title,
  description: product.seo!.description,
  path: product.href!,
});

export default function Page() {
  return <ProductPage product={product} />;
}
