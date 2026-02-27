import { supabase } from "@/integrations/supabase/client";

const TESTIMONIALS_BUCKET = "testimonials";

export interface TestimonialRecord {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  avatar?: string;
  childAge?: string;
  planType?: string;
  imageUrl?: string;
  videoUrl?: string;
}

/**
 * Row shape when using a Supabase table "testimonials".
 * Create table with: id (uuid), name (text), child_age (text), video_url (text), display_order (int), optional: location, rating, text.
 */
interface SupabaseTestimonialRow {
  id: string;
  name: string;
  child_age?: string | null;
  video_url?: string | null;
  video_path?: string | null;
  display_order?: number | null;
  location?: string | null;
  rating?: number | null;
  text?: string | null;
  avatar?: string | null;
  plan_type?: string | null;
}

function toTestimonial(row: SupabaseTestimonialRow, storageBaseUrl: string): TestimonialRecord {
  let videoUrl = row.video_url ?? undefined;
  if (!videoUrl && row.video_path) {
    const path = String(row.video_path).replace(/^\//, "");
    const { data } = supabase.storage.from(TESTIMONIALS_BUCKET).getPublicUrl(path);
    videoUrl = data.publicUrl;
  }
  return {
    id: row.id,
    name: row.name ?? "Customer",
    location: row.location ?? "Bangalore",
    rating: row.rating ?? 5,
    text: row.text ?? "",
    avatar: row.avatar ?? undefined,
    childAge: row.child_age ?? undefined,
    planType: row.plan_type ?? undefined,
    videoUrl,
  };
}

/** Known filenames in the testimonials bucket – used when list() is not allowed by RLS. Order = display order. */
const KNOWN_TESTIMONIAL_FILES = [
  "Nithin.mp4",
  "Devanshi shukla.mp4",
  "Himanshi.mp4",
  "Krupa.mp4",
  "Nikitha.mp4",
];

function filenameToName(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildPublicUrl(filename: string): string {
  const base = (import.meta.env.VITE_SUPABASE_URL || "https://wucwpyitzqjukcphczhr.supabase.co").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${TESTIMONIALS_BUCKET}/${encodeURIComponent(filename)}`;
}

/** Default testimonials with video URLs from the public bucket – use when query is loading or fails. Never throws. */
export function getDefaultVideoTestimonials(): TestimonialRecord[] {
  try {
    return KNOWN_TESTIMONIAL_FILES.map((filename, i) => ({
      id: `storage-${i}-${filename}`,
      name: filenameToName(filename),
      location: "Bangalore",
      rating: 5,
      text: "",
      childAge: undefined,
      videoUrl: buildPublicUrl(filename),
    })) as TestimonialRecord[];
  } catch {
    return [{
      id: "fallback-0",
      name: "Customer",
      location: "Bangalore",
      rating: 5,
      text: "",
      videoUrl: "https://wucwpyitzqjukcphczhr.supabase.co/storage/v1/object/public/testimonials/Nithin.mp4",
    }];
  }
}

export async function fetchTestimonialsFromSupabase(): Promise<TestimonialRecord[]> {
  try {
    const storageBaseUrl = (import.meta.env.VITE_SUPABASE_URL || "https://wucwpyitzqjukcphczhr.supabase.co").replace(/\/$/, "") +
      `/storage/v1/object/public/${TESTIMONIALS_BUCKET}`;
    // 1. Try table first (optional – table may not exist)
    try {
      const { data: rows, error: tableError } = await (supabase as any)
        .from("testimonials")
        .select("id, name, child_age, video_url, video_path, display_order, location, rating, text, avatar, plan_type")
        .order("display_order", { ascending: true });

      if (!tableError && rows && rows.length > 0) {
        return rows.map((row: SupabaseTestimonialRow) => toTestimonial(row, storageBaseUrl));
      }
    } catch {
      // Table may not exist; continue to Storage
    }

    // 2. Try listing Storage bucket
    try {
      const { data: files, error: listError } = await supabase.storage
      .from(TESTIMONIALS_BUCKET)
      .list("", { limit: 50 });

    if (!listError && files && files.length > 0) {
      const videoExtensions = [".mp4", ".webm", ".mov", ".MP4", ".WEBM", ".MOV"];
      const items = files
        .filter((f) => f.name && !f.name.startsWith(".") && videoExtensions.some((ext) => f.name!.endsWith(ext)))
        .sort((a, b) => {
          const ai = KNOWN_TESTIMONIAL_FILES.indexOf(a.name ?? "");
          const bi = KNOWN_TESTIMONIAL_FILES.indexOf(b.name ?? "");
          if (ai >= 0 && bi >= 0) return ai - bi;
          if (ai >= 0) return -1;
          if (bi >= 0) return 1;
          return (a.name ?? "").localeCompare(b.name ?? "");
        });

      if (items.length > 0) {
        return items.map((file, i) => ({
          id: `storage-${i}-${file.name}`,
          name: filenameToName(file.name!),
          location: "Bangalore",
          rating: 5,
          text: "",
          childAge: undefined,
          videoUrl: buildPublicUrl(file.name!),
        })) as TestimonialRecord[];
      }
    }
    } catch {
      // List failed (e.g. RLS); use known filenames
    }

    // 3. Use known filenames – works as long as bucket is public
    return getDefaultVideoTestimonials();
  } catch {
    return getDefaultVideoTestimonials();
  }
}
