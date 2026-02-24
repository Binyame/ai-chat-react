import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
process.env.VITE_API_BASE_URL = 'http://localhost:3001/api'

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn()

// Mock MUI icons to prevent "too many open files" error
vi.mock('@mui/icons-material', () => ({
  Send: () => 'SendIcon',
  Chat: () => 'ChatIcon',
  Upload: () => 'UploadIcon',
  Description: () => 'DescriptionIcon',
  Delete: () => 'DeleteIcon',
  Folder: () => 'FolderIcon',
  ExpandMore: () => 'ExpandMoreIcon',
  CloudUpload: () => 'CloudUploadIcon',
  AutoAwesome: () => 'AutoAwesomeIcon',
  History: () => 'HistoryIcon',
  Brightness4: () => 'Brightness4Icon',
  Brightness7: () => 'Brightness7Icon',
  Close: () => 'CloseIcon',
  Error: () => 'ErrorIcon',
  Warning: () => 'WarningIcon',
  Info: () => 'InfoIcon',
}))
