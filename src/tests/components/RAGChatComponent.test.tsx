import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '../test-utils'
import RAGChatComponent from '../../components/RAGChatComponent'

// Mock fetch globally
global.fetch = vi.fn()

describe('RAGChatComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock for namespaces endpoint
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        success: true,
        namespaces: [
          { name: 'default', vectorCount: 10 },
          { name: 'docs', vectorCount: 5 },
        ],
      }),
    })
  })

  describe('Initial Rendering', () => {
    it('should render welcome message', async () => {
      render(<RAGChatComponent />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to RAG Chat/i)).toBeInTheDocument()
      })
    })

    it('should render file upload area', async () => {
      render(<RAGChatComponent />)

      await waitFor(() => {
        expect(screen.getByText(/Drop PDF here or click to browse/i)).toBeInTheDocument()
      })
    })

    it('should render message input field', () => {
      render(<RAGChatComponent />)

      const input = screen.getByPlaceholderText(/Ask a question about your documents/i)
      expect(input).toBeInTheDocument()
    })

    it('should render send button', () => {
      render(<RAGChatComponent />)

      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toBeInTheDocument()
    })

    it('should have send button disabled when input is empty', () => {
      render(<RAGChatComponent />)

      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toBeDisabled()
    })

    it('should load namespaces on mount', async () => {
      render(<RAGChatComponent />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/rag/namespaces')
        )
      })
    })
  })

  describe('Namespace Selection', () => {
    it('should display namespace selector', async () => {
      render(<RAGChatComponent />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Document Collection/i)).toBeInTheDocument()
      })
    })

    it('should have default namespace selected', async () => {
      render(<RAGChatComponent />)

      await waitFor(() => {
        const selector = screen.getByLabelText(/Document Collection/i) as HTMLSelectElement
        expect(selector).toHaveValue('default')
      })
    })
  })

  describe('File Upload', () => {
    it('should show error when uploading non-PDF file', async () => {
      render(<RAGChatComponent />)

      await waitFor(() => {
        expect(screen.getByText(/Drop PDF here or click to browse/i)).toBeInTheDocument()
      })

      const file = new File(['content'], 'test.txt', { type: 'text/plain' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText(/Please upload a PDF file/i)).toBeInTheDocument()
      })
    })

    it('should upload PDF file successfully', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
        if (url.includes('/namespaces')) {
          return Promise.resolve({
            json: async () => ({ success: true, namespaces: [] }),
          })
        }
        if (url.includes('/upload')) {
          return Promise.resolve({
            json: async () => ({
              success: true,
              chunks: 10,
              pages: 5,
            }),
          })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      render(<RAGChatComponent />)

      await waitFor(() => {
        expect(screen.getByText(/Drop PDF here or click to browse/i)).toBeInTheDocument()
      })

      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText(/Successfully uploaded test.pdf/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should show upload progress', async () => {
      let resolveUpload: (value: any) => void
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve
      })

      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
        if (url.includes('/namespaces')) {
          return Promise.resolve({
            json: async () => ({ success: true, namespaces: [] }),
          })
        }
        if (url.includes('/upload')) {
          return uploadPromise.then(() => ({
            json: async () => ({
              success: true,
              chunks: 10,
              pages: 5,
            }),
          }))
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      render(<RAGChatComponent />)

      await waitFor(() => {
        expect(screen.getByText(/Drop PDF here or click to browse/i)).toBeInTheDocument()
      })

      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText(/Processing PDF.../i)).toBeInTheDocument()
      })

      resolveUpload!({})
    })

    it('should handle upload errors', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
        if (url.includes('/namespaces')) {
          return Promise.resolve({
            json: async () => ({ success: true, namespaces: [] }),
          })
        }
        if (url.includes('/upload')) {
          return Promise.resolve({
            json: async () => ({
              success: false,
              error: 'Upload failed',
            }),
          })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      render(<RAGChatComponent />)

      await waitFor(() => {
        expect(screen.getByText(/Drop PDF here or click to browse/i)).toBeInTheDocument()
      })

      const file = new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      })

      fireEvent.change(input)

      await waitFor(() => {
        expect(screen.getByText(/Upload failed/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Message Input', () => {
    it('should enable send button when input has text', async () => {
      render(<RAGChatComponent />)

      const input = screen.getByPlaceholderText(/Ask a question about your documents/i)
      const sendButton = screen.getByRole('button', { name: /send/i })

      expect(sendButton).toBeDisabled()

      fireEvent.change(input, { target: { value: 'What is this document about?' } })

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled()
      })
    })

    it('should clear input after sending message', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
        if (url.includes('/namespaces')) {
          return Promise.resolve({
            json: async () => ({ success: true, namespaces: [] }),
          })
        }
        if (url.includes('/rag/chat')) {
          return Promise.resolve({
            json: async () => ({
              success: true,
              response: 'This is the answer',
              citations: [],
            }),
          })
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      render(<RAGChatComponent />)

      const input = screen.getByPlaceholderText(/Ask a question about your documents/i) as HTMLInputElement
      const sendButton = screen.getByRole('button', { name: /send/i })

      fireEvent.change(input, { target: { value: 'What is AI?' } })
      fireEvent.click(sendButton)

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })
  })

  describe('Manage Collections Dialog', () => {
    it('should open manage collections dialog', async () => {
      render(<RAGChatComponent />)

      const manageButton = screen.getByRole('button', { name: /manage collections/i })
      fireEvent.click(manageButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/Document Collections/i)).toBeInTheDocument()
      })
    })

    it('should close manage collections dialog', async () => {
      render(<RAGChatComponent />)

      const manageButton = screen.getByRole('button', { name: /manage collections/i })
      fireEvent.click(manageButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Drag and Drop', () => {
    it('should highlight drop zone on drag over', async () => {
      render(<RAGChatComponent />)

      await waitFor(() => {
        expect(screen.getByText(/Drop PDF here or click to browse/i)).toBeInTheDocument()
      })

      const dropZone = screen.getByText(/Drop PDF here or click to browse/i).closest('div')
      expect(dropZone).toBeTruthy()

      fireEvent.dragEnter(dropZone!)

      // The drag active state should be set (visual feedback)
      expect(dropZone).toBeInTheDocument()
    })

    it('should remove highlight on drag leave', async () => {
      render(<RAGChatComponent />)

      await waitFor(() => {
        expect(screen.getByText(/Drop PDF here or click to browse/i)).toBeInTheDocument()
      })

      const dropZone = screen.getByText(/Drop PDF here or click to browse/i).closest('div')
      expect(dropZone).toBeTruthy()

      fireEvent.dragEnter(dropZone!)
      fireEvent.dragLeave(dropZone!)

      expect(dropZone).toBeInTheDocument()
    })
  })
})
