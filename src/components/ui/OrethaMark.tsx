import Image from "next/image";

export function OrethaMark({
  size = 96,
  width,
  height,
  priority = false,
  className = "rounded-full object-cover",
}: {
  size?: number;
  /** Override width/height for non-square renders (e.g. the welcome hero oval). */
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  const w = width ?? size;
  const h = height ?? size;
  return (
    <Image
      src="/oretha-mark.png"
      alt="Oretha"
      width={w}
      height={h}
      priority={priority}
      className={className}
      style={{ width: w, height: h }}
    />
  );
}
