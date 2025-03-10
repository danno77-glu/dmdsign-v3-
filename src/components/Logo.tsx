import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-8 w-auto" }) => {
  return (
    <img 
      src="https://fvvdqinsqguilxjjszcz.supabase.co/storage/v1/object/public/audit-photos/asset/logo12.png"
      alt="Logo"
      className={className}
    />
  );
};
