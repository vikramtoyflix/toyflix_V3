
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminRequests } from '@/hooks/useAdminRequests';
import { useCustomAuth } from '@/hooks/useCustomAuth';

interface PauseSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maxPauseMonths: number;
}

const PauseSubscriptionDialog: React.FC<PauseSubscriptionDialogProps> = ({ open, onOpenChange, maxPauseMonths }) => {
  const { user } = useCustomAuth();
  const { createPauseRequest, isLoading } = useAdminRequests();
  const [months, setMonths] = useState('1');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setMonths('1');
      setReason('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user || !reason) return;
    const result = await createPauseRequest(user.id, parseInt(months), reason);
    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request to Pause Subscription</DialogTitle>
          <DialogDescription>
            Select the number of months you'd like to pause your subscription for. This will send a request to our team for approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="months">Months to pause</Label>
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger id="months">
                <SelectValue placeholder="Select months" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxPauseMonths }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for pausing</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Going on vacation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !reason.trim()}>
            {isLoading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PauseSubscriptionDialog;
