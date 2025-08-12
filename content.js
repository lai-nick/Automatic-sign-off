// 初始化变量
let isRunning = false;
let intervalId = null;

// 监听来自popup的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "start") {
    startAutoSign();
  } else if (request.action === "stop") {
    stopAutoSign();
  }
});

// 检查插件启动时的状态
chrome.storage.local.get(['isRunning'], function(result) {
  if (result.isRunning) {
    startAutoSign();
  }
});

// 更新状态并发送消息到popup
function updateStatus(currentAction, lastAction, progress, complete = false, error = false) {
  // 保存到storage
  chrome.storage.local.set({
    currentAction: currentAction,
    lastAction: lastAction,
    progress: progress
  });
  
  // 发送消息到popup
  chrome.runtime.sendMessage({
    type: 'status_update',
    currentAction: currentAction,
    lastAction: lastAction,
    progress: progress,
    complete: complete,
    error: error
  });
  
  // 在控制台输出日志
  console.log(currentAction);
}

// 开始自动签收
function startAutoSign() {
  isRunning = true;
  
  updateStatus('正在查找"待签收件"标签...', '开始运行', '0/6');
  
  // 先点击"待签收件"标签
  clickPendingTab();
}

// 停止自动签收
function stopAutoSign() {
  isRunning = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  updateStatus('已停止', '用户手动停止', '0/6');
}

// 点击"待签收件"标签
function clickPendingTab() {
  if (!isRunning) return;
  
  const elements = findElementsByText("待签收件");
  
  if (elements.length > 0) {
    updateStatus('找到"待签收件"标签，正在点击...', '查找标签成功', '1/6');
    elements[0].click();
    
    // 等待页面加载（2秒后点击全选复选框）
    setTimeout(clickSelectAllCheckbox, 2000);
  } else {
    updateStatus('未找到"待签收件"标签，重试中...', '查找标签失败', '0/6', false, true);
    // 如果没找到，1秒后重试
    setTimeout(clickPendingTab, 1000);
  }
}

// 点击全选复选框
function clickSelectAllCheckbox() {
  if (!isRunning) return;
  
  updateStatus('正在查找全选复选框...', '页面已加载', '1/6');
  
  // 查找第一个复选框（通常是全选框）
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  let selectAllCheckbox = null;
  
  // 尝试找到ID为select-all的复选框
  selectAllCheckbox = document.getElementById('select-all');
  
  // 如果没找到特定ID的复选框，尝试找表头中的第一个复选框
  if (!selectAllCheckbox) {
    const tableHeaders = document.querySelectorAll('th');
    for (const th of tableHeaders) {
      const checkbox = th.querySelector('input[type="checkbox"]');
      if (checkbox) {
        selectAllCheckbox = checkbox;
        break;
      }
    }
  }
  
  // 如果还是没找到，使用第一个复选框
  if (!selectAllCheckbox && checkboxes.length > 0) {
    selectAllCheckbox = checkboxes[0];
  }
  
  if (selectAllCheckbox) {
    updateStatus('找到全选复选框，正在点击...', '查找全选复选框成功', '2/6');
    
    // 如果复选框未被选中，则点击它
    if (!selectAllCheckbox.checked) {
      selectAllCheckbox.click();
    }
    
    // 等待复选框状态更新（1秒后点击批量签收按钮）
    setTimeout(clickBatchSignButton, 1000);
  } else {
    updateStatus('未找到全选复选框，尝试直接点击批量签收...', '查找全选复选框失败', '1/6', false, true);
    // 如果没找到全选框，直接尝试点击批量签收按钮
    setTimeout(clickBatchSignButton, 1000);
  }
}

// 点击"批量签收"按钮
function clickBatchSignButton() {
  if (!isRunning) return;
  
  updateStatus('正在查找"批量签收"按钮...', '全选已完成', '2/6');
  
  const batchSignButtons = findElementsByText("批量签收");
  
  if (batchSignButtons.length > 0) {
    updateStatus('找到"批量签收"按钮，正在点击...', '查找批量签收按钮成功', '3/6');
    batchSignButtons[0].click();
    
    // 等待确认对话框出现（1.5秒后点击确认按钮）
    setTimeout(clickFirstConfirmButton, 1500);
  } else {
    updateStatus('未找到"批量签收"按钮，重试中...', '查找批量签收按钮失败', '2/6', false, true);
    // 如果没找到，1秒后重试
    setTimeout(clickBatchSignButton, 1000);
  }
}

// 点击第一个确定按钮
function clickFirstConfirmButton() {
  if (!isRunning) return;
  
  updateStatus('正在查找第一个"确定"按钮...', '等待确认对话框', '3/6');
  
  // 使用多种方法查找确定按钮
  let confirmButton = null;
  
  // 方法1：直接查找确定按钮（测试页面中的按钮）
  confirmButton = findButtonByClassAndText('confirm-btn', '确定');
  
  // 方法2：查找任何包含"确定"文本的按钮
  if (!confirmButton) {
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      if (button.textContent.trim() === '确定') {
        confirmButton = button;
        break;
      }
    }
  }
  
  // 方法3：查找对话框中的按钮
  if (!confirmButton) {
    // 查找可见的模态框
    const modalElements = document.querySelectorAll('.modal, .dialog, .popup, [role="dialog"]');
    for (const modal of modalElements) {
      if (window.getComputedStyle(modal).display !== 'none') {
        // 在可见的模态框中查找确定按钮
        const buttons = modal.querySelectorAll('button');
        for (const button of buttons) {
          if (button.textContent.trim() === '确定') {
            confirmButton = button;
            break;
          }
        }
        
        // 如果没找到确定按钮，尝试找确认按钮
        if (!confirmButton) {
          for (const button of buttons) {
            if (button.textContent.trim() === '确认') {
              confirmButton = button;
              break;
            }
          }
        }
        
        // 如果还是没找到，尝试找类名包含confirm的按钮
        if (!confirmButton) {
          const confirmBtns = modal.querySelectorAll('.confirm-btn, .ok-btn, [class*="confirm"], [class*="ok"]');
          if (confirmBtns.length > 0) {
            confirmButton = confirmBtns[0];
          }
        }
        
        // 如果还是没找到，使用最后一个按钮（通常是确定按钮）
        if (!confirmButton && buttons.length > 0) {
          confirmButton = buttons[buttons.length - 1];
        }
      }
    }
  }
  
  // 方法4：尝试直接调用函数（针对测试页面）
  if (!confirmButton && typeof window.batchSign === 'function') {
    updateStatus('找到批量签收函数，直接调用...', '使用函数调用替代按钮点击', '4/6');
    try {
      window.batchSign();
      
      // 直接调用函数后，跳过后续确定按钮点击，直接完成
      setTimeout(function() {
        updateStatus('签收操作已完成！', '签收成功', '6/6', true);
        isRunning = false;
      }, 1500);
      
      return;
    } catch (e) {
      console.error('调用batchSign函数失败:', e);
    }
  }
  
  if (confirmButton) {
    updateStatus('找到第一个"确定"按钮，正在点击...', '查找确定按钮成功', '4/6');
    
    // 使用多种方法尝试点击按钮
    try {
      // 方法1：直接点击
      confirmButton.click();
      
      // 方法2：如果直接点击不起作用，尝试创建并分发点击事件
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      confirmButton.dispatchEvent(clickEvent);
      
      // 等待可能出现的第二个确认对话框（1.5秒后）
      setTimeout(clickSecondConfirmButton, 1500);
    } catch (e) {
      console.error('点击确定按钮失败:', e);
      updateStatus('点击确定按钮失败，重试中...', '点击操作失败', '3/6', false, true);
      setTimeout(clickFirstConfirmButton, 1000);
    }
  } else {
    updateStatus('未找到第一个"确定"按钮，重试中...', '查找确定按钮失败', '3/6', false, true);
    // 如果没找到，1秒后重试
    setTimeout(clickFirstConfirmButton, 1000);
  }
}

// 点击第二个确定按钮（如果有）
function clickSecondConfirmButton() {
  if (!isRunning) return;
  
  updateStatus('正在查找第二个"确定"按钮...', '等待第二个确认对话框', '4/6');
  
  // 使用与第一个确定按钮相同的查找逻辑
  let confirmButton = null;
  
  // 查找任何包含"确定"文本的按钮
  const buttons = document.querySelectorAll('button');
  for (const button of buttons) {
    if (button.textContent.trim() === '确定') {
      confirmButton = button;
      break;
    }
  }
  
  // 如果没找到确定按钮，查找确认按钮
  if (!confirmButton) {
    for (const button of buttons) {
      if (button.textContent.trim() === '确认') {
        confirmButton = button;
        break;
      }
    }
  }
  
  // 查找对话框中的按钮
  if (!confirmButton) {
    // 查找可见的模态框
    const modalElements = document.querySelectorAll('.modal, .dialog, .popup, [role="dialog"]');
    for (const modal of modalElements) {
      if (window.getComputedStyle(modal).display !== 'none') {
        const modalButtons = modal.querySelectorAll('button');
        for (const button of modalButtons) {
          if (button.textContent.trim() === '确定' || button.textContent.trim() === '确认') {
            confirmButton = button;
            break;
          }
        }
        
        // 如果还是没找到，使用最后一个按钮
        if (!confirmButton && modalButtons.length > 0) {
          confirmButton = modalButtons[modalButtons.length - 1];
        }
      }
    }
  }
  
  if (confirmButton) {
    updateStatus('找到第二个"确定"按钮，正在点击...', '查找第二个确定按钮成功', '5/6');
    
    try {
      // 直接点击
      confirmButton.click();
      
      // 创建并分发点击事件
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      confirmButton.dispatchEvent(clickEvent);
      
      // 等待可能出现的第三个确认对话框（1.5秒后）
      setTimeout(clickThirdConfirmButton, 1500);
    } catch (e) {
      console.error('点击第二个确定按钮失败:', e);
      updateStatus('点击第二个确定按钮失败，尝试继续...', '点击操作失败', '4/6', false, true);
      setTimeout(clickThirdConfirmButton, 1000);
    }
  } else {
    // 如果没找到第二个确定按钮，可能不需要第二次确认，继续尝试第三个按钮
    updateStatus('未找到第二个"确定"按钮，尝试查找第三个按钮...', '可能不需要第二次确认', '4/6');
    setTimeout(clickThirdConfirmButton, 1000);
  }
}

// 点击第三个确定按钮（如果有）
function clickThirdConfirmButton() {
  if (!isRunning) return;
  
  updateStatus('正在查找第三个"确定"按钮...', '等待第三个确认对话框', '5/6');
  
  // 使用与前两个确定按钮相同的查找逻辑
  let confirmButton = null;
  
  // 查找任何包含"确定"文本的按钮
  const buttons = document.querySelectorAll('button');
  for (const button of buttons) {
    if (button.textContent.trim() === '确定') {
      confirmButton = button;
      break;
    }
  }
  
  // 如果没找到确定按钮，查找确认按钮
  if (!confirmButton) {
    for (const button of buttons) {
      if (button.textContent.trim() === '确认') {
        confirmButton = button;
        break;
      }
    }
  }
  
  // 查找对话框中的按钮
  if (!confirmButton) {
    // 查找可见的模态框
    const modalElements = document.querySelectorAll('.modal, .dialog, .popup, [role="dialog"]');
    for (const modal of modalElements) {
      if (window.getComputedStyle(modal).display !== 'none') {
        const modalButtons = modal.querySelectorAll('button');
        for (const button of modalButtons) {
          if (button.textContent.trim() === '确定' || button.textContent.trim() === '确认') {
            confirmButton = button;
            break;
          }
        }
        
        // 如果还是没找到，使用最后一个按钮
        if (!confirmButton && modalButtons.length > 0) {
          confirmButton = modalButtons[modalButtons.length - 1];
        }
      }
    }
  }
  
  if (confirmButton) {
    updateStatus('找到第三个"确定"按钮，正在点击...', '查找第三个确定按钮成功', '6/6');
    
    try {
      // 直接点击
      confirmButton.click();
      
      // 创建并分发点击事件
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      confirmButton.dispatchEvent(clickEvent);
      
      // 完成所有操作
      setTimeout(function() {
        updateStatus('签收操作已完成！', '签收成功', '6/6', true);
        isRunning = false;
      }, 1500);
    } catch (e) {
      console.error('点击第三个确定按钮失败:', e);
      updateStatus('点击第三个确定按钮失败，但继续完成操作', '点击操作失败', '5/6', false, true);
      setTimeout(function() {
        updateStatus('签收操作已完成！', '签收可能已成功', '6/6', true);
        isRunning = false;
      }, 1000);
    }
  } else {
    // 如果没找到第三个确定按钮，可能不需要第三次确认，完成操作
    updateStatus('未找到第三个"确定"按钮，可能不需要第三次确认', '签收操作已完成', '6/6', true);
    isRunning = false;
  }
}

// 通过类名和文本内容查找按钮
function findButtonByClassAndText(className, text) {
  const buttons = document.querySelectorAll('.' + className);
  for (const button of buttons) {
    if (button.textContent.trim() === text) {
      return button;
    }
  }
  return null;
}

// 通过文本内容查找元素
function findElementsByText(text) {
  const result = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue.includes(text) && node.parentElement) {
      result.push(node.parentElement);
    }
  }
  
  return result;
}