import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { Copy, Trash2, Download, Code2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Highlight {
  id: string;
  text: string;
  url: string;
  path: string;
  createdAt: Date;
  isCode: boolean;
}

const DomainDetails: React.FC = () => {
  const navigate = useNavigate();
  const { domain } = useParams<{ domain: string }>();
  const { isAuthenticated } = useApp();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/mode');
    }
  }, [isAuthenticated, navigate]);

  // Mock data
  const mockHighlights: Highlight[] = [
    {
      id: '1',
      text: 'The minimalist design movement originated in the 20th century as a reaction against the complexity and ornamentation of previous art styles.',
      url: 'https://google.com/search/minimalism',
      path: '/search/minimalism',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isCode: false,
    },
    {
      id: '2',
      text: 'Search algorithms prioritize user intent over keyword stuffing. Modern SEO focuses on answering the user\'s question directly.',
      url: 'https://google.com/webmasters/guidelines',
      path: '/webmasters/guidelines',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      isCode: false,
    },
    {
      id: '3',
      text: 'Core Web Vitals are a set of specific factors that Google considers important in a webpage\'s overall user experience.',
      url: 'https://google.com/developers/vitals',
      path: '/developers/vitals',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      isCode: false,
    },
    {
      id: '4',
      text: 'Material Design 3',
      url: 'https://google.com/design/spec',
      path: '/design/spec',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      isCode: false,
    },
    {
      id: '5',
      text: 'const observer = new IntersectionObserver(callback, options);',
      url: 'https://google.com/docs/api',
      path: '/docs/api',
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      isCode: true,
    },
  ];

  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    console.log('Delete highlight:', id);
  };

  const handleClearAll = () => {
    console.log('Clear all highlights for:', domain);
    setShowClearDialog(false);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(mockHighlights, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${domain}-highlights.json`;
    link.click();
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'captured now';
    if (diffHours < 24) return `captured ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays === 1) return 'captured yesterday';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      {/* Main Content */}
      <main className="flex-1 w-full flex justify-center py-8 sm:py-12">
        <div className="w-full max-w-2xl px-6 flex flex-col">
          {/* Breadcrumb */}
          <nav className="mb-12">
            <button
              onClick={() => navigate('/collections')}
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              Back to Dashboard
            </button>
          </nav>

          {/* Page Heading */}
          <div className="mb-16">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-l-4 border-primary pl-6">
              <div>
                <h2 className="text-4xl sm:text-5xl font-black tracking-tighter mb-2">
                  {domain}
                </h2>
                <p className="text-muted-foreground text-lg font-normal">
                  {mockHighlights.length} underscores saved
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                >
                  Export
                </button>
                <button
                  onClick={() => setShowClearDialog(true)}
                  className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Highlights List */}
          <div className="flex flex-col gap-10">
            {mockHighlights.map((highlight) => (
              <article
                key={highlight.id}
                className="group relative flex flex-col gap-3 p-6 -mx-6 rounded-lg transition-all hover:bg-secondary/50 dark:hover:bg-secondary/30 border border-transparent hover:border-border"
              >
                <div className="flex justify-between items-start gap-4">
                  {highlight.isCode ? (
                    <div className="w-full">
                      <p className="text-lg sm:text-xl font-medium leading-relaxed font-mono bg-secondary/50 dark:bg-secondary/30 p-3 rounded text-sm sm:text-base border border-border">
                        {highlight.text}
                      </p>
                    </div>
                  ) : (
                    <p className="text-lg sm:text-xl font-medium leading-relaxed select-none">
                      {highlight.text}
                    </p>
                  )}

                  {/* Action buttons - visible on hover/focus */}
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleCopyToClipboard(highlight.text, highlight.id)}
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(highlight.id)}
                      className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  {highlight.isCode ? (
                    <Code2 className="w-3.5 h-3.5" />
                  ) : (
                    <span>●</span>
                  )}
                  <time>{formatTime(highlight.createdAt)}</time>
                  <span className="w-1 h-1 rounded-full bg-border"></span>
                  <span>{highlight.path}</span>
                </div>

                {/* Copy Feedback */}
                {copiedId === highlight.id && (
                  <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                    ✓ Copied to clipboard
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* End of list indicator */}
          <div className="mt-20 flex justify-center gap-1">
            <div className="h-1 w-1 rounded-full bg-border"></div>
            <div className="h-1 w-1 rounded-full bg-border"></div>
            <div className="h-1 w-1 rounded-full bg-border"></div>
          </div>
        </div>
      </main>

      {/* Clear All Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Clear all highlights?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All {mockHighlights.length} underscores for{' '}
            <strong>{domain}</strong> will be permanently deleted.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DomainDetails;
