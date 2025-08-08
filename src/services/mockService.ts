import { ApiResponse } from '../types';

// Mock AI service for local testing (no API required)
export const sendMessageToMockAI = async (message: string): Promise<ApiResponse> => {
  // Creating a promise to simulate network delay
  return new Promise((resolve) => {
    // Simulate thinking/network delay
    setTimeout(() => {
      const lowerMessage = message.toLowerCase();
      let response = '';
      
      // Simple keyword-based response system
      if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        response = "Hello! How can I help you today?";
      } 
      else if (lowerMessage.includes('weather')) {
        response = "I don't have access to real-time weather data, but I can help with other questions!";
      } 
      else if (lowerMessage.includes('name')) {
        response = "I'm a local mock AI assistant. No API calls are being made to generate this response!";
      } 
      else if (lowerMessage.includes('programming language') || lowerMessage.includes('code')) {
        response = "For beginners, Python is often recommended due to its readable syntax and versatile applications. JavaScript is excellent for web development, and Scratch is perfect for absolute beginners learning programming concepts. This response is generated locally without any API calls.";
      }
      else if (lowerMessage.includes('help')) {
        response = "I'm here to help! You can ask me questions about programming, technology, or general knowledge. This is a mock AI response generated completely locally in your browser.";
      }
      else if (lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
        response = "You're welcome! Let me know if you need anything else.";
      }
      else if (lowerMessage.includes('framework')) {
        response = "Popular frameworks include React, Angular, and Vue for frontend; Node.js, Django, and Flask for backend. This response is generated locally without any API calls.";
      }
      else if (lowerMessage.includes('database')) {
        response = "Common databases include MySQL, PostgreSQL, MongoDB, and Redis. Each has different strengths depending on your application needs. This is a locally generated response.";
      }
      else if (lowerMessage.includes('learn')) {
        response = "Great resources for learning programming include freeCodeCamp, Codecademy, Khan Academy, and YouTube tutorials. This response is generated locally without any API calls.";
      }
      else if (lowerMessage.includes('best') || lowerMessage.includes('recommend')) {
        response = "'Best' often depends on your specific needs and context. Could you provide more details about what you're looking for? This response is generated locally.";
      }
      else if (lowerMessage.includes('how to')) {
        response = "That's a good question. I can provide step-by-step guidance, but I'd need more specific information about what you're trying to accomplish. This is a mock response generated locally.";
      }
      else if (lowerMessage.includes('difference between')) {
        response = "Comparing things requires understanding the key aspects of each. Could you provide more details about what you're comparing? This response is generated locally.";
      }
      else {
        response = "That's an interesting question. In a real implementation, I would connect to an LLM API to provide a comprehensive answer. For now, this is just a mock response to test your UI functionality.";
      }

      resolve({
        success: true,
        data: response
      });
    }, 1000); // 1 second delay to simulate thinking/network
  });
};