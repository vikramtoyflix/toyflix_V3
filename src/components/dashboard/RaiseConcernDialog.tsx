
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminRequests } from '@/hooks/useAdminRequests';
import { useCustomAuth } from '@/hooks/useCustomAuth';

interface RaiseConcernDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RaiseConcernDialog: React.FC<RaiseConcernDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useCustomAuth();
  const { createConcernRequest, isLoading } = useAdminRequests();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      setSubject('');
      setMessage('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user || !subject || !message) return;
    const result = await createConcernRequest(user.id, subject, message);
    if (result.success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise a Concern</DialogTitle>
          <DialogDescription>
            Have a question or an issue? Let us know. We'll get back to you as soon as possible.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="e.g., Question about my billing"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Please describe your concern in detail."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !subject.trim() || !message.trim()}>
            {isLoading ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RaiseConcernDialog;
