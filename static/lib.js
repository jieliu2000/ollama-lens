const OLLAMA_PROXY = '__OLLAMA_PROXY__';

// 在全局作用域声明变量
let inputTextarea;
let sendButton;
let ollamaUrlInput;
let modelSelect;
let chatHistory;
let fileInput;
let previewContainer;

// 创建一个 axios 实例，设置基础配置
const api = axios.create({
    timeout: 30000, // 30秒超时
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
    chatHistory = document.querySelector('.chat-history .h-full');
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

    // 初始化时获取模型列表
    fetchModels();

    // 添加点击事件监听
    sendButton.addEventListener('click', sendMessage);

    // 添加键盘事件监听（Ctrl+Enter发送）
    inputTextarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            sendMessage();
        }
    });
});

function clearHistory() {
    if(confirm('确定要清除所有对话历史吗？此操作不可恢复！')) {
        chatHistory.innerHTML = `
            <div class="text-center py-6 text-gray-400 text-sm">
                <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                已成功清空对话历史
            </div>
        `;
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

// 修改 saveConfig 函数
function saveConfig() {
    api.post('/api/config/ollama', {
        url: ollamaUrlInput.value,
        model: modelSelect.value
    })
    .then(response => {
        fetchModels();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('保存配置失败，请检查输入是否正确');
    });
}

// 发送消息函数
async function sendMessage() {
    const message = inputTextarea.value.trim();
    if (!message) {
        alert('请输入消息内容');
        return;
    }

    try {
        sendButton.disabled = true;
        sendButton.textContent = '发送中...';

        const response = await api.post('/ollama/api/chat', {
            message: message,
            model: modelSelect.value
        }, {
            headers: {
                'X-Ollama-URL': ollamaUrlInput.value || 'http://localhost:11434'
            }
        });

        // 处理响应
        const responseDiv = document.createElement('div');
        responseDiv.className = 'flex flex-col items-start';
        responseDiv.innerHTML = `
            <div class="bg-gray-50 border border-gray-100 rounded-xl p-3 max-w-[85%] shadow-sm">
                <p class="leading-relaxed text-gray-700">${response.data.message}</p>
                <div class="text-xs text-gray-500/80 mt-1">${new Date().toLocaleTimeString()}</div>
            </div>
        `;
        chatHistory.querySelector('.space-y-3').appendChild(responseDiv);
        inputTextarea.value = '';

    } catch (error) {
        console.error('Error:', error);
        alert('发送消息失败，请检查服务器连接');
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = '发送';
    }
}