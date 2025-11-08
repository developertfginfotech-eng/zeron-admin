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
  onSubmit?: (data: any) => void // Changed to any instead of FormData
  onCancel?: () => void
  initialData?: any
}

export function PropertyForm({ onSubmit, onCancel, initialData }: PropertyFormProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Helper function to extract location address
  const getLocationAddress = () => {
    if (!initialData?.location) return "";
    if (typeof initialData.location === 'string') {
      return initialData.location;
    }
    if (typeof initialData.location === 'object') {
      // Extract from object format - combine district and city
      const district = initialData.location.district || "";
      const city = initialData.location.city || "";
      return district && city ? `${district}, ${city}` : initialData.location.address || "";
    }
    return "";
  };

  // Helper function to extract financials
  const getFinancialValue = (key: string, fallback: string = "") => {
    if (typeof initialData?.financials === 'object') {
      return initialData.financials[key]?.toString() || fallback;
    }
    return initialData?.[key]?.toString() || fallback;
  };

  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    location: getLocationAddress(),
    price: getFinancialValue("totalValue"),
    propertyType: initialData?.propertyType || "",
    yield: getFinancialValue("projectedYield"),
    status: initialData?.status || "upcoming",
    totalValue: getFinancialValue("totalValue"),
    currentValue: getFinancialValue("currentValue"),
    totalShares: getFinancialValue("totalShares"),
    availableShares: getFinancialValue("availableShares"),
    pricePerShare: getFinancialValue("pricePerShare"),
    projectedYield: getFinancialValue("projectedYield"),
    monthlyRental: getFinancialValue("monthlyRental"),
    minInvestment: getFinancialValue("minInvestment"),
    // Investment Terms - Property Specific
    rentalYieldRate: initialData?.investmentTerms?.rentalYieldRate?.toString() || "",
    appreciationRate: initialData?.investmentTerms?.appreciationRate?.toString() || "",
    lockingPeriodYears: initialData?.investmentTerms?.lockingPeriodYears?.toString() || "",
    earlyWithdrawalPenaltyPercentage: initialData?.investmentTerms?.earlyWithdrawalPenaltyPercentage?.toString() || "",
  })

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [filePreviews, setFilePreviews] = useState<string[]>([])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    const invalidFiles = files.filter((file) => !validTypes.includes(file.type))
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid File Type",
        description: "Please select only JPEG, PNG, or WebP images.",
        variant: "destructive",
      })
      return
    }

    const oversizedFiles = files.filter((file) => file.size > 5 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: "Please select images smaller than 5MB.",
        variant: "destructive",
      })
      return
    }

    setSelectedFiles(files)

    const previews: string[] = []
    let loadedCount = 0
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        previews.push(e.target?.result as string)
        loadedCount++
        if (loadedCount === files.length) setFilePreviews(previews)
      }
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setFilePreviews((prev) => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.title.trim()) {
      toast({ title: "Title Required", variant: "destructive" })
      return
    }

    if (!formData.propertyType) {
      toast({ title: "Property type required", variant: "destructive" })
      return
    }

    // Debug logging
    console.log('Form Data before submission:', {
      title: formData.title,
      description: formData.description,
      propertyType: formData.propertyType,
      status: formData.status,
      location: formData.location,
      price: formData.price,
      yield: formData.yield,
      totalValue: formData.totalValue,
      currentValue: formData.currentValue,
      totalShares: formData.totalShares,
      availableShares: formData.availableShares,
      pricePerShare: formData.pricePerShare,
      projectedYield: formData.projectedYield,
      monthlyRental: formData.monthlyRental,
      minInvestment: formData.minInvestment,
      investmentTerms: {
        rentalYieldRate: formData.rentalYieldRate,
        appreciationRate: formData.appreciationRate,
        lockingPeriodYears: formData.lockingPeriodYears,
        earlyWithdrawalPenaltyPercentage: formData.earlyWithdrawalPenaltyPercentage,
      },
      files: selectedFiles.length
    })

    // Create the data structure to send
    const submitData = {
      // Basic fields (strings, not FormData)
      title: formData.title.trim(),
      description: formData.description,
      propertyType: formData.propertyType,
      status: formData.status,

      // Location object
      location: {
        address: formData.location,
        addressAr: formData.location,
        city: formData.location.split(",")[1]?.trim() || formData.location.split(",")[0]?.trim() || "riyadh",
        district: formData.location.split(",")[0]?.trim() || "",
        coordinates: { latitude: null, longitude: null },
      },

      // Financials object
      financials: {
        totalValue: parseFloat(formData.totalValue) || parseFloat(formData.price) || 0,
        currentValue: parseFloat(formData.currentValue) || parseFloat(formData.price) || 0,
        projectedYield: parseFloat(formData.projectedYield) || parseFloat(formData.yield) || 0,
        expectedReturn: parseFloat(formData.yield) || 0,
        minimumInvestment: parseFloat(formData.minInvestment) || Math.max(1000, (parseFloat(formData.price) || 0) * 0.01),
        managementFee: 2.5,
        totalShares: parseFloat(formData.totalShares) || 100,
        availableShares: parseFloat(formData.availableShares) || 100,
        pricePerShare: parseFloat(formData.pricePerShare) || (parseFloat(formData.price) || 0) / 100,
        monthlyRental: parseFloat(formData.monthlyRental) || 0,
      },

      // Investment Terms - Property Specific Settings
      investmentTerms: {
        targetReturn: parseFloat(formData.projectedYield) || 0,
        rentalYieldRate: formData.rentalYieldRate ? parseFloat(formData.rentalYieldRate) : null,
        appreciationRate: formData.appreciationRate ? parseFloat(formData.appreciationRate) : null,
        lockingPeriodYears: formData.lockingPeriodYears ? parseFloat(formData.lockingPeriodYears) : null,
        investmentDurationYears: formData.lockingPeriodYears ? parseFloat(formData.lockingPeriodYears) : null,
        earlyWithdrawalPenaltyPercentage: formData.earlyWithdrawalPenaltyPercentage ? parseFloat(formData.earlyWithdrawalPenaltyPercentage) : null,
      },

      // Files array
      images: selectedFiles
    }

    console.log('Submitting structured data:', submitData)
    onSubmit?.(submitData)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? "Edit Property" : "Add New Property"}</CardTitle>
          <CardDescription>
            {initialData ? "Update property details" : "Enter the details for the new property listing"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Remove the <form> wrapper, handle submission manually */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Property Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter property title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  placeholder="District, City"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Enter property description"
                rows={3}
              />
            </div>


            {/* Investment Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Investment Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalValue">Total Value (SAR)</Label>
                  <Input
                    id="totalValue"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.totalValue}
                    onChange={(e) => handleInputChange("totalValue", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Current Value (SAR)</Label>
                  <Input
                    id="currentValue"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.currentValue}
                    onChange={(e) => handleInputChange("currentValue", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalShares">Total Shares</Label>
                  <Input
                    id="totalShares"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.totalShares}
                    onChange={(e) => handleInputChange("totalShares", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availableShares">Available Shares</Label>
                  <Input
                    id="availableShares"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.availableShares}
                    onChange={(e) => handleInputChange("availableShares", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerShare">Price Per Share (SAR)</Label>
                  <Input
                    id="pricePerShare"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.pricePerShare}
                    onChange={(e) => handleInputChange("pricePerShare", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yield">Expected Yield (%)</Label>
                  <Input
                    id="yield"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.yield}
                    onChange={(e) => handleInputChange("yield", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyRental">Monthly Rental (SAR)</Label>
                  <Input
                    id="monthlyRental"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.monthlyRental}
                    onChange={(e) => handleInputChange("monthlyRental", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minInvestment">Minimum Investment (SAR)</Label>
                  <Input
                    id="minInvestment"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.minInvestment}
                    onChange={(e) => handleInputChange("minInvestment", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Investment Terms - Property Specific */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Investment Terms (Optional - Leave empty to use global defaults)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rentalYieldRate">Annual Rental Yield (%)</Label>
                  <Input
                    id="rentalYieldRate"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g., 8 (default: 8%)"
                    value={formData.rentalYieldRate}
                    onChange={(e) => handleInputChange("rentalYieldRate", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Income earned annually during locking period</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appreciationRate">Annual Appreciation Rate (%)</Label>
                  <Input
                    id="appreciationRate"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g., 3 (default: 3%)"
                    value={formData.appreciationRate}
                    onChange={(e) => handleInputChange("appreciationRate", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Property value growth after maturity</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockingPeriodYears">Locking Period (Years)</Label>
                  <Input
                    id="lockingPeriodYears"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g., 5 (default: 5 years)"
                    value={formData.lockingPeriodYears}
                    onChange={(e) => handleInputChange("lockingPeriodYears", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Minimum hold period before withdrawal</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="earlyWithdrawalPenaltyPercentage">Early Withdrawal Penalty (%)</Label>
                  <Input
                    id="earlyWithdrawalPenaltyPercentage"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g., 5 (default: 5%)"
                    value={formData.earlyWithdrawalPenaltyPercentage}
                    onChange={(e) => handleInputChange("earlyWithdrawalPenaltyPercentage", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Penalty if withdrawn before maturity</p>
                </div>
              </div>
            </div>

            {/* Property Type & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Type *</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value) => handleInputChange("propertyType", value)}
                >
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
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
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
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Images
                  </Button>
                  <p className="mt-2 text-sm text-muted-foreground">JPEG, PNG, WebP up to 5MB each</p>
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
              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {filePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
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
              <Button type="button" onClick={handleSubmit}>
                {initialData ? "Update Property" : "Create Property"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}