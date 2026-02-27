import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Calendar, 
  User, 
  Phone, 
  Package, 
  AlertTriangle, 
  Clock,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useCurrentlyRentedToys, useRentalSummary, useOverdueRentals } from '@/hooks/useInventoryManagement';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CurrentlyRentedToys: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('due_date');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const { data: currentlyRented, isLoading, error, refetch } = useCurrentlyRentedToys();
  const { data: rentalSummary } = useRentalSummary();
  const { data: overdueRentals } = useOverdueRentals();

  // Filter and sort the data
  const filteredRentals = React.useMemo(() => {
    if (!currentlyRented) return [];

    let filtered = currentlyRented.filter(rental => {
      const matchesSearch = 
        rental.toy_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rental.user_phone.includes(searchTerm);

      const matchesStatus = 
        statusFilter === 'all' || 
        rental.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort the results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'due_date':
          return new Date(a.rental_end_date).getTime() - new Date(b.rental_end_date).getTime();
        case 'days_rented':
          return b.days_rented - a.days_rented;
        case 'toy_name':
          return a.toy_name.localeCompare(b.toy_name);
        case 'user_name':
          return a.user_name.localeCompare(b.user_name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [currentlyRented, searchTerm, statusFilter, sortBy]);

  // Pagination calculations
  const totalItems = filteredRentals.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  
  // Paginated data
  const paginatedRentals = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredRentals.slice(startIndex, startIndex + pageSize);
  }, [filteredRentals, currentPage, pageSize]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy]);

  const exportToCSV = () => {
    if (!filteredRentals.length) return;

    const headers = [
      'Order Number',
      'Toy Name', 
      'Customer Name',
      'Customer Phone',
      'Rental Start',
      'Due Date',
      'Days Rented',
      'Days Overdue',
      'Status'
    ];

    const rows = filteredRentals.map(rental => [
      rental.order_number,
      rental.toy_name,
      rental.user_name,
      rental.user_phone,
      format(new Date(rental.rental_start_date), 'yyyy-MM-dd'),
      format(new Date(rental.rental_end_date), 'yyyy-MM-dd'),
      rental.days_rented.toString(),
      rental.days_overdue.toString(),
      rental.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `currently-rented-toys-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              Error loading rental data. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Currently Rented Toys</h1>
          <p className="text-muted-foreground">
            Track toys currently with customers and manage returns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rented</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rentalSummary?.total_rented_toys || 0}</div>
            <p className="text-xs text-muted-foreground">
              toys currently with customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rentalSummary?.total_active_rentals || 0}</div>
            <p className="text-xs text-muted-foreground">
              active rental orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rentalSummary?.overdue_rentals || 0}</div>
            <p className="text-xs text-muted-foreground">
              rentals past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{rentalSummary?.toys_due_this_week || 0}</div>
            <p className="text-xs text-muted-foreground">
              toys due within 7 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search toys, customers, or order numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date">Due Date</SelectItem>
                <SelectItem value="days_rented">Days Rented</SelectItem>
                <SelectItem value="toy_name">Toy Name</SelectItem>
                <SelectItem value="user_name">Customer Name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rental List */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All Rentals ({filteredRentals.length}{searchTerm || statusFilter !== 'all' ? ` of ${currentlyRented?.length || 0}` : ''})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue ({overdueRentals?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Currently Rented Toys</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRentals.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No currently rented toys found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedRentals.map((rental) => (
                    <div key={`${rental.rental_order_id}-${rental.toy_id}`} 
                         className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Toy Information */}
                          <div>
                            <div className="font-medium">{rental.toy_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Order: {rental.order_number}
                            </div>
                          </div>

                          {/* Customer Information */}
                          <div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="text-sm font-medium">{rental.user_name}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{rental.user_phone}</span>
                            </div>
                          </div>

                          {/* Rental Period */}
                          <div>
                            <div className="text-sm">
                              <span className="font-medium">Due: </span>
                              {format(new Date(rental.rental_end_date), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Rented: {rental.days_rented} days
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={rental.status === 'overdue' ? 'destructive' : 'secondary'}
                            >
                              {rental.status === 'overdue' 
                                ? `${rental.days_overdue} days overdue`
                                : 'Active'
                              }
                            </Badge>
                            {rental.days_overdue > 7 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Pagination Controls for All Rentals */}
            {totalItems > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-muted-foreground">
                    Showing {startItem} to {endItem} of {totalItems} rentals
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">Rows per page:</p>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => handlePageSizeChange(Number(value))}
                    >
                      <SelectTrigger className="h-8 w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Overdue Rentals</CardTitle>
            </CardHeader>
            <CardContent>
              {(!overdueRentals || overdueRentals.length === 0) ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <p className="text-green-600 font-medium">No overdue rentals! 🎉</p>
                  <p className="text-muted-foreground">All toys are returned on time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {overdueRentals.map((rental) => (
                    <div key={`${rental.rental_order_id}-${rental.toy_id}`} 
                         className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="font-medium">{rental.toy_name}</div>
                            <div className="text-sm text-muted-foreground">
                              Order: {rental.order_number}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="text-sm font-medium">{rental.user_name}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{rental.user_phone}</span>
                            </div>
                          </div>

                          <div>
                            <div className="text-sm">
                              <span className="font-medium text-red-600">Was due: </span>
                              {format(new Date(rental.rental_end_date), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Total rented: {rental.days_rented} days
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">
                              {rental.days_overdue} days overdue
                            </Badge>
                            {rental.days_overdue > 7 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CurrentlyRentedToys; 