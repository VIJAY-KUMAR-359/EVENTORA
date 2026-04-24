import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Event, Registration, Profile,
  getProfilesByIds, updateRegistrationStatus, createNotification, getSignedUrl,
} from '@/lib/storage';
import { Download, Users, User as UserIcon, Mail, Phone, Ticket, CheckCircle2, XCircle, Clock, Image as ImageIcon } from 'lucide-react';

interface ParticipantsListProps {
  event: Event;
  registrations: Registration[];
  onStatusChange?: () => void;
}

export const ParticipantsList = ({ event, registrations, onStatusChange }: ParticipantsListProps) => {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<{ registration: Registration; user: Profile }[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [loadingScreenshot, setLoadingScreenshot] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isPaidEvent = event.fee_type === 'paid' && event.fee_amount && event.fee_amount > 0;

  useEffect(() => {
    const userIds = registrations.map(r => r.user_id);
    if (userIds.length === 0) { setParticipants([]); return; }
    
    getProfilesByIds(userIds).then((profiles) => {
      const result = registrations
        .map(reg => ({
          registration: reg,
          user: profiles.find(p => p.id === reg.user_id)!,
        }))
        .filter(p => p.user);
      setParticipants(result);
    });
  }, [registrations]);

  const handleApprove = async (registration: Registration, userName: string) => {
    setProcessingId(registration.id);
    const success = await updateRegistrationStatus(registration.id, 'approved');
    if (success) {
      await createNotification(
        registration.user_id,
        event.id,
        '✅ Payment Confirmed!',
        `Your payment for "${event.title}" has been confirmed. Your ticket (${registration.ticket}) is now active!`,
        'payment_approved'
      );
      toast({ title: 'Payment Approved', description: `${userName}'s registration has been approved.` });
      onStatusChange?.();
    } else {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
    setProcessingId(null);
  };

  const handleReject = async (registration: Registration, userName: string) => {
    setProcessingId(registration.id);
    const success = await updateRegistrationStatus(registration.id, 'rejected', rejectNote || 'Payment not verified.');
    if (success) {
      await createNotification(
        registration.user_id,
        event.id,
        '❌ Payment Rejected',
        `Your payment for "${event.title}" could not be verified. Reason: ${rejectNote || 'Payment not verified.'}. Please contact the organizer.`,
        'payment_rejected'
      );
      toast({ title: 'Payment Rejected', description: `${userName}'s registration has been rejected.` });
      setRejectingId(null);
      setRejectNote('');
      onStatusChange?.();
    } else {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
    setProcessingId(null);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
    }
  };

  const handleDownload = () => {
    const csvHeaders = ['Name', 'Email', 'Phone', 'Ticket ID', 'Payment Status', 'Registered At'];
    const csvRows = participants.map(p => [
      p.user?.name || 'N/A',
      p.user?.email || 'N/A',
      p.user?.phone || 'N/A',
      p.registration.ticket,
      p.registration.payment_status || (event.fee_type === 'paid' ? 'Pending' : 'Free'),
      new Date(p.registration.registered_at).toLocaleString(),
    ]);

    const csvContent = [
      `Event: ${event.title}`,
      `Date: ${new Date(event.date).toLocaleDateString()}`,
      `Venue: ${event.venue}`,
      `Total Participants: ${participants.length}`,
      '',
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `participants-${event.title.replace(/\s+/g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Participants ({registrations.length})
            </CardTitle>
            {registrations.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" /> Download
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No participants yet</p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {participants.map(({ registration, user }) => (
                <div key={registration.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">{user?.name}</p>
                        {isPaidEvent && getStatusBadge(registration.payment_status)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{user?.email}</span>
                      </div>
                      {user?.phone && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          <span>{user.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Ticket className="h-3 w-3" />
                        <span className="font-mono">{registration.ticket}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment screenshot & approval for paid events */}
                  {isPaidEvent && registration.payment_screenshot_url && (
                    <div className="ml-13 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-xs"
                        disabled={loadingScreenshot}
                        onClick={async () => {
                          const url = registration.payment_screenshot_url!;
                          // Extract file path from full URL for signed URL generation
                          const bucketPrefix = '/storage/v1/object/public/payment-screenshots/';
                          const pathIndex = url.indexOf(bucketPrefix);
                          if (pathIndex !== -1) {
                            setLoadingScreenshot(true);
                            const filePath = url.substring(pathIndex + bucketPrefix.length);
                            const signedUrl = await getSignedUrl('payment-screenshots', filePath);
                            setSelectedScreenshot(signedUrl || url);
                            setLoadingScreenshot(false);
                          } else {
                            setSelectedScreenshot(url);
                          }
                        }}
                      >
                        <ImageIcon className="h-3 w-3" /> View Payment Screenshot
                      </Button>

                      {registration.payment_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                            disabled={processingId === registration.id}
                            onClick={() => handleApprove(registration, user?.name || 'User')}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                            disabled={processingId === registration.id}
                            onClick={() => setRejectingId(registration.id)}
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </Button>
                        </div>
                      )}

                      {registration.payment_status === 'rejected' && registration.organizer_note && (
                        <p className="text-xs text-destructive">Reason: {registration.organizer_note}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Screenshot Preview Dialog */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment Screenshot</DialogTitle>
            <DialogDescription>Review the payment confirmation submitted by the participant.</DialogDescription>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={selectedScreenshot} alt="Payment screenshot" className="w-full object-contain max-h-[70vh]" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={() => { setRejectingId(null); setRejectNote(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this payment (optional).</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., Payment amount doesn't match, screenshot is unclear..."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setRejectingId(null); setRejectNote(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={processingId !== null}
              onClick={() => {
                const p = participants.find(p => p.registration.id === rejectingId);
                if (p) handleReject(p.registration, p.user?.name || 'User');
              }}
            >
              Reject Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
