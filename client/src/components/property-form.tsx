import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PropertyFormProps {
  onSubmit?: (data: FormData) => void
  onCancel?: () => void
  initialData?: any
}

export function PropertyForm({ onSubmit, onCancel, initialData }: PropertyFormProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    location: initialData?.location || '',
    price: initialData?.price || '',
    propertyType: initialData?.propertyType || '',
    yield: initialData?.yield || '',
    status: initialData?.status || 'upcoming'
  })

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<string[]>([])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    if (files.length === 0) return

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const invalidFiles = files.filter(file => !validTypes.includes(file.type))
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid File Type",
        description: "Please select only JPEG, PNG, or WebP images.",
        variant: "destructive"
      })
      return
    }

    // Check file sizes (max 5MB per file)
    const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: "Please select images smaller than 5MB.",
        variant: "destructive"
      })
      return
    }

    setSelectedFiles(files)

    // Create previews
    const previews: string[] = []
    let loadedCount = 0

    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        previews.push(e.target?.result as string)
        loadedCount++
        if (loadedCount === files.length) {
          setFilePreviews(previews)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newPreviews = filePreviews.filter((_, i) => i !== index)
    
    setSelectedFiles(newFiles)
    setFilePreviews(newPreviews)
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form state:', formData)
    // Basic validation
    if (!formData.title.trim()) {
      toast({ title: "Title Required", variant: "destructive" })
      return
    }

    // if (!formData.price || parseFloat(formData.price) <= 0) {
    //   toast({ title: "Valid price required", variant: "destructive" })
    //   return
    // }

    if (!formData.propertyType) {
      toast({ title: "Property type required", variant: "destructive" })
      return
    }

    // Create FormData for backend
    const submitData = new FormData()
    
    // Add form fields
    submitData.append('title', formData.title.trim())
    submitData.append('description', formData.description)
    submitData.append('propertyType', formData.propertyType)
    submitData.append('status', formData.status)
    
    // Parse location into backend format
    const locationParts = formData.location.split(',').map(part => part.trim())
    const district = locationParts[0] || ''
    const city = locationParts[1] || locationParts[0] || 'riyadh'
    
    const locationObj = {
      address: formData.location,
      addressAr: formData.location,
      city: city.toLowerCase(),
      district: district,
      coordinates: { latitude: null, longitude: null }
    }
    submitData.append('location', JSON.stringify(locationObj))
    
    // Parse financials into backend format
    const financialsObj = {
      totalValue: parseFloat(formData.price) || 0,
      currentValue: parseFloat(formData.price) || 0,
      projectedYield: parseFloat(formData.yield) || 0,
      expectedReturn: parseFloat(formData.yield) || 0,
      minimumInvestment: Math.max(1000, (parseFloat(formData.price) || 0) * 0.01),
      managementFee: 2.5,
      totalShares: 100,
      availableShares: 100,
      pricePerShare: (parseFloat(formData.price) || 0) / 100
    }
    submitData.append('financials', JSON.stringify(financialsObj))
    
    // Add files
    selectedFiles.forEach(file => {
      submitData.append('images', file)
    })

    console.log('Submitting property form with files:', selectedFiles.length)
    onSubmit?.(submitData)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? 'Edit Property' : 'Add New Property'}</CardTitle>
          <CardDescription>
            {initialData ? 'Update property details' : 'Enter the details for the new property listing'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Property Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter property title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="District, City"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter property description"
              rows={3}
            />
          </div>

          {/* Financial Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Total Value (SAR) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1000"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="Enter any amount"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yield">Expected Yield (%)</Label>
              <Input
                id="yield"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.yield}
                onChange={(e) => handleInputChange('yield', e.target.value)}
                placeholder="8.5"
              />
            </div>
          </div>

          {/* Property Type & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Property Type *</Label>
              <Select value={formData.propertyType} onValueChange={(value) => handleInputChange('propertyType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Live</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <Label>Property Images</Label>
            
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
                <p className="mt-2 text-sm text-muted-foreground">
                  JPEG, PNG, WebP up to 5MB each
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* File Previews */}
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {filePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" onClick={handleSubmit}>
              {initialData ? 'Update Property' : 'Create Property'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}