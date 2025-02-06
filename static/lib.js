const OLLAMA_PROXY = '__OLLAMA_PROXY__';

// 在全局作用域声明变量
let inputTextarea;
let sendButton;
let ollamaUrlInput;
let modelSelect;
let chatHistory = [];
let fileInput;
let previewContainer;
let chatHistoryContainer; // 将DOM容器提升到全局作用域

// 在全局作用域添加配置对象
const CONFIG_KEY = 'ollamaLensConfig';
let appConfig = {
    ollamaUrl: 'http://localhost:11434',
    model: '',
    useHistory: true,
    formatOutput: false,
    streamOutput: true,
    historyLength: 5
};

// 创建一个 axios 实例，设置基础配置
const api = axios.create({
    timeout: 30000*10, // 5分钟超时
    headers: {
        'Content-Type': 'application/json'
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // 初始化变量
    inputTextarea = document.querySelector('textarea');
    sendButton = document.querySelector('.send-button');
    ollamaUrlInput = document.getElementById('ollamaUrl');
    modelSelect = document.getElementById('modelSelect');
    chatHistoryContainer = document.querySelector('.chat-history .h-full');
    fileInput = document.querySelector('input[type="file"]');
    previewContainer = document.querySelector('.preview-container');
    
    fileInput.addEventListener('change', function(e) {
        previewContainer.innerHTML = ''; // 清空之前的预览
        
        Array.from(this.files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-24 h-24 object-cover rounded-lg border-2 border-blue-200';
                img.title = file.name;
                
                const wrapper = document.createElement('div');
                wrapper.className = 'relative group';
                wrapper.innerHTML = `
                    ${img.outerHTML}
                    <button class="absolute -top-2 -right-2 bg-red-500 text-white 
                            rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 
                            transition-opacity duration-200 hover:bg-red-600">
                        ×
                    </button>
                `;
                
                wrapper.querySelector('button').addEventListener('click', () => {
                    wrapper.remove();
                    // 这里可以添加从FileList中移除文件的逻辑
                });
                
                previewContainer.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
    });

    document.querySelectorAll('.help-tooltip').forEach(container => {
        let timeout;
        
        container.addEventListener('mouseenter', () => {
            clearTimeout(timeout);
            container.querySelector('.tooltip').classList.remove('hidden');
        });
        
        container.addEventListener('mouseleave', () => {
            timeout = setTimeout(() => {
                container.querySelector('.tooltip').classList.add('hidden');
            }, 300);
        });
        
        container.addEventListener('click', (e) => {
            e.preventDefault();
            const tooltip = container.querySelector('.tooltip');
            tooltip.classList.toggle('hidden');
        });
    });

    document.querySelector('.clear-history-btn').addEventListener('click', clearHistory);

    // 先加载本地配置
    loadConfig();
    
    // 然后获取模型列表
    fetchModels();

    // 添加点击事件监听
    sendButton.addEventListener('click', sendMessage);

    // 添加键盘事件监听（Ctrl+Enter发送）
    inputTextarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            sendMessage();
        }
    });

    // 为所有配置控件添加输入事件监听
    const configControls = [
        ollamaUrlInput,
        modelSelect,
        document.getElementById('historyToggle'),
        document.querySelector('input[name="formatOutput"]'),
        document.querySelector('input[name="streamOutput"]'),
        document.querySelector('input[name="historyLength"]'),
        document.querySelector('input[name="temperature"]'),
        document.querySelector('input[name="topP"]'),
        document.querySelector('input[name="topK"]'),
        document.querySelector('input[name="repeatPenalty"]'),
        document.querySelector('input[name="contextLength"]')
    ];

    configControls.forEach(control => {
        control.addEventListener('change', () => {
            saveConfig();
        
        });
    });

    // 添加Temperature和Top P的输入事件监听
    document.querySelector('input[name="temperature"]').addEventListener('input', function() {
        document.getElementById('temperatureValue').textContent = (this.value / 100).toFixed(2);
    });

    document.querySelector('input[name="topP"]').addEventListener('input', function() {
        document.getElementById('topPValue').textContent = (this.value / 100).toFixed(2);
    });

    // 初始化显示值
    document.getElementById('temperatureValue').textContent = (appConfig.temperature || 0.7).toFixed(2);
    document.getElementById('topPValue').textContent = (appConfig.top_p || 0.9).toFixed(2);
    document.querySelector('input[name="temperature"]').value = (appConfig.temperature || 0.7) * 100;
    document.querySelector('input[name="topP"]').value = (appConfig.top_p || 0.9) * 100;

    document.querySelector('.reset-defaults-btn').addEventListener('click', resetToDefaults);

    // 模型切换时清除图片
    modelSelect.addEventListener('change', () => {
        fileInput.value = '';
        previewContainer.innerHTML = '';
        saveConfig();
    });
});

function clearHistory() {
    if(confirm('确定要清除所有对话历史吗？此操作不可恢复！')) {
        chatHistoryContainer.innerHTML = `
            <div class="space-y-3">
                <div class="text-center py-6 text-gray-400 text-sm temporary-clear-message">
                    <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    已成功清空对话历史
                </div>
            </div>
        `;
        chatHistory = [];
    }
}

// 新增清空功能函数
function toggleClearButton(input) {
    const clearBtn = document.getElementById('clearUrlBtn');
    const defaultValue = 'http://localhost:11434';
    clearBtn.classList.toggle('active', input.value !== defaultValue);
}

function clearOllamaUrl() {
    const input = document.getElementById('ollamaUrl');
    input.value = 'http://localhost:11434';
    toggleClearButton(input);
    saveConfig();
    input.focus();
}

function restoreDefault(input) {
    if (input.value.trim() === '') {
        input.value = defaultValue;
        toggleClearButton(input);
    }
}

// 修改 fetchModels 函数
function fetchModels() {
    modelSelect.innerHTML = '<option value="" disabled selected>正在加载模型...</option>';
    
    api.get(`${OLLAMA_PROXY}/api/tags`)
        .then(response => {
            const data = response.data;
            modelSelect.innerHTML = data.models
                .map(model => `<option value="${model.name}">${model.name}</option>`)
                .join('');
            
            // 模型加载完成后恢复选中状态
            restoreModelSelection();
            
            if (data.models.length === 0) {
                modelSelect.innerHTML = '<option value="" disabled>未找到可用模型</option>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            modelSelect.innerHTML = '<option value="" disabled>无法获取模型列表</option>';
            alert('获取模型失败，请检查服务器连接');
        });
}

// 新增模型选中状态恢复函数
function restoreModelSelection() {
    const savedModel = localStorage.getItem(CONFIG_KEY) 
        ? JSON.parse(localStorage.getItem(CONFIG_KEY)).model
        : null;
    
    if (savedModel) {
        const optionExists = Array.from(modelSelect.options).some(
            opt => opt.value === savedModel
        );
        
        if (optionExists) {
            modelSelect.value = savedModel;
            return;
        }
    }
    
    // 默认选中第一个可用模型
    if (modelSelect.options.length > 1) {
        modelSelect.selectedIndex = 1;
    }
}

// 新增加载配置函数
function loadConfig() {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
        appConfig = JSON.parse(savedConfig);
        ollamaUrlInput.value = appConfig.ollamaUrl;
        modelSelect.value = appConfig.model;
        document.getElementById('historyToggle').checked = appConfig.useHistory;
        document.querySelector('input[name="formatOutput"]').checked = appConfig.formatOutput;
        document.querySelector('input[name="streamOutput"]').checked = appConfig.streamOutput;
        document.querySelector('input[name="historyLength"]').value = appConfig.historyLength;
        document.querySelector('input[name="temperature"]').value = appConfig.temperature * 100;
        document.querySelector('input[name="topP"]').value = appConfig.top_p * 100;
        document.querySelector('input[name="topK"]').value = appConfig.top_k;
        document.querySelector('input[name="repeatPenalty"]').value = appConfig.repeat_penalty;
        document.querySelector('input[name="contextLength"]').value = appConfig.num_ctx;
        // 触发change事件以更新UI
        if (appConfig.model) {
            modelSelect.dispatchEvent(new Event('change'));
        }
        
        // 延迟设置模型值，等待模型列表加载完成
        setTimeout(() => {
            if (appConfig.model && modelSelect.querySelector(`option[value="${appConfig.model}"]`)) {
                modelSelect.value = appConfig.model;
            } else {
                modelSelect.value = '';
            }
        }, 500);
    }
}

// 修改 saveConfig 函数
function saveConfig() {
    appConfig = {
        ollamaUrl: ollamaUrlInput.value,
        model: modelSelect.value || '',
        useHistory: document.getElementById('historyToggle').checked,
        formatOutput: document.querySelector('input[name="formatOutput"]').checked,
        streamOutput: document.querySelector('input[name="streamOutput"]').checked,
        historyLength: parseInt(document.querySelector('input[name="historyLength"]').value),
        temperature: parseFloat(document.querySelector('input[name="temperature"]').value) / 100,
        top_p: parseFloat(document.querySelector('input[name="topP"]').value) / 100,
        top_k: parseInt(document.querySelector('input[name="topK"]').value),
        repeat_penalty: parseFloat(document.querySelector('input[name="repeatPenalty"]').value),
        num_ctx: parseInt(document.querySelector('input[name="contextLength"]').value)
    };
    
    localStorage.setItem(CONFIG_KEY, JSON.stringify(appConfig));
}

async function getImageBase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result.split(',')[1];
            resolve(base64Data);
        };
        reader.readAsDataURL(file);
    });
}

// 新增显示消息的函数
function appendMessageToHistory(message, isUser = true) {
    // 确保消息容器存在
    let messagesContainer = chatHistoryContainer.querySelector('.space-y-3');
    if (!messagesContainer) {
        messagesContainer = document.createElement('div');
        messagesContainer.className = 'space-y-3';
        chatHistoryContainer.appendChild(messagesContainer);
    } else {
        // 首次发送消息时清除欢迎界面
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        // 清除临时提示信息
        const tempMessage = messagesContainer.querySelector('.temporary-clear-message');
        if (tempMessage) {
            tempMessage.remove();
        }
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex flex-col items-${isUser ? 'end' : 'start'}`;
    
    const contentHTML = isUser 
        ? `<div class="bg-blue-600 text-white rounded-xl p-3 max-w-[85%] shadow-md">
              <p class="leading-relaxed">${message.content}</p>
              <div class="text-xs text-blue-100/80 mt-1">${new Date().toLocaleTimeString()}</div>
           </div>`
        : `<div class="bg-gray-50 border border-gray-100 rounded-xl p-3 max-w-[85%] shadow-sm">
              <p class="leading-relaxed text-gray-700">${message.content}</p>
              <div class="text-xs text-gray-500/80 mt-1">${new Date().toLocaleTimeString()}</div>
           </div>`;
    
    messageDiv.innerHTML = contentHTML;
    messagesContainer.appendChild(messageDiv);
    // 自动滚动到底部
    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
}

// 修改 sendMessage 函数
async function sendMessage() {
    const message = inputTextarea.value.trim();
    if (!message) return;

    try {
        sendButton.disabled = true;
        sendButton.textContent = '发送中...';

        // 处理图片上传
        let images = [];
        if (fileInput.files.length > 0) {
            images = await Promise.all(
                Array.from(fileInput.files).map(file => getImageBase64(file))
            );
        }

        // 构建消息对象
        const userMessage = {
            role: "user",
            content: message,
            ...(images.length > 0 && { images: images }) // 仅在存在图片时添加images字段
        };

        // 保存到历史记录
        if(appConfig.useHistory) {
            chatHistory.push(userMessage);
        }
        appendMessageToHistory(userMessage, true);

        // 发送后清除图片
        fileInput.value = '';
        previewContainer.innerHTML = '';

        if (appConfig.streamOutput) {
            // 流式输出处理
            let fullResponse = '';
            let assistantMessage = {
                role: "assistant",
                content: ""
            };
            chatHistory.push(assistantMessage);
            
            const streamResponse = await api.post('/ollama/api/chat', {
                model: modelSelect.value,
                messages: appConfig.useHistory ? chatHistory : [userMessage],
                stream: appConfig.streamOutput,
                options: {
                    temperature: appConfig.temperature,
                    top_p: appConfig.top_p,
                    top_k: appConfig.top_k,
                    repeat_penalty: appConfig.repeat_penalty,
                    num_ctx: appConfig.num_ctx
                }
            }, {
                responseType: 'stream'
            });

            const reader = streamResponse.data.getReader();
            const decoder = new TextDecoder();
            
            while(true) {
                const { done, value } = await reader.read();
                if(done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                lines.forEach(line => {
                    try {
                        const data = JSON.parse(line);
                        fullResponse += data.message.content;
                        assistantMessage.content = fullResponse;
                        updateLastMessage(fullResponse);
                    } catch(e) {
                        console.error('解析错误:', e);
                    }
                });
            }
        } else {
            // 普通请求处理
            const response = await api.post('/ollama/api/chat', {
                model: modelSelect.value,
                messages: appConfig.useHistory ? chatHistory : [userMessage],
                stream: appConfig.streamOutput,
                options: {
                    temperature: appConfig.temperature,
                    top_p: appConfig.top_p,
                    top_k: appConfig.top_k,
                    repeat_penalty: appConfig.repeat_penalty,
                    num_ctx: appConfig.num_ctx
                }
            }, {
                headers: {
                    'X-Ollama-URL': appConfig.ollamaUrl
                }
            });
            appendMessageToHistory({
                content: response.data.message.content
            }, false);
            
            // 保存AI响应到历史
            const assistantMessage = {
                role: "assistant",
                content: response.data.message.content
            };
            chatHistory.push(assistantMessage);
        }

    } catch (error) {
        console.error('Error:', error);
        alert('发送消息失败，请检查服务器连接');
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = '发送';
    }
}

// 新增重置默认设置函数
function resetToDefaults() {
    if (confirm('确定要恢复所有设置为默认值吗？当前设置将会丢失！')) {
        localStorage.removeItem(CONFIG_KEY);
        appConfig = {
            ollamaUrl: 'http://localhost:11434',
            model: '',
            useHistory: true,
            formatOutput: false,
            streamOutput: true,
            historyLength: 5,
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            repeat_penalty: 1.1,
            num_ctx: 4096
        };
        
        // 重新加载配置
        loadConfig();
        // 刷新模型列表
        fetchModels();
        // 更新界面显示值
        document.getElementById('temperatureValue').textContent = '0.70';
        document.getElementById('topPValue').textContent = '0.90';
    }
}

// 新增更新最后一条消息的函数
function updateLastMessage(content) {
    const lastMessage = chatHistoryContainer.querySelector('.message:last-child');
    if(lastMessage) {
        lastMessage.querySelector('p').textContent = content;
        chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
    }
}