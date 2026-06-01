import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Book } from "@/generated/prisma/client";

const FORMAT_LABELS: Record<string, string> = {
  EBOOK: "Ebook",
  PRINT: "Impreso",
  AUDIOBOOK: "Audiolibro",
};

export default function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/libros/${book.id}`}>
      <Card className="bg-[var(--color-surface)] border-[var(--color-border)] shadow-[var(--shadow-card)] hover:shadow-md transition-shadow duration-[var(--duration-fast)] cursor-pointer overflow-hidden h-full">
        <div className="aspect-[3/4] bg-[var(--color-accent-light)] flex items-center justify-center overflow-hidden">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen size={36} className="text-[var(--color-accent)] opacity-40" />
          )}
        </div>
        <CardContent className="p-4">
          <h3
            className="font-semibold text-sm text-[var(--color-text)] line-clamp-2 leading-snug mb-2"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {book.title}
          </h3>
          <div className="flex flex-wrap gap-1">
            {book.formats.map((format) => (
              <Badge
                key={format}
                variant="secondary"
                className="text-[10px] px-2 py-0 bg-[var(--color-accent-light)] text-[var(--color-accent)] border-0"
              >
                {FORMAT_LABELS[format] ?? format}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
