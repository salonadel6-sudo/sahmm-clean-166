import { existsSync } from "node:fs";
import { join } from "node:path";

const POST_IMAGE_BY_INTENT = [
  { matches: ["حشرات", "مبيدات", "بق", "نمل"], image: "/images/service-pest.jpg" },
  { matches: ["بعد البناء", "بعد التشطيب", "تشطيب", "بناء", "دهان", "تجديد"], image: "/images/service-postconstruction.jpg" },
  { matches: ["واجهات", "مكاتب", "منشآت", "مستودعات"], image: "/images/service-facades.jpg" },
  { matches: ["مجالس", "كنب", "سجاد", "موكيت", "مفروشات", "ستائر", "بخار"], image: "/images/service-majlis.jpg" },
  { matches: ["رخام", "بلاط", "أرضيات", "ارضيات"], image: "/images/service-marble.jpg" },
  { matches: ["مكيف", "مكيفات", "سبليت", "سبلت"], image: "/images/service-ac.jpg" },
  { matches: ["خزانات", "خزان"], image: "/images/service-tanks.jpg" },
  { matches: ["فلل", "فيلا", "قصور", "قصر"], image: "/images/service-villas.jpg" },
  { matches: ["منازل", "منزل", "شقق", "شقة"], image: "/images/service-apartments.jpg" },
];

export function postImageFallback(post) {
  const text = String(post?.title || post?.category || "").toLocaleLowerCase("ar");
  return POST_IMAGE_BY_INTENT.find(({ matches }) =>
    matches.some((term) => text.includes(term.toLocaleLowerCase("ar"))),
  )?.image || "/images/service-apartments.jpg";
}

export function resolvePostImage(post, uploadDirectories = [], imageField = "og_image") {
  const candidate = String(
    imageField === "cover_image"
      ? post?.cover_image || ""
      : post?.og_image || post?.cover_image || "",
  ).trim();
  const uploadMatch = candidate.match(/(?:^|\/)(?:api\/)?uploads\/([^/?#]+)/i);
  if (!uploadMatch) return candidate || postImageFallback(post);

  let filename = uploadMatch[1];
  try {
    filename = decodeURIComponent(filename);
  } catch {
    // Preserve the raw name so missing uploads resolve to a real local image.
  }
  const extension = filename.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || "";
  const webpFallback = extension && extension !== "webp"
    ? `${filename.slice(0, -(extension.length + 1))}.webp`
    : "";
  const existingFilename = [filename, webpFallback].filter(Boolean).find((name) =>
    uploadDirectories.some((directory) => existsFile(directory, name)),
  );
  if (!existingFilename) return postImageFallback(post);
  if (existingFilename === filename) return candidate;
  return `/uploads/${encodeURIComponent(existingFilename)}`;
}

function existsFile(directory, filename) {
  return existsSync(join(directory, filename));
}
