export interface Link {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  favicon_url: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  tags: string[];
}

export interface Tag {
  id: number;
  name: string;
  link_count: number;
}
