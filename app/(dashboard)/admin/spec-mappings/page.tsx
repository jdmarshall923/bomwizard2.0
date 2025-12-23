'use client';

import { useState } from 'react';
import { useSpecMappings } from '@/lib/hooks/useSpecMapping';
import { SpecGroupMapping, BIKE_TYPES, SPEC_CATEGORIES } from '@/types/spec';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfidenceIndicator, ConfidenceBar } from '@/components/spec/ConfidenceIndicator';
import { 
  Layers, 
  Search, 
  Download,
  Upload,
  RefreshCw,
  Edit,
  Copy,
  AlertTriangle,
  Bike,
  Settings2
} from 'lucide-react';

export default function SpecMappingsAdminPage() {
  const [bikeTypeFilter, setBikeTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    mappings, 
    loading, 
    error, 
    lowConfidence, 
    stats,
    refetch 
  } = useSpecMappings({
    bikeType: bikeTypeFilter !== 'all' ? bikeTypeFilter : undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
  });
  
  // Filter mappings by search query
  const filteredMappings = mappings.filter(m => 
    searchQuery === '' ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.optionValue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.groupCodes.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers size={24} />
            Spec Group Mappings
          </h1>
          <p className="text-muted-foreground">
            Manage the learning database for spec-to-group mappings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw size={16} className="mr-1.5" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-1.5" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload size={16} className="mr-1.5" />
            Import
          </Button>
        </div>
      </div>
      
      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Mappings</p>
              <p className="text-2xl font-bold">{stats.totalMappings}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Bike Types</p>
              <p className="text-2xl font-bold">{stats.byBikeType.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.averageConfidence}%</p>
                <ConfidenceBar score={stats.averageConfidence} className="flex-1" />
              </div>
            </CardContent>
          </Card>
          <Card className={stats.lowConfidenceCount > 0 ? 'border-amber-200 bg-amber-50' : ''}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Low Confidence</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{stats.lowConfidenceCount}</p>
                {stats.lowConfidenceCount > 0 && (
                  <AlertTriangle size={20} className="text-amber-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Low confidence alert */}
      {lowConfidence.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-700 flex items-center gap-2">
              <AlertTriangle size={18} />
              Low Confidence Mappings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowConfidence.slice(0, 5).map(m => (
                <Badge 
                  key={m.id} 
                  variant="outline" 
                  className="bg-white border-amber-300 text-amber-700"
                >
                  {m.bikeType} • {m.category}: {m.optionValue} ({m.confidence}%)
                </Badge>
              ))}
              {lowConfidence.length > 5 && (
                <Badge variant="outline" className="bg-white border-amber-300 text-amber-700">
                  +{lowConfidence.length - 5} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Bike size={18} className="text-muted-foreground" />
              <Select value={bikeTypeFilter} onValueChange={setBikeTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Bike Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Bike Types</SelectItem>
                  {BIKE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Settings2 size={18} className="text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {SPEC_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search mappings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Mappings table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[12%]">Bike Type</TableHead>
                <TableHead className="w-[12%]">Category</TableHead>
                <TableHead className="w-[15%]">Option</TableHead>
                <TableHead className="w-[25%]">Groups</TableHead>
                <TableHead className="w-[10%] text-center">Confidence</TableHead>
                <TableHead className="w-[8%] text-center">Uses</TableHead>
                <TableHead className="w-[10%] text-center">Confirmers</TableHead>
                <TableHead className="w-[8%]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No mappings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredMappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <Badge variant="outline">{mapping.bikeType}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {mapping.category}
                    </TableCell>
                    <TableCell>
                      {mapping.optionValue}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {mapping.groupCodes.slice(0, 3).map(code => (
                          <Badge key={code} variant="secondary" className="font-mono text-xs">
                            {code}
                          </Badge>
                        ))}
                        {mapping.groupCodes.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{mapping.groupCodes.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ConfidenceIndicator 
                        score={mapping.confidence} 
                        showLabel={true}
                        size="sm" 
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {mapping.usageCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {mapping.confirmedBy.length}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Copy size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Bike type breakdown */}
      {stats && stats.byBikeType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mappings by Bike Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.byBikeType.map(({ bikeType, count }) => (
                <div 
                  key={bikeType}
                  className="bg-muted/50 rounded-lg p-3 text-center cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setBikeTypeFilter(bikeType)}
                >
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">{bikeType}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

