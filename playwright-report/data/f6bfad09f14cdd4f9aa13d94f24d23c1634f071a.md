# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - button [ref=e6] [cursor=pointer]:
        - img [ref=e7]
      - generic [ref=e9]: AI Chat Application
      - button "Switch to dark mode" [ref=e10] [cursor=pointer]:
        - img [ref=e11]
  - tablist "chat provider tabs" [ref=e17]:
    - tab "RAG with PDFs" [ref=e18] [cursor=pointer]
    - tab "OpenAI Chat" [active] [selected] [ref=e19] [cursor=pointer]: OpenAI Chat
    - tab "Gemini Chat" [ref=e20] [cursor=pointer]
  - generic [ref=e23]:
    - generic [ref=e24]:
      - generic [ref=e25]:
        - img [ref=e26]
        - heading "OpenAI Chat" [level=5] [ref=e28]
      - alert [ref=e29]:
        - img [ref=e31]
        - generic [ref=e33]:
          - text: Direct chat with
          - strong [ref=e34]: GPT-3.5 Turbo
          - text: via OpenAI API
    - generic [ref=e37]:
      - img [ref=e38]
      - heading "Start a Conversation" [level=5] [ref=e40]
      - paragraph [ref=e41]: Ask me anything! I'm powered by OpenAI's GPT-3.5 Turbo model.
    - generic [ref=e43]:
      - generic [ref=e45]:
        - textbox "Type a message..." [ref=e46]
        - group
      - button "Send" [disabled]:
        - text: Send
        - generic:
          - img
```