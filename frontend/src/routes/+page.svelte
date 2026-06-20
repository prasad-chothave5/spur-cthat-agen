<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { sendMessage, loadHistory, type Message } from '$lib/api';
  import { sessionStore } from '$lib/session';

  interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
    error?: boolean;
  }

  let messages: ChatMessage[] = [];
  let inputText = '';
  let isLoading = false;
  let isTyping = false;
  let sessionId: string | undefined;
  let messagesContainer: HTMLElement;
  let inputEl: HTMLTextAreaElement;

  const MAX_INPUT_LENGTH = 2000;

  // ── Restore session on mount ─────────────────────────────────
  onMount(async () => {
    const unsubscribe = sessionStore.subscribe((id) => {
      sessionId = id;
    });

    if (sessionId) {
      try {
        const history = await loadHistory(sessionId);
        messages = history.messages.map((m) => ({
          id: m.id,
          sender: m.sender,
          text: m.text,
          timestamp: m.timestamp
        }));
        await scrollToBottom();
      } catch {
        // Session not found on server — clear it
        sessionStore.clear();
        messages = [];
      }
    }

    return unsubscribe;
  });

  async function scrollToBottom() {
    await tick();
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function formatTime(ts: string): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isLoading) return;
    if (text.length > MAX_INPUT_LENGTH) return;

    inputText = '';
    isLoading = true;

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    messages = [...messages, tempUserMsg];
    await scrollToBottom();

    // Show typing indicator
    await tick();
    isTyping = true;
    await scrollToBottom();

    try {
      const result = await sendMessage(text, sessionId);

      // Save session
      if (!sessionId || sessionId !== result.sessionId) {
        sessionStore.save(result.sessionId);
      }

      isTyping = false;

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: result.reply,
        timestamp: new Date().toISOString()
      };
      messages = [...messages, aiMsg];
    } catch (err) {
      isTyping = false;
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
        error: true
      };
      messages = [...messages, errorMsg];
    } finally {
      isLoading = false;
      await scrollToBottom();
      inputEl?.focus();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleNewChat() {
    sessionStore.clear();
    messages = [];
    inputText = '';
    inputEl?.focus();
  }
</script>

<div class="page">
  <!-- Header -->
  <header class="header">
    <div class="header-left">
      <div class="avatar">
        <span>S</span>
        <div class="status-dot"></div>
      </div>
      <div class="header-info">
        <h1>ShopBreezy Support</h1>
        <span class="online">Online · Typically replies instantly</span>
      </div>
    </div>
    <button class="new-chat-btn" on:click={handleNewChat} title="Start new chat">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      New chat
    </button>
  </header>

  <!-- Messages -->
  <main class="messages" bind:this={messagesContainer}>
    {#if messages.length === 0}
      <div class="empty-state">
        <div class="empty-icon">💬</div>
        <h2>Hi there! 👋</h2>
        <p>I'm the ShopBreezy support assistant.<br />Ask me anything about shipping, returns, or orders!</p>
        <div class="suggestions">
          {#each ['What\'s your return policy?', 'Do you ship to the USA?', 'What payment methods do you accept?'] as suggestion}
            <button
              class="suggestion-chip"
              on:click={() => { inputText = suggestion; inputEl?.focus(); }}
            >
              {suggestion}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#each messages as msg (msg.id)}
      <div class="message-row {msg.sender}" class:error={msg.error}>
        {#if msg.sender === 'ai'}
          <div class="msg-avatar">S</div>
        {/if}
        <div class="bubble">
          <p>{msg.text}</p>
          <span class="timestamp">{formatTime(msg.timestamp)}</span>
        </div>
      </div>
    {/each}

    {#if isTyping}
      <div class="message-row ai">
        <div class="msg-avatar">S</div>
        <div class="bubble typing-bubble">
          <span></span><span></span><span></span>
        </div>
      </div>
    {/if}
  </main>

  <!-- Input area -->
  <footer class="input-area">
    <div class="input-wrapper" class:at-limit={inputText.length > MAX_INPUT_LENGTH * 0.9}>
      <textarea
        bind:this={inputEl}
        bind:value={inputText}
        on:keydown={handleKeydown}
        placeholder="Type your message…"
        rows="1"
        maxlength={MAX_INPUT_LENGTH}
        disabled={isLoading}
      ></textarea>
      {#if inputText.length > MAX_INPUT_LENGTH * 0.8}
        <span class="char-count">{inputText.length}/{MAX_INPUT_LENGTH}</span>
      {/if}
    </div>
    <button
      class="send-btn"
      on:click={handleSend}
      disabled={isLoading || !inputText.trim()}
      aria-label="Send message"
    >
      {#if isLoading}
        <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      {:else}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      {/if}
    </button>
  </footer>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f0f2f5;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }

  .page {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 760px;
    height: 100vh;
    max-height: 860px;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.12);
    overflow: hidden;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: #1a1a2e;
    color: #fff;
    flex-shrink: 0;
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .avatar {
    position: relative;
    width: 42px; height: 42px;
    background: linear-gradient(135deg, #e94560, #f5a623);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 18px; color: #fff;
  }
  .status-dot {
    position: absolute; bottom: 1px; right: 1px;
    width: 10px; height: 10px;
    background: #4caf50; border-radius: 50%;
    border: 2px solid #1a1a2e;
  }
  .header-info h1 { font-size: 15px; font-weight: 600; }
  .online { font-size: 12px; color: #a0a8c0; }

  .new-chat-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; font-size: 13px; font-weight: 500;
    background: rgba(255,255,255,0.1); color: #fff;
    border: 1px solid rgba(255,255,255,0.2); border-radius: 20px;
    cursor: pointer; transition: background 0.2s;
  }
  .new-chat-btn:hover { background: rgba(255,255,255,0.18); }

  /* Messages */
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px 20px 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scroll-behavior: smooth;
  }
  .messages::-webkit-scrollbar { width: 6px; }
  .messages::-webkit-scrollbar-track { background: transparent; }
  .messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }

  /* Empty state */
  .empty-state {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; gap: 10px; padding: 40px 20px;
  }
  .empty-icon { font-size: 48px; }
  .empty-state h2 { font-size: 22px; color: #1a1a2e; }
  .empty-state p { color: #666; line-height: 1.6; font-size: 14px; }
  .suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 12px; }
  .suggestion-chip {
    padding: 8px 16px; font-size: 13px;
    background: #f0f2f5; color: #444;
    border: 1px solid #e0e0e0; border-radius: 20px;
    cursor: pointer; transition: all 0.15s;
  }
  .suggestion-chip:hover { background: #e8eaf0; border-color: #c0c4d0; }

  /* Message rows */
  .message-row {
    display: flex;
    gap: 8px;
    max-width: 85%;
  }
  .message-row.user { align-self: flex-end; flex-direction: row-reverse; }
  .message-row.ai { align-self: flex-start; }

  .msg-avatar {
    width: 30px; height: 30px; flex-shrink: 0;
    background: linear-gradient(135deg, #e94560, #f5a623);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #fff;
    align-self: flex-end;
  }

  .bubble {
    padding: 10px 14px;
    border-radius: 18px;
    font-size: 14px; line-height: 1.55;
    position: relative;
  }
  .bubble p { white-space: pre-wrap; word-break: break-word; }
  .message-row.user .bubble {
    background: #1a1a2e;
    color: #fff;
    border-bottom-right-radius: 4px;
  }
  .message-row.ai .bubble {
    background: #f0f2f5;
    color: #1a1a2e;
    border-bottom-left-radius: 4px;
  }
  .message-row.error .bubble {
    background: #fff0f0;
    color: #c0392b;
    border: 1px solid #f5c6c6;
  }
  .timestamp {
    display: block; font-size: 10px;
    margin-top: 4px; opacity: 0.55;
    text-align: right;
  }

  /* Typing indicator */
  .typing-bubble {
    display: flex; align-items: center; gap: 4px;
    padding: 12px 16px;
  }
  .typing-bubble span {
    width: 7px; height: 7px;
    background: #888; border-radius: 50%;
    animation: bounce 1.2s infinite;
  }
  .typing-bubble span:nth-child(2) { animation-delay: 0.2s; }
  .typing-bubble span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
    40% { transform: translateY(-6px); opacity: 1; }
  }

  /* Input area */
  .input-area {
    display: flex; align-items: flex-end; gap: 10px;
    padding: 14px 20px;
    border-top: 1px solid #eee;
    background: #fff;
    flex-shrink: 0;
  }
  .input-wrapper {
    flex: 1; position: relative;
    background: #f0f2f5; border-radius: 22px;
    border: 1.5px solid transparent;
    transition: border-color 0.2s;
  }
  .input-wrapper:focus-within { border-color: #1a1a2e; background: #fff; }
  .input-wrapper.at-limit { border-color: #e67e22; }

  textarea {
    width: 100%; padding: 10px 16px;
    background: transparent; border: none; outline: none;
    font-size: 14px; line-height: 1.5; color: #1a1a2e;
    resize: none; max-height: 120px; overflow-y: auto;
    font-family: inherit;
  }
  textarea::placeholder { color: #aaa; }
  textarea:disabled { opacity: 0.5; cursor: not-allowed; }

  .char-count {
    position: absolute; right: 12px; bottom: 8px;
    font-size: 10px; color: #e67e22;
  }

  .send-btn {
    width: 42px; height: 42px; flex-shrink: 0;
    background: #1a1a2e; color: #fff;
    border: none; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s;
  }
  .send-btn:hover:not(:disabled) { background: #e94560; transform: scale(1.05); }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  @media (max-width: 600px) {
    :global(body) { align-items: flex-start; }
    .page { border-radius: 0; max-height: 100vh; height: 100vh; }
  }
</style>
