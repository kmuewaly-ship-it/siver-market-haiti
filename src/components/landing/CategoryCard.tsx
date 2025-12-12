import { Link } from "react-router-dom";

interface CategoryCardProps {
  label: string;
  image?: string | null;
  href?: string;
}

const CategoryCard = ({ label, image, href = '#' }: CategoryCardProps) => {
  return (
    <Link to={href} className="group flex flex-col items-center text-center">
      <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-muted flex items-center justify-center mb-3 transition-transform transform group-hover:scale-105 border border-border">
        {image ? (
          <img src={image} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-3xl text-muted-foreground">{label.charAt(0).toUpperCase()}</span>
          </div>
        )}
      </div>
      <div className="text-sm md:text-base text-foreground max-w-xs">
        {label}
      </div>
    </Link>
  );
};

export default CategoryCard;
