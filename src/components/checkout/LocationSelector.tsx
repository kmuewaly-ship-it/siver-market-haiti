import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLogisticsEngine } from '@/hooks/useLogisticsEngine';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Building2 } from 'lucide-react';

interface LocationSelectorProps {
  departmentId: string | null;
  communeId: string | null;
  onDepartmentChange: (id: string) => void;
  onCommuneChange: (id: string) => void;
  disabled?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  departmentId,
  communeId,
  onDepartmentChange,
  onCommuneChange,
  disabled = false,
}) => {
  const { useDepartments, useCommunes } = useLogisticsEngine();
  const { data: departments, isLoading: loadingDepartments } = useDepartments();
  const { data: communes, isLoading: loadingCommunes } = useCommunes(departmentId || undefined);

  // Reset commune when department changes
  const handleDepartmentChange = (id: string) => {
    onDepartmentChange(id);
    onCommuneChange(''); // Reset commune selection
  };

  if (loadingDepartments) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Department Select */}
      <div className="space-y-2">
        <Label htmlFor="department" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Departamento
        </Label>
        <Select
          value={departmentId || ''}
          onValueChange={handleDepartmentChange}
          disabled={disabled}
        >
          <SelectTrigger id="department">
            <SelectValue placeholder="Selecciona un departamento" />
          </SelectTrigger>
          <SelectContent>
            {departments?.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                <span className="font-mono mr-2 text-muted-foreground">{dept.code}</span>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Commune Select */}
      <div className="space-y-2">
        <Label htmlFor="commune" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Comuna / Municipio
        </Label>
        <Select
          value={communeId || ''}
          onValueChange={onCommuneChange}
          disabled={disabled || !departmentId || loadingCommunes}
        >
          <SelectTrigger id="commune">
            <SelectValue placeholder={
              !departmentId 
                ? "Primero selecciona un departamento" 
                : loadingCommunes 
                  ? "Cargando..." 
                  : "Selecciona una comuna"
            } />
          </SelectTrigger>
          <SelectContent>
            {communes?.map((commune) => (
              <SelectItem key={commune.id} value={commune.id}>
                <span className="font-mono mr-2 text-muted-foreground">{commune.code}</span>
                {commune.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
