"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WorkspaceStats {
  id: string;
  hasChats: boolean;
  hasComposers: boolean;
  chatCount: number;
  composerCount: number;
  folder?: string;
  chatDataSizeMB: number;
  composerDataSizeMB: number;
  totalSizeMB: number;
}

interface GlobalDatabaseStats {
  totalEntries: number;
  composerEntries: number;
  otherEntries: number;
  totalSizeMB: number;
  composerDataSizeMB: number;
  otherDataSizeMB: number;
  entriesByType: Record<string, number>;
  entriesSizeByType: Record<string, number>;
  largestEntries: Array<{
    key: string;
    sizeMB: number;
    type: string;
  }>;
  sampleKeys: Record<string, string[]>;
}

interface DatabaseStatistics {
  totalWorkspaces: number;
  workspacesWithChats: number;
  workspacesWithComposers: number;
  workspacesWithBoth: number;
  workspacesWithNeither: number;
  workspacesWithOnlyChats: number;
  workspacesWithOnlyComposers: number;
  totalChats: number;
  totalComposers: number;
  totalWorkspaceDataSizeMB: number;
  workspaceDetails: WorkspaceStats[];
  globalDatabase: GlobalDatabaseStats;
}

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<DatabaseStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeSuccess, setRemoveSuccess] = useState<string | null>(null)

  // Helper function to format file sizes
  const formatSize = (sizeMB: number): string => {
    if (sizeMB < 0.001) return '< 1 KB'
    if (sizeMB < 1) return `${(sizeMB * 1024).toFixed(1)} KB`
    if (sizeMB < 1024) return `${sizeMB.toFixed(2)} MB`
    return `${(sizeMB / 1024).toFixed(2)} GB`
  }

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch('/api/statistics')
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch statistics')
        }
        const data = await response.json()
        setStatistics(data)
      } catch (error) {
        console.error('Failed to fetch statistics:', error)
        setError(error instanceof Error ? error.message : 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [])
  const handleRemoveEmptyWorkspaces = async () => {
    console.log('Button clicked!'); // Debug log
    if (!statistics) return
    
    const emptyWorkspaces = statistics.workspaceDetails
      .filter(w => !w.hasChats && !w.hasComposers)
      .map(w => w.id)
    
    console.log('Empty workspaces:', emptyWorkspaces); // Debug log
    
    if (emptyWorkspaces.length === 0) {
      setError('No empty workspaces to remove')
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove ${emptyWorkspaces.length} workspace(s) without any logs? This action cannot be undone.`
    )
    
    if (!confirmed) return

    setRemoving(true)
    setError(null)
    setRemoveSuccess(null)

    try {
      const response = await fetch('/api/remove-empty-workspaces', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceIds: emptyWorkspaces }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove workspaces')
      }

      setRemoveSuccess(`Successfully removed ${result.removedCount} workspace(s)`)
      
      // Refresh statistics
      const statsResponse = await fetch('/api/statistics')
      if (statsResponse.ok) {
        const newStats = await statsResponse.json()
        setStatistics(newStats)
      }

    } catch (error) {
      console.error('Failed to remove workspaces:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove workspaces')
    } finally {
      setRemoving(false)
    }
  }

  if (loading) {
    return <Loading message="Loading statistics..." />
  }

  if (error) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-red-500">{error}</p>
        {error.includes('Workspace path not configured') && (
          <div>
            <p className="text-muted-foreground">
              Please configure your Cursor workspace path first.
            </p>
            <Link 
              href="/config" 
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Go to Configuration
            </Link>
          </div>
        )}
      </div>
    )
  }

  if (!statistics) {
    return (
      <div className="text-center py-8">
        <p>No statistics available</p>
      </div>
    )
  }

  const percentageWithNeither = statistics.totalWorkspaces > 0 
    ? ((statistics.workspacesWithNeither / statistics.totalWorkspaces) * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Database Statistics</h1>
        <p className="text-muted-foreground">
          Analysis of Cursor workspace databases and their content
        </p>
      </div>

      {/* Success/Error Messages */}
      {removeSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{removeSuccess}</p>
        </div>
      )}      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalWorkspaces}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Workspaces with Ask Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.workspacesWithChats}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.totalWorkspaces > 0 ? ((statistics.workspacesWithChats / statistics.totalWorkspaces) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Workspaces with Agent Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.workspacesWithComposers}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.totalWorkspaces > 0 ? ((statistics.workspacesWithComposers / statistics.totalWorkspaces) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Workspace Data Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatSize(statistics.totalWorkspaceDataSizeMB)}</div>
            <p className="text-xs text-muted-foreground">
              Total data in workspaces
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
              Workspaces without Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {statistics.workspacesWithNeither}
            </div>
            <p className="text-xs text-red-600 dark:text-red-400">
              {percentageWithNeither}% of total workspaces
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Distribution</CardTitle>
            <CardDescription>
              How workspaces are distributed across different log types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Both Ask & Agent Logs</span>
              <Badge variant="default">{statistics.workspacesWithBoth}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Only Ask Logs</span>
              <Badge variant="secondary">{statistics.workspacesWithOnlyChats}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Only Agent Logs</span>
              <Badge variant="secondary">{statistics.workspacesWithOnlyComposers}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">No Logs</span>
              <Badge variant="destructive">{statistics.workspacesWithNeither}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Content</CardTitle>
            <CardDescription>
              Overall count of logs across all workspaces
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Ask Logs</span>
              <Badge variant="outline">{statistics.totalChats}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Total Agent Logs</span>
              <Badge variant="outline">{statistics.totalComposers}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Average Ask Logs per Workspace</span>
              <Badge variant="outline">
                {statistics.totalWorkspaces > 0 ? (statistics.totalChats / statistics.totalWorkspaces).toFixed(1) : 0}
              </Badge>
            </div>            <div className="flex justify-between items-center">
              <span className="text-sm">Average Agent Logs per Workspace</span>
              <Badge variant="outline">
                {statistics.totalWorkspaces > 0 ? (statistics.totalComposers / statistics.totalWorkspaces).toFixed(1) : 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Database Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Global Database Analysis</CardTitle>
          <CardDescription>
            Analysis of the global Cursor database (non-workspace specific data)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Storage Overview</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Entries</span>
                  <Badge variant="outline">{statistics.globalDatabase.totalEntries}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Size</span>
                  <Badge variant="outline">{formatSize(statistics.globalDatabase.totalSizeMB)}</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Composer Data</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Composer Entries</span>
                  <Badge variant="secondary">{statistics.globalDatabase.composerEntries}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Composer Data Size</span>
                  <Badge variant="secondary">{formatSize(statistics.globalDatabase.composerDataSizeMB)}</Badge>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground">Other Data</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Other Entries</span>
                  <Badge variant="outline">{statistics.globalDatabase.otherEntries}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Other Data Size</span>
                  <Badge variant="outline">{formatSize(statistics.globalDatabase.otherDataSizeMB)}</Badge>
                </div>
              </div>
            </div>
          </div>
            {Object.keys(statistics.globalDatabase.entriesByType).length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Data Types Distribution</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(statistics.globalDatabase.entriesByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const sizeMB = statistics.globalDatabase.entriesSizeByType?.[type] || 0;
                    const samples = statistics.globalDatabase.sampleKeys?.[type] || [];
                    return (
                      <div key={type} className="p-3 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-mono font-medium">{type}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">{count} entries</Badge>
                            <Badge variant="secondary" className="text-xs">{formatSize(sizeMB)}</Badge>
                          </div>
                        </div>
                        {samples.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <div className="font-medium mb-1">Sample keys:</div>
                            {samples.map((sample, idx) => (
                              <div key={idx} className="font-mono truncate">{sample}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
            {statistics.globalDatabase.largestEntries && statistics.globalDatabase.largestEntries.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Largest Database Entries</h4>
              <div className="space-y-2">
                {statistics.globalDatabase.largestEntries.map((entry, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded border">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-mono truncate">{entry.key}</div>
                      <div className="text-xs text-muted-foreground">Type: {entry.type}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="destructive">{formatSize(entry.sizeMB)}</Badge>
                      <Link
                        href={`/database-entry?key=${encodeURIComponent(entry.key)}&source=global`}
                        className="text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded transition-colors"
                      >
                        View Content
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workspaces without any logs */}
      {statistics.workspacesWithNeither > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-300">
              Workspaces Without Any Logs ({statistics.workspacesWithNeither})
            </CardTitle>
            <CardDescription>
              These workspaces have database files but no chat or composer logs
            </CardDescription>
            <div className="mt-4">
              <Button
                variant="destructive"
                onClick={handleRemoveEmptyWorkspaces}
                disabled={removing}
                className="w-full sm:w-auto"
              >
                {removing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Removing...
                  </>
                ) : (
                  `Remove All ${statistics.workspacesWithNeither} Empty Workspaces`
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                This will permanently delete workspace folders that contain no chat or agent logs.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace Hash</TableHead>
                    <TableHead>Folder</TableHead>
                    <TableHead className="text-center">Ask Logs</TableHead>
                    <TableHead className="text-center">Agent Logs</TableHead>
                    <TableHead className="text-center">Data Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statistics.workspaceDetails
                    .filter(w => !w.hasChats && !w.hasComposers)
                    .map((workspace) => (
                      <TableRow key={workspace.id}>
                        <TableCell className="font-mono text-sm">
                          {workspace.id}
                        </TableCell>
                        <TableCell>
                          {workspace.folder ? (
                            <div className="flex items-start space-x-2">
                              <span className="text-gray-500 mt-1">📁</span>
                              <span 
                                className="break-all text-sm"
                                title={workspace.folder}
                              >
                                {workspace.folder}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No folder</span>
                          )}
                        </TableCell>                        <TableCell className="text-center">
                          <Badge variant="outline">0</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">0</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono text-xs">
                            {formatSize(workspace.totalSizeMB)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All workspaces table */}
      <Card>
        <CardHeader>
          <CardTitle>All Workspaces Details</CardTitle>
          <CardDescription>
            Complete breakdown of all workspaces and their log counts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace Hash</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead className="text-center">Ask Logs</TableHead>
                  <TableHead className="text-center">Agent Logs</TableHead>
                  <TableHead className="text-center">Data Size</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statistics.workspaceDetails
                  .sort((a, b) => {
                    // Sort by total logs count (descending)
                    const aTotal = a.chatCount + a.composerCount
                    const bTotal = b.chatCount + b.composerCount
                    return bTotal - aTotal
                  })
                  .map((workspace) => (
                    <TableRow key={workspace.id}>
                      <TableCell className="font-mono text-sm">
                        {workspace.id}
                      </TableCell>
                      <TableCell>
                        {workspace.folder ? (
                          <div className="flex items-start space-x-2">
                            <span className="text-gray-500 mt-1">📁</span>
                            <span 
                              className="break-all text-sm"
                              title={workspace.folder}
                            >
                              {workspace.folder}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No folder</span>
                        )}
                      </TableCell>                      <TableCell className="text-center">
                        <Badge variant={workspace.chatCount > 0 ? "default" : "outline"}>
                          {workspace.chatCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={workspace.composerCount > 0 ? "default" : "outline"}>
                          {workspace.composerCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-xs">
                          {formatSize(workspace.totalSizeMB)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {workspace.hasChats && workspace.hasComposers && (
                          <Badge variant="default">Both</Badge>
                        )}
                        {workspace.hasChats && !workspace.hasComposers && (
                          <Badge variant="secondary">Ask Only</Badge>
                        )}
                        {!workspace.hasChats && workspace.hasComposers && (
                          <Badge variant="secondary">Agent Only</Badge>
                        )}
                        {!workspace.hasChats && !workspace.hasComposers && (
                          <Badge variant="destructive">Empty</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
