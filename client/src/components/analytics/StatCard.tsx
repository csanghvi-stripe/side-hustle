import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
}

export function StatCard({ 
  title, 
  value, 
  description, 
  trend, 
  trendValue, 
  icon 
}: StatCardProps) {
  const renderTrend = () => {
    if (!trend || !trendValue) return null;
    
    const colorClass = trend === 'up' 
      ? 'text-green-500' 
      : trend === 'down' 
        ? 'text-red-500' 
        : 'text-gray-500';
    
    const iconClass = trend === 'up' 
      ? '↑' 
      : trend === 'down' 
        ? '↓' 
        : '→';
    
    return (
      <span className={`text-sm font-medium ${colorClass} flex items-center`}>
        <span className="mr-1">{iconClass}</span>
        {trendValue}
      </span>
    );
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
      {(trend || trendValue) && (
        <CardFooter className="p-2">
          {renderTrend()}
        </CardFooter>
      )}
    </Card>
  );
}