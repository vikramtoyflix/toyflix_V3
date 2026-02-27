import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, FileText, FileSpreadsheet, Calendar, Clock, Mail, 
  Settings, Play, Pause, Trash2, Plus, Filter, Users, Package,
  TrendingUp, DollarSign, AlertCircle, CheckCircle, Send
} from "lucide-react";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface ExportManagerProps {
  orders: any[];
  selectedOrderIds: string[];
  filters: any;
}

interface ScheduledReport {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'csv';
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  filters: any;
  lastRun?: string;
  nextRun?: string;
  isActive: boolean;
  created_at: string;
}

const ExportManager = ({ orders, selectedOrderIds, filters }: ExportManagerProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [exportType, setExportType] = useState<'individual' | 'bulk' | 'scheduled'>('bulk');
  const [isExporting, setIsExporting] = useState(false);
  
  // Export configuration
  const [exportConfig, setExportConfig] = useState({
    format: 'excel' as 'pdf' | 'excel' | 'csv',
    dateFrom: '',
    dateTo: '',
    includeCustomers: true,
    includeToys: true,
    includePayments: true,
    includeShipping: true,
    includeTimeline: false,
    customFields: [] as string[],
    fileName: ''
  });

  // Scheduled reports
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [newScheduledReport, setNewScheduledReport] = useState({
    name: '',
    type: 'excel' as 'pdf' | 'excel' | 'csv',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
    recipients: [''],
    filters: {},
    isActive: true
  });

  // Load scheduled reports
  useEffect(() => {
    loadScheduledReports();
  }, []);

  const loadScheduledReports = async () => {
    try {
      // This would typically load from a database
      // For now, using localStorage as a mock
      const saved = localStorage.getItem('toyflix_scheduled_reports');
      if (saved) {
        setScheduledReports(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load scheduled reports:', error);
    }
  };

  const saveScheduledReports = (reports: ScheduledReport[]) => {
    localStorage.setItem('toyflix_scheduled_reports', JSON.stringify(reports));
    setScheduledReports(reports);
  };

  // Generate PDF Invoice for individual orders
  const generatePDFInvoice = async (order: any) => {
    try {
      setIsExporting(true);
      
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      
      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text('TOYFLIX', 20, 30);
      pdf.setFontSize(10);
      pdf.text('Toy Rental Invoice', 20, 40);
      
      // Invoice details
      pdf.setFontSize(12);
      pdf.text(`Invoice #: ${order.order_number || order.id.slice(0, 8)}`, 20, 60);
      pdf.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 70);
      pdf.text(`Status: ${order.status.toUpperCase()}`, 20, 80);
      
      // Customer details
      pdf.setFontSize(14);
      pdf.text('Bill To:', 20, 100);
      pdf.setFontSize(10);
      const customerName = order.custom_user?.first_name || order.custom_user?.last_name 
        ? `${order.custom_user.first_name || ''} ${order.custom_user.last_name || ''}`.trim()
        : 'Unknown Customer';
      
      pdf.text(customerName, 20, 110);
      pdf.text(order.custom_user?.phone || 'No phone', 20, 120);
      pdf.text(order.custom_user?.email || 'No email', 20, 130);
      
      // Order items table
      const tableData = order.toys_data?.map((toy: any, index: number) => [
        (index + 1).toString(),
        toy.name || 'Unknown Toy',
        '1', // Quantity
        `₹${toy.unit_price || 0}`,
        `₹${toy.unit_price || 0}`
      ]) || [];
      
      (pdf as any).autoTable({
        startY: 150,
        head: [['#', 'Item', 'Qty', 'Price', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 9 }
      });
      
      // Totals
      const finalY = (pdf as any).lastAutoTable.finalY + 20;
      pdf.setFontSize(12);
      pdf.text(`Subtotal: ₹${order.total_amount || 0}`, pageWidth - 80, finalY);
      if (order.discount_amount) {
        pdf.text(`Discount: -₹${order.discount_amount}`, pageWidth - 80, finalY + 10);
      }
      pdf.setFontSize(14);
      pdf.text(`Total: ₹${(order.total_amount || 0) - (order.discount_amount || 0)}`, pageWidth - 80, finalY + 25);
      
      // Footer
      pdf.setFontSize(8);
      pdf.text('Thank you for choosing Toyflix!', 20, pdf.internal.pageSize.height - 20);
      
      pdf.save(`toyflix-invoice-${order.order_number || order.id.slice(0, 8)}.pdf`);
      
      toast({
        title: "Invoice Generated",
        description: "PDF invoice has been downloaded successfully.",
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF invoice.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Generate Excel Report
  const generateExcelReport = async (ordersToExport: any[]) => {
    try {
      setIsExporting(true);
      
      // Prepare data for Excel
      const excelData = ordersToExport.map(order => {
        const customerName = order.custom_user?.first_name || order.custom_user?.last_name 
          ? `${order.custom_user.first_name || ''} ${order.custom_user.last_name || ''}`.trim()
          : 'Unknown Customer';
        
        const baseData: any = {
          'Order Number': order.order_number || order.id.slice(0, 8),
          'Order Date': new Date(order.created_at).toLocaleDateString(),
          'Status': order.status,
          'Payment Status': order.payment_status,
          'Order Type': order.order_type,
          'Subscription Plan': order.subscription_plan || 'N/A',
          'Total Amount': order.total_amount || 0,
          'Discount': order.discount_amount || 0,
          'Final Amount': (order.total_amount || 0) - (order.discount_amount || 0)
        };

        if (exportConfig.includeCustomers) {
          baseData['Customer Name'] = customerName;
          baseData['Customer Phone'] = order.custom_user?.phone || 'N/A';
          baseData['Customer Email'] = order.custom_user?.email || 'N/A';
        }

        if (exportConfig.includeToys) {
          baseData['Toys Count'] = Array.isArray(order.toys_data) ? order.toys_data.length : 0;
          baseData['Toys List'] = Array.isArray(order.toys_data) 
            ? order.toys_data.map((toy: any) => toy.name).join(', ')
            : 'N/A';
        }

        if (exportConfig.includePayments) {
          baseData['Coupon Code'] = order.coupon_code || 'N/A';
          baseData['Payment Method'] = 'Online'; // Placeholder
        }

        if (exportConfig.includeShipping) {
          baseData['Shipping Address'] = order.shipping_address 
            ? (typeof order.shipping_address === 'string' 
              ? order.shipping_address 
              : JSON.stringify(order.shipping_address))
            : 'N/A';
        }

        if (exportConfig.includeTimeline) {
          baseData['Confirmed At'] = order.confirmed_at 
            ? new Date(order.confirmed_at).toLocaleDateString() 
            : 'N/A';
          baseData['Shipped At'] = order.shipped_at 
            ? new Date(order.shipped_at).toLocaleDateString() 
            : 'N/A';
          baseData['Delivered At'] = order.delivered_at 
            ? new Date(order.delivered_at).toLocaleDateString() 
            : 'N/A';
        }

        return baseData;
      });

      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Main orders sheet
      const ordersSheet = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, ordersSheet, 'Orders');
      
      // Summary sheet
      const summaryData = [
        { Metric: 'Total Orders', Value: ordersToExport.length },
        { Metric: 'Total Revenue', Value: ordersToExport.reduce((sum, order) => sum + (order.total_amount || 0), 0) },
        { Metric: 'Total Discounts', Value: ordersToExport.reduce((sum, order) => sum + (order.discount_amount || 0), 0) },
        { Metric: 'Pending Orders', Value: ordersToExport.filter(o => o.status === 'pending').length },
        { Metric: 'Delivered Orders', Value: ordersToExport.filter(o => o.status === 'delivered').length },
        { Metric: 'Export Date', Value: new Date().toLocaleDateString() },
        { Metric: 'Date Range', Value: exportConfig.dateFrom && exportConfig.dateTo 
          ? `${exportConfig.dateFrom} to ${exportConfig.dateTo}` 
          : 'All dates' }
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Generate filename
      const fileName = exportConfig.fileName || 
        `toyflix-orders-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Excel Report Generated",
        description: `Successfully exported ${ordersToExport.length} orders to Excel.`,
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate Excel report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Generate CSV Report
  const generateCSVReport = async (ordersToExport: any[]) => {
    try {
      setIsExporting(true);
      
      const csvData = ordersToExport.map(order => {
        const customerName = order.custom_user?.first_name || order.custom_user?.last_name 
          ? `${order.custom_user.first_name || ''} ${order.custom_user.last_name || ''}`.trim()
          : 'Unknown Customer';
        
        return {
          order_number: order.order_number || order.id.slice(0, 8),
          order_date: new Date(order.created_at).toLocaleDateString(),
          customer_name: customerName,
          customer_phone: order.custom_user?.phone || '',
          customer_email: order.custom_user?.email || '',
          status: order.status,
          payment_status: order.payment_status,
          total_amount: order.total_amount || 0,
          toys_count: Array.isArray(order.toys_data) ? order.toys_data.length : 0,
          order_type: order.order_type,
          subscription_plan: order.subscription_plan || ''
        };
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + Object.keys(csvData[0] || {}).join(",") + "\n"
        + csvData.map(row => Object.values(row).map(val => `"${val}"`).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", 
        exportConfig.fileName || `toyflix-orders-${new Date().toISOString().split('T')[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "CSV Report Generated",
        description: `Successfully exported ${ordersToExport.length} orders to CSV.`,
      });
    } catch (error) {
      console.error('CSV export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate CSV report.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export based on configuration
  const handleExport = async () => {
    let ordersToExport = orders;

    // Apply date filtering if specified
    if (exportConfig.dateFrom || exportConfig.dateTo) {
      ordersToExport = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        const fromDate = exportConfig.dateFrom ? new Date(exportConfig.dateFrom) : null;
        const toDate = exportConfig.dateTo ? new Date(exportConfig.dateTo) : null;
        
        if (fromDate && orderDate < fromDate) return false;
        if (toDate && orderDate > toDate) return false;
        return true;
      });
    }

    // Use selected orders if in bulk mode and orders are selected
    if (exportType === 'bulk' && selectedOrderIds.length > 0) {
      ordersToExport = ordersToExport.filter(order => selectedOrderIds.includes(order.id));
    }

    if (ordersToExport.length === 0) {
      toast({
        title: "No Orders to Export",
        description: "No orders match the export criteria.",
        variant: "destructive",
      });
      return;
    }

    switch (exportConfig.format) {
      case 'excel':
        await generateExcelReport(ordersToExport);
        break;
      case 'csv':
        await generateCSVReport(ordersToExport);
        break;
      case 'pdf':
        if (ordersToExport.length === 1) {
          await generatePDFInvoice(ordersToExport[0]);
        } else {
          toast({
            title: "PDF Export Limited",
            description: "PDF export is available for individual orders only. Please select one order.",
            variant: "destructive",
          });
        }
        break;
    }
  };

  // Add scheduled report
  const addScheduledReport = () => {
    const newReport: ScheduledReport = {
      id: Date.now().toString(),
      ...newScheduledReport,
      recipients: newScheduledReport.recipients.filter(email => email.trim() !== ''),
      created_at: new Date().toISOString(),
      lastRun: undefined,
      nextRun: calculateNextRun(newScheduledReport.frequency)
    };

    const updatedReports = [...scheduledReports, newReport];
    saveScheduledReports(updatedReports);
    
    // Reset form
    setNewScheduledReport({
      name: '',
      type: 'excel',
      frequency: 'weekly',
      recipients: [''],
      filters: {},
      isActive: true
    });

    toast({
      title: "Scheduled Report Added",
      description: "New scheduled report has been created successfully.",
    });
  };

  // Calculate next run time for scheduled reports
  const calculateNextRun = (frequency: string): string => {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
    }
    return now.toISOString();
  };

  // Toggle scheduled report status
  const toggleScheduledReport = (reportId: string) => {
    const updatedReports = scheduledReports.map(report => 
      report.id === reportId 
        ? { ...report, isActive: !report.isActive }
        : report
    );
    saveScheduledReports(updatedReports);
  };

  // Delete scheduled report
  const deleteScheduledReport = (reportId: string) => {
    const updatedReports = scheduledReports.filter(report => report.id !== reportId);
    saveScheduledReports(updatedReports);
    
    toast({
      title: "Report Deleted",
      description: "Scheduled report has been removed.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Advanced Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Advanced Export & Reporting
          </DialogTitle>
        </DialogHeader>

        <Tabs value={exportType} onValueChange={(value: any) => setExportType(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bulk">Bulk Export</TabsTrigger>
            <TabsTrigger value="individual">PDF Invoices</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          </TabsList>

          {/* Bulk Export Tab */}
          <TabsContent value="bulk" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Export Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Export Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Export Format</Label>
                    <Select value={exportConfig.format} onValueChange={(value: any) => 
                      setExportConfig(prev => ({ ...prev, format: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                        <SelectItem value="pdf">PDF Invoice (single order)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>From Date</Label>
                      <Input
                        type="date"
                        value={exportConfig.dateFrom}
                        onChange={(e) => setExportConfig(prev => ({ 
                          ...prev, dateFrom: e.target.value 
                        }))}
                      />
                    </div>
                    <div>
                      <Label>To Date</Label>
                      <Input
                        type="date"
                        value={exportConfig.dateTo}
                        onChange={(e) => setExportConfig(prev => ({ 
                          ...prev, dateTo: e.target.value 
                        }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Custom File Name (optional)</Label>
                    <Input
                      placeholder="my-custom-report"
                      value={exportConfig.fileName}
                      onChange={(e) => setExportConfig(prev => ({ 
                        ...prev, fileName: e.target.value 
                      }))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Data Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Selection</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-customers"
                        checked={exportConfig.includeCustomers}
                        onCheckedChange={(checked) => setExportConfig(prev => ({ 
                          ...prev, includeCustomers: checked as boolean 
                        }))}
                      />
                      <Label htmlFor="include-customers">Customer Information</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-toys"
                        checked={exportConfig.includeToys}
                        onCheckedChange={(checked) => setExportConfig(prev => ({ 
                          ...prev, includeToys: checked as boolean 
                        }))}
                      />
                      <Label htmlFor="include-toys">Toy Details</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-payments"
                        checked={exportConfig.includePayments}
                        onCheckedChange={(checked) => setExportConfig(prev => ({ 
                          ...prev, includePayments: checked as boolean 
                        }))}
                      />
                      <Label htmlFor="include-payments">Payment Information</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-shipping"
                        checked={exportConfig.includeShipping}
                        onCheckedChange={(checked) => setExportConfig(prev => ({ 
                          ...prev, includeShipping: checked as boolean 
                        }))}
                      />
                      <Label htmlFor="include-shipping">Shipping Details</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-timeline"
                        checked={exportConfig.includeTimeline}
                        onCheckedChange={(checked) => setExportConfig(prev => ({ 
                          ...prev, includeTimeline: checked as boolean 
                        }))}
                      />
                      <Label htmlFor="include-timeline">Order Timeline</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 border rounded-lg">
                    <Package className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">{orders.length}</p>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold">{selectedOrderIds.length}</p>
                    <p className="text-sm text-muted-foreground">Selected</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold">
                      ₹{orders.reduce((sum, order) => sum + (order.total_amount || 0), 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Value</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                    <p className="text-2xl font-bold">
                      {exportConfig.dateFrom || exportConfig.dateTo ? 'Filtered' : 'All'}
                    </p>
                    <p className="text-sm text-muted-foreground">Date Range</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Individual PDF Invoices Tab */}
          <TabsContent value="individual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PDF Invoice Generation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Generate professional PDF invoices for individual orders. Select orders from the main list and use the "Generate PDF" button for each order.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <FileText className="w-8 h-8 mb-2 text-red-600" />
                      <h3 className="font-semibold">Professional Invoices</h3>
                      <p className="text-sm text-muted-foreground">
                        Generate branded PDF invoices with order details, customer information, and itemized costs.
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <Settings className="w-8 h-8 mb-2 text-blue-600" />
                      <h3 className="font-semibold">Auto-formatting</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically formatted with company branding, tax calculations, and professional layout.
                      </p>
                    </div>
                  </div>

                  {selectedOrderIds.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">Ready for PDF Generation</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        {selectedOrderIds.length} order{selectedOrderIds.length > 1 ? 's' : ''} selected for PDF generation.
                      </p>
                      <div className="space-y-2">
                        {orders.filter(order => selectedOrderIds.includes(order.id)).map(order => (
                          <div key={order.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <span className="font-medium">#{order.order_number}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {order.custom_user?.first_name} {order.custom_user?.last_name}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => generatePDFInvoice(order)}
                              disabled={isExporting}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Generate PDF
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scheduled Reports Tab */}
          <TabsContent value="scheduled" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add New Scheduled Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Create Scheduled Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Report Name</Label>
                    <Input
                      placeholder="Weekly Sales Report"
                      value={newScheduledReport.name}
                      onChange={(e) => setNewScheduledReport(prev => ({ 
                        ...prev, name: e.target.value 
                      }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Format</Label>
                      <Select value={newScheduledReport.type} onValueChange={(value: any) => 
                        setNewScheduledReport(prev => ({ ...prev, type: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excel">Excel</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                          <SelectItem value="pdf">PDF Summary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Frequency</Label>
                      <Select value={newScheduledReport.frequency} onValueChange={(value: any) => 
                        setNewScheduledReport(prev => ({ ...prev, frequency: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Email Recipients</Label>
                    {newScheduledReport.recipients.map((email, index) => (
                      <div key={index} className="flex gap-2 mt-2">
                        <Input
                          type="email"
                          placeholder="recipient@example.com"
                          value={email}
                          onChange={(e) => {
                            const newRecipients = [...newScheduledReport.recipients];
                            newRecipients[index] = e.target.value;
                            setNewScheduledReport(prev => ({ 
                              ...prev, recipients: newRecipients 
                            }));
                          }}
                        />
                        {index === newScheduledReport.recipients.length - 1 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNewScheduledReport(prev => ({ 
                              ...prev, recipients: [...prev.recipients, ''] 
                            }))}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button 
                    onClick={addScheduledReport}
                    disabled={!newScheduledReport.name || !newScheduledReport.recipients[0]}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Scheduled Report
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Scheduled Reports */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Scheduled Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {scheduledReports.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No scheduled reports configured</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scheduledReports.map(report => (
                        <div key={report.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{report.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{report.type.toUpperCase()}</Badge>
                                <Badge variant="outline">{report.frequency}</Badge>
                                {report.isActive ? (
                                  <Badge variant="default">Active</Badge>
                                ) : (
                                  <Badge variant="secondary">Paused</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleScheduledReport(report.id)}
                              >
                                {report.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteScheduledReport(report.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <p>Recipients: {report.recipients.join(', ')}</p>
                            <p>Next run: {report.nextRun ? new Date(report.nextRun).toLocaleDateString() : 'N/A'}</p>
                            {report.lastRun && (
                              <p>Last run: {new Date(report.lastRun).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          {exportType === 'bulk' && (
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {exportConfig.format.toUpperCase()}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportManager; 