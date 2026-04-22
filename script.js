class KChat {
    constructor() {
        this.socket = io();
        this.currentUser = '';
        this.avatarColor = '#5865f2';
        this.isTyping = false;
        this.typingTimer = null;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.showLoginModal();
    }

    cacheElements() {
        this.loginModal = document.getElementById('loginModal');
        this.usernameInput = document.getElementById('usernameInput');
        this.avatarColorInput = document.getElementById('avatarColor');
        this.joinBtn = document.getElementById('joinBtn');
        this.app = document.getElementById('app');
        this.messageInput = document.getElementById('messageInput');
        this.messagesContainer = document.getElementById('messages');
        this.sendButton = document.getElementById('sendButton');
        this.onlineCount = document.getElementById('onlineCount');
        this.totalOnline = document.getElementById('totalOnline');
        this.userList = document.getElementById('userList');
        this.currentUserAvatar = document.getElementById('currentUserAvatar');
        this.currentUsername = document.getElementById('currentUsername');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.typingIndicatorInput = document.getElementById('typingIndicatorInput');
        this.generalUsers = document.getElementById('generalUsers');
    }

    bindEvents() {
        // Login
        this.joinBtn.addEventListener('click', () => this.joinChat());
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinChat();
        });

        // Chat
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.sendMessage();
            } else if (e.key === 'Enter') {
                this.handleTyping(true);
            }
        });

        this.messageInput.addEventListener('input', () => {
            this.autoResizeTextarea();
            this.handleTyping(this.messageInput.value.trim().length > 0);
        });

        this.messageInput.addEventListener('blur', () => {
            this.handleTyping(false);
        });

        // Socket events
        this.socket.on('systemMessage', (data) => this.addSystemMessage(data));
        this.socket.on('newMessage', (message) => this.addMessage(message));
        this.socket.on('userJoined', (username) => this.showNotification(`${username} đã tham gia`));
        this.socket.on('userLeft', (username) => this.showNotification(`${username} đã rời đi`));
        this.socket.on('userList', (userList) => this.updateUserList(userList));
        this.socket.on('messageHistory', (history) => this.loadMessageHistory(history));
        this.socket.on('userTyping', (data) => this.updateTypingIndicator(data));
    }

    showLoginModal() {
        this.usernameInput.focus();
    }

    joinChat() {
        const username = this.usernameInput.value.trim();
        if (username.length < 2) {
            this.shakeElement(this.usernameInput);
            return;
        }

        this.currentUser = username;
        this.avatarColor = this.avatarColorInput.value;
        
        // Update UI
        this.currentUsername.textContent = this.currentUser;
        this.currentUserAvatar.textContent = this.currentUser.charAt(0).toUpperCase();
        this.currentUserAvatar.style.background = this.avatarColor;
        
        // Hide modal, show app
        this.loginModal.style.display = 'none';
        this.app.style.display = 'flex';

        // Join socket room
        this.socket.emit('join', this.currentUser);

        // Focus message input
        setTimeout(() => {
            this.messageInput.focus();
        }, 300);
    }

        sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text || this.sendButton.disabled) return;

        this.socket.emit('chatMessage', {
            text: text,
            avatarColor: this.avatarColor
        });

        this.messageInput.value = '';
        this.autoResizeTextarea();
        this.handleTyping(false);
        this.sendButton.disabled = true;

        setTimeout(() => {
            this.sendButton.disabled = false;
        }, 500);
    }

    handleTyping(isTyping) {
        if (this.isTyping === isTyping) return;
        this.isTyping = isTyping;

        clearTimeout(this.typingTimer);
        this.typingTimer = setTimeout(() => {
            this.socket.emit('typing', false);
        }, 1000);

        this.socket.emit('typing', isTyping);
    }

    addMessage(message) {
        const div = document.createElement('div');
        div.className = 'message';
        div.innerHTML = `
            <div class="message-avatar" style="background: ${message.avatarColor}">
                ${message.author.charAt(0).toUpperCase()}
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${this.escapeHtml(message.author)}</span>
                    <span class="message-time">${this.formatTime(new Date(message.timestamp))}</span>
                </div>
                <div class="message-text">${this.formatMessageText(message.text)}</div>
            </div>
        `;
        
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    addSystemMessage(data) {
        const div = document.createElement('div');
        div.className = 'message system-message';
        div.style.justifyContent = 'center';
        div.style.margin = '20px 0';
        
        div.innerHTML = `
            <div style="background: rgba(79, 84, 92, 0.3); padding: 12px 24px; border-radius: 16px; font-style: italic;">
                ${data.text}
            </div>
        `;
        
        this.messagesContainer.appendChild(div);
        this.scrollToBottom();
    }

    updateTypingIndicator(data) {
        if (data.isTyping) {
            this.typingIndicator.textContent = `${data.username} đang gõ...`;
        } else {
            this.typingIndicator.textContent = '';
        }
    }

    updateUserList(userList) {
        this.onlineCount.textContent = userList.length;
        this.totalOnline.textContent = userList.length;
        this.generalUsers.textContent = `${userList.length} online`;
        
        this.userList.innerHTML = '';
        userList.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'online-user';
            userDiv.innerHTML = `
                <div class="user-avatar-small" style="background: #5865f2">
                    ${user.username.charAt(0).toUpperCase()}
                </div>
                <span>${this.escapeHtml(user.username)}</span>
            `;
            this.userList.appendChild(userDiv);
        });
    }

    loadMessageHistory(history) {
        this.messagesContainer.innerHTML = '';
        history.forEach(msg => this.addMessage(msg));
    }

    showNotification(text) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = text;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    formatTime(date) {
        return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    formatMessageText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code style="background: rgba(79,84,92,0.3); padding: 2px 4px; border-radius: 4px;">$1</code>')
            .replace(/https?:\/\/[^\s]+/g, '<a href="$&" target="_blank" style="color: #5865f2;">$&</a>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    shakeElement(element) {
        element.style.animation = 'shake 0.5s';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #43b581;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .typing-dots {
        display: none;
        gap: 2px;
    }
    
    .typing-dots.active {
        display: flex;
    }
    
    .typing-dots span {
        width: 4px;
        height: 4px;
        background: #72767d;
        border-radius: 50%;
        animation: typing 1.4s infinite;
    }
    
    .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes typing {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-10px); }
    }
    
    .online-user {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
    }
    
    .online-user:hover {
        background: rgba(79, 84, 92, 0.16);
    }
    
    .user-avatar-small {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        color: white;
        flex-shrink: 0;
    }
    
    .users-title {
        padding: 16px;
        font-size: 12px;
        color: #8e9297;
        font-weight: 600;
        text-transform: uppercase;
        border-bottom: 1px solid #202225;
    }
    
    .header-right {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .input-wrapper {
        flex: 1;
        position: relative;
    }
    
    #typingIndicator {
        font-size: 14px;
        color: #72767d;
        font-style: italic;
    }
    
    .welcome-message {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        color: #72767d;
        font-size: 18px;
    }
    
    .channel-users {
        margin-left: auto;
        font-size: 12px;
        color: #43b581;
        font-weight: 600;
    }
`;

// Copy toàn bộ CSS từ code trước vào đây (sidebar, main-chat, etc...)
document.head.appendChild(style);

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    new KChat();
});
