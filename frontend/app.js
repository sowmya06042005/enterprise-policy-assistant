/**
 * Enterprise Policy Assistant Frontend Client
 */

// Centralized API Configuration
const API_BASE = (window.location.origin && window.location.origin !== 'null' && !window.location.protocol.startsWith('file')) ? window.location.origin : 'http://127.0.0.1:8001';

document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatHistory = document.getElementById('chat-history');
    const ingestBtn = document.getElementById('ingest-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const statusPill = document.getElementById('status-pill');
    const statusText = document.getElementById('status-text');
    const chipBtns = document.querySelectorAll('.chip-btn');

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
    });

    // Enter key submits (Shift+Enter for newline)
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    // Initial Health Check
    checkHealth();

    const sendBtn = document.getElementById('send-btn');

    // Form Submit Handler
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = userInput.value.trim();
        if (!question) return;

        if (question.length > 500) {
            showToast('Question is too long (maximum 500 characters allowed).', 'error');
            return;
        }

        // Disable input & send button to prevent duplicate submission
        userInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;

        // Render User Message
        appendUserMessage(question);

        // Clear & Reset Input
        userInput.value = '';
        userInput.style.height = 'auto';

        // Render Assistant Typing Indicator
        const loadingId = appendTypingIndicator();
        scrollToBottom();

        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: 'Server Error' }));
                throw new Error(errData.detail || 'Failed to get answer');
            }

            const data = await response.json();
            removeMessage(loadingId);
            appendAssistantMessage(data.answer, data.sources, data.relevance_score || data.confidence);

        } catch (err) {
            removeMessage(loadingId);
            appendAssistantMessage(
                `⚠️ **Error:** Unable to process your request. (${err.message})`,
                [],
                0
            );
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            userInput.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
            userInput.focus();
            scrollToBottom();
        }
    });

    // Quick Prompt Chips
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.getAttribute('data-query');
            if (query) {
                userInput.value = query;
                chatForm.dispatchEvent(new Event('submit'));
            }
        });
    });

    // Sync / Re-ingest Knowledge Base
    ingestBtn.addEventListener('click', async () => {
        ingestBtn.disabled = true;
        ingestBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Syncing...`;
        showToast('Syncing knowledge base with Pinecone...', 'info');

        try {
            const res = await fetch(`${API_BASE}/ingest`, { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                showToast(`Success: ${data.message}`, 'success');
            } else {
                showToast(`Sync issue: ${data.message || 'Unknown error'}`, 'error');
            }
        } catch (err) {
            showToast(`Ingestion failed: ${err.message}`, 'error');
        } finally {
            ingestBtn.disabled = false;
            ingestBtn.innerHTML = `<i class="fa-solid fa-rotate"></i> Sync Knowledge Base`;
        }
    });

    // Clear Chat
    clearChatBtn.addEventListener('click', () => {
        chatHistory.innerHTML = `
            <div class="message assistant-message">
                <div class="avatar assistant-avatar">
                    <i class="fa-solid fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="sender-name">Policy Assistant</span>
                        <span class="badge badge-rag"><i class="fa-solid fa-brain"></i> RAG Grounded</span>
                    </div>
                    <div class="message-body">
                        Hello! I am your Enterprise Policy Assistant. I can help answer your questions regarding <strong>Leave Policies</strong>, <strong>Travel & Expense Reimbursements</strong>, and <strong>Health Insurance Coverage</strong> based directly on verified company documentation.
                        <br><br>
                        Feel free to select a suggested question on the left or type your query below.
                    </div>
                </div>
            </div>
        `;
        showToast('Conversation history cleared.', 'success');
    });

    // API Health Check Function
    async function checkHealth() {
        try {
            const res = await fetch(`${API_BASE}/health`);
            if (res.ok) {
                const data = await res.json();
                statusPill.className = 'status-pill online';
                statusText.textContent = data.pinecone_ready ? 'System Online' : 'Index Initializing';
            } else {
                throw new Error('Health check failed');
            }
        } catch (e) {
            statusPill.className = 'status-pill offline';
            statusText.textContent = 'Backend Offline';
        }
    }

    // Append User Message to Chat
    function appendUserMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message user-message';
        msgDiv.innerHTML = `
            <div class="avatar user-avatar">
                <i class="fa-solid fa-user"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">You</span>
                </div>
                <div class="message-body">${escapeHtml(text)}</div>
            </div>
        `;
        chatHistory.appendChild(msgDiv);
    }

    // Append Assistant Message with Markdown & Sources
    function appendAssistantMessage(answerText, sources = [], confidence = 0) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message assistant-message';

        const formattedBody = formatMarkdown(answerText);

        let sourcesHtml = '';
        if (sources && sources.length > 0) {
            const sourceListHtml = sources.map(s => `
                <div class="source-item">
                    <div class="source-header">
                        <span class="source-title"><i class="fa-solid fa-file-text"></i> ${escapeHtml(s.source)}</span>
                        ${s.score ? `<span class="source-score"><i class="fa-solid fa-bullseye"></i> Vector Match: ${(s.score * 100).toFixed(1)}%</span>` : ''}
                    </div>
                    <div class="source-snippet">${escapeHtml(s.text)}</div>
                </div>
            `).join('');

            sourcesHtml = `
                <div class="sources-container">
                    <button class="sources-toggle" onclick="toggleSources(this)">
                        <i class="fa-solid fa-chevron-right"></i> Cited Sources (${sources.length})
                    </button>
                    <div class="sources-list" style="display: none;">
                        ${sourceListHtml}
                    </div>
                </div>
            `;
        }

        const confidenceBadge = confidence > 0 
            ? `<span class="badge badge-confidence" title="Pinecone Vector Similarity Score"><i class="fa-solid fa-chart-simple"></i> Vector Match ${(confidence * 100).toFixed(0)}%</span>` 
            : '';

        msgDiv.innerHTML = `
            <div class="avatar assistant-avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">Policy Assistant</span>
                    <div>
                        <span class="badge badge-rag"><i class="fa-solid fa-brain"></i> Grounded</span>
                        ${confidenceBadge}
                    </div>
                </div>
                <div class="message-body">${formattedBody}</div>
                ${sourcesHtml}
            </div>
        `;
        chatHistory.appendChild(msgDiv);
    }

    // Append Typing Loader
    function appendTypingIndicator() {
        const id = 'typing-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message assistant-message';
        msgDiv.id = id;
        msgDiv.innerHTML = `
            <div class="avatar assistant-avatar">
                <i class="fa-solid fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        chatHistory.appendChild(msgDiv);
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // Toast Notification System
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // Helper: Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Helper: Basic Markdown Parser
    function formatMarkdown(text) {
        if (!text) return '';
        let html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');

        // Parse bullet points
        const lines = html.split('\n');
        let inList = false;
        let result = [];

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                if (!inList) {
                    result.push('<ul>');
                    inList = true;
                }
                result.push(`<li>${trimmed.substring(2)}</li>`);
            } else if (/^\d+\.\s/.test(trimmed)) {
                if (!inList) {
                    result.push('<ol>');
                    inList = true;
                }
                const content = trimmed.replace(/^\d+\.\s/, '');
                result.push(`<li>${content}</li>`);
            } else {
                if (inList) {
                    result.push('</ul>');
                    inList = false;
                }
                if (trimmed) {
                    result.push(`<p>${trimmed}</p>`);
                }
            }
        });

        if (inList) result.push('</ul>');
        return result.join('');
    }
});

// Global Toggle for Source Cards
function toggleSources(btn) {
    const list = btn.nextElementSibling;
    const icon = btn.querySelector('i');
    if (list.style.display === 'none' || !list.style.display) {
        list.style.display = 'flex';
        icon.className = 'fa-solid fa-chevron-down';
    } else {
        list.style.display = 'none';
        icon.className = 'fa-solid fa-chevron-right';
    }
}
