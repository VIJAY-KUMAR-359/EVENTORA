import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Trash2, Download, Mail, ShieldAlert, RefreshCw, Database } from 'lucide-react';
import { format } from 'date-fns';

const ADMIN_EMAIL = 'vijaykumareppili24@gmail.com';

type ContactMessage = {
  id: string;
  created_at: string;
  message: string;
  sender_name: string | null;
  sender_email: string | null;
};

const TABLE_EXPORTS: { table: string; label: string; description: string }[] = [
  { table: 'profiles', label: 'Users (Profiles)', description: 'All registered users' },
  { table: 'events', label: 'Events', description: 'All events created' },
  { table: 'registrations', label: 'Registrations & Payments', description: 'Tickets, payment status, screenshots' },
  { table: 'feedbacks', label: 'Feedbacks', description: 'User testimonials & event reviews' },
  { table: 'notifications', label: 'Notifications', description: 'All in-app notifications' },
  { table: 'event_messages', label: 'Event Messages', description: 'Q&A between attendees and organizers' },
  { table: 'contact_messages', label: 'Contact Messages', description: 'Get-in-touch submissions' },
];

const toCsv = (rows: Record<string, any>[]): string => {
  if (rows.length === 0) return '';
  const headerSet = new Set<string>();
  rows.forEach(row => Object.keys(row).forEach(k => headerSet.add(k)));
  const headers = Array.from(headerSet);
  const escape = (val: any): string => {
    if (val === null || val === undefined) return '';
    const s = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
};

const downloadFile = (filename: string, content: string, mime = 'text/csv') => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const Admin = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exportingTable, setExportingTable] = useState<string | null>(null);

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (!isLoading && !user) navigate('/login');
  }, [user, isLoading, navigate]);

  const loadMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load messages', description: error.message, variant: 'destructive' });
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadMessages();
  }, [isAdmin]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('contact_messages').delete().eq('id', deleteId);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Message deleted' });
      setMessages(prev => prev.filter(m => m.id !== deleteId));
    }
    setDeleteId(null);
  };

  const handleExport = async (table: string, label: string) => {
    setExportingTable(table);
    const { data, error } = await supabase.from(table as any).select('*');
    if (error) {
      toast({ title: `Export failed: ${label}`, description: error.message, variant: 'destructive' });
    } else if (!data || data.length === 0) {
      toast({ title: `${label} is empty`, description: 'No rows to export.' });
    } else {
      const csv = toCsv(data as any);
      const date = format(new Date(), 'yyyy-MM-dd');
      downloadFile(`${table}_${date}.csv`, csv);
      toast({ title: '✅ Exported', description: `${data.length} rows downloaded as CSV.` });
    }
    setExportingTable(null);
  };

  const handleExportContactCsv = () => {
    if (filtered.length === 0) {
      toast({ title: 'Nothing to export', description: 'No contact messages match.' });
      return;
    }
    const csv = toCsv(filtered);
    downloadFile(`contact_messages_${format(new Date(), 'yyyy-MM-dd')}.csv`, csv);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(m => {
      const name = (m.sender_name ?? '').toLowerCase();
      const email = (m.sender_email ?? '').toLowerCase();
      const msg = (m.message ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || msg.includes(q);
    });
  }, [messages, search]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                This page is restricted to the site administrator.
              </p>
              <Button onClick={() => navigate('/')}>Back to Home</Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Signed in as <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>

        {/* Database Export */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Database Export
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Download each table as an individual CSV file.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TABLE_EXPORTS.map(({ table, label, description }) => (
                <div
                  key={table}
                  className="border border-border rounded-lg p-4 flex flex-col gap-2 bg-card hover:border-primary/40 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-sm">{label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 mt-auto"
                    onClick={() => handleExport(table, label)}
                    disabled={exportingTable === table}
                  >
                    <Download className="h-4 w-4" />
                    {exportingTable === table ? 'Exporting…' : 'Download CSV'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Messages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contact Messages
                <Badge variant="secondary">{messages.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={loadMessages} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportContactCsv} className="gap-2">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter by name, email, or message..."
              />
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading messages...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {messages.length === 0 ? 'No contact messages yet.' : 'No messages match your filter.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-[80px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(msg => (
                      <TableRow key={msg.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {format(new Date(msg.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium">{msg.sender_name || '—'}</TableCell>
                        <TableCell className="text-sm">
                          {msg.sender_email ? (
                            <a href={`mailto:${msg.sender_email}`} className="text-primary hover:underline">
                              {msg.sender_email}
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(msg.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The contact message will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
