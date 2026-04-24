import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Event, Registration, Profile } from '@/lib/storage';
import { format } from 'date-fns';
import { Download, Calendar, MapPin, Clock, Ticket } from 'lucide-react';

interface DigitalTicketProps {
  event: Event;
  registration: Registration;
  user: Profile;
}

export const DigitalTicket = ({ event, registration, user }: DigitalTicketProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qrData = JSON.stringify({
      ticketId: registration.ticket,
      eventId: event.id,
      eventTitle: event.title,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      registeredAt: registration.registered_at,
      verified: true,
    });

    QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setQrCodeUrl);
  }, [event, registration, user]);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const loadImageAsDataUrl = (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const handleDownload = async () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [105, 210] });
    const w = 105;
    let y = 0;

    pdf.setFillColor(139, 92, 246);
    pdf.rect(0, 0, w, 28, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EVENTORA', w / 2, 12, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Digital Event Ticket', w / 2, 19, { align: 'center' });
    y = 28;

    if (event.poster_url) {
      try {
        const posterData = await loadImageAsDataUrl(event.poster_url);
        pdf.addImage(posterData, 'JPEG', 0, y, w, 45);
        y += 45;
      } catch { y += 2; }
    } else { y += 2; }

    y += 8;
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const titleLines = pdf.splitTextToSize(event.title, w - 16);
    pdf.text(titleLines, 8, y);
    y += titleLines.length * 7 + 4;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);

    const infoItems = [
      { label: 'Date', value: format(new Date(event.date), 'EEEE, MMMM d, yyyy') },
      { label: 'Time', value: `${event.start_time} • ${formatDuration(event.duration)}` },
      { label: 'Venue', value: event.venue },
      { label: 'Organizer', value: event.organizer_name },
    ];

    for (const item of infoItems) {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(item.label, 8, y);
      y += 4;
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 30, 30);
      pdf.text(item.value, 8, y);
      y += 7;
    }

    y += 2;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.line(8, y, w - 8, y);
    pdf.setLineDashPattern([], 0);
    y += 6;

    if (qrCodeUrl) {
      pdf.addImage(qrCodeUrl, 'PNG', 8, y, 32, 32);
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Scan at venue entry', 8, y + 35);
    }

    const rightX = w - 8;
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Ticket ID', rightX, y + 4, { align: 'right' });

    pdf.setFontSize(16);
    pdf.setTextColor(139, 92, 246);
    pdf.setFont('courier', 'bold');
    pdf.text(registration.ticket, rightX, y + 12, { align: 'right' });

    pdf.setFontSize(10);
    pdf.setTextColor(30, 30, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.text(user.name, rightX, y + 20, { align: 'right' });

    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont('helvetica', 'normal');
    pdf.text(user.email, rightX, y + 26, { align: 'right' });

    if (user.phone) {
      pdf.text(user.phone, rightX, y + 31, { align: 'right' });
    }

    y += 42;
    pdf.setFillColor(245, 245, 245);
    pdf.rect(0, y, w, 12, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text('This ticket is your entry pass. Please present it at the venue gate.', w / 2, y + 5, { align: 'center' });
    pdf.text(`Generated on ${format(new Date(), 'MMM d, yyyy')}`, w / 2, y + 9, { align: 'center' });

    pdf.save(`ticket-${registration.ticket}.pdf`);
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 text-center">
        <Ticket className="h-6 w-6 mx-auto mb-1" />
        <h3 className="font-semibold">Digital Ticket</h3>
      </div>
      
      <div ref={ticketRef} className="p-4 space-y-4">
        {event.poster_url && (
          <div className="rounded-lg overflow-hidden h-32">
            <img src={event.poster_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}
        
        <div>
          <h4 className="font-bold text-lg text-foreground">{event.title}</h4>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{format(new Date(event.date), 'EEE, MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>{event.start_time} • {formatDuration(event.duration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{event.venue}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-dashed pt-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 mx-auto" />
              )}
              <p className="text-xs text-muted-foreground mt-1">Scan at entry</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Ticket ID</p>
              <p className="font-mono font-bold text-primary text-lg">{registration.ticket}</p>
              <p className="text-sm font-medium mt-2">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 pt-0">
        <Button onClick={handleDownload} className="w-full gap-2">
          <Download className="h-4 w-4" />
          Download Ticket (PDF)
        </Button>
      </div>
    </Card>
  );
};
