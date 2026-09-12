import Image from "next/image";

export function OrethaMark({
  size = 96,
  priority = false,
}: {
  size?: number;
  priority?: boolean;
}) {
  return (
    <Image
      src="/oretha-logo.jpg"
      alt="Oretha"
      width={size}
      height={size}
      priority={priority}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
