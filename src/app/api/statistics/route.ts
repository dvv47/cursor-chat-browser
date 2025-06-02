import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

// Helper function to calculate size in MB from string data
function calculateDataSizeMB(data: string | null): number {
  if (!data) return 0
  return Buffer.byteLength(data, 'utf8') / (1024 * 1024)
}

// Helper function to analyze global database
async function analyzeGlobalDatabase(workspacePath: string): Promise<GlobalDatabaseStats> {
  const globalDbPath = path.join(workspacePath, '..', 'globalStorage', 'state.vscdb')
    const stats: GlobalDatabaseStats = {
    totalEntries: 0,
    composerEntries: 0,
    otherEntries: 0,
    totalSizeMB: 0,
    composerDataSizeMB: 0,
    otherDataSizeMB: 0,
    entriesByType: {},
    entriesSizeByType: {},
    largestEntries: [],
    sampleKeys: {}
  }
  
  if (!existsSync(globalDbPath)) {
    return stats
  }
  
  try {
    const db = await open({
      filename: globalDbPath,
      driver: sqlite3.Database
    })
    
    const allEntries = await db.all(`
      SELECT [key], value FROM cursorDiskKV
    `)
    
    await db.close()
      stats.totalEntries = allEntries.length
    
    // Track largest entries and collect detailed statistics
    const allEntriesWithSize = []
    
    for (const entry of allEntries) {
      const key = entry.key as string
      const value = entry.value as string | null
      
      if (!value) continue // Skip null values
      
      const sizeMB = calculateDataSizeMB(value)
      
      stats.totalSizeMB += sizeMB
      
      // Track entry with size for sorting
      allEntriesWithSize.push({ key, sizeMB, value })
      
      if (key.startsWith('composerData:')) {
        stats.composerEntries++
        stats.composerDataSizeMB += sizeMB
            } else {
        stats.otherEntries++
        stats.otherDataSizeMB += sizeMB
        
        // Categorize other entries by prefix
        const keyType = key.split(':')[0] || 'unknown'
        stats.entriesByType[keyType] = (stats.entriesByType[keyType] || 0) + 1
        stats.entriesSizeByType[keyType] = (stats.entriesSizeByType[keyType] || 0) + sizeMB
        
        // Collect sample keys for each type (max 3 samples)
        if (!stats.sampleKeys[keyType]) {
          stats.sampleKeys[keyType] = []
        }
        if (stats.sampleKeys[keyType].length < 3) {
          stats.sampleKeys[keyType].push(key)
        }
      }
    }
    
    // Filter out data types with less than 100KB (0.1 MB) total size
    const MIN_SIZE_MB = 0.1
    const filteredEntriesByType: Record<string, number> = {}
    const filteredEntriesSizeByType: Record<string, number> = {}
    const filteredSampleKeys: Record<string, string[]> = {}
    
    for (const [keyType, count] of Object.entries(stats.entriesByType)) {
      const totalSize = stats.entriesSizeByType[keyType] || 0
      if (totalSize >= MIN_SIZE_MB) {
        filteredEntriesByType[keyType] = count
        filteredEntriesSizeByType[keyType] = totalSize
        filteredSampleKeys[keyType] = stats.sampleKeys[keyType] || []
      }
    }
    
    // Update stats with filtered data
    stats.entriesByType = filteredEntriesByType
    stats.entriesSizeByType = filteredEntriesSizeByType
    stats.sampleKeys = filteredSampleKeys
    
    // Find largest entries
    stats.largestEntries = allEntriesWithSize
      .sort((a, b) => b.sizeMB - a.sizeMB)
      .slice(0, 10)
      .map(entry => ({
        key: entry.key,
        sizeMB: entry.sizeMB,
        type: entry.key.split(':')[0] || 'unknown'
      }))
    
  } catch (error) {
    console.error('Error analyzing global database:', error)
  }
  
  return stats
}

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

export async function GET() {
  try {
    const workspacePath = process.env.WORKSPACE_PATH || ''
    
    if (!workspacePath) {
      return NextResponse.json({ 
        error: 'Workspace path not configured. Please configure it in the settings first.' 
      }, { status: 400 })
    }
    
    const workspaceDetails: WorkspaceStats[] = []
    
    const entries = await fs.readdir(workspacePath, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dbPath = path.join(workspacePath, entry.name, 'state.vscdb')
        const workspaceJsonPath = path.join(workspacePath, entry.name, 'workspace.json')
        
        // Skip if state.vscdb doesn't exist
        if (!existsSync(dbPath)) {
          continue
        }
        
        try {
          // Get workspace folder info
          let workspaceFolder = undefined
          try {
            const workspaceData = JSON.parse(await fs.readFile(workspaceJsonPath, 'utf-8'))
            workspaceFolder = workspaceData.folder
          } catch (error) {
            console.log(`No workspace.json found for ${entry.name}`)
          }

          const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
          })
            // Check for chat data
          const chatResult = await db.get(`
            SELECT value FROM ItemTable 
            WHERE [key] = 'workbench.panel.aichat.view.aichat.chatdata'
          `)
          
          let chatCount = 0
          let chatDataSizeMB = 0
          const hasChats = !!chatResult?.value
          if (hasChats) {
            try {
              const chatData = JSON.parse(chatResult.value)
              chatCount = chatData.tabs?.length || 0
              chatDataSizeMB = calculateDataSizeMB(chatResult.value)
            } catch (error) {
              console.error('Error parsing chat data:', error)
            }
          }
          
          // Check for composer data
          const composerResult = await db.get(`
            SELECT value FROM ItemTable 
            WHERE [key] = 'composer.composerData'
          `)
          
          let composerCount = 0
          let composerDataSizeMB = 0
          const hasComposers = !!composerResult?.value
          if (hasComposers) {
            try {
              const composerData = JSON.parse(composerResult.value)
              composerCount = composerData.allComposers?.length || 0
              composerDataSizeMB = calculateDataSizeMB(composerResult.value)
            } catch (error) {
              console.error('Error parsing composer data:', error)
            }
          }
          
          await db.close()
            workspaceDetails.push({
            id: entry.name,
            hasChats,
            hasComposers,
            chatCount,
            composerCount,
            folder: workspaceFolder,
            chatDataSizeMB,
            composerDataSizeMB,
            totalSizeMB: chatDataSizeMB + composerDataSizeMB
          })
          
        } catch (error) {
          console.error(`Error processing workspace ${entry.name}:`, error)
        }
      }
    }
      // Calculate statistics
    const totalWorkspaces = workspaceDetails.length
    const workspacesWithChats = workspaceDetails.filter(w => w.hasChats).length
    const workspacesWithComposers = workspaceDetails.filter(w => w.hasComposers).length
    const workspacesWithBoth = workspaceDetails.filter(w => w.hasChats && w.hasComposers).length
    const workspacesWithNeither = workspaceDetails.filter(w => !w.hasChats && !w.hasComposers).length
    const workspacesWithOnlyChats = workspaceDetails.filter(w => w.hasChats && !w.hasComposers).length
    const workspacesWithOnlyComposers = workspaceDetails.filter(w => !w.hasChats && w.hasComposers).length
    const totalChats = workspaceDetails.reduce((sum, w) => sum + w.chatCount, 0)
    const totalComposers = workspaceDetails.reduce((sum, w) => sum + w.composerCount, 0)
    const totalWorkspaceDataSizeMB = workspaceDetails.reduce((sum, w) => sum + w.totalSizeMB, 0)
    
    // Analyze global database
    const globalDatabase = await analyzeGlobalDatabase(workspacePath)
    
    const statistics: DatabaseStatistics = {
      totalWorkspaces,
      workspacesWithChats,
      workspacesWithComposers,
      workspacesWithBoth,
      workspacesWithNeither,
      workspacesWithOnlyChats,
      workspacesWithOnlyComposers,
      totalChats,
      totalComposers,
      totalWorkspaceDataSizeMB,
      workspaceDetails,
      globalDatabase
    }
    
    return NextResponse.json(statistics)
  } catch (error) {
    console.error('Failed to get statistics:', error)
    return NextResponse.json({ error: 'Failed to get statistics' }, { status: 500 })
  }
}
