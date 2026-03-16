'use client'

import * as React from 'react'
import { ChevronRight, FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Input, cn } from '@wren/ui'
import type { KbCollection } from './api'

interface KbCollectionTreeProps {
  collections: KbCollection[]
  selectedCollectionId: string | null
  onSelect: (id: string | null) => void
  onCreate: (name: string, parentId: string | null) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

interface TreeNode extends KbCollection {
  children: TreeNode[]
}

function buildTree(collections: KbCollection[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  for (const collection of collections) {
    nodeMap.set(collection.id, { ...collection, children: [] })
  }

  const roots: TreeNode[] = []
  for (const collection of collections) {
    const node = nodeMap.get(collection.id)!
    if (collection.parentId && nodeMap.has(collection.parentId)) {
      nodeMap.get(collection.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots.sort((a, b) => a.name.localeCompare(b.name))
}

export function KbCollectionTree({
  collections,
  selectedCollectionId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: KbCollectionTreeProps) {
  const [draftName, setDraftName] = React.useState('')
  const [parentId, setParentId] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingName, setEditingName] = React.useState('')
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})

  const tree = React.useMemo(() => buildTree(collections), [collections])

  async function handleCreate() {
    const name = draftName.trim()
    if (!name) return
    setDraftName('')
    await onCreate(name, parentId)
    setParentId(null)
  }

  async function handleRename(id: string) {
    const name = editingName.trim()
    if (!name) return
    setEditingId(null)
    await onRename(id, name)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this collection? Documents will be moved to Unassigned.')) return
    await onDelete(id)
    if (selectedCollectionId === id) onSelect(null)
  }

  function renderNode(node: TreeNode, depth = 0) {
    const isOpen = expanded[node.id] ?? true
    const isEditing = editingId === node.id
    const hasChildren = node.children.length > 0

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm',
            selectedCollectionId === node.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
          )}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((current) => ({ ...current, [node.id]: !isOpen }))}
            aria-label={isOpen ? 'Collapse collection' : 'Expand collection'}
          >
            <ChevronRight className={cn('h-4 w-4 transition-transform', hasChildren && isOpen && 'rotate-90', !hasChildren && 'opacity-30')} />
          </button>

          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => onSelect(node.id)}
          >
            <FolderTree className="h-4 w-4 shrink-0" />
            {isEditing ? (
              <Input
                autoFocus
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                onBlur={() => void handleRename(node.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleRename(node.id)
                  if (event.key === 'Escape') setEditingId(null)
                }}
                className="h-7"
              />
            ) : (
              <span className="truncate">{node.name}</span>
            )}
          </button>

          {!isEditing && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setParentId(node.id)
                  setDraftName('')
                }}
                className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label="Create sub-collection"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(node.id)
                  setEditingName(node.name)
                }}
                className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label="Rename collection"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(node.id)}
                className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                aria-label="Delete collection"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {parentId === node.id && (
          <div className="flex gap-2 pl-10">
            <Input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="New collection"
              className="h-8"
            />
            <Button type="button" size="sm" onClick={() => void handleCreate()}>
              Add
            </Button>
          </div>
        )}

        {hasChildren && isOpen && (
          <div className="space-y-1">
            {node.children.sort((a, b) => a.name.localeCompare(b.name)).map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Collections
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setParentId(null)
            setDraftName('')
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>

      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
          selectedCollectionId === null ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
        )}
      >
        All documents
      </button>

      {parentId === null && (
        <div className="flex gap-2">
          <Input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="New collection"
            className="h-8"
          />
          <Button type="button" size="sm" onClick={() => void handleCreate()}>
            Add
          </Button>
        </div>
      )}

      <div className="space-y-1">{tree.map((node) => renderNode(node))}</div>
    </div>
  )
}
