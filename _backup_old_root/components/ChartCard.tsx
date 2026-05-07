import Link from "next/link";

type ChartCardProps = {
  title: string;
  image: string;
  description: string;
  href?: string;
};

export default function ChartCard({
  title,
  image,
  description,
  href,
}: ChartCardProps) {
  const content = (
    <article className="h-full rounded-lg border border-neutral-800 bg-neutral-950 p-4 shadow-lg transition hover:border-neutral-700">
      <h2 className="mb-3 text-xl font-bold text-white">{title}</h2>
      <img
        src={image}
        alt={title}
        className="aspect-[16/10] w-full rounded-md border border-neutral-800 bg-black object-cover"
      />
      <p className="mt-3 text-sm leading-6 text-neutral-400">{description}</p>
    </article>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}
