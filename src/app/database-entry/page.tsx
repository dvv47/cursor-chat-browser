"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { Copy } from 'lucide-react';

interface DatabaseEntry {
  key: string;
  rawValue: string;
  parsedValue: any;
  source: string;
  size: number;
  sizeFormatted: string;
}

export default function DatabaseEntryPage() {
  const [entry, setEntry] = useState<DatabaseEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const key = searchParams.get('key');
  const source = searchParams.get('source');

  useEffect(() => {
    const fetchEntry = async () => {
      if (!key || !source) {
        setError('Missing key or source parameter');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/database-entry?key=${encodeURIComponent(key)}&source=${encodeURIComponent(source)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch entry');
        }
        
        const data = await response.json();
        setEntry(data);
      } catch (error) {
        console.error('Failed to fetch database entry:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch database entry');
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [key, source]);

  const formatDataType = (key: string): string => {
    if (key.startsWith('bubbleId:')) return 'Chat Message';
    if (key.startsWith('checkpointId:')) return 'Checkpoint';
    if (key.startsWith('codeBlockDiff:')) return 'Code Diff';
    if (key.startsWith('messageRequestContext:')) return 'Message Context';
    if (key.startsWith('composerData:')) return 'Composer Data';
    if (key === 'workbench.panel.aichat.view.aichat.chatdata') return 'Chat Data';
    if (key === 'composer.composerData') return 'Composer Metadata';
    return 'Unknown';
  };  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const formatJson = (obj: any): string => {
    return JSON.stringify(obj, null, 2);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Loading message="Loading database entry..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={() => router.back()} 
              className="mt-4"
              variant="outline"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Entry Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The requested database entry was not found.</p>
            <Button 
              onClick={() => router.back()} 
              className="mt-4"
              variant="outline"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Button 
          onClick={() => router.back()} 
          variant="outline"
          className="mb-4"
        >
          ← Back to Statistics
        </Button>
        
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Database Entry Details</h1>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'formatted' ? 'default' : 'outline'}
              onClick={() => setViewMode('formatted')}
              size="sm"
            >
              Formatted
            </Button>
            <Button
              variant={viewMode === 'raw' ? 'default' : 'outline'}
              onClick={() => setViewMode('raw')}
              size="sm"
            >
              Raw JSON
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Entry Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Entry Information
              <div className="flex gap-2">
                <Badge variant="secondary">
                  {formatDataType(entry.key)}
                </Badge>
                <Badge variant="outline">
                  {entry.source === 'global' ? 'Global DB' : `Workspace: ${entry.source}`}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Key:</h4>
              <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm break-all">
                {entry.key}
              </code>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">Size:</h4>
                <p>{entry.sizeFormatted} ({entry.size.toLocaleString()} bytes)</p>
              </div>
              <div>
                <h4 className="font-semibold">Source:</h4>
                <p>{entry.source === 'global' ? 'Global Database' : `Workspace Database (${entry.source})`}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entry Content */}
        <Card>
          <CardHeader>            <CardTitle className="flex items-center justify-between">
              Content
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(viewMode === 'formatted' ? formatJson(entry.parsedValue) : entry.rawValue)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Content
              </Button>
            </CardTitle>
            <CardDescription>
              {viewMode === 'formatted' 
                ? 'Parsed and formatted JSON content' 
                : 'Raw JSON content as stored in database'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto text-sm max-h-96 border">
                <code>
                  {viewMode === 'formatted' 
                    ? formatJson(entry.parsedValue)
                    : entry.rawValue
                  }
                </code>
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Additional Analysis for specific types */}
        {entry.key.startsWith('bubbleId:') && entry.parsedValue && (
          <Card>
            <CardHeader>
              <CardTitle>Chat Message Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {typeof entry.parsedValue === 'object' && (
                <div className="space-y-2">
                  {entry.parsedValue.text && (
                    <div>
                      <h4 className="font-semibold">Message Text:</h4>
                      <p className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        {entry.parsedValue.text.substring(0, 200)}
                        {entry.parsedValue.text.length > 200 && '...'}
                      </p>
                    </div>
                  )}
                  {entry.parsedValue.timestamp && (
                    <div>
                      <h4 className="font-semibold">Timestamp:</h4>
                      <p>{new Date(entry.parsedValue.timestamp).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
