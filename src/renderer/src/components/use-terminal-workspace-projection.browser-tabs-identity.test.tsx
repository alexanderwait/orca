// @vitest-environment happy-dom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useTerminalWorkspaceProjection } from './use-terminal-workspace-projection'
import type { TerminalWorkspaceStoreController } from './use-terminal-workspace-store-bindings'

vi.mock('../store', () => ({ useAppStore: (selector: (s: unknown) => unknown) => selector({}) }))
vi.mock('../../../shared/feature-interactions', () => ({ hasFeatureInteraction: () => false }))
vi.mock('@/lib/foreground-terminal-tabs', () => ({ setForegroundTerminalTabIds: () => {} }))
vi.mock('@/lib/pane-manager/client-hosted-browser-row-state', () => ({
  useClientHostedBrowserRows: () => []
}))
vi.mock('./terminal/use-terminal-provider-snapshot-capability', () => ({
  useTerminalProviderSnapshotCapability: () => 0
}))
vi.mock('./terminal/split-group-mount', () => ({ getEffectiveLayoutForWorktree: () => undefined }))
vi.mock('./contextual-tours/use-contextual-tour', () => ({ useContextualTour: () => {} }))
vi.mock('./terminal/use-worktree-files', () => ({ useWorktreeFiles: () => [] }))

function controllerFor(
  browserTabsByWorktree: Record<string, { id: string }[]>,
  renderedActiveWorktreeId: string | null
) {
  return {
    activeGroupIdByWorktree: {},
    activeTabId: null,
    activeTabType: 'terminal',
    activeView: 'terminal',
    activeWorktreeId: null,
    activityTerminalPortals: [],
    browserTabsByWorktree,
    ensureWorktreeRootGroup: () => {},
    groupsByWorktree: {},
    hydrationSucceeded: true,
    layoutByWorktree: {},
    openFiles: [],
    renderedActiveWorktreeId,
    tabsByWorktree: {},
    workspaceSessionReady: true
  } as unknown as TerminalWorkspaceStoreController
}

describe('useTerminalWorkspaceProjection worktreeBrowserTabs identity', () => {
  // Why these three: each is a distinct path to the fallback, and a fix that
  // only stabilises one of them still churns the other two.
  it.each([
    ['a worktree with no entry in the map', {}, 'wt-1'],
    ['a worktree whose entry is absent while others exist', { other: [{ id: 'b1' }] }, 'wt-1'],
    ['no rendered worktree at all', { 'wt-1': [{ id: 'b1' }] }, null]
  ])('keeps one reference across re-renders for %s', (_name, map, worktreeId) => {
    const controller = controllerFor(map as Record<string, { id: string }[]>, worktreeId)
    const { result, rerender } = renderHook(() => useTerminalWorkspaceProjection(controller))

    const first = result.current.worktreeBrowserTabs
    rerender()
    rerender()

    expect(result.current.worktreeBrowserTabs).toBe(first)
    expect(result.current.worktreeBrowserTabs).toEqual([])
  })

  it('still hands back the real array when the worktree has tabs', () => {
    const tabs = [{ id: 'b1' }, { id: 'b2' }]
    const controller = controllerFor({ 'wt-1': tabs }, 'wt-1')
    const { result, rerender } = renderHook(() => useTerminalWorkspaceProjection(controller))

    const first = result.current.worktreeBrowserTabs
    rerender()

    expect(first).toBe(tabs)
    expect(result.current.worktreeBrowserTabs).toBe(tabs)
    expect(result.current.activeWorktreeBrowserTabIdsKey).toBe('b1,b2')
  })
})
