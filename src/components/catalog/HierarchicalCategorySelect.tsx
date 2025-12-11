import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface HierarchicalCategorySelectProps {
  categories: Category[] | undefined;
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

interface FlattenedCategory {
  id: string;
  name: string;
  depth: number;
  path: string[];
}

const HierarchicalCategorySelect = ({ 
  categories, 
  value, 
  onValueChange, 
  placeholder = "Seleccionar categoría" 
}: HierarchicalCategorySelectProps) => {
  
  const flattenedCategories = useMemo(() => {
    if (!categories) return [];
    
    const result: FlattenedCategory[] = [];
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    
    // Build path for each category
    const getPath = (cat: Category): string[] => {
      const path: string[] = [];
      let current: Category | undefined = cat;
      while (current) {
        path.unshift(current.name);
        current = current.parent_id ? categoryMap.get(current.parent_id) : undefined;
      }
      return path;
    };
    
    // Get depth for each category
    const getDepth = (cat: Category): number => {
      let depth = 0;
      let current: Category | undefined = cat;
      while (current?.parent_id) {
        depth++;
        current = categoryMap.get(current.parent_id);
      }
      return depth;
    };
    
    // Sort categories by hierarchy
    const sortedCategories = [...categories].sort((a, b) => {
      const pathA = getPath(a).join('/');
      const pathB = getPath(b).join('/');
      return pathA.localeCompare(pathB);
    });
    
    sortedCategories.forEach(cat => {
      result.push({
        id: cat.id,
        name: cat.name,
        depth: getDepth(cat),
        path: getPath(cat),
      });
    });
    
    return result;
  }, [categories]);

  const getDisplayValue = () => {
    if (!value) return placeholder;
    const cat = flattenedCategories.find(c => c.id === value);
    return cat ? cat.path.join(' > ') : placeholder;
  };

  return (
    <Select onValueChange={onValueChange} value={value || ''}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {getDisplayValue()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {flattenedCategories.map((cat) => (
          <SelectItem 
            key={cat.id} 
            value={cat.id}
            className="cursor-pointer"
          >
            <div className="flex items-center">
              {cat.depth > 0 && (
                <span 
                  className="text-muted-foreground mr-1"
                  style={{ paddingLeft: `${cat.depth * 12}px` }}
                >
                  {Array(cat.depth).fill(null).map((_, i) => (
                    <ChevronRight key={i} className="h-3 w-3 inline-block" />
                  ))}
                </span>
              )}
              <span>{cat.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default HierarchicalCategorySelect;
