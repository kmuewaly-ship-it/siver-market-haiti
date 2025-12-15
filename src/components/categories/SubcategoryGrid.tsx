import { useNavigate } from "react-router-dom";
import { Category } from "@/hooks/useCategories";

interface SubcategoryGridProps {
  subcategories: Category[];
  parentCategory: Category | null;
}

const SubcategoryGrid = ({ subcategories, parentCategory }: SubcategoryGridProps) => {
  const navigate = useNavigate();

  if (!parentCategory) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Selecciona una categoría</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Section title */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">
          {subcategories.length > 0 ? `${parentCategory.name}` : parentCategory.name}
        </h2>
      </div>

      {subcategories.length > 0 ? (
        <div className="p-3">
          <div className="grid grid-cols-3 gap-3">
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => navigate(`/categoria/${sub.slug}`)}
                className="flex flex-col items-center text-center group"
              >
                {/* Circular image */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-muted border border-border mb-2 group-hover:border-destructive transition-colors">
                  {sub.icon ? (
                    <img 
                      src={sub.icon} 
                      alt={sub.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <span className="text-lg text-muted-foreground font-medium">
                        {sub.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Name */}
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2 leading-tight">
                  {sub.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <button
            onClick={() => navigate(`/categoria/${parentCategory.slug}`)}
            className="w-full py-3 px-4 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            Ver productos de {parentCategory.name}
          </button>
        </div>
      )}
    </div>
  );
};

export default SubcategoryGrid;
