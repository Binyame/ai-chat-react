import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../test-utils'
import ChatComponent from '../../components/ChatComponent'

// Mock axios
vi.mock('axios')

describe('ChatComponent', () => {
  it('should render welcome message when no chat history', () => {
    render(<ChatComponent />)

    expect(screen.getByText(/Start a Conversation/i)).toBeInTheDocument()
    expect(screen.getByText(/Ask me anything/i)).toBeInTheDocument()
  })

  it('should render input field and send button', () => {
    render(<ChatComponent />)

    const input = screen.getByPlaceholderText(/Type a message.../i)
    const sendButton = screen.getByRole('button', { name: /Send/i })

    expect(input).toBeInTheDocument()
    expect(sendButton).toBeInTheDocument()
  })

  it('should have send button disabled when input is empty', () => {
    render(<ChatComponent />)

    const sendButton = screen.getByRole('button', { name: /Send/i })

    expect(sendButton).toBeDisabled()
  })

  it('should display API info alert', () => {
    render(<ChatComponent />)

    expect(screen.getByText(/Direct chat with/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
