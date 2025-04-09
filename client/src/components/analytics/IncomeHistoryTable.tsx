import React, { useState } from 'react';
import { useIncomeEntries, useDeleteIncomeEntry } from '@/hooks/use-analytics';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { 
  ArrowUpDown, 
  Loader2, 
  Search, 
  Edit, 
  Trash2, 
  RefreshCw, 
  DollarSign, 
  CalendarDays,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { IncomeEntryForm } from './IncomeEntryForm';
import { IncomeEntry } from '@shared/schema';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface IncomeHistoryTableProps {
  progressId: number | null;
  onAddIncomeClick: () => void;
}

export function IncomeHistoryTable({ progressId, onAddIncomeClick }: IncomeHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null);
  
  const { 
    data: incomeEntries, 
    isLoading, 
    isError 
  } = useIncomeEntries(progressId);
  
  const deleteIncomeMutation = useDeleteIncomeEntry();
  
  // Handle sorting
  const toggleSort = (column: 'date' | 'amount') => {
    if (sortBy === column) {
      // Toggle order if same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending order
      setSortBy(column);
      setSortOrder('desc');
    }
  };
  
  // Filter and sort entries
  const filteredAndSortedEntries = React.useMemo(() => {
    if (!incomeEntries) return [];
    
    let result = [...incomeEntries];
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(entry => entry.category === categoryFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(entry => 
        entry.source.toLowerCase().includes(search) ||
        entry.notes?.toLowerCase().includes(search)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.entryDate).getTime();
        const dateB = new Date(b.entryDate).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const amountA = parseFloat(a.amount.toString());
        const amountB = parseFloat(b.amount.toString());
        return sortOrder === 'asc' ? amountA - amountB : amountB - amountA;
      }
    });
    
    return result;
  }, [incomeEntries, categoryFilter, searchTerm, sortBy, sortOrder]);
  
  // Get available categories for filter
  const availableCategories = React.useMemo(() => {
    if (!incomeEntries) return [];
    
    const categories = new Set<string>();
    incomeEntries.forEach(entry => {
      if (entry.category) categories.add(entry.category);
    });
    
    return Array.from(categories);
  }, [incomeEntries]);
  
  // Calculate totals
  const totalIncome = React.useMemo(() => {
    if (!filteredAndSortedEntries.length) return 0;
    
    return filteredAndSortedEntries.reduce((sum, entry) => 
      sum + parseFloat(entry.amount.toString())
    , 0);
  }, [filteredAndSortedEntries]);
  
  // Handle edit click
  const handleEditClick = (entry: IncomeEntry) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };
  
  // Handle delete click
  const handleDeleteClick = async () => {
    if (!deletingEntryId || !progressId) return;
    
    try {
      await deleteIncomeMutation.mutateAsync({
        id: deletingEntryId,
        progressId,
      });
      setDeletingEntryId(null);
    } catch (error) {
      console.error("Error deleting income entry:", error);
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income History</CardTitle>
          <CardDescription>Track your revenue from this opportunity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income History</CardTitle>
          <CardDescription>Track your revenue from this opportunity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <AlertCircle className="h-8 w-8 mb-4 text-destructive" />
            <h3 className="text-lg font-medium mb-2">Failed to load income data</h3>
            <p className="text-sm text-muted-foreground">
              There was an error loading your income data. Please try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Income History</CardTitle>
            <CardDescription>Track your revenue from this opportunity</CardDescription>
          </div>
          <Button onClick={onAddIncomeClick} disabled={!progressId}>
            <DollarSign className="h-4 w-4 mr-2" />
            Add Income
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(!incomeEntries || incomeEntries.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <DollarSign className="h-8 w-8 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No income recorded yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Record your first income to start tracking revenue
            </p>
            <Button onClick={onAddIncomeClick} disabled={!progressId}>
              <DollarSign className="h-4 w-4 mr-2" />
              Record Your First Income
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Filters and search */}
            <div className="flex flex-col md:flex-row gap-4 items-end justify-between mb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-auto">
                  <Select 
                    value={categoryFilter} 
                    onValueChange={(value) => setCategoryFilter(value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {availableCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search income entries..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground flex items-center">
                Total: <span className="text-base font-semibold ml-1 text-primary">{formatCurrency(totalIncome)}</span>
              </div>
            </div>
            
            {/* Table */}
            <div className="rounded-md border">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-1 w-full justify-start font-medium"
                          onClick={() => toggleSort('date')}
                        >
                          Date
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-1 w-full justify-start font-medium"
                          onClick={() => toggleSort('amount')}
                        >
                          Amount
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(entry.entryDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{entry.source}</span>
                            {entry.isRecurring && (
                              <Badge variant="outline" className="w-fit mt-1">
                                <RefreshCw className="h-3 w-3 mr-1" /> Recurring
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.category && (
                            <Badge variant="secondary">{entry.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(entry)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletingEntryId(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Edit Dialog */}
      {editingEntry && (
        <IncomeEntryForm
          progressId={progressId}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingEntry(null);
          }}
          entryToEdit={editingEntry}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingEntryId} onOpenChange={() => setDeletingEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this income entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClick}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteIncomeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}