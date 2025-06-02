"use client"

import Link from "next/link"
import { Button } from "./ui/button"
import { ThemeToggle } from "./theme-toggle"
import { Settings, Search, BarChart3 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
import { Input } from "./ui/input"
import { useRouter, usePathname } from "next/navigation"
import { useState } from "react"

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto flex items-center justify-between h-16">
        <Link href="/" className="font-bold text-xl">
          Cursor Chat Browser
        </Link>
        
        <div className="flex-1 max-w-xl mx-8">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="search"
              placeholder="Search ask and agent logs..."
              className="w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </form>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Button variant="ghost" asChild>
              <Link href="/chat">Ask Logs</Link>
            </Button>
            {pathname.startsWith('/chat') && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </div>
            <div className="relative">
            <Button variant="ghost" asChild>
              <Link href="/composer">Agent Logs</Link>
            </Button>
            {pathname.startsWith('/composer') && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </div>

          <div className="relative">
            <Button variant="ghost" asChild>
              <Link href="/statistics">Statistics</Link>
            </Button>
            {pathname.startsWith('/statistics') && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
          </div>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/config" aria-label="Configuration">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Configuration
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/statistics" aria-label="Statistics">
                  <BarChart3 className="h-5 w-5" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Database Statistics
            </TooltipContent>
          </Tooltip>

          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
} 