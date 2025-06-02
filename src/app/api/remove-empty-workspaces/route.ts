import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

export async function DELETE(request: NextRequest) {
  try {
    const workspacePath = process.env.WORKSPACE_PATH

    if (!workspacePath) {
      return NextResponse.json(
        { error: 'Workspace path not configured. Please set it in the configuration page.' },
        { status: 400 }
      )
    }

    // Get the list of workspace IDs to remove from the request body
    const body = await request.json()
    const { workspaceIds } = body

    if (!workspaceIds || !Array.isArray(workspaceIds)) {
      return NextResponse.json(
        { error: 'Invalid request. Expected workspaceIds array.' },
        { status: 400 }
      )
    }    const removedWorkspaces: string[] = []
    const errors: { workspaceId: string; error: string }[] = []

    for (const workspaceId of workspaceIds) {
      try {
        const workspaceDir = path.join(workspacePath, workspaceId)
        
        // Check if the workspace directory exists
        try {
          await fs.access(workspaceDir)
        } catch {
          errors.push({ workspaceId, error: 'Workspace directory not found' })
          continue
        }

        // Remove the entire workspace directory
        await fs.rm(workspaceDir, { recursive: true, force: true })
        removedWorkspaces.push(workspaceId)
      } catch (error) {
        console.error(`Error removing workspace ${workspaceId}:`, error)
        errors.push({ 
          workspaceId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return NextResponse.json({
      success: true,
      removedWorkspaces,
      removedCount: removedWorkspaces.length,
      errors,
      message: `Successfully removed ${removedWorkspaces.length} workspace(s)`
    })

  } catch (error) {
    console.error('Error removing workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to remove workspaces: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
