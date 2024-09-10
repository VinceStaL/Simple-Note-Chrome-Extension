let currentTabId = 'tab-0';
let chatHistory = {};
let tabsData = [];

document.addEventListener('DOMContentLoaded', function() {
  const addTabButton = document.getElementById('add-tab');
  const deleteTabButton = document.getElementById('delete-tab');
  const exportTabButton = document.getElementById('export-tab');

  // Load saved chat history and tabs data
  chrome.storage.local.get(['chatHistory', 'tabsData']).then((result) => {
    if (result.chatHistory) {
      chatHistory = JSON.parse(result.chatHistory);
    }
    if (result.tabsData && result.tabsData.length > 0) {
      tabsData = result.tabsData;
    } else {
      tabsData = ['tab-0']; // Default tab if no data
    }

    // Initialize tabs
    tabsData.forEach((tabId, index) => {
      const tab = createTab(tabId, index + 1);
      document.getElementById('tabs').appendChild(tab);
      createChatArea(tabId);
    });

    switchTab(tabsData[0]); // Switch to the first tab
  });

  // Add new tab when clicking the + button
  addTabButton.addEventListener('click', addNewTab);

  // Delete selected tab when clicking the - button
  deleteTabButton.addEventListener('click', deleteSelectedTab);

  // Export current tab when clicking the > button
  exportTabButton.addEventListener('click', exportCurrentTab);

  // Close popup when clicking outside
  window.addEventListener('blur', function() {
    saveAllData();
  });
});

function createTab(id, number) {
  const tab = document.createElement('button');
  tab.textContent = number;
  tab.id = id;
  tab.classList.add('tab');
  tab.addEventListener('click', () => switchTab(id));
  return tab;
}

function createChatArea(id) {
  const chatArea = document.createElement('div');
  chatArea.id = `chat-area-${id}`;
  chatArea.classList.add('chat-area');
  chatArea.style.display = 'none';

  const textarea = document.createElement('textarea');
  textarea.id = `secureInput-${id}`;
  textarea.classList.add('secure-input');
  textarea.addEventListener('input', function() {
    adjustTextareaHeight(textarea);
    saveChatContent(id);
  });

  chatArea.appendChild(textarea);
  document.getElementById('chat-container').appendChild(chatArea);

  return chatArea;
}

function switchTab(tabId) {
  // Hide all chat areas
  document.querySelectorAll('.chat-area').forEach(area => area.style.display = 'none');

  // Show the selected chat area
  const chatArea = document.getElementById(`chat-area-${tabId}`);
  chatArea.style.display = 'block';

  // Load saved content
  const textarea = chatArea.querySelector('textarea');
  textarea.value = chatHistory[tabId] ? decrypt(chatHistory[tabId]) : '';
  adjustTextareaHeight(textarea);

  // Update active tab styling
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');

  currentTabId = tabId;
}

function addNewTab() {
  const tabsContainer = document.getElementById('tabs');
  const newTabId = `tab-${Date.now()}`; // Use timestamp for unique IDs
  const newTab = createTab(newTabId, tabsContainer.children.length + 1);
  tabsContainer.appendChild(newTab);
  createChatArea(newTabId);
  tabsData.push(newTabId);
  switchTab(newTabId);
  saveAllData();
}

function deleteSelectedTab() {
  if (tabsData.length === 1) {
    // Clear the content of the last tab instead of showing a warning
    const textarea = document.querySelector(`#chat-area-${currentTabId} textarea`);
    textarea.value = '';
    chatHistory[currentTabId] = encrypt('');
    adjustTextareaHeight(textarea);
    saveAllData();
    return;
  }

  const index = tabsData.indexOf(currentTabId);
  if (index > -1) {
    tabsData.splice(index, 1);
    document.getElementById(currentTabId).remove();
    document.getElementById(`chat-area-${currentTabId}`).remove();
    delete chatHistory[currentTabId];

    // Switch to the previous tab or the first tab if deleting the first
    const newTabId = tabsData[index - 1] || tabsData[0];
    switchTab(newTabId);

    // Renumber remaining tabs
    document.querySelectorAll('.tab').forEach((tab, idx) => {
      tab.textContent = idx + 1;
    });
  }
  saveAllData();
}

function adjustTextareaHeight(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 500) + 'px';
}

function saveChatContent(tabId) {
  const textarea = document.getElementById(`secureInput-${tabId}`);
  chatHistory[tabId] = encrypt(textarea.value);
  saveAllData();
}

function saveAllData() {
  chrome.storage.local.set({
    chatHistory: JSON.stringify(chatHistory),
    tabsData: tabsData
  });
}

function encrypt(text) {
  // Implement your encryption logic here
  return btoa(text); // Simple base64 encoding for demonstration
}

function decrypt(encryptedText) {
  // Implement your decryption logic here
  return atob(encryptedText); // Simple base64 decoding for demonstration
}

function exportCurrentTab() {
  const textarea = document.querySelector(`#chat-area-${currentTabId} textarea`);
  const content = textarea.value;
  const blob = new Blob([content], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `note_${timestamp}.txt`;

  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  }, function(downloadId) {
    URL.revokeObjectURL(url);
  });
}