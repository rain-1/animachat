/**
 * Plugin Registry
 * 
 * All available plugins are registered here.
 */

import { ToolPlugin } from './types.js'
import configPlugin from './config.js'
import notesPlugin from './notes.js'

// Register all available plugins
export const availablePlugins: Record<string, ToolPlugin> = {
  'config': configPlugin,
  'notes': notesPlugin,
}

export * from './types.js'
export * from './state.js'
export { PluginContextFactory } from './context-factory.js'

