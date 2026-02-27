import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, FileSpreadsheet, Calendar, Clock, Mail, 
  Download, TrendingUp, Package, Users
} from "lucide-react";

interface ExportSummaryCardProps {
  totalOrders: number;
  selectedOrders: number;
  totalValue: number;
  hasDateFilter: boolean;
}

const ExportSummaryCard = ({ 
  totalOrders, 
  selectedOrders, 
  totalValue, 
  hasDateFilter 
}: ExportSummaryCardProps) => {
  return (
    <Card className="border-l-4 border-l-green-500 bg-gradient-to-r from-green-50 to-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="w-5 h-5 text-green-600" />
          Export Capabilities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <Package className="w-6 h-6 mx-auto mb-1 text-blue-600" />
            <p className="text-xl font-bold">{totalOrders.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="text-center">
            <Users className="w-6 h-6 mx-auto mb-1 text-purple-600" />
            <p className="text-xl font-bold">{selectedOrders}</p>
            <p className="text-xs text-muted-foreground">Selected</p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-1 text-green-600" />
            <p className="text-xl font-bold">₹{totalValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </div>
          <div className="text-center">
            <Calendar className="w-6 h-6 mx-auto mb-1 text-orange-600" />
            <p className="text-xl font-bold">{hasDateFilter ? 'Filtered' : 'All'}</p>
            <p className="text-xs text-muted-foreground">Date Range</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <FileSpreadsheet className="w-3 h-3" />
            Excel Reports
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            PDF Invoices
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            CSV Export
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Scheduled Reports
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            Email Delivery
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Use <strong>Advanced Export</strong> for comprehensive reporting with custom date ranges, 
          multiple formats, and scheduled delivery options.
        </p>
      </CardContent>
    </Card>
  );
};

export default ExportSummaryCard; 