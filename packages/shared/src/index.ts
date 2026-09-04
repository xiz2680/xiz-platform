/**
 * @xiz-platform/shared
 *
 * Shared business logic for XIZ Platform.
 * Used by the Electron app.
 *
 * Import specific modules via subpath exports:
 *   import { CraftAgent } from '@xiz-platform/shared/agent';
 *   import { loadStoredConfig } from '@xiz-platform/shared/config';
 *   import { getCredentialManager } from '@xiz-platform/shared/credentials';
 *   import { CraftMcpClient } from '@xiz-platform/shared/mcp';
 *   import { debug } from '@xiz-platform/shared/utils';
 *   import { loadSource, createSource, getSourceCredentialManager } from '@xiz-platform/shared/sources';
 *   import { createWorkspace, loadWorkspace } from '@xiz-platform/shared/workspaces';
 *
 * Available modules:
 *   - agent: CraftAgent SDK wrapper, plan tools
 *   - auth: OAuth, token management, auth state
 *   - clients: Craft API client
 *   - config: Storage, models, preferences
 *   - credentials: Encrypted credential storage
 *   - mcp: MCP client, connection validation
 *   - prompts: System prompt generation
 *   - sources: Workspace-scoped source management (MCP, API, local)
 *   - utils: Debug logging, file handling, summarization
 *   - validation: URL validation
 *   - version: Version and installation management
 *   - workspaces: Workspace management (top-level organizational unit)
 */

// Export branding (standalone, no dependencies)
export * from './branding.ts';
