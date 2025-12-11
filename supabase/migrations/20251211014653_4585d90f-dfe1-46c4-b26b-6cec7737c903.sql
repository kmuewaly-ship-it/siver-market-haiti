-- Add visibility field for B2C display
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_visible_public boolean NOT NULL DEFAULT true;

-- Add description field for categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description text;

-- Add icon field for categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon text;

-- Add sort_order for custom ordering
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;