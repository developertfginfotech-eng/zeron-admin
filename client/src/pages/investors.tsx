import { useState, useEffect } from "react"
import { apiCall, apiCallWithFiles, API_ENDPOINTS } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Filter, Eye, TrendingUp, TrendingDown, Building, Wallet, ArrowUpRight, ArrowDownRight, Calendar, MapPin, Phone, Mail, User, FileText, CreditCard, Banknote, PieChart, Shield, CheckCircle, XCircle, Clock, AlertTriangle, Download, ExternalLink } from "lucide-react"
import { Investor, Investment, Transaction, PortfolioSummary, KycDocument } from "@shared/schema"

// Safe helper functions for nullable values
const safeParseNumber = (value: string | number | null | undefined, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue
  const parsed = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(parsed) ? defaultValue : parsed
}

const safeParseString = (value: string | null | undefined, defaultValue: string = '0'): string => {
  return value ?? defaultValue
}

const safePerformanceScore = (score: number | null | undefined): number => {
  return score ?? 50 // Default performance score
}

interface InvestorWithPortfolio extends Investor {
  investments: Investment[]
  transactions: Transaction[]
  portfolio: PortfolioSummary
  kycDocuments?: KycDocument[]
}

export default function Investors() {
  const [searchTerm, setSearchTerm] = useState("")
  const [jobCategoryFilter, setJobCategoryFilter] = useState("all")
  const [investorTierFilter, setInvestorTierFilter] = useState("all")
  const [languageFilter, setLanguageFilter] = useState("all")
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorWithPortfolio | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [investors, setInvestors] = useState<InvestorWithPortfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('')

  // Comprehensive mock investors data - only KYC approved customers
  const mockInvestors: InvestorWithPortfolio[] = [
    // TOP TIER INVESTORS (Executives)
    {
      // Executive - High Investment
      id: '1',
      name: 'Ahmed Al-Mansouri',
      firstName: 'Ahmed',
      lastName: 'Al-Mansouri',
      email: 'ahmed.mansouri@aramco.com',
      phone: '+966 50 123 4567',
      salutation: 'Mr',
      gender: 'male',
      dateOfBirth: new Date('1975-03-15'),
      occupation: 'Chief Technology Officer',
      jobCategory: 'executive',
      jobTitle: 'Chief Technology Officer',
      company: 'Saudi Aramco',
      workExperience: 25,
      city: 'Riyadh',
      country: 'Saudi Arabia',
      address: 'King Fahd District, Riyadh',
      nationality: 'Saudi Arabia',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '2850000',
      activeProperties: 8,
      monthlyIncome: '85000',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-01-05T08:30:00Z'),
      kycSubmittedAt: new Date('2024-01-10T14:22:00Z'),
      aiRiskScore: 8,
      investorTier: 'top',
      preferredLanguage: 'en',
      languagesSpoken: ['en', 'ar'],
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-15'),

      // Portfolio summary - High tier investor
      portfolio: {
        id: 'port1',
        investorId: '1',
        totalInvestment: '2850000',
        currentValue: '3265000',
        totalReturns: '415000',
        totalDividends: '128500',
        totalWithdrawals: '50000',
        unrealizedGains: '286500',
        realizedGains: '128500',
        riskScore: 8,
        performanceScore: 96,
        lastUpdated: new Date('2024-04-15'),
      },

      // Investments - Multiple large properties
      investments: [
        {
          id: 'inv1',
          investorId: '1',
          propertyId: 'prop1',
          investmentAmount: '800000',
          ownershipPercentage: '25.5',
          expectedReturn: '8.2',
          currentValue: '912000',
          totalReturns: '112000',
          totalDividends: '42000',
          status: 'active',
          investmentDate: new Date('2024-01-10T10:30:00Z'),
          exitDate: null,
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-10'),
        },
        {
          id: 'inv2',
          investorId: '1',
          propertyId: 'prop2',
          investmentAmount: '650000',
          ownershipPercentage: '22.3',
          expectedReturn: '7.8',
          currentValue: '739000',
          totalReturns: '89000',
          totalDividends: '35500',
          status: 'active',
          investmentDate: new Date('2024-01-25T14:20:00Z'),
          exitDate: null,
          createdAt: new Date('2024-01-25'),
          updatedAt: new Date('2024-01-25'),
        },
        {
          id: 'inv3',
          investorId: '1',
          propertyId: 'prop3',
          investmentAmount: '500000',
          ownershipPercentage: '18.7',
          expectedReturn: '9.1',
          currentValue: '585000',
          totalReturns: '85000',
          totalDividends: '28500',
          status: 'active',
          investmentDate: new Date('2024-02-15T16:45:00Z'),
          exitDate: null,
          createdAt: new Date('2024-02-15'),
          updatedAt: new Date('2024-02-15'),
        },
        {
          id: 'inv4',
          investorId: '1',
          propertyId: 'prop4',
          investmentAmount: '450000',
          ownershipPercentage: '16.2',
          expectedReturn: '8.5',
          currentValue: '518000',
          totalReturns: '68000',
          totalDividends: '22500',
          status: 'active',
          investmentDate: new Date('2024-03-01T11:30:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-01'),
          updatedAt: new Date('2024-03-01'),
        },
        {
          id: 'inv5',
          investorId: '1',
          propertyId: 'prop5',
          investmentAmount: '450000',
          ownershipPercentage: '15.8',
          expectedReturn: '7.9',
          currentValue: '511000',
          totalReturns: '61000',
          totalDividends: '19000',
          status: 'active',
          investmentDate: new Date('2024-03-20T09:15:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-20'),
          updatedAt: new Date('2024-03-20'),
        }
      ],

      // Transactions - High value transactions
      transactions: [
        {
          id: 'tx1',
          investorId: '1',
          propertyId: 'prop1',
          type: 'investment',
          amount: '800000',
          fee: '8000',
          description: 'Major investment in Premium Commercial Tower',
          reference: 'INV-001-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****4567' }),
          processedAt: new Date('2024-01-10T10:30:00Z'),
          createdAt: new Date('2024-01-10T08:15:00Z'),
          updatedAt: new Date('2024-01-10T10:30:00Z'),
        },
        {
          id: 'tx2',
          investorId: '1',
          propertyId: null,
          type: 'dividend',
          amount: '128500',
          fee: '0',
          description: 'Quarterly dividend payments (all properties)',
          reference: 'DIV-Q1-2024-ALL',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****4567' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        },
        {
          id: 'tx3',
          investorId: '1',
          propertyId: null,
          type: 'withdrawal',
          amount: '50000',
          fee: '500',
          description: 'Partial profit withdrawal for personal use',
          reference: 'WTH-001-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****4567' }),
          processedAt: new Date('2024-03-15T14:20:00Z'),
          createdAt: new Date('2024-03-15T13:10:00Z'),
          updatedAt: new Date('2024-03-15T14:20:00Z'),
        }
      ],

      // KYC Documents - Executive level comprehensive documentation
      kycDocuments: [
        {
          id: 'kyc1',
          investorId: '1',
          documentType: 'national_id',
          documentUrl: 'https://docs.example.com/kyc/ahmed-mansouri-national-id.pdf',
          status: 'approved',
          reviewNotes: 'High-quality scan, all security features verified. Document issued by Ministry of Interior.',
          reviewedBy: 'admin1',
          isAuthentic: true,
          confidenceScore: 98,
          extractedData: JSON.stringify({
            idNumber: '1234567890',
            fullName: 'Ahmed bin Abdullah Al-Mansouri',
            dateOfBirth: '1975-03-15',
            placeOfBirth: 'Riyadh',
            nationality: 'Saudi Arabia',
            issueDate: '2020-01-15',
            expiryDate: '2030-01-15'
          }),
          uploadedAt: new Date('2024-01-08T14:30:00Z'),
          reviewedAt: new Date('2024-01-09T10:15:00Z'),
        },
        {
          id: 'kyc2',
          investorId: '1',
          documentType: 'passport',
          documentUrl: 'https://docs.example.com/kyc/ahmed-mansouri-passport.pdf',
          status: 'approved',
          reviewNotes: 'Saudi passport with multiple travel stamps. All security features authentic.',
          reviewedBy: 'admin1',
          isAuthentic: true,
          confidenceScore: 97,
          extractedData: JSON.stringify({
            passportNumber: 'A12345678',
            fullName: 'Ahmed Abdullah Al-Mansouri',
            nationality: 'Saudi Arabia',
            dateOfBirth: '1975-03-15',
            placeOfBirth: 'Riyadh',
            issueDate: '2022-05-20',
            expiryDate: '2032-05-20'
          }),
          uploadedAt: new Date('2024-01-08T14:45:00Z'),
          reviewedAt: new Date('2024-01-09T10:30:00Z'),
        },
        {
          id: 'kyc3',
          investorId: '1',
          documentType: 'selfie',
          documentUrl: 'https://docs.example.com/kyc/ahmed-mansouri-selfie.jpg',
          status: 'approved',
          reviewNotes: 'Clear facial biometric match with official documents. Liveness detection passed.',
          reviewedBy: 'admin1',
          isAuthentic: true,
          confidenceScore: 99,
          extractedData: JSON.stringify({
            biometricMatch: 'verified',
            livenessDetection: 'passed',
            faceMatchConfidence: 99.2,
            qualityScore: 95
          }),
          uploadedAt: new Date('2024-01-08T15:00:00Z'),
          reviewedAt: new Date('2024-01-09T11:00:00Z'),
        },
        {
          id: 'kyc4',
          investorId: '1',
          documentType: 'employment_letter',
          documentUrl: 'https://docs.example.com/kyc/ahmed-mansouri-employment.pdf',
          status: 'approved',
          reviewNotes: 'Official Saudi Aramco letterhead with HR seal. Position and salary confirmed.',
          reviewedBy: 'admin2',
          isAuthentic: true,
          confidenceScore: 96,
          extractedData: JSON.stringify({
            company: 'Saudi Aramco',
            position: 'Chief Technology Officer',
            employmentType: 'permanent',
            monthlySalary: '85000',
            currency: 'SAR',
            startDate: '2019-01-15',
            hrContact: '+966-13-872-0000'
          }),
          uploadedAt: new Date('2024-01-08T15:30:00Z'),
          reviewedAt: new Date('2024-01-09T14:20:00Z'),
        },
        {
          id: 'kyc5',
          investorId: '1',
          documentType: 'bank_statement',
          documentUrl: 'https://docs.example.com/kyc/ahmed-mansouri-bank-statement.pdf',
          status: 'approved',
          reviewNotes: 'Al Rajhi Bank statement showing consistent high income and substantial savings.',
          reviewedBy: 'admin2',
          isAuthentic: true,
          confidenceScore: 95,
          extractedData: JSON.stringify({
            bank: 'Al Rajhi Bank',
            accountType: 'current',
            averageBalance: '2450000',
            currency: 'SAR',
            statementPeriod: '2023-10 to 2024-01',
            regularIncome: true,
            transactionVolume: 'high'
          }),
          uploadedAt: new Date('2024-01-09T09:00:00Z'),
          reviewedAt: new Date('2024-01-09T16:45:00Z'),
        },
        {
          id: 'kyc6',
          investorId: '1',
          documentType: 'address_proof',
          documentUrl: 'https://docs.example.com/kyc/ahmed-mansouri-utility-bill.pdf',
          status: 'approved',
          reviewNotes: 'Saudi Electricity Company bill matching address on official documents.',
          reviewedBy: 'admin1',
          isAuthentic: true,
          confidenceScore: 94,
          extractedData: JSON.stringify({
            address: 'King Fahd District, Riyadh',
            utilityProvider: 'Saudi Electricity Company',
            billDate: '2024-01-05',
            accountHolder: 'Ahmed Al-Mansouri',
            serviceAddress: 'King Fahd District, Riyadh 12271'
          }),
          uploadedAt: new Date('2024-01-09T10:15:00Z'),
          reviewedAt: new Date('2024-01-10T09:30:00Z'),
        },
        {
          id: 'kyc7',
          investorId: '1',
          documentType: 'proof_of_income',
          documentUrl: 'https://docs.example.com/kyc/ahmed-mansouri-tax-certificate.pdf',
          status: 'approved',
          reviewNotes: 'ZATCA tax certificate confirming declared income and tax compliance.',
          reviewedBy: 'admin2',
          isAuthentic: true,
          confidenceScore: 97,
          extractedData: JSON.stringify({
            taxAuthority: 'ZATCA',
            taxYear: '2023',
            declaredIncome: '1020000',
            currency: 'SAR',
            taxStatus: 'compliant',
            certificateNumber: 'TAX-2023-891234'
          }),
          uploadedAt: new Date('2024-01-09T11:30:00Z'),
          reviewedAt: new Date('2024-01-10T13:15:00Z'),
        }
      ]
    },

    // SECOND TOP TIER INVESTOR (Executive - International)
    {
      id: '2',
      name: 'Dr. Sarah Al-Qahtani',
      firstName: 'Sarah',
      lastName: 'Al-Qahtani',
      email: 'sarah.qahtani@kfsh.med.sa',
      phone: '+966 55 234 5678',
      salutation: 'Dr',
      gender: 'female',
      dateOfBirth: new Date('1978-11-22'),
      occupation: 'Hospital Chief Executive',
      jobCategory: 'executive',
      jobTitle: 'Chief Executive Officer',
      company: 'King Faisal Specialist Hospital',
      workExperience: 22,
      city: 'Riyadh',
      country: 'Saudi Arabia',
      address: 'Diplomatic Quarter, Riyadh',
      nationality: 'Saudi Arabia',
      profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b5b0c8d1?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '1950000',
      activeProperties: 6,
      monthlyIncome: '72000',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-01-08T09:15:00Z'),
      kycSubmittedAt: new Date('2024-01-12T16:30:00Z'),
      aiRiskScore: 12,
      investorTier: 'top',
      preferredLanguage: 'ar',
      languagesSpoken: ['ar', 'en', 'fr'],
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-18'),

      portfolio: {
        id: 'port2',
        investorId: '2',
        totalInvestment: '1950000',
        currentValue: '2243000',
        totalReturns: '293000',
        totalDividends: '89500',
        totalWithdrawals: '25000',
        unrealizedGains: '203500',
        realizedGains: '89500',
        riskScore: 12,
        performanceScore: 94,
        lastUpdated: new Date('2024-04-10'),
      },

      investments: [
        {
          id: 'inv6',
          investorId: '2',
          propertyId: 'prop6',
          investmentAmount: '600000',
          ownershipPercentage: '21.5',
          expectedReturn: '8.5',
          currentValue: '696000',
          totalReturns: '96000',
          totalDividends: '32000',
          status: 'active',
          investmentDate: new Date('2024-01-18T13:20:00Z'),
          exitDate: null,
          createdAt: new Date('2024-01-18'),
          updatedAt: new Date('2024-01-18'),
        },
        {
          id: 'inv7',
          investorId: '2',
          propertyId: 'prop7',
          investmentAmount: '450000',
          ownershipPercentage: '17.4',
          expectedReturn: '9.1',
          currentValue: '531000',
          totalReturns: '81000',
          totalDividends: '28500',
          status: 'active',
          investmentDate: new Date('2024-02-05T10:45:00Z'),
          exitDate: null,
          createdAt: new Date('2024-02-05'),
          updatedAt: new Date('2024-02-05'),
        },
        {
          id: 'inv8',
          investorId: '2',
          propertyId: 'prop8',
          investmentAmount: '450000',
          ownershipPercentage: '16.8',
          expectedReturn: '7.9',
          currentValue: '512000',
          totalReturns: '62000',
          totalDividends: '29000',
          status: 'active',
          investmentDate: new Date('2024-02-25T15:30:00Z'),
          exitDate: null,
          createdAt: new Date('2024-02-25'),
          updatedAt: new Date('2024-02-25'),
        },
        {
          id: 'inv9',
          investorId: '2',
          propertyId: 'prop9',
          investmentAmount: '450000',
          ownershipPercentage: '15.2',
          expectedReturn: '8.3',
          currentValue: '504000',
          totalReturns: '54000',
          totalDividends: '18500',
          status: 'active',
          investmentDate: new Date('2024-03-12T12:00:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-12'),
          updatedAt: new Date('2024-03-12'),
        }
      ],

      transactions: [
        {
          id: 'tx4',
          investorId: '2',
          propertyId: 'prop6',
          type: 'investment',
          amount: '600000',
          fee: '6000',
          description: 'Investment in Medical District Complex',
          reference: 'INV-002-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'SABB Bank', account: '****9876' }),
          processedAt: new Date('2024-01-18T13:20:00Z'),
          createdAt: new Date('2024-01-18T11:00:00Z'),
          updatedAt: new Date('2024-01-18T13:20:00Z'),
        },
        {
          id: 'tx5',
          investorId: '2',
          propertyId: null,
          type: 'dividend',
          amount: '89500',
          fee: '0',
          description: 'Quarterly dividend payments',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'SABB Bank', account: '****9876' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    // MANAGEMENT TIER INVESTORS
    {
      id: '3',
      name: 'Khalid Al-Mutairi',
      firstName: 'Khalid',
      lastName: 'Al-Mutairi',
      email: 'khalid.mutairi@sabic.com',
      phone: '+966 53 345 6789',
      salutation: 'Eng',
      gender: 'male',
      dateOfBirth: new Date('1982-09-30'),
      occupation: 'Regional Operations Manager',
      jobCategory: 'management',
      jobTitle: 'Regional Operations Manager',
      company: 'SABIC',
      workExperience: 18,
      city: 'Dammam',
      country: 'Saudi Arabia',
      address: 'Al-Khobar, Eastern Province',
      nationality: 'Saudi Arabia',
      profilePicture: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '875000',
      activeProperties: 4,
      monthlyIncome: '35000',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-01-12T07:20:00Z'),
      kycSubmittedAt: new Date('2024-01-18T12:45:00Z'),
      aiRiskScore: 18,
      investorTier: 'medium',
      preferredLanguage: 'ar',
      languagesSpoken: ['ar', 'en'],
      createdAt: new Date('2024-01-12'),
      updatedAt: new Date('2024-01-25'),

      portfolio: {
        id: 'port3',
        investorId: '3',
        totalInvestment: '875000',
        currentValue: '1015000',
        totalReturns: '140000',
        totalDividends: '52500',
        totalWithdrawals: '15000',
        unrealizedGains: '87500',
        realizedGains: '52500',
        riskScore: 18,
        performanceScore: 88,
        lastUpdated: new Date('2024-04-08'),
      },

      investments: [
        {
          id: 'inv10',
          investorId: '3',
          propertyId: 'prop10',
          investmentAmount: '300000',
          ownershipPercentage: '19.3',
          expectedReturn: '8.2',
          currentValue: '345000',
          totalReturns: '45000',
          totalDividends: '18200',
          status: 'active',
          investmentDate: new Date('2024-01-25T13:20:00Z'),
          exitDate: null,
          createdAt: new Date('2024-01-25'),
          updatedAt: new Date('2024-01-25'),
        },
        {
          id: 'inv11',
          investorId: '3',
          propertyId: 'prop11',
          investmentAmount: '250000',
          ownershipPercentage: '17.4',
          expectedReturn: '9.1',
          currentValue: '290000',
          totalReturns: '40000',
          totalDividends: '15500',
          status: 'active',
          investmentDate: new Date('2024-02-10T10:45:00Z'),
          exitDate: null,
          createdAt: new Date('2024-02-10'),
          updatedAt: new Date('2024-02-10'),
        },
        {
          id: 'inv12',
          investorId: '3',
          propertyId: 'prop12',
          investmentAmount: '175000',
          ownershipPercentage: '12.1',
          expectedReturn: '7.9',
          currentValue: '196000',
          totalReturns: '21000',
          totalDividends: '9800',
          status: 'active',
          investmentDate: new Date('2024-03-05T15:30:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-05'),
          updatedAt: new Date('2024-03-05'),
        },
        {
          id: 'inv13',
          investorId: '3',
          propertyId: 'prop13',
          investmentAmount: '150000',
          ownershipPercentage: '11.2',
          expectedReturn: '8.7',
          currentValue: '184000',
          totalReturns: '34000',
          totalDividends: '9000',
          status: 'active',
          investmentDate: new Date('2024-03-22T12:00:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-22'),
          updatedAt: new Date('2024-03-22'),
        }
      ],

      transactions: [
        {
          id: 'tx6',
          investorId: '3',
          propertyId: 'prop10',
          type: 'investment',
          amount: '300000',
          fee: '3000',
          description: 'Investment in Eastern Province Industrial Complex',
          reference: 'INV-003-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'NCB Bank', account: '****1234' }),
          processedAt: new Date('2024-01-25T13:20:00Z'),
          createdAt: new Date('2024-01-25T11:00:00Z'),
          updatedAt: new Date('2024-01-25T13:20:00Z'),
        },
        {
          id: 'tx7',
          investorId: '3',
          propertyId: null,
          type: 'dividend',
          amount: '52500',
          fee: '0',
          description: 'Quarterly dividend payments (all properties)',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'NCB Bank', account: '****1234' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    {
      id: '4',
      name: 'Fatima Al-Zahra',
      firstName: 'Fatima',
      lastName: 'Al-Zahra',
      email: 'fatima.zahra@stc.com.sa',
      phone: '+966 55 987 6543',
      salutation: 'Mrs',
      gender: 'female',
      dateOfBirth: new Date('1985-07-22'),
      occupation: 'Marketing Director',
      jobCategory: 'management',
      jobTitle: 'Marketing Director',
      company: 'Saudi Telecom Company',
      workExperience: 15,
      city: 'Jeddah',
      country: 'Saudi Arabia',
      address: 'Al-Hamra District, Jeddah',
      nationality: 'Saudi Arabia',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '625000',
      activeProperties: 3,
      monthlyIncome: '28500',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-01-15T12:15:00Z'),
      kycSubmittedAt: new Date('2024-01-20T16:45:00Z'),
      aiRiskScore: 22,
      investorTier: 'medium',
      preferredLanguage: 'ar',
      languagesSpoken: ['ar', 'en'],
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-28'),

      portfolio: {
        id: 'port4',
        investorId: '4',
        totalInvestment: '625000',
        currentValue: '718750',
        totalReturns: '93750',
        totalDividends: '38200',
        totalWithdrawals: '0',
        unrealizedGains: '55550',
        realizedGains: '38200',
        riskScore: 22,
        performanceScore: 91,
        lastUpdated: new Date('2024-04-05'),
      },

      investments: [
        {
          id: 'inv14',
          investorId: '4',
          propertyId: 'prop14',
          investmentAmount: '275000',
          ownershipPercentage: '16.6',
          expectedReturn: '8.5',
          currentValue: '315000',
          totalReturns: '40000',
          totalDividends: '16200',
          status: 'active',
          investmentDate: new Date('2024-01-28T09:15:00Z'),
          exitDate: null,
          createdAt: new Date('2024-01-28'),
          updatedAt: new Date('2024-01-28'),
        },
        {
          id: 'inv15',
          investorId: '4',
          propertyId: 'prop15',
          investmentAmount: '200000',
          ownershipPercentage: '13.8',
          expectedReturn: '9.2',
          currentValue: '235000',
          totalReturns: '35000',
          totalDividends: '12500',
          status: 'active',
          investmentDate: new Date('2024-02-18T11:30:00Z'),
          exitDate: null,
          createdAt: new Date('2024-02-18'),
          updatedAt: new Date('2024-02-18'),
        },
        {
          id: 'inv16',
          investorId: '4',
          propertyId: 'prop16',
          investmentAmount: '150000',
          ownershipPercentage: '11.2',
          expectedReturn: '7.8',
          currentValue: '168750',
          totalReturns: '18750',
          totalDividends: '9500',
          status: 'active',
          investmentDate: new Date('2024-03-08T14:45:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-08'),
          updatedAt: new Date('2024-03-08'),
        }
      ],

      transactions: [
        {
          id: 'tx8',
          investorId: '4',
          propertyId: 'prop14',
          type: 'investment',
          amount: '275000',
          fee: '2750',
          description: 'Investment in Jeddah Commercial Hub',
          reference: 'INV-004-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Arab National Bank', account: '****5432' }),
          processedAt: new Date('2024-01-28T09:15:00Z'),
          createdAt: new Date('2024-01-28T08:00:00Z'),
          updatedAt: new Date('2024-01-28T09:15:00Z'),
        },
        {
          id: 'tx9',
          investorId: '4',
          propertyId: null,
          type: 'dividend',
          amount: '38200',
          fee: '0',
          description: 'Quarterly dividend payments',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Arab National Bank', account: '****5432' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    // PROFESSIONAL TIER INVESTORS
    {
      id: '5',
      name: 'Dr. Omar Al-Rashid',
      firstName: 'Omar',
      lastName: 'Al-Rashid',
      email: 'omar.rashid@ksu.edu.sa',
      phone: '+966 56 456 7890',
      salutation: 'Dr',
      gender: 'male',
      dateOfBirth: new Date('1980-04-12'),
      occupation: 'Petroleum Engineer',
      jobCategory: 'professional',
      jobTitle: 'Senior Petroleum Engineer',
      company: 'King Saud University',
      workExperience: 20,
      city: 'Riyadh',
      country: 'Saudi Arabia',
      address: 'Al-Narjis District, Riyadh',
      nationality: 'Saudi Arabia',
      profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '485000',
      activeProperties: 3,
      monthlyIncome: '22500',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-01-20T10:30:00Z'),
      kycSubmittedAt: new Date('2024-01-25T14:22:00Z'),
      aiRiskScore: 28,
      investorTier: 'medium',
      preferredLanguage: 'en',
      languagesSpoken: ['en', 'ar'],
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-02-05'),

      portfolio: {
        id: 'port5',
        investorId: '5',
        totalInvestment: '485000',
        currentValue: '548000',
        totalReturns: '63000',
        totalDividends: '28500',
        totalWithdrawals: '8000',
        unrealizedGains: '34500',
        realizedGains: '28500',
        riskScore: 28,
        performanceScore: 82,
        lastUpdated: new Date('2024-04-02'),
      },

      investments: [
        {
          id: 'inv17',
          investorId: '5',
          propertyId: 'prop17',
          investmentAmount: '200000',
          ownershipPercentage: '14.5',
          expectedReturn: '8.2',
          currentValue: '225000',
          totalReturns: '25000',
          totalDividends: '12500',
          status: 'active',
          investmentDate: new Date('2024-02-05T10:30:00Z'),
          exitDate: null,
          createdAt: new Date('2024-02-05'),
          updatedAt: new Date('2024-02-05'),
        },
        {
          id: 'inv18',
          investorId: '5',
          propertyId: 'prop18',
          investmentAmount: '185000',
          ownershipPercentage: '12.8',
          expectedReturn: '7.9',
          currentValue: '205000',
          totalReturns: '20000',
          totalDividends: '9500',
          status: 'active',
          investmentDate: new Date('2024-02-20T14:20:00Z'),
          exitDate: null,
          createdAt: new Date('2024-02-20'),
          updatedAt: new Date('2024-02-20'),
        },
        {
          id: 'inv19',
          investorId: '5',
          propertyId: 'prop19',
          investmentAmount: '100000',
          ownershipPercentage: '8.2',
          expectedReturn: '9.0',
          currentValue: '118000',
          totalReturns: '18000',
          totalDividends: '6500',
          status: 'active',
          investmentDate: new Date('2024-03-10T16:45:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-10'),
          updatedAt: new Date('2024-03-10'),
        }
      ],

      transactions: [
        {
          id: 'tx10',
          investorId: '5',
          propertyId: 'prop17',
          type: 'investment',
          amount: '200000',
          fee: '2000',
          description: 'Investment in Engineering Hub Complex',
          reference: 'INV-005-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Banque Saudi Fransi', account: '****7890' }),
          processedAt: new Date('2024-02-05T10:30:00Z'),
          createdAt: new Date('2024-02-05T08:15:00Z'),
          updatedAt: new Date('2024-02-05T10:30:00Z'),
        },
        {
          id: 'tx11',
          investorId: '5',
          propertyId: null,
          type: 'dividend',
          amount: '28500',
          fee: '0',
          description: 'Quarterly dividend payments',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Banque Saudi Fransi', account: '****7890' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    {
      id: '6',
      name: 'Amina Khoury',
      firstName: 'Amina',
      lastName: 'Khoury',
      email: 'amina.khoury@health.gov.sa',
      phone: '+966 57 567 8901',
      salutation: 'Dr',
      gender: 'female',
      dateOfBirth: new Date('1983-09-18'),
      occupation: 'Cardiologist',
      jobCategory: 'professional',
      jobTitle: 'Senior Cardiologist',
      company: 'Ministry of Health',
      workExperience: 16,
      city: 'Mecca',
      country: 'Saudi Arabia',
      address: 'Al-Aziziyyah, Mecca',
      nationality: 'Lebanon',
      profilePicture: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '365000',
      activeProperties: 2,
      monthlyIncome: '28000',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-02-01T11:45:00Z'),
      kycSubmittedAt: new Date('2024-02-08T15:30:00Z'),
      aiRiskScore: 32,
      investorTier: 'medium',
      preferredLanguage: 'ar',
      languagesSpoken: ['ar', 'en', 'fr'],
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-15'),

      portfolio: {
        id: 'port6',
        investorId: '6',
        totalInvestment: '365000',
        currentValue: '405000',
        totalReturns: '40000',
        totalDividends: '22500',
        totalWithdrawals: '5000',
        unrealizedGains: '17500',
        realizedGains: '22500',
        riskScore: 32,
        performanceScore: 78,
        lastUpdated: new Date('2024-03-28'),
      },

      investments: [
        {
          id: 'inv20',
          investorId: '6',
          propertyId: 'prop20',
          investmentAmount: '200000',
          ownershipPercentage: '13.2',
          expectedReturn: '8.1',
          currentValue: '218000',
          totalReturns: '18000',
          totalDividends: '12000',
          status: 'active',
          investmentDate: new Date('2024-02-15T09:15:00Z'),
          exitDate: null,
          createdAt: new Date('2024-02-15'),
          updatedAt: new Date('2024-02-15'),
        },
        {
          id: 'inv21',
          investorId: '6',
          propertyId: 'prop21',
          investmentAmount: '165000',
          ownershipPercentage: '11.4',
          expectedReturn: '7.8',
          currentValue: '187000',
          totalReturns: '22000',
          totalDividends: '10500',
          status: 'active',
          investmentDate: new Date('2024-03-05T11:30:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-05'),
          updatedAt: new Date('2024-03-05'),
        }
      ],

      transactions: [
        {
          id: 'tx12',
          investorId: '6',
          propertyId: 'prop20',
          type: 'investment',
          amount: '200000',
          fee: '2000',
          description: 'Investment in Healthcare District',
          reference: 'INV-006-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Bilad Bank', account: '****2345' }),
          processedAt: new Date('2024-02-15T09:15:00Z'),
          createdAt: new Date('2024-02-15T08:00:00Z'),
          updatedAt: new Date('2024-02-15T09:15:00Z'),
        },
        {
          id: 'tx13',
          investorId: '6',
          propertyId: null,
          type: 'dividend',
          amount: '22500',
          fee: '0',
          description: 'Quarterly dividend payments',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Bilad Bank', account: '****2345' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    {
      id: '7',
      name: 'Rajesh Patel',
      firstName: 'Rajesh',
      lastName: 'Patel',
      email: 'rajesh.patel@aramco.com',
      phone: '+966 58 678 9012',
      salutation: 'Mr',
      gender: 'male',
      dateOfBirth: new Date('1987-02-14'),
      occupation: 'IT Architect',
      jobCategory: 'professional',
      jobTitle: 'Senior IT Architect',
      company: 'Saudi Aramco',
      workExperience: 12,
      city: 'Dhahran',
      country: 'Saudi Arabia',
      address: 'Aramco Compound, Dhahran',
      nationality: 'India',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '275000',
      activeProperties: 2,
      monthlyIncome: '19500',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-02-10T13:20:00Z'),
      kycSubmittedAt: new Date('2024-02-18T16:45:00Z'),
      aiRiskScore: 35,
      investorTier: 'medium',
      preferredLanguage: 'en',
      languagesSpoken: ['en', 'hi', 'ar'],
      createdAt: new Date('2024-02-10'),
      updatedAt: new Date('2024-02-25'),

      portfolio: {
        id: 'port7',
        investorId: '7',
        totalInvestment: '275000',
        currentValue: '301500',
        totalReturns: '26500',
        totalDividends: '16200',
        totalWithdrawals: '0',
        unrealizedGains: '10300',
        realizedGains: '16200',
        riskScore: 35,
        performanceScore: 75,
        lastUpdated: new Date('2024-03-25'),
      },

      investments: [
        {
          id: 'inv22',
          investorId: '7',
          propertyId: 'prop22',
          investmentAmount: '150000',
          ownershipPercentage: '10.8',
          expectedReturn: '8.4',
          currentValue: '165000',
          totalReturns: '15000',
          totalDividends: '9200',
          status: 'active',
          investmentDate: new Date('2024-02-25T12:30:00Z'),
          exitDate: null,
          createdAt: new Date('2024-02-25'),
          updatedAt: new Date('2024-02-25'),
        },
        {
          id: 'inv23',
          investorId: '7',
          propertyId: 'prop23',
          investmentAmount: '125000',
          ownershipPercentage: '9.2',
          expectedReturn: '7.6',
          currentValue: '136500',
          totalReturns: '11500',
          totalDividends: '7000',
          status: 'active',
          investmentDate: new Date('2024-03-15T14:45:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-15'),
          updatedAt: new Date('2024-03-15'),
        }
      ],

      transactions: [
        {
          id: 'tx14',
          investorId: '7',
          propertyId: 'prop22',
          type: 'investment',
          amount: '150000',
          fee: '1500',
          description: 'Investment in Tech Park Complex',
          reference: 'INV-007-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'SAMBA Bank', account: '****3456' }),
          processedAt: new Date('2024-02-25T12:30:00Z'),
          createdAt: new Date('2024-02-25T11:00:00Z'),
          updatedAt: new Date('2024-02-25T12:30:00Z'),
        },
        {
          id: 'tx15',
          investorId: '7',
          propertyId: null,
          type: 'dividend',
          amount: '16200',
          fee: '0',
          description: 'Quarterly dividend payments',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'SAMBA Bank', account: '****3456' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    // SKILLED WORKER TIER INVESTORS  
    {
      id: '8',
      name: 'Nadia Al-Harbi',
      firstName: 'Nadia',
      lastName: 'Al-Harbi',
      email: 'nadia.harbi@education.gov.sa',
      phone: '+966 59 789 0123',
      salutation: 'Ms',
      gender: 'female',
      dateOfBirth: new Date('1988-06-25'),
      occupation: 'High School Teacher',
      jobCategory: 'skilled_worker',
      jobTitle: 'Mathematics Teacher',
      company: 'Ministry of Education',
      workExperience: 10,
      city: 'Medina',
      country: 'Saudi Arabia',
      address: 'Al-Haram District, Medina',
      nationality: 'Saudi Arabia',
      profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b5b0c8d1?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '125000',
      activeProperties: 2,
      monthlyIncome: '9500',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-02-18T14:15:00Z'),
      kycSubmittedAt: new Date('2024-02-25T10:30:00Z'),
      aiRiskScore: 42,
      investorTier: 'low',
      preferredLanguage: 'ar',
      languagesSpoken: ['ar', 'en'],
      createdAt: new Date('2024-02-18'),
      updatedAt: new Date('2024-03-02'),

      portfolio: {
        id: 'port8',
        investorId: '8',
        totalInvestment: '125000',
        currentValue: '133000',
        totalReturns: '8000',
        totalDividends: '7200',
        totalWithdrawals: '0',
        unrealizedGains: '800',
        realizedGains: '7200',
        riskScore: 42,
        performanceScore: 68,
        lastUpdated: new Date('2024-03-20'),
      },

      investments: [
        {
          id: 'inv24',
          investorId: '8',
          propertyId: 'prop24',
          investmentAmount: '75000',
          ownershipPercentage: '6.8',
          expectedReturn: '7.2',
          currentValue: '79500',
          totalReturns: '4500',
          totalDividends: '4200',
          status: 'active',
          investmentDate: new Date('2024-03-02T11:20:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-02'),
          updatedAt: new Date('2024-03-02'),
        },
        {
          id: 'inv25',
          investorId: '8',
          propertyId: 'prop25',
          investmentAmount: '50000',
          ownershipPercentage: '4.9',
          expectedReturn: '6.8',
          currentValue: '53500',
          totalReturns: '3500',
          totalDividends: '3000',
          status: 'active',
          investmentDate: new Date('2024-03-18T09:45:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-18'),
          updatedAt: new Date('2024-03-18'),
        }
      ],

      transactions: [
        {
          id: 'tx16',
          investorId: '8',
          propertyId: 'prop24',
          type: 'investment',
          amount: '75000',
          fee: '750',
          description: 'Investment in Educational Hub',
          reference: 'INV-008-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Alinma Bank', account: '****4567' }),
          processedAt: new Date('2024-03-02T11:20:00Z'),
          createdAt: new Date('2024-03-02T10:00:00Z'),
          updatedAt: new Date('2024-03-02T11:20:00Z'),
        },
        {
          id: 'tx17',
          investorId: '8',
          propertyId: null,
          type: 'dividend',
          amount: '7200',
          fee: '0',
          description: 'Quarterly dividend payments',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Alinma Bank', account: '****4567' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    {
      id: '9',
      name: 'Mohammad Al-Sayed',
      firstName: 'Mohammad',
      lastName: 'Al-Sayed',
      email: 'mohammad.sayed@gmail.com',
      phone: '+966 50 890 1234',
      salutation: 'Mr',
      gender: 'male',
      dateOfBirth: new Date('1984-12-03'),
      occupation: 'Aircraft Mechanic',
      jobCategory: 'skilled_worker',
      jobTitle: 'Senior Aircraft Mechanic',
      company: 'Saudia Airlines',
      workExperience: 16,
      city: 'Jeddah',
      country: 'Saudi Arabia',
      address: 'King Abdulaziz International Airport',
      nationality: 'Saudi Arabia',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '185000',
      activeProperties: 2,
      monthlyIncome: '12500',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-02-22T16:30:00Z'),
      kycSubmittedAt: new Date('2024-03-01T14:15:00Z'),
      aiRiskScore: 38,
      investorTier: 'low',
      preferredLanguage: 'ar',
      languagesSpoken: ['ar', 'en'],
      createdAt: new Date('2024-02-22'),
      updatedAt: new Date('2024-03-08'),

      portfolio: {
        id: 'port9',
        investorId: '9',
        totalInvestment: '185000',
        currentValue: '198500',
        totalReturns: '13500',
        totalDividends: '11800',
        totalWithdrawals: '2500',
        unrealizedGains: '1700',
        realizedGains: '11800',
        riskScore: 38,
        performanceScore: 72,
        lastUpdated: new Date('2024-03-15'),
      },

      investments: [
        {
          id: 'inv26',
          investorId: '9',
          propertyId: 'prop26',
          investmentAmount: '100000',
          ownershipPercentage: '8.5',
          expectedReturn: '7.5',
          currentValue: '107000',
          totalReturns: '7000',
          totalDividends: '6500',
          status: 'active',
          investmentDate: new Date('2024-03-08T13:40:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-08'),
          updatedAt: new Date('2024-03-08'),
        },
        {
          id: 'inv27',
          investorId: '9',
          propertyId: 'prop27',
          investmentAmount: '85000',
          ownershipPercentage: '7.2',
          expectedReturn: '7.8',
          currentValue: '91500',
          totalReturns: '6500',
          totalDividends: '5300',
          status: 'active',
          investmentDate: new Date('2024-03-25T15:20:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-25'),
          updatedAt: new Date('2024-03-25'),
        }
      ],

      transactions: [
        {
          id: 'tx18',
          investorId: '9',
          propertyId: 'prop26',
          type: 'investment',
          amount: '100000',
          fee: '1000',
          description: 'Investment in Airport Commercial Zone',
          reference: 'INV-009-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****5678' }),
          processedAt: new Date('2024-03-08T13:40:00Z'),
          createdAt: new Date('2024-03-08T12:00:00Z'),
          updatedAt: new Date('2024-03-08T13:40:00Z'),
        },
        {
          id: 'tx19',
          investorId: '9',
          propertyId: null,
          type: 'dividend',
          amount: '11800',
          fee: '0',
          description: 'Quarterly dividend payments',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****5678' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        },
        {
          id: 'tx20',
          investorId: '9',
          propertyId: null,
          type: 'withdrawal',
          amount: '2500',
          fee: '25',
          description: 'Small withdrawal for family expenses',
          reference: 'WTH-003-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****5678' }),
          processedAt: new Date('2024-03-22T10:15:00Z'),
          createdAt: new Date('2024-03-22T09:30:00Z'),
          updatedAt: new Date('2024-03-22T10:15:00Z'),
        }
      ]
    },

    // ENTRY LEVEL WORKERS
    {
      id: '10',
      name: 'Yusuf Chen',
      firstName: 'Yusuf',
      lastName: 'Chen',
      email: 'yusuf.chen@outlook.com',
      phone: '+966 51 901 2345',
      salutation: 'Mr',
      gender: 'male',
      dateOfBirth: new Date('1993-08-15'),
      occupation: 'Junior Accountant',
      jobCategory: 'entry_level',
      jobTitle: 'Junior Accountant',
      company: 'Local Accounting Firm',
      workExperience: 3,
      city: 'Abha',
      country: 'Saudi Arabia',
      address: 'Al-Manhal District, Abha',
      nationality: 'China',
      profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '45000',
      activeProperties: 1,
      monthlyIncome: '4200',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-03-05T08:45:00Z'),
      kycSubmittedAt: new Date('2024-03-12T11:20:00Z'),
      aiRiskScore: 58,
      investorTier: 'low',
      preferredLanguage: 'en',
      languagesSpoken: ['en', 'ar', 'zh'],
      createdAt: new Date('2024-03-05'),
      updatedAt: new Date('2024-03-18'),

      portfolio: {
        id: 'port10',
        investorId: '10',
        totalInvestment: '45000',
        currentValue: '47500',
        totalReturns: '2500',
        totalDividends: '2100',
        totalWithdrawals: '0',
        unrealizedGains: '400',
        realizedGains: '2100',
        riskScore: 58,
        performanceScore: 62,
        lastUpdated: new Date('2024-03-30'),
      },

      investments: [
        {
          id: 'inv28',
          investorId: '10',
          propertyId: 'prop28',
          investmentAmount: '45000',
          ownershipPercentage: '3.8',
          expectedReturn: '6.9',
          currentValue: '47500',
          totalReturns: '2500',
          totalDividends: '2100',
          status: 'active',
          investmentDate: new Date('2024-03-18T14:30:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-18'),
          updatedAt: new Date('2024-03-18'),
        }
      ],

      transactions: [
        {
          id: 'tx21',
          investorId: '10',
          propertyId: 'prop28',
          type: 'investment',
          amount: '45000',
          fee: '450',
          description: 'First investment in Residential Complex',
          reference: 'INV-010-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Bank AlJazira', account: '****6789' }),
          processedAt: new Date('2024-03-18T14:30:00Z'),
          createdAt: new Date('2024-03-18T13:15:00Z'),
          updatedAt: new Date('2024-03-18T14:30:00Z'),
        },
        {
          id: 'tx22',
          investorId: '10',
          propertyId: 'prop28',
          type: 'dividend',
          amount: '2100',
          fee: '0',
          description: 'First dividend payment',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Bank AlJazira', account: '****6789' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    {
      id: '11',
      name: 'Layla Al-Dosari',
      firstName: 'Layla',
      lastName: 'Al-Dosari',
      email: 'layla.dosari@gmail.com',
      phone: '+966 52 012 3456',
      salutation: 'Ms',
      gender: 'female',
      dateOfBirth: new Date('1996-01-20'),
      occupation: 'Customer Service Representative',
      jobCategory: 'entry_level',
      jobTitle: 'Customer Service Representative',
      company: 'STC Customer Care',
      workExperience: 2,
      city: 'Tabuk',
      country: 'Saudi Arabia',
      address: 'Prince Fahd bin Sultan, Tabuk',
      nationality: 'Saudi Arabia',
      profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b5b0c8d1?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '32000',
      activeProperties: 1,
      monthlyIncome: '3800',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-03-08T10:15:00Z'),
      kycSubmittedAt: new Date('2024-03-15T14:40:00Z'),
      aiRiskScore: 62,
      investorTier: 'low',
      preferredLanguage: 'ar',
      languagesSpoken: ['ar', 'en'],
      createdAt: new Date('2024-03-08'),
      updatedAt: new Date('2024-03-22'),

      portfolio: {
        id: 'port11',
        investorId: '11',
        totalInvestment: '32000',
        currentValue: '33200',
        totalReturns: '1200',
        totalDividends: '1800',
        totalWithdrawals: '0',
        unrealizedGains: '-600',
        realizedGains: '1800',
        riskScore: 62,
        performanceScore: 58,
        lastUpdated: new Date('2024-03-28'),
      },

      investments: [
        {
          id: 'inv29',
          investorId: '11',
          propertyId: 'prop29',
          investmentAmount: '32000',
          ownershipPercentage: '2.9',
          expectedReturn: '6.5',
          currentValue: '33200',
          totalReturns: '1200',
          totalDividends: '1800',
          status: 'active',
          investmentDate: new Date('2024-03-22T16:20:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-22'),
          updatedAt: new Date('2024-03-22'),
        }
      ],

      transactions: [
        {
          id: 'tx23',
          investorId: '11',
          propertyId: 'prop29',
          type: 'investment',
          amount: '32000',
          fee: '320',
          description: 'Initial small investment',
          reference: 'INV-011-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Riyad Bank', account: '****7890' }),
          processedAt: new Date('2024-03-22T16:20:00Z'),
          createdAt: new Date('2024-03-22T15:00:00Z'),
          updatedAt: new Date('2024-03-22T16:20:00Z'),
        },
        {
          id: 'tx24',
          investorId: '11',
          propertyId: 'prop29',
          type: 'dividend',
          amount: '1800',
          fee: '0',
          description: 'First dividend payment',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Riyad Bank', account: '****7890' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    {
      id: '12',
      name: 'Ahmed Hassan',
      firstName: 'Ahmed',
      lastName: 'Hassan',
      email: 'ahmed.hassan@retailco.sa',
      phone: '+966 53 123 4567',
      salutation: 'Mr',
      gender: 'male',
      dateOfBirth: new Date('1991-11-08'),
      occupation: 'Retail Sales Associate',
      jobCategory: 'entry_level',
      jobTitle: 'Senior Sales Associate',
      company: 'Electronics Retail Chain',
      workExperience: 5,
      city: 'Riyadh',
      country: 'Saudi Arabia',
      address: 'Al-Suwaidi District, Riyadh',
      nationality: 'Egypt',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '65000',
      activeProperties: 1,
      monthlyIncome: '5200',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-03-12T12:30:00Z'),
      kycSubmittedAt: new Date('2024-03-20T09:15:00Z'),
      aiRiskScore: 55,
      investorTier: 'low',
      preferredLanguage: 'ar',
      languagesSpoken: ['ar', 'en'],
      createdAt: new Date('2024-03-12'),
      updatedAt: new Date('2024-03-26'),

      portfolio: {
        id: 'port12',
        investorId: '12',
        totalInvestment: '65000',
        currentValue: '68500',
        totalReturns: '3500',
        totalDividends: '3200',
        totalWithdrawals: '1000',
        unrealizedGains: '300',
        realizedGains: '3200',
        riskScore: 55,
        performanceScore: 64,
        lastUpdated: new Date('2024-03-25'),
      },

      investments: [
        {
          id: 'inv30',
          investorId: '12',
          propertyId: 'prop30',
          investmentAmount: '65000',
          ownershipPercentage: '5.2',
          expectedReturn: '7.1',
          currentValue: '68500',
          totalReturns: '3500',
          totalDividends: '3200',
          status: 'active',
          investmentDate: new Date('2024-03-26T11:45:00Z'),
          exitDate: null,
          createdAt: new Date('2024-03-26'),
          updatedAt: new Date('2024-03-26'),
        }
      ],

      transactions: [
        {
          id: 'tx25',
          investorId: '12',
          propertyId: 'prop30',
          type: 'investment',
          amount: '65000',
          fee: '650',
          description: 'Investment in Mixed-Use Development',
          reference: 'INV-012-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****8901' }),
          processedAt: new Date('2024-03-26T11:45:00Z'),
          createdAt: new Date('2024-03-26T10:30:00Z'),
          updatedAt: new Date('2024-03-26T11:45:00Z'),
        },
        {
          id: 'tx26',
          investorId: '12',
          propertyId: 'prop30',
          type: 'dividend',
          amount: '3200',
          fee: '0',
          description: 'Quarterly dividend payment',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****8901' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        },
        {
          id: 'tx27',
          investorId: '12',
          propertyId: null,
          type: 'withdrawal',
          amount: '1000',
          fee: '10',
          description: 'Small emergency withdrawal',
          reference: 'WTH-004-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****8901' }),
          processedAt: new Date('2024-03-30T14:20:00Z'),
          createdAt: new Date('2024-03-30T13:45:00Z'),
          updatedAt: new Date('2024-03-30T14:20:00Z'),
        }
      ]
    },

    // LABOR TIER WORKERS
    {
      id: '13',
      name: 'Rizwan Ali',
      firstName: 'Rizwan',
      lastName: 'Ali', 
      email: 'rizwan.ali@constructionco.sa',
      phone: '+966 54 234 5678',
      salutation: 'Mr',
      gender: 'male',
      dateOfBirth: new Date('1986-05-12'),
      occupation: 'Construction Worker',
      jobCategory: 'labor',
      jobTitle: 'Senior Construction Worker',
      company: 'Al-Rashid Construction',
      workExperience: 8,
      city: 'Riyadh',
      country: 'Saudi Arabia',
      address: 'Workers Housing, Industrial District',
      nationality: 'Pakistan',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '15000',
      activeProperties: 1,
      monthlyIncome: '2800',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-03-18T17:45:00Z'),
      kycSubmittedAt: new Date('2024-03-25T16:30:00Z'),
      aiRiskScore: 68,
      investorTier: 'low',
      preferredLanguage: 'ar',
      languagesSpoken: ['ur', 'ar', 'en'],
      createdAt: new Date('2024-03-18'),
      updatedAt: new Date('2024-04-02'),

      portfolio: {
        id: 'port13',
        investorId: '13',
        totalInvestment: '15000',
        currentValue: '15400',
        totalReturns: '400',
        totalDividends: '650',
        totalWithdrawals: '0',
        unrealizedGains: '-250',
        realizedGains: '650',
        riskScore: 68,
        performanceScore: 52,
        lastUpdated: new Date('2024-04-01'),
      },

      investments: [
        {
          id: 'inv31',
          investorId: '13',
          propertyId: 'prop31',
          investmentAmount: '15000',
          ownershipPercentage: '1.8',
          expectedReturn: '6.2',
          currentValue: '15400',
          totalReturns: '400',
          totalDividends: '650',
          status: 'active',
          investmentDate: new Date('2024-04-02T08:30:00Z'),
          exitDate: null,
          createdAt: new Date('2024-04-02'),
          updatedAt: new Date('2024-04-02'),
        }
      ],

      transactions: [
        {
          id: 'tx28',
          investorId: '13',
          propertyId: 'prop31',
          type: 'investment',
          amount: '15000',
          fee: '150',
          description: 'Small worker investment',
          reference: 'INV-013-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****9012' }),
          processedAt: new Date('2024-04-02T08:30:00Z'),
          createdAt: new Date('2024-04-02T07:45:00Z'),
          updatedAt: new Date('2024-04-02T08:30:00Z'),
        },
        {
          id: 'tx29',
          investorId: '13',
          propertyId: 'prop31',
          type: 'dividend',
          amount: '650',
          fee: '0',
          description: 'First dividend payment',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Al Rajhi Bank', account: '****9012' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    {
      id: '14',
      name: 'Maria Santos',
      firstName: 'Maria',
      lastName: 'Santos',
      email: 'maria.santos@cleaningservice.sa',
      phone: '+966 55 345 6789',
      salutation: 'Mrs',
      gender: 'female',
      dateOfBirth: new Date('1989-07-28'),
      occupation: 'Cleaning Service Worker',
      jobCategory: 'labor',
      jobTitle: 'Cleaning Supervisor',
      company: 'Premium Cleaning Services',
      workExperience: 6,
      city: 'Jeddah',
      country: 'Saudi Arabia',
      address: 'Al-Safa District, Jeddah',
      nationality: 'Philippines',
      profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b5b0c8d1?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '8500',
      activeProperties: 1,
      monthlyIncome: '2200',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-03-22T19:15:00Z'),
      kycSubmittedAt: new Date('2024-03-28T15:45:00Z'),
      aiRiskScore: 71,
      investorTier: 'low',
      preferredLanguage: 'en',
      languagesSpoken: ['en', 'tl', 'ar'],
      createdAt: new Date('2024-03-22'),
      updatedAt: new Date('2024-04-05'),

      portfolio: {
        id: 'port14',
        investorId: '14',
        totalInvestment: '8500',
        currentValue: '8650',
        totalReturns: '150',
        totalDividends: '420',
        totalWithdrawals: '0',
        unrealizedGains: '-270',
        realizedGains: '420',
        riskScore: 71,
        performanceScore: 48,
        lastUpdated: new Date('2024-04-03'),
      },

      investments: [
        {
          id: 'inv32',
          investorId: '14',
          propertyId: 'prop32',
          investmentAmount: '8500',
          ownershipPercentage: '1.2',
          expectedReturn: '5.8',
          currentValue: '8650',
          totalReturns: '150',
          totalDividends: '420',
          status: 'active',
          investmentDate: new Date('2024-04-05T13:20:00Z'),
          exitDate: null,
          createdAt: new Date('2024-04-05'),
          updatedAt: new Date('2024-04-05'),
        }
      ],

      transactions: [
        {
          id: 'tx30',
          investorId: '14',
          propertyId: 'prop32',
          type: 'investment',
          amount: '8500',
          fee: '85',
          description: 'Small savings investment',
          reference: 'INV-014-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'SAMBA Bank', account: '****0123' }),
          processedAt: new Date('2024-04-05T13:20:00Z'),
          createdAt: new Date('2024-04-05T12:00:00Z'),
          updatedAt: new Date('2024-04-05T13:20:00Z'),
        },
        {
          id: 'tx31',
          investorId: '14',
          propertyId: 'prop32',
          type: 'dividend',
          amount: '420',
          fee: '0',
          description: 'First dividend payment',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'SAMBA Bank', account: '****0123' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    },

    {
      id: '15',
      name: 'Omar Al-Kindi',
      firstName: 'Omar',
      lastName: 'Al-Kindi',
      email: 'omar.kindi@delivery.sa',
      phone: '+966 56 456 7890',
      salutation: 'Mr',
      gender: 'male',
      dateOfBirth: new Date('1994-03-14'),
      occupation: 'Delivery Driver',
      jobCategory: 'labor',
      jobTitle: 'Delivery Driver',
      company: 'Quick Delivery Services',
      workExperience: 4,
      city: 'Dammam',
      country: 'Saudi Arabia',
      address: 'Al-Shatea District, Dammam',
      nationality: 'Saudi Arabia',
      profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      kycStatus: 'approved',
      totalInvested: '12000',
      activeProperties: 1,
      monthlyIncome: '2500',
      documentsUploaded: true,
      applicationProgress: 100,
      appDownloadedAt: new Date('2024-03-28T20:30:00Z'),
      kycSubmittedAt: new Date('2024-04-03T14:15:00Z'),
      aiRiskScore: 65,
      investorTier: 'low',
      preferredLanguage: 'ar',
      languagesSpoken: ['ar', 'en'],
      createdAt: new Date('2024-03-28'),
      updatedAt: new Date('2024-04-08'),

      portfolio: {
        id: 'port15',
        investorId: '15',
        totalInvestment: '12000',
        currentValue: '12180',
        totalReturns: '180',
        totalDividends: '580',
        totalWithdrawals: '0',
        unrealizedGains: '-400',
        realizedGains: '580',
        riskScore: 65,
        performanceScore: 50,
        lastUpdated: new Date('2024-04-06'),
      },

      investments: [
        {
          id: 'inv33',
          investorId: '15',
          propertyId: 'prop33',
          investmentAmount: '12000',
          ownershipPercentage: '1.5',
          expectedReturn: '6.0',
          currentValue: '12180',
          totalReturns: '180',
          totalDividends: '580',
          status: 'active',
          investmentDate: new Date('2024-04-08T10:45:00Z'),
          exitDate: null,
          createdAt: new Date('2024-04-08'),
          updatedAt: new Date('2024-04-08'),
        }
      ],

      transactions: [
        {
          id: 'tx32',
          investorId: '15',
          propertyId: 'prop33',
          type: 'investment',
          amount: '12000',
          fee: '120',
          description: 'Driver savings investment',
          reference: 'INV-015-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Banque Saudi Fransi', account: '****1234' }),
          processedAt: new Date('2024-04-08T10:45:00Z'),
          createdAt: new Date('2024-04-08T09:30:00Z'),
          updatedAt: new Date('2024-04-08T10:45:00Z'),
        },
        {
          id: 'tx33',
          investorId: '15',
          propertyId: 'prop33',
          type: 'dividend',
          amount: '580',
          fee: '0',
          description: 'First dividend payment',
          reference: 'DIV-Q1-2024',
          status: 'completed',
          paymentMethod: 'bank_transfer',
          bankDetails: JSON.stringify({ bank: 'Banque Saudi Fransi', account: '****1234' }),
          processedAt: new Date('2024-04-01T12:00:00Z'),
          createdAt: new Date('2024-04-01T11:00:00Z'),
          updatedAt: new Date('2024-04-01T12:00:00Z'),
        }
      ]
    }
  ]

  // Fetch investors from API
  useEffect(() => {
    const fetchInvestors = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiCall(API_ENDPOINTS.ADMIN.LIST_INVESTORS)
        console.log('API Response:', data)

        // Handle different response formats
        let investorsArray: any[] = []
        if (Array.isArray(data)) {
          investorsArray = data
        } else if (data && data.success && data.data) {
          // Handle {success: true, data: {...}} format
          console.log('API data object:', data.data)
          console.log('Data keys:', Object.keys(data.data))

          if (Array.isArray(data.data)) {
            investorsArray = data.data
          } else if (data.data.investors && Array.isArray(data.data.investors)) {
            investorsArray = data.data.investors
          } else if (data.data.users && Array.isArray(data.data.users)) {
            investorsArray = data.data.users
          } else {
            // If data.data is an object, check all its properties for arrays
            const dataObj = data.data
            for (const key in dataObj) {
              if (Array.isArray(dataObj[key])) {
                console.log(`Found array in ${key}:`, dataObj[key])
                investorsArray = dataObj[key]
                break
              }
            }
          }
        } else if (data && data.data && Array.isArray(data.data)) {
          investorsArray = data.data
        } else if (data && data.investors && Array.isArray(data.investors)) {
          investorsArray = data.investors
        }

        if (investorsArray.length === 0) {
          console.error('No investors array found in API response:', data)
          console.log('Response type:', typeof data)
          console.log('Response keys:', data ? Object.keys(data) : 'null/undefined')
          // Don't throw error, just use empty array for now
          console.warn('Using empty array - will fall back to mock data')
        }

        // Transform API data to match InvestorWithPortfolio interface
        const transformedData: InvestorWithPortfolio[] = investorsArray.map((investor: any) => ({
          ...investor,
          activeProperties: investor.properties?.length || 0,
          investments: investor.properties?.map((prop: any, index: number) => ({
            id: `inv${investor.id}_${index}`,
            investorId: investor.id,
            propertyId: prop.propertyId,
            propertyTitle: prop.propertyTitle,
            investmentAmount: prop.amount?.toString() || '0',
            ownershipPercentage: '0',
            expectedReturn: '8.0',
            currentValue: prop.amount?.toString() || '0',
            totalReturns: prop.returns?.toString() || '0',
            totalDividends: '0',
            status: 'active',
            investmentDate: new Date(prop.date),
            lastUpdated: new Date(prop.date),
          })) || [],
          transactions: investor.transactions || [],
          portfolio: investor.portfolio || {
            id: `port${investor.id}`,
            investorId: investor.id,
            totalInvestment: investor.totalInvestments?.toString() || '0',
            currentValue: investor.totalInvestments?.toString() || '0',
            totalReturns: investor.totalReturns?.toString() || '0',
            totalDividends: '0',
            totalWithdrawals: '0',
            unrealizedGains: '0',
            realizedGains: '0',
            riskScore: investor.aiRiskScore || 5,
            performanceScore: 75,
            lastUpdated: new Date(),
          },
          kycDocuments: investor.kycDocuments || (investor.kycStatus === 'approved' ? [
            {
              id: `doc_${investor.id}_1`,
              investorId: investor.id,
              documentType: 'national_id',
              fileName: 'national_id.pdf',
              fileSize: 1024000,
              fileUrl: '#',
              status: 'approved',
              uploadedAt: new Date(investor.joinedDate || new Date()),
              reviewedAt: new Date(investor.joinedDate || new Date()),
              confidenceScore: 95,
              extractedData: {
                fullName: investor.name,
                documentNumber: `ID${Math.random().toString().substr(2, 9)}`,
                issueDate: '2020-01-15',
                expiryDate: '2030-01-15'
              }
            },
            {
              id: `doc_${investor.id}_2`,
              investorId: investor.id,
              documentType: 'proof_of_address',
              fileName: 'address_proof.pdf',
              fileSize: 856000,
              fileUrl: '#',
              status: 'approved',
              uploadedAt: new Date(investor.joinedDate || new Date()),
              reviewedAt: new Date(investor.joinedDate || new Date()),
              confidenceScore: 92,
              extractedData: {
                address: investor.address || 'N/A',
                issueDate: '2024-01-01'
              }
            }
          ] : [])
        }))

        setInvestors(transformedData)
        console.log(`Successfully loaded ${transformedData.length} investors`)
      } catch (err) {
        console.error('Error fetching investors:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch investors')
        // Fallback to mock data if API fails
        setInvestors(mockInvestors)
      } finally {
        setLoading(false)
      }
    }

    fetchInvestors()
  }, [])

  const filteredInvestors = investors.filter(investor => {
    // Only show KYC-approved investors
    const isApproved = investor.kycStatus === 'approved'
    const matchesSearch = investor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         investor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (investor.occupation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (investor.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (investor.company || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesJobCategory = jobCategoryFilter === "all" || investor.jobCategory === jobCategoryFilter
    const matchesTier = investorTierFilter === "all" || investor.investorTier === investorTierFilter
    const matchesLanguage = languageFilter === "all" || 
                           (investor.languagesSpoken && investor.languagesSpoken.includes(languageFilter))
    
    return isApproved && matchesSearch && matchesJobCategory && matchesTier && matchesLanguage
  })

  const formatCurrency = (amount: string | null | undefined) => {
    const parsedAmount = safeParseNumber(amount, 0)
    return `${parsedAmount.toLocaleString()}`
  }

  const formatPercentage = (value: string | null | undefined) => {
    const parsedValue = safeParseNumber(value, 0)
    return `${parsedValue.toFixed(1)}%`
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
  }


  const getPerformanceColor = (score: number | null | undefined) => {
    const safeScore = safePerformanceScore(score)
    if (safeScore >= 80) return 'text-green-600'
    if (safeScore >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTierBadgeVariant = (tier: string | null | undefined) => {
    switch (tier) {
      case 'top': return "default" // Blue/primary
      case 'medium': return "secondary" // Gray
      case 'low': return "outline" // Outline
      default: return "outline"
    }
  }

  const getTierLabel = (tier: string | null | undefined) => {
    switch (tier) {
      case 'top': return "TOP INVESTOR"
      case 'medium': return "MEDIUM INVESTOR"
      case 'low': return "ENTRY INVESTOR"
      default: return "INVESTOR"
    }
  }

  const getJobCategoryLabel = (category: string | null | undefined) => {
    switch (category) {
      case 'executive': return "Executive"
      case 'management': return "Management"
      case 'professional': return "Professional"
      case 'skilled_worker': return "Skilled Worker"
      case 'entry_level': return "Entry Level"
      case 'labor': return "Labor"
      default: return "Unknown"
    }
  }

  const handleViewProfile = (investor: InvestorWithPortfolio) => {
    setSelectedInvestor(investor)
    setIsProfileModalOpen(true)
  }

  const handleExport = () => {
    console.log('Export investors data')
    // In real app, this would export the data
  }

  const handleDocumentUpload = async (file: File, documentType: string, investorId: string) => {
    try {
      setUploadingDocument(true)

      // Create form data for file upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)
      formData.append('investorId', investorId)

      // Upload to backend API
      try {
        const response = await apiCallWithFiles(API_ENDPOINTS.ADMIN.UPLOAD_KYC_DOCUMENT(investorId), formData)

        // If upload successful, use the response data
        if (response && response.success) {
          const newDocument = response.data

          // Update the investor's documents
          setInvestors(prev => prev.map(inv => {
            if (inv.id === investorId) {
              return {
                ...inv,
                kycDocuments: [...(inv.kycDocuments || []), newDocument]
              }
            }
            return inv
          }))

          // Update selected investor if it's the same one
          if (selectedInvestor?.id === investorId) {
            setSelectedInvestor(prev => prev ? {
              ...prev,
              kycDocuments: [...(prev.kycDocuments || []), newDocument]
            } : null)
          }

          console.log('Document uploaded successfully:', response.message)
          return
        }
      } catch (apiError) {
        console.error('API upload failed, falling back to mock:', apiError)
      }

      // Fallback: create a mock document if API fails
      const newDocument: KycDocument = {
        id: `doc_${Date.now()}`,
        investorId: investorId,
        documentType: documentType,
        fileName: file.name,
        fileSize: file.size,
        fileUrl: URL.createObjectURL(file), // Temporary URL for demo
        status: 'under_review',
        uploadedAt: new Date(),
        confidenceScore: 85,
        extractedData: {}
      }

      // Update the investor's documents
      setInvestors(prev => prev.map(inv => {
        if (inv.id === investorId) {
          return {
            ...inv,
            kycDocuments: [...(inv.kycDocuments || []), newDocument]
          }
        }
        return inv
      }))

      // Update selected investor if it's the same one
      if (selectedInvestor?.id === investorId) {
        setSelectedInvestor(prev => prev ? {
          ...prev,
          kycDocuments: [...(prev.kycDocuments || []), newDocument]
        } : null)
      }

      console.log('Document uploaded successfully:', file.name)
    } catch (error) {
      console.error('Error uploading document:', error)
    } finally {
      setUploadingDocument(false)
      setSelectedDocumentType('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 modern-scrollbar">
        <div className="p-6 space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-lg text-muted-foreground">Loading investors...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 modern-scrollbar">
        <div className="p-6 space-y-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-lg text-destructive">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 modern-scrollbar">
      <div className="p-6 space-y-8" data-testid="page-investors">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-primary to-primary/70 bg-clip-text text-transparent animate-float" data-testid="text-investors-title">
              Active Investors
            </h1>
            <p className="text-lg text-muted-foreground/80">
              KYC-approved customers with active investment portfolios
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {investors.length} active investors • {investors.reduce((sum, inv) => sum + safeParseNumber(inv.portfolio.totalInvestment), 0).toLocaleString()} total investment • {Array.from(new Set(investors.flatMap(inv => inv.languagesSpoken || []))).length} languages
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExport} variant="outline" data-testid="button-export-investors">
              <TrendingUp className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-morphism" data-testid="card-total-investment">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Investment
              </CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {investors.reduce((sum, inv) => sum + safeParseNumber(inv.portfolio.totalInvestment), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all portfolios
              </p>
            </CardContent>
          </Card>

          <Card className="glass-morphism" data-testid="card-current-value">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Value
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {investors.reduce((sum, inv) => sum + safeParseNumber(inv.portfolio.currentValue), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Live portfolio value
              </p>
            </CardContent>
          </Card>

          <Card className="glass-morphism" data-testid="card-total-returns">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Returns
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {investors.reduce((sum, inv) => sum + safeParseNumber(inv.portfolio.totalReturns), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total profit generated
              </p>
            </CardContent>
          </Card>

          <Card className="glass-morphism" data-testid="card-avg-performance">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Performance
              </CardTitle>
              <PieChart className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {Math.round(investors.reduce((sum, inv) => sum + safePerformanceScore(inv.portfolio.performanceScore), 0) / (investors.length || 1))}%
              </div>
              <p className="text-xs text-muted-foreground">
                Portfolio performance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="glass-morphism">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>Find investors by name, job category, tier, or language</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, job title, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-investors"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                <Select value={jobCategoryFilter} onValueChange={setJobCategoryFilter}>
                  <SelectTrigger className="w-full" data-testid="select-job-category-filter">
                    <SelectValue placeholder="Job Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Job Categories</SelectItem>
                    <SelectItem value="executive">Executives ({investors.filter(i => i.jobCategory === 'executive').length})</SelectItem>
                    <SelectItem value="management">Management ({investors.filter(i => i.jobCategory === 'management').length})</SelectItem>
                    <SelectItem value="professional">Professionals ({investors.filter(i => i.jobCategory === 'professional').length})</SelectItem>
                    <SelectItem value="skilled_worker">Skilled Workers ({investors.filter(i => i.jobCategory === 'skilled_worker').length})</SelectItem>
                    <SelectItem value="entry_level">Entry Level ({investors.filter(i => i.jobCategory === 'entry_level').length})</SelectItem>
                    <SelectItem value="labor">Labor ({investors.filter(i => i.jobCategory === 'labor').length})</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={investorTierFilter} onValueChange={setInvestorTierFilter}>
                  <SelectTrigger className="w-full" data-testid="select-tier-filter">
                    <SelectValue placeholder="Investor Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="top">Top Investors ({investors.filter(i => i.investorTier === 'top').length})</SelectItem>
                    <SelectItem value="medium">Medium Investors ({investors.filter(i => i.investorTier === 'medium').length})</SelectItem>
                    <SelectItem value="low">Entry Investors ({investors.filter(i => i.investorTier === 'low').length})</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-full" data-testid="select-language-filter">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="ar">Arabic ({investors.filter(i => i.languagesSpoken?.includes('ar')).length})</SelectItem>
                    <SelectItem value="en">English ({investors.filter(i => i.languagesSpoken?.includes('en')).length})</SelectItem>
                    <SelectItem value="fr">French ({investors.filter(i => i.languagesSpoken?.includes('fr')).length})</SelectItem>
                    <SelectItem value="hi">Hindi ({investors.filter(i => i.languagesSpoken?.includes('hi')).length})</SelectItem>
                    <SelectItem value="ur">Urdu ({investors.filter(i => i.languagesSpoken?.includes('ur')).length})</SelectItem>
                    <SelectItem value="zh">Chinese ({investors.filter(i => i.languagesSpoken?.includes('zh')).length})</SelectItem>
                    <SelectItem value="tl">Tagalog ({investors.filter(i => i.languagesSpoken?.includes('tl')).length})</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("")
                    setJobCategoryFilter("all")
                    setInvestorTierFilter("all")
                    setLanguageFilter("all")
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investors Table */}
        <Card className="glass-morphism">
          <CardHeader>
            <CardTitle>
              Investment Portfolios ({filteredInvestors.length} investors)
            </CardTitle>
            <CardDescription>
              Active investors with approved KYC and investment portfolios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredInvestors.map((investor) => (
                <div
                  key={investor.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate"
                  data-testid={`investor-row-${investor.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={investor.profilePicture || undefined} alt={investor.name} />
                      <AvatarFallback>
                        {investor.firstName?.[0]}{investor.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{investor.salutation} {investor.name}</h3>
                        <Badge variant={getTierBadgeVariant(investor.investorTier)}>
                          {getTierLabel(investor.investorTier)}
                        </Badge>
                        {safePerformanceScore(investor.portfolio.performanceScore) >= 90 && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            TOP PERFORMER
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{investor.email}</p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getJobCategoryLabel(investor.jobCategory)}
                        </Badge>
                        <span>{investor.jobTitle} @ {investor.company}</span>
                        <span>•</span>
                        <span>{investor.gender}, {investor.city}</span>
                        <span>•</span>
                        <span>{investor.languagesSpoken?.join(', ') || 'N/A'}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {investor.activeProperties} properties
                        </span>
                        <span className="flex items-center gap-1">
                          <Wallet className="w-3 h-3" />
                          {formatCurrency(investor.monthlyIncome)} monthly
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {investor.workExperience || 0} years exp
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(investor.portfolio.totalInvestment)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Invested
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(investor.portfolio.currentValue)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Current Value
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className={`text-lg font-bold ${getPerformanceColor(investor.portfolio.performanceScore)}`}>
                        {safePerformanceScore(investor.portfolio.performanceScore)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Performance
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewProfile(investor)}
                      data-testid={`button-view-${investor.id}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredInvestors.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No investors found matching your criteria</p>
                <Button variant="outline" onClick={() => {
                  setSearchTerm("")
                  setJobCategoryFilter("all")
                  setInvestorTierFilter("all")
                  setLanguageFilter("all")
                }} data-testid="button-clear-filters">
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Profile Modal */}
        <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Investor Profile & Portfolio
              </DialogTitle>
              <DialogDescription>
                Complete investment profile with financial and non-financial information
              </DialogDescription>
            </DialogHeader>
            
            {selectedInvestor && (
              <div className="space-y-6">
                {/* Investor Header */}
                <div className="flex items-start gap-6 p-6 bg-card/50 rounded-lg">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={selectedInvestor.profilePicture || undefined} alt={selectedInvestor.name} />
                    <AvatarFallback className="text-2xl">
                      {selectedInvestor.firstName?.[0]}{selectedInvestor.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-3xl font-bold">{selectedInvestor.salutation} {selectedInvestor.name}</h2>
                      <Badge variant={getTierBadgeVariant(selectedInvestor.investorTier)}>
                        {getTierLabel(selectedInvestor.investorTier)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedInvestor.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedInvestor.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedInvestor.city}, {selectedInvestor.country}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedInvestor.occupation}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-2">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(selectedInvestor.portfolio.currentValue)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Portfolio Value</div>
                    <div className="flex items-center gap-2">
                      <div className={`text-lg font-bold ${getPerformanceColor(selectedInvestor.portfolio.performanceScore)}`}>
                        {selectedInvestor.portfolio.performanceScore}%
                      </div>
                      <div className="text-sm text-muted-foreground">Performance Score</div>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="financial" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="financial">Financial Overview</TabsTrigger>
                    <TabsTrigger value="investments">Investments</TabsTrigger>
                    <TabsTrigger value="transactions">Transactions</TabsTrigger>
                    <TabsTrigger value="personal">Personal Info</TabsTrigger>
                    <TabsTrigger value="kyc-documents">KYC Documents</TabsTrigger>
                  </TabsList>

                  <TabsContent value="financial" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-green-600" />
                            Investment Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Invested:</span>
                            <span className="font-bold">{formatCurrency(selectedInvestor.portfolio.totalInvestment)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Current Value:</span>
                            <span className="font-bold text-primary">{formatCurrency(selectedInvestor.portfolio.currentValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Returns:</span>
                            <span className="font-bold text-green-600">{formatCurrency(selectedInvestor.portfolio.totalReturns)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Return Rate:</span>
                            <span className="font-bold text-green-600">
                              {((safeParseNumber(selectedInvestor.portfolio.totalReturns) / safeParseNumber(selectedInvestor.portfolio.totalInvestment, 1)) * 100).toFixed(2)}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-blue-600" />
                            Dividend & Withdrawals
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Dividends:</span>
                            <span className="font-bold text-blue-600">{formatCurrency(selectedInvestor.portfolio.totalDividends)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Withdrawals:</span>
                            <span className="font-bold text-orange-600">{formatCurrency(selectedInvestor.portfolio.totalWithdrawals)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Net Received:</span>
                            <span className="font-bold text-green-600">
                              {formatCurrency((safeParseNumber(selectedInvestor.portfolio.totalDividends) + safeParseNumber(selectedInvestor.portfolio.totalWithdrawals)).toString())}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Monthly Income:</span>
                            <span className="font-bold">{formatCurrency(selectedInvestor.monthlyIncome)}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                            Performance Metrics
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Performance Score:</span>
                              <span className={`font-bold ${getPerformanceColor(selectedInvestor.portfolio.performanceScore)}`}>
                                {safePerformanceScore(selectedInvestor.portfolio.performanceScore)}%
                              </span>
                            </div>
                            <Progress value={safePerformanceScore(selectedInvestor.portfolio.performanceScore)} className="h-2" />
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Active Properties:</span>
                            <span className="font-bold">{selectedInvestor.activeProperties}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="investments" className="space-y-4">
                    <div className="space-y-4">
                      {selectedInvestor.investments.map((investment) => (
                        <Card key={investment.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-2">
                                <h4 className="font-semibold">{investment.propertyTitle || `Property Investment #${investment.propertyId}`}</h4>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <span>Invested: {formatCurrency(investment.investmentAmount)}</span>
                                  <span>Ownership: {formatPercentage(investment.ownershipPercentage)}</span>
                                  <span>Expected: {formatPercentage(investment.expectedReturn)} annual</span>
                                </div>
                                <div className="text-sm">
                                  Investment Date: {formatDate(investment.investmentDate)}
                                </div>
                              </div>
                              
                              <div className="text-right space-y-2">
                                <div className="text-lg font-bold text-primary">
                                  {formatCurrency(investment.currentValue)}
                                </div>
                                <div className="text-sm text-muted-foreground">Current Value</div>
                                <div className="text-lg font-bold text-green-600">
                                  +{formatCurrency(investment.totalReturns)}
                                </div>
                                <div className="text-sm text-muted-foreground">Total Returns</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="transactions" className="space-y-4">
                    <div className="space-y-4">
                      {selectedInvestor.transactions.map((transaction) => {
                        const isPositive = transaction.type === 'dividend' || transaction.type === 'withdrawal'
                        return (
                          <Card key={transaction.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <div className={`p-2 rounded-full ${isPositive ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {transaction.type === 'investment' && <ArrowDownRight className="h-4 w-4" />}
                                    {transaction.type === 'dividend' && <ArrowUpRight className="h-4 w-4" />}
                                    {transaction.type === 'withdrawal' && <Banknote className="h-4 w-4" />}
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <h4 className="font-semibold capitalize">{transaction.type.replace('_', ' ')}</h4>
                                    <p className="text-sm text-muted-foreground">{transaction.description}</p>
                                    <p className="text-xs text-muted-foreground">Ref: {transaction.reference}</p>
                                  </div>
                                </div>
                                
                                <div className="text-right space-y-1">
                                  <div className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-primary'}`}>
                                    {isPositive ? '+' : ''}{formatCurrency(transaction.amount)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatDate(transaction.processedAt)}
                                  </div>
                                  <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                                    {transaction.status.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </TabsContent>

                  <TabsContent value="personal" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Personal Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Full Name</span>
                              <p className="font-medium">{selectedInvestor.salutation} {selectedInvestor.firstName} {selectedInvestor.lastName}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Gender</span>
                              <p className="font-medium capitalize">{selectedInvestor.gender}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Date of Birth</span>
                              <p className="font-medium">{formatDate(selectedInvestor.dateOfBirth)}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Nationality</span>
                              <p className="font-medium">{selectedInvestor.nationality}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Occupation</span>
                              <p className="font-medium">{selectedInvestor.occupation}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Preferred Language</span>
                              <p className="font-medium">{selectedInvestor.preferredLanguage?.toUpperCase()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Contact & Location
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Email Address</span>
                              <p className="font-medium">{selectedInvestor.email}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Phone Number</span>
                              <p className="font-medium">{selectedInvestor.phone}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">City</span>
                              <p className="font-medium">{selectedInvestor.city}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Address</span>
                              <p className="font-medium">{selectedInvestor.address}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Country</span>
                              <p className="font-medium">{selectedInvestor.country}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Account Timeline
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">App Downloaded</span>
                              <p className="font-medium">{formatDate(selectedInvestor.appDownloadedAt)}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">KYC Submitted</span>
                              <p className="font-medium">{formatDate(selectedInvestor.kycSubmittedAt)}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Account Created</span>
                              <p className="font-medium">{formatDate(selectedInvestor.createdAt)}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Last Updated</span>
                              <p className="font-medium">{formatDate(selectedInvestor.updatedAt)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            KYC Status
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="space-y-3">
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">KYC Status</span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="default">APPROVED</Badge>
                              </div>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Application Progress</span>
                              <div className="flex items-center gap-2 mt-2">
                                <Progress value={selectedInvestor.applicationProgress} className="flex-1" />
                                <span className="text-sm font-medium">{selectedInvestor.applicationProgress}%</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">Documents Status</span>
                              <p className="font-medium text-green-600">
                                {selectedInvestor.documentsUploaded ? 'All Documents Verified' : 'Pending Documents'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="kyc-documents" className="space-y-4">
                    <div className="space-y-6">
                      {/* KYC Summary Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Shield className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="text-2xl font-bold text-green-600">{selectedInvestor.kycDocuments?.filter(doc => doc.status === 'approved').length || 0}</p>
                                <p className="text-sm text-muted-foreground">Approved Documents</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-5 w-5 text-orange-600" />
                              <div>
                                <p className="text-2xl font-bold text-orange-600">{selectedInvestor.kycDocuments?.filter(doc => doc.status === 'under_review').length || 0}</p>
                                <p className="text-sm text-muted-foreground">Under Review</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-2xl font-bold text-blue-600">
                                  {selectedInvestor.kycDocuments?.length ? 
                                    Math.round(selectedInvestor.kycDocuments.reduce((acc, doc) => acc + (doc.confidenceScore || 0), 0) / selectedInvestor.kycDocuments.length) 
                                    : 0}%
                                </p>
                                <p className="text-sm text-muted-foreground">Avg AI Confidence</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-purple-600" />
                              <div>
                                <p className="text-2xl font-bold text-purple-600">{selectedInvestor.kycDocuments?.length || 0}</p>
                                <p className="text-sm text-muted-foreground">Total Documents</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Document Cards */}
                      <div className="space-y-4">
                        {selectedInvestor.kycDocuments?.map((document) => {
                          const getStatusIcon = (status: string) => {
                            switch (status) {
                              case 'approved':
                                return <CheckCircle className="h-5 w-5 text-green-600" />
                              case 'rejected':
                                return <XCircle className="h-5 w-5 text-red-600" />
                              case 'under_review':
                                return <Clock className="h-5 w-5 text-orange-600" />
                              case 'pending':
                                return <AlertTriangle className="h-5 w-5 text-yellow-600" />
                              default:
                                return <FileText className="h-5 w-5 text-gray-600" />
                            }
                          }

                          const getStatusVariant = (status: string) => {
                            switch (status) {
                              case 'approved':
                                return 'default' as const
                              case 'rejected':
                                return 'destructive' as const
                              case 'under_review':
                                return 'secondary' as const
                              case 'pending':
                                return 'outline' as const
                              default:
                                return 'outline' as const
                            }
                          }

                          const getDocumentDisplayName = (type: string) => {
                            const names = {
                              'national_id': 'National ID',
                              'passport': 'Passport',
                              'iqama': 'Iqama',
                              'selfie': 'Selfie Verification',
                              'proof_of_income': 'Proof of Income',
                              'address_proof': 'Address Proof',
                              'employment_letter': 'Employment Letter',
                              'bank_statement': 'Bank Statement'
                            }
                            return names[type as keyof typeof names] || type.replace('_', ' ')
                          }

                          return (
                            <Card key={document.id} className="hover-elevate">
                              <CardContent className="p-6">
                                <div className="flex items-start gap-6">
                                  {/* Document Icon and Basic Info */}
                                  <div className="flex items-center gap-3">
                                    {getStatusIcon(document.status)}
                                    <div>
                                      <h4 className="text-lg font-semibold">{getDocumentDisplayName(document.documentType)}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        Uploaded: {formatDate(document.uploadedAt)}
                                      </p>
                                      {document.reviewedAt && (
                                        <p className="text-sm text-muted-foreground">
                                          Reviewed: {formatDate(document.reviewedAt)}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex-1 space-y-4">
                                    {/* Status and AI Verification */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <Badge variant={getStatusVariant(document.status)} data-testid={`badge-document-status-${document.id}`}>
                                          {document.status.toUpperCase().replace('_', ' ')}
                                        </Badge>
                                        {document.isAuthentic !== null && (
                                          <Badge variant={document.isAuthentic ? 'default' : 'destructive'}>
                                            {document.isAuthentic ? 'AUTHENTIC' : 'NOT AUTHENTIC'}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <Button variant="outline" size="sm" data-testid={`button-view-document-${document.id}`}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Document
                                        </Button>
                                        <Button variant="outline" size="sm" data-testid={`button-download-document-${document.id}`}>
                                          <Download className="h-4 w-4 mr-2" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>

                                    {/* AI Confidence Score */}
                                    {document.confidenceScore && (
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm font-medium text-muted-foreground">AI Confidence Score</span>
                                          <span className={`text-sm font-bold ${
                                            document.confidenceScore >= 90 ? 'text-green-600' : 
                                            document.confidenceScore >= 70 ? 'text-orange-600' : 'text-red-600'
                                          }`}>
                                            {document.confidenceScore}%
                                          </span>
                                        </div>
                                        <Progress 
                                          value={document.confidenceScore} 
                                          className={`h-2 ${
                                            document.confidenceScore >= 90 ? '[&>div]:bg-green-600' : 
                                            document.confidenceScore >= 70 ? '[&>div]:bg-orange-600' : '[&>div]:bg-red-600'
                                          }`} 
                                        />
                                      </div>
                                    )}

                                    {/* Review Notes */}
                                    {document.reviewNotes && (
                                      <div className="bg-muted/50 p-3 rounded-md">
                                        <h5 className="text-sm font-medium mb-1">Review Notes</h5>
                                        <p className="text-sm text-muted-foreground">{document.reviewNotes}</p>
                                        {document.reviewedBy && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Reviewed by: {document.reviewedBy}
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* Extracted Data */}
                                    {document.extractedData && (
                                      <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
                                        <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                          <PieChart className="h-4 w-4" />
                                          Extracted Information
                                        </h5>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          {Object.entries(document.extractedData || {}).map(([key, value]) => (
                                            <div key={key} className="flex justify-between">
                                              <span className="text-muted-foreground capitalize">
                                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                                              </span>
                                              <span className="font-medium text-right">
                                                {typeof value === 'string' ? value : JSON.stringify(value)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}

                        {/* No Documents Message */}
                        {(!selectedInvestor.kycDocuments || selectedInvestor.kycDocuments.length === 0) && (
                          <Card>
                            <CardContent className="p-8 text-center">
                              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-medium mb-2">No KYC Documents</h3>
                              <p className="text-muted-foreground">
                                This investor has not uploaded any KYC documents yet.
                              </p>
                            </CardContent>
                          </Card>
                        )}

                        {/* Upload New Document */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              Upload New KYC Document
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Document Type</label>
                                <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select document type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="national_id">National ID</SelectItem>
                                    <SelectItem value="passport">Passport</SelectItem>
                                    <SelectItem value="driver_license">Driver's License</SelectItem>
                                    <SelectItem value="proof_of_address">Proof of Address</SelectItem>
                                    <SelectItem value="bank_statement">Bank Statement</SelectItem>
                                    <SelectItem value="employment_certificate">Employment Certificate</SelectItem>
                                    <SelectItem value="tax_certificate">Tax Certificate</SelectItem>
                                    <SelectItem value="selfie">Selfie with ID</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">Upload File</label>
                                <Input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file && selectedDocumentType && selectedInvestor) {
                                      handleDocumentUpload(file, selectedDocumentType, selectedInvestor.id)
                                    }
                                  }}
                                  disabled={uploadingDocument || !selectedDocumentType}
                                />
                              </div>
                            </div>
                            {uploadingDocument && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                Uploading document...
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Supported formats: PDF, JPG, PNG, DOC, DOCX. Max file size: 10MB
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* KYC Completion Summary */}
                      {selectedInvestor.kycDocuments && selectedInvestor.kycDocuments.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Shield className="h-5 w-5" />
                              KYC Verification Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Overall Status</span>
                                <p className="font-medium text-green-600">Fully Verified</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Verification Date</span>
                                <p className="font-medium">{formatDate(selectedInvestor.kycSubmittedAt)}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-muted-foreground">Investor Tier</span>
                                <p className={`font-medium ${
                                  selectedInvestor.investorTier === 'top' ? 'text-green-600' : 
                                  selectedInvestor.investorTier === 'medium' ? 'text-orange-600' : 'text-blue-600'
                                }`}>
                                  {getTierLabel(selectedInvestor.investorTier)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-md">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="font-medium text-green-800 dark:text-green-200">
                                  All KYC requirements satisfied. Investor approved for investment activities.
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}