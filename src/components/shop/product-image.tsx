import Image from "next/image";

/** next/image wrapper: raster images are converted to AVIF/WebP and lazy-loaded; SVG illustrations are served as-is. */
export function ProductImage({ src, alt, sizes, priority, className, fill = true }: { src?: string | null; alt: string; sizes?: string; priority?: boolean; className?: string; fill?: boolean }) {
  const url = src || "/products/phone-black-front.svg";
  const unoptimized = url.endsWith(".svg") || url.startsWith("/api/media/");
  return (
    <Image
      src={url}
      alt={alt}
      fill={fill}
      width={fill ? undefined : 600}
      height={fill ? undefined : 600}
      sizes={sizes ?? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      unoptimized={unoptimized}
      className={className ?? "object-contain"}
    />
  );
}
