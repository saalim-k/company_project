'use client'
import * as React from 'react'
import { Suspense } from 'react'

// import { SearchForm } from "@/components/search-form"
// import { VersionSwitcher } from "@/components/version-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { ChevronRight, FolderKanban, House, FileText } from 'lucide-react'
import { usePathname } from 'next/navigation'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible'
import { Skeleton } from '@/components/ui/skeleton'

const data = {
  navMain: [
    {
      title: 'Day Three Project',
      url: '/',
      items: [
        {
          title: 'Home',
          url: '/',
          icon: House,
        },
        {
          title: 'File Upload',
          url: '/file-management/file-upload',
          icon: FolderKanban,
        },
      ],
    },
  ],
}

const filesPromise = fetch('http://localhost:8000/files/')
  .then(res => res.json())
  .then(data => {
    if (data.status !== 'success') throw new Error('Failed to fetch files')
    return data.files
  })

function LoadingSkeleton() {
  return (
    <div className='space-y-2 p-2'>
      <Skeleton className='h-4 w-[120px]' />
      <Skeleton className='h-4 w-[140px]' />
      <Skeleton className='h-4 w-[100px]' />
    </div>
  )
}

function AnalyzedFiles() {
  const files = React.use(filesPromise)
  const pathname = usePathname()

  if (!files.length) return null

  return (
    <SidebarGroup>
      <SidebarGroupLabel
        asChild
        className='group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      >
        <CollapsibleTrigger>
          Analyzed Files
          <ChevronRight className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90' />
        </CollapsibleTrigger>
      </SidebarGroupLabel>
      <CollapsibleContent>
        <SidebarGroupContent>
          <SidebarMenu>
            {files.map((file: string) => {
              const url = `/file-management/files/${encodeURIComponent(
                file
              )}`
              const isActive = pathname === url
              return (
                <SidebarMenuItem key={file}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <a href={url}>
                      <FileText className='h-4 w-4' />
                      <span>{file}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </CollapsibleContent>
    </SidebarGroup>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        {/* <VersionSwitcher
          versions={data.versions}
          defaultVersion={data.versions[0]}
        />
        <SearchForm /> */}
      </SidebarHeader>
      <SidebarContent className='gap-0'>
        {/* We create a collapsible SidebarGroup for each parent. */}
        {data.navMain.map(group => (
          <Collapsible
            key={group.title}
            title={group.title}
            defaultOpen
            className='group/collapsible'
          >
            <SidebarGroup>
              <SidebarGroupLabel
                asChild
                className='group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              >
                <CollapsibleTrigger>
                  {group.title}{' '}
                  <ChevronRight className='ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90' />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map(item => {
                      const isActive = pathname === item.url
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <a href={item.url}>
                              <item.icon />
                              <span>{item.title}</span>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}

        <Collapsible defaultOpen className='group/collapsible'>
          <Suspense fallback={<LoadingSkeleton />}>
            <AnalyzedFiles />
          </Suspense>
        </Collapsible>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
