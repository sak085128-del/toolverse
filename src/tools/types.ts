export interface ToolMeta {
  slug: string;
  title: string;
  category: string;
  desc: string;
}

export interface CategoryMeta {
  id: string;
  label: string;
  icon: string;
}

export interface ToolImpl {
  markup?: () => string;
  init: (root: HTMLElement) => void | Promise<void>;
}