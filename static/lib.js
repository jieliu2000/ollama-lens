document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.querySelector('input[type="file"]');
    const previewContainer = document.querySelector('.preview-container');

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
});

function clearHistory() {
    if(confirm('确定要清除所有对话历史吗？此操作不可恢复！')) {
        const chatHistory = document.querySelector('.chat-history .h-full');
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

// 新增模型获取函数
function fetchModels() {
    const modelSelect = document.getElementById('modelSelect');
    const ollamaUrl = document.getElementById('ollamaUrl').value;
    
    modelSelect.innerHTML = '<option value="" disabled selected>正在加载模型...</option>';
    
    fetch(`${ollamaUrl}/api/tags`)
        .then(response => {
            if (!response.ok) throw new Error('获取模型失败');
            return response.json();
        })
        .then(data => {
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

// 在saveConfig函数中保存选中的模型
function saveConfig() {
    const urlInput = document.getElementById('ollamaUrl');
    const modelSelect = document.getElementById('modelSelect');
    
    fetch('/api/config/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            url: urlInput.value,
            model: modelSelect.value 
        })
    })
    // ... 后续代码保持不变 ...
} 