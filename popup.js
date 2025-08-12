document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('start');
  const stopButton = document.getElementById('stop');
  const statusText = document.getElementById('status');
  const currentActionText = document.getElementById('current-action');
  const progressText = document.getElementById('progress');
  const lastActionText = document.getElementById('last-action');
  
  // 检查当前状态
  chrome.storage.local.get(['isRunning', 'currentAction', 'progress', 'lastAction'], function(result) {
    if (result.isRunning) {
      statusText.textContent = '运行中';
      statusText.style.color = '#4CAF50';
    } else {
      statusText.textContent = '未运行';
      statusText.style.color = '#000';
    }
    
    // 更新详细状态信息
    if (result.currentAction) {
      currentActionText.textContent = result.currentAction;
      currentActionText.className = 'progress';
    }
    
    if (result.progress) {
      progressText.textContent = result.progress;
    }
    
    if (result.lastAction) {
      lastActionText.textContent = result.lastAction;
    }
  });

  // 开始自动签收
  startButton.addEventListener('click', function() {
    chrome.storage.local.set({
      isRunning: true,
      currentAction: '正在查找"待签收件"标签...',
      progress: '0/0',
      lastAction: '开始运行'
    }, function() {
      statusText.textContent = '运行中';
      statusText.style.color = '#4CAF50';
      currentActionText.textContent = '正在查找"待签收件"标签...';
      currentActionText.className = 'progress';
      progressText.textContent = '0/0';
      lastActionText.textContent = '开始运行';
      
      // 向当前标签页发送开始消息
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "start"});
      });
    });
  });

  // 停止自动签收
  stopButton.addEventListener('click', function() {
    chrome.storage.local.set({
      isRunning: false,
      currentAction: '已停止',
      lastAction: '用户手动停止'
    }, function() {
      statusText.textContent = '未运行';
      statusText.style.color = '#000';
      currentActionText.textContent = '已停止';
      currentActionText.className = '';
      
      // 向当前标签页发送停止消息
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "stop"});
      });
    });
  });
  
  // 监听来自content script的状态更新消息
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type === 'status_update') {
      if (request.currentAction) {
        currentActionText.textContent = request.currentAction;
        currentActionText.className = 'progress';
      }
      
      if (request.progress) {
        progressText.textContent = request.progress;
      }
      
      if (request.lastAction) {
        lastActionText.textContent = request.lastAction;
      }
      
      if (request.complete) {
        statusText.textContent = '完成';
        currentActionText.className = 'success';
      }
      
      if (request.error) {
        currentActionText.className = 'error';
      }
    }
  });
});