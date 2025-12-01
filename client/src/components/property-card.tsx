// Update your PropertyCard component with the correct interface

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, TrendingUp, Users, Edit, Trash2, DollarSign, BarChart3, Activity, Shield } from "lucide-react"

// Use the same interface as your Properties component
interface FrontendProperty {
  id: string;
  title: string;
  description: string;
  location: string;
  price: string;
  propertyType: 'residential' | 'commercial' | 'retail';
  yield: string;
  ownershipCap: number;
  status: 'live' | 'upcoming' | 'closed';
  images: string[];
  totalInvestment: string;
  investorCount: number;
  currentOwnership: string;
  monthlyRevenue: string;
  totalRevenue: string;
  occupancyRate: string;
  performance: 'excellent' | 'good' | 'stable';
  lastDividendDate: Date | null;
  deactivationReason: string | null;
  deactivatedAt: Date | null;
  deactivatedBy: string | null;
  createdAt: Date;
}

interface PropertyCardProps {
  property: FrontendProperty // Changed from Property to FrontendProperty
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onDeactivate?: (id: string) => void
  onActivate?: (id: string) => void
}

export function PropertyCard({ property, onEdit, onDelete, onDeactivate, onActivate }: PropertyCardProps) {
  const statusColors = {
    live: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }

  const performanceColors = {
    excellent: "text-emerald-600",
    good: "text-green-600",
    stable: "text-blue-600",
    declining: "text-orange-600"
  }

  const handleEdit = () => {
    console.log('Edit property triggered:', property.id)
    onEdit?.(property.id)
  }

  const handleDelete = () => {
    console.log('Delete property triggered:', property.id)
    onDelete?.(property.id)
  }

  const handleDeactivate = () => {
    console.log('Deactivate property triggered:', property.id)
    onDeactivate?.(property.id)
  }

  const handleActivate = () => {
    console.log('Activate property triggered:', property.id)
    onActivate?.(property.id)
  }

  // Determine if property can be deleted (only non-live properties without investments)
  const canDelete = property.status !== 'live' && Number(property.totalInvestment || 0) === 0

  // Determine if property should show deactivate option (live properties with investments)
  const shouldShowDeactivate = property.status === 'live' && Number(property.totalInvestment || 0) > 0

  // Determine if property should show activate option (closed/deactivated properties)
  const shouldShowActivate = property.status === 'closed'

  return (
    <Card className="enhanced-card animate-scale-up group overflow-hidden" data-testid={`card-property-${property.id}`}>
      {property.images && property.images.length > 0 && (
        <div className="aspect-video relative overflow-hidden rounded-t-lg">
          <img
            src={property.images[0]}
            alt={property.title}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
            data-testid={`img-property-${property.id}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Badge className={`${statusColors[property.status]} backdrop-blur-sm`}>
              {property.status}
            </Badge>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg" data-testid={`text-property-title-${property.id}`}>
            {property.title}
          </CardTitle>
          <Badge 
            className={statusColors[property.status]}
            data-testid={`badge-status-${property.id}`}
          >
            {property.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mr-1" />
          <span data-testid={`text-location-${property.id}`}>{property.location}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
            <span data-testid={`text-yield-${property.id}`}>{property.yield}% Yield</span>
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1 text-blue-600" />
            <span data-testid={`text-ownership-${property.id}`}>{property.ownershipCap}% Cap</span>
          </div>
        </div>

        <div className="text-xl font-bold text-primary" data-testid={`text-price-${property.id}`}>
          SAR {Number(property.price).toLocaleString()}
        </div>

        {/* Investment Metrics */}
        {property.status === 'live' && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-green-600" />
                <span className="text-muted-foreground">Investment</span>
              </div>
              <span className="font-semibold" data-testid={`text-investment-${property.id}`}>
                SAR {Number(property.totalInvestment || 0).toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1 text-blue-600" />
                <span className="text-muted-foreground">Investors</span>
              </div>
              <span className="font-semibold" data-testid={`text-investors-${property.id}`}>
                {property.investorCount || 0}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-1 text-purple-600" />
                <span className="text-muted-foreground">Occupancy</span>
              </div>
              <span className="font-semibold" data-testid={`text-occupancy-${property.id}`}>
                {property.occupancyRate || 0}%
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <Activity className="h-4 w-4 mr-1" />
                <span className="text-muted-foreground">Performance</span>
              </div>
              <span className={`font-semibold capitalize ${performanceColors[property.performance as keyof typeof performanceColors] || 'text-muted-foreground'}`} data-testid={`text-performance-${property.id}`}>
                {property.performance || 'stable'}
              </span>
            </div>
          </div>
        )}

        {property.description && (
          <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${property.id}`}>
            {property.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleEdit}
          data-testid={`button-edit-${property.id}`}
          className="flex-1"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>

        {canDelete ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            data-testid={`button-delete-${property.id}`}
            className="flex-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        ) : shouldShowDeactivate ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeactivate}
            data-testid={`button-deactivate-${property.id}`}
            className="flex-1 text-orange-600 hover:text-orange-700"
          >
            <Shield className="h-4 w-4 mr-1" />
            Deactivate
          </Button>
        ) : shouldShowActivate ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleActivate}
            data-testid={`button-activate-${property.id}`}
            className="flex-1 text-green-600 hover:text-green-700"
          >
            <Shield className="h-4 w-4 mr-1" />
            Activate
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="flex-1 opacity-50"
            title={property.status === 'live' ? 'Cannot delete live property with investments' : 'Property has active investments'}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {property.status === 'live' ? 'Active' : 'Protected'}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}