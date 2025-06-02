import { NextResponse } from 'next/server'
import path from 'path'
import { existsSync } from 'fs'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    const source = searchParams.get('source') // 'global' or workspace ID
    
    if (!key) {
      return NextResponse.json({ error: 'Key parameter is required' }, { status: 400 })
    }
    
    const workspacePath = process.env.WORKSPACE_PATH || ''
    
    if (!workspacePath) {
      return NextResponse.json({ 
        error: 'Workspace path not configured. Please configure it in the settings first.' 
      }, { status: 400 })
    }
    
    let dbPath: string
    let tableName: string
    let keyColumn: string
    
    if (source === 'global') {
      // Global database
      dbPath = path.join(workspacePath, '..', 'globalStorage', 'state.vscdb')
      tableName = 'cursorDiskKV'
      keyColumn = '[key]'
    } else {
      // Workspace database
      dbPath = path.join(workspacePath, source || '', 'state.vscdb')
      tableName = 'ItemTable'
      keyColumn = '[key]'
    }
    
    if (!existsSync(dbPath)) {
      return NextResponse.json({ error: 'Database not found' }, { status: 404 })
    }
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })
    
    const result = await db.get(`
      SELECT ${keyColumn}, value FROM ${tableName}
      WHERE ${keyColumn} = ?
    `, [key])
    
    await db.close()
    
    if (!result) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
    
    // Try to parse the value as JSON for better display
    let parsedValue
    try {
      parsedValue = JSON.parse(result.value)
    } catch {
      parsedValue = result.value
    }
    
    return NextResponse.json({
      key: result.key,
      rawValue: result.value,
      parsedValue,
      source,
      size: Buffer.byteLength(result.value, 'utf8'),
      sizeFormatted: (Buffer.byteLength(result.value, 'utf8') / (1024 * 1024)).toFixed(2) + ' MB'
    })
    
  } catch (error) {
    console.error('Failed to get database entry:', error)
    return NextResponse.json({ error: 'Failed to get database entry' }, { status: 500 })
  }
}
