/**
 * 主逻辑模块
 * 负责界面交互、标签管理、设置功能
 */

// 全局变量
let currentPrompts = [];
let currentEditingId = null;
let currentDeleteId = null;
let currentFilter = 'all';
let currentSearchKeyword = '';
let tempPresetTags = []; // 临时预置标签，用于设置界面

// DOM元素引用
let elements = {};

/**
 * 页面初始化
 */
function init() {
  // 获取DOM元素引用
  initElements();

  // 绑定事件监听器
  bindEvents();

  // 加载初始数据
  loadInitialData();

  console.log('Simple Prompt Manager 初始化完成');
}

/**
 * 初始化DOM元素引用
 */
function initElements() {
  elements = {
    // 搜索和操作
    searchInput: document.getElementById('searchInput'),
    settingsBtn: document.getElementById('settingsBtn'),
    addBtn: document.getElementById('addBtn'),
    importBtn: document.getElementById('importBtn'),
    exportBtn: document.getElementById('exportBtn'),
    fileInput: document.getElementById('fileInput'),

    // 标签筛选
    tagFilter: document.getElementById('tagFilter'),

    // 提示词列表
    promptList: document.getElementById('promptList'),
    emptyState: document.getElementById('emptyState'),
    promptCount: document.getElementById('promptCount'),

    // 编辑模态框
    editModal: document.getElementById('editModal'),
    modalTitle: document.getElementById('modalTitle'),
    closeEditModal: document.getElementById('closeEditModal'),
    promptForm: document.getElementById('promptForm'),
    titleInput: document.getElementById('titleInput'),
    contentInput: document.getElementById('contentInput'),
    presetTags: document.getElementById('presetTags'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveBtn: document.getElementById('saveBtn'),

    // 设置模态框
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModal: document.getElementById('closeSettingsModal'),
    settingsForm: document.getElementById('settingsForm'),
    settingsTags: document.getElementById('settingsTags'),
    newTagInput: document.getElementById('newTagInput'),
    addTagBtn: document.getElementById('addTagBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),

    // 删除确认
    deleteModal: document.getElementById('deleteModal'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),

    // 消息提示
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
  };
}

/**
 * 绑定事件监听器
 */
function bindEvents() {
  // 搜索事件（防抖）
  elements.searchInput.addEventListener('input', debounce(handleSearch, 300));

  // 操作按钮事件
  elements.settingsBtn.addEventListener('click', showSettingsModal);
  elements.addBtn.addEventListener('click', () => showEditModal());
  elements.importBtn.addEventListener('click', handleImport);
  elements.exportBtn.addEventListener('click', handleExport);
  elements.fileInput.addEventListener('change', handleFileSelect);

  // 编辑模态框事件
  elements.closeEditModal.addEventListener('click', hideEditModal);
  elements.cancelEditBtn.addEventListener('click', hideEditModal);
  elements.promptForm.addEventListener('submit', handleSavePrompt);
  elements.saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    handleSavePrompt(e);
  });

  // 设置模态框事件
  elements.closeSettingsModal.addEventListener('click', () => {
    // 检查是否有未保存的更改
    const currentSavedTags = getPresetTags();
    const hasChanges = JSON.stringify(tempPresetTags.sort()) !== JSON.stringify(currentSavedTags.sort());

    if (hasChanges) {
      if (confirm('有未保存的标签更改，确定要关闭吗？')) {
        hideSettingsModal();
      }
    } else {
      hideSettingsModal();
    }
  });
  elements.addTagBtn.addEventListener('click', handleAddTag);
  elements.newTagInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  });
  elements.saveSettingsBtn.addEventListener('click', handleSaveSettings);

  // 设置标签删除事件（事件委托）
  elements.settingsTags.addEventListener('click', (e) => {
    if (e.target.classList.contains('settings-tag-remove')) {
      const tag = e.target.dataset.tag;
      removePresetTag(tag);
    }
  });

  // 删除确认事件
  elements.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  elements.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

  // 标签筛选点击事件（事件委托）
  elements.tagFilter.addEventListener('click', (e) => {
    if (e.target.classList.contains('tag-btn')) {
      handleTagFilter(e.target.dataset.tag);
    }
  });

  // 预置标签点击事件（事件委托）
  elements.presetTags.addEventListener('click', (e) => {
    if (e.target.classList.contains('preset-tag')) {
      e.target.classList.toggle('selected');
    }
  });

  // 提示词列表点击事件（事件委托）
  elements.promptList.addEventListener('click', (e) => {
    const button = e.target.closest('.prompt-action-btn');
    if (!button) return;

    const action = button.dataset.action;
    const promptId = button.dataset.id;

    switch (action) {
      case 'copy':
        copyPromptContent(promptId);
        break;
      case 'edit':
        showEditModal(promptId);
        break;
      case 'delete':
        showDeleteModal(promptId);
        break;
    }
  });

  // 模态框背景点击关闭
  elements.editModal.addEventListener('click', (e) => {
    if (e.target === elements.editModal) hideEditModal();
  });
  elements.settingsModal.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) hideSettingsModal();
  });
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) hideDeleteModal();
  });

  // ESC键关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideEditModal();
      hideSettingsModal();
      hideDeleteModal();
    }
  });
}

/**
 * 加载初始数据
 */
function loadInitialData() {
  console.log('开始加载初始数据');

  // 检查并初始化默认设置（如果不存在）
  const settings = getSettings();
  console.log('当前设置:', settings);

  // 加载提示词
  refreshPromptList();

  // 加载标签筛选栏
  updateTagFilter();

  // 加载编辑框的预置标签
  updatePresetTagsDisplay();

  console.log('初始数据加载完成');
}

/**
 * 刷新提示词列表
 */
function refreshPromptList() {
  // 获取筛选后的提示词
  let prompts = getAllPrompts();

  // 应用标签筛选
  if (currentFilter !== 'all') {
    prompts = filterPromptsByTag(currentFilter);
  }

  // 应用搜索筛选
  if (currentSearchKeyword) {
    prompts = searchPrompts(currentSearchKeyword);
    if (currentFilter !== 'all') {
      prompts = prompts.filter((prompt) => Array.isArray(prompt.tags) && prompt.tags.includes(currentFilter));
    }
  }

  currentPrompts = prompts;
  updatePromptList(prompts);
  updateStatusBar(prompts.length);
}

/**
 * 更新提示词列表显示
 */
function updatePromptList(prompts) {
  if (!prompts || prompts.length === 0) {
    elements.promptList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <div class="empty-text">${currentSearchKeyword ? '未找到匹配的提示词' : '暂无提示词'}</div>
        <div class="empty-subtext">${currentSearchKeyword ? '尝试其他搜索关键词' : '点击 + 添加第一个提示词'}</div>
      </div>
    `;
    return;
  }

  const promptCards = prompts.map((prompt) => createPromptCard(prompt)).join('');
  elements.promptList.innerHTML = promptCards;
}

/**
 * 创建提示词卡片HTML
 */
function createPromptCard(prompt) {
  const tagsHtml =
    Array.isArray(prompt.tags) && prompt.tags.length > 0
      ? `<div class="prompt-tags">
         ${prompt.tags.map((tag) => `<span class="prompt-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>`
      : '';

  return `
    <div class="prompt-card" data-id="${prompt.id}">
      <div class="prompt-title" title="${escapeHtml(prompt.title)}">${escapeHtml(prompt.title)}</div>
      <div class="prompt-content" title="${escapeHtml(prompt.content)}">${escapeHtml(truncateText(prompt.content, 100))}</div>
      ${tagsHtml}
      <div class="prompt-actions">
        <button class="prompt-action-btn copy-btn" data-action="copy" data-id="${prompt.id}" title="复制内容">📋</button>
        <button class="prompt-action-btn edit-btn" data-action="edit" data-id="${prompt.id}" title="编辑">📝</button>
        <button class="prompt-action-btn delete-btn delete" data-action="delete" data-id="${prompt.id}" title="删除">🗑️</button>
      </div>
    </div>
  `;
}

/**
 * 更新标签筛选栏
 */
function updateTagFilter() {
  const presetTags = getPresetTags();
  const allTags = new Set(['all', ...presetTags]);

  // 从现有提示词中提取使用过的标签
  const prompts = getAllPrompts();
  prompts.forEach((prompt) => {
    if (Array.isArray(prompt.tags)) {
      prompt.tags.forEach((tag) => allTags.add(tag));
    }
  });

  // 计算每个标签的提示词数量
  const tagCounts = {};
  prompts.forEach((prompt) => {
    if (Array.isArray(prompt.tags)) {
      prompt.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });

  const tagsArray = Array.from(allTags);
  const tagButtons = tagsArray
    .map((tag) => {
      const isActive = tag === currentFilter;
      let displayName;
      if (tag === 'all') {
        displayName = `全部(${prompts.length})`;
      } else {
        const count = tagCounts[tag] || 0;
        displayName = `${tag}(${count})`;
      }
      return `<button class="tag-btn ${isActive ? 'active' : ''}" data-tag="${tag}">${escapeHtml(displayName)}</button>`;
    })
    .join('');

  elements.tagFilter.innerHTML = tagButtons;
}

/**
 * 更新状态栏
 */
function updateStatusBar(count) {
  elements.promptCount.textContent = `共 ${count} 条提示词`;
}

/**
 * 处理搜索
 */
function handleSearch() {
  currentSearchKeyword = elements.searchInput.value.trim();
  refreshPromptList();
}

/**
 * 处理标签筛选
 */
function handleTagFilter(tag) {
  currentFilter = tag;

  // 更新按钮状态
  elements.tagFilter.querySelectorAll('.tag-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tag === tag);
  });

  refreshPromptList();
}

/**
 * 显示编辑模态框
 */
function showEditModal(promptId = null) {
  console.log('showEditModal 被调用，promptId:', promptId);
  currentEditingId = promptId;

  if (promptId) {
    // 编辑模式
    const prompt = getPromptById(promptId);
    console.log('获取到的提示词:', prompt);
    if (!prompt) {
      showToast('提示词不存在', 'error');
      return;
    }

    elements.modalTitle.textContent = '编辑提示词';
    elements.titleInput.value = prompt.title;
    elements.contentInput.value = prompt.content;
    updatePresetTagsSelection(prompt.tags || []);
  } else {
    // 添加模式
    console.log('添加模式');
    elements.modalTitle.textContent = '添加提示词';
    elements.titleInput.value = '';
    elements.contentInput.value = '';
    updatePresetTagsSelection([]);
  }

  updatePresetTagsDisplay();
  elements.editModal.classList.add('show');

  // 延迟一下再更新预置标签，确保DOM已经渲染
  setTimeout(() => {
    updatePresetTagsDisplay();
  }, 100);

  elements.titleInput.focus();
  console.log('模态框应该已显示');
}

/**
 * 隐藏编辑模态框
 */
function hideEditModal() {
  elements.editModal.classList.remove('show');
  currentEditingId = null;
  elements.promptForm.reset();
}

/**
 * 更新预置标签显示
 */
function updatePresetTagsDisplay() {
  // 防止在模态框未打开时调用
  if (!elements.presetTags) {
    console.warn('presetTags 元素不存在，跳过更新');
    return;
  }

  const presetTags = getPresetTags();
  console.log('更新预置标签显示:', presetTags);
  const tagsHtml = presetTags.map((tag) => `<span class="preset-tag" data-tag="${tag}">${escapeHtml(tag)}</span>`).join('');

  elements.presetTags.innerHTML = tagsHtml;
}

/**
 * 更新预置标签选择状态
 */
function updatePresetTagsSelection(selectedTags) {
  console.log('更新标签选择状态:', selectedTags);
  setTimeout(() => {
    const tagElements = elements.presetTags.querySelectorAll('.preset-tag');
    console.log('找到标签元素数量:', tagElements.length);
    tagElements.forEach((tagElement) => {
      const tag = tagElement.dataset.tag;
      const isSelected = selectedTags.includes(tag);
      tagElement.classList.toggle('selected', isSelected);
      console.log(`标签 ${tag} 选中状态:`, isSelected);
    });
  }, 200); // 增加延迟确保DOM已更新
}

/**
 * 获取选中的标签
 */
function getSelectedTags() {
  const selectedElements = elements.presetTags.querySelectorAll('.preset-tag.selected');
  return Array.from(selectedElements).map((el) => el.dataset.tag);
}

/**
 * 处理保存提示词
 */
function handleSavePrompt(e) {
  e.preventDefault();
  console.log('handleSavePrompt 被调用');

  const title = elements.titleInput.value.trim();
  const content = elements.contentInput.value.trim();
  const tags = getSelectedTags();

  console.log('表单数据:', { title, content, tags });

  if (!title || !content) {
    showToast('标题和内容不能为空', 'error');
    return;
  }

  const promptData = { title, content, tags };
  let result;

  if (currentEditingId) {
    // 更新提示词
    result = updatePrompt(currentEditingId, promptData);
    if (result) {
      showToast('提示词更新成功', 'success');
    } else {
      showToast('更新失败', 'error');
      return;
    }
  } else {
    // 添加新提示词
    result = addPrompt(promptData);
    if (result) {
      showToast('提示词添加成功', 'success');
    } else {
      showToast('添加失败', 'error');
      return;
    }
  }

  hideEditModal();
  refreshPromptList();
  updateTagFilter();
}

/**
 * 显示删除确认模态框
 */
function showDeleteModal(promptId) {
  currentDeleteId = promptId;
  elements.deleteModal.classList.add('show');
}

/**
 * 隐藏删除确认模态框
 */
function hideDeleteModal() {
  elements.deleteModal.classList.remove('show');
  currentDeleteId = null;
}

/**
 * 处理确认删除
 */
function handleConfirmDelete() {
  if (!currentDeleteId) return;

  if (deletePrompt(currentDeleteId)) {
    showToast('提示词删除成功', 'success');
    hideDeleteModal();
    refreshPromptList();
    updateTagFilter();
  } else {
    showToast('删除失败', 'error');
  }
}

/**
 * 复制提示词内容到剪贴板
 */
function copyPromptContent(promptId) {
  const prompt = getPromptById(promptId);
  if (!prompt) {
    showToast('提示词不存在', 'error');
    return;
  }

  navigator.clipboard
    .writeText(prompt.content)
    .then(() => {
      showToast('内容已复制到剪贴板', 'success');
    })
    .catch(() => {
      showToast('复制失败', 'error');
    });
}

/**
 * 显示设置模态框
 */
function showSettingsModal() {
  // 初始化临时标签为当前保存的标签
  tempPresetTags = [...getPresetTags()];
  console.log('显示设置模态框，初始化临时标签:', tempPresetTags);
  updateSettingsTagsDisplay();
  elements.settingsModal.classList.add('show');
}

/**
 * 隐藏设置模态框
 */
function hideSettingsModal() {
  elements.settingsModal.classList.remove('show');
  elements.newTagInput.value = '';
  // 重置临时标签状态
  tempPresetTags = [];
}

/**
 * 更新设置中的标签显示
 */
function updateSettingsTagsDisplay() {
  // 使用临时标签数组
  const tagsHtml = tempPresetTags
    .map(
      (tag) =>
        `<div class="settings-tag">
        <span>${escapeHtml(tag)}</span>
        <button class="settings-tag-remove" data-tag="${tag}">×</button>
      </div>`
    )
    .join('');

  elements.settingsTags.innerHTML = tagsHtml;
  console.log('更新设置标签显示，当前临时标签:', tempPresetTags);
}

/**
 * 处理添加标签
 */
function handleAddTag() {
  const newTag = elements.newTagInput.value.trim();
  if (!newTag) {
    showToast('标签名不能为空', 'error');
    return;
  }

  if (tempPresetTags.includes(newTag)) {
    showToast('标签已存在', 'error');
    return;
  }

  // 只添加到临时数组，不保存到localStorage
  tempPresetTags.push(newTag);
  elements.newTagInput.value = '';

  // 只更新设置界面的标签显示
  updateSettingsTagsDisplay();
  showToast('标签已添加，点击"保存设置"生效', 'success');

  console.log('临时添加标签:', newTag, '当前临时标签:', tempPresetTags);
}

/**
 * 移除预置标签
 */
function removePresetTag(tag) {
  // 检查是否有提示词使用了这个标签（只检查已保存的标签）
  const currentSavedTags = getPresetTags();
  if (currentSavedTags.includes(tag)) {
    const prompts = getAllPrompts();
    const relatedPrompts = prompts.filter((prompt) => Array.isArray(prompt.tags) && prompt.tags.includes(tag));

    if (relatedPrompts.length > 0) {
      const confirmMessage = `标签"${tag}"正在被 ${relatedPrompts.length} 个提示词使用。\n删除标签后，这些提示词将失去该标签。\n\n确定要删除吗？`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }
  }

  // 只从临时数组中删除
  tempPresetTags = tempPresetTags.filter((t) => t !== tag);

  // 只更新设置界面的标签显示
  updateSettingsTagsDisplay();
  showToast('标签已删除，点击"保存设置"生效', 'success');

  console.log('临时删除标签:', tag, '当前临时标签:', tempPresetTags);
}

/**
 * 处理保存设置
 */
function handleSaveSettings() {
  console.log('保存设置，临时标签:', tempPresetTags);

  // 获取当前已保存的标签
  const currentSavedTags = getPresetTags();
  console.log('当前已保存的标签:', currentSavedTags);

  // 找出被删除的标签
  const deletedTags = currentSavedTags.filter((tag) => !tempPresetTags.includes(tag));
  console.log('被删除的标签:', deletedTags);

  // 如果有标签被删除，需要从相关提示词中移除
  if (deletedTags.length > 0) {
    const prompts = getAllPrompts();
    let updatedPromptsCount = 0;

    prompts.forEach((prompt) => {
      if (Array.isArray(prompt.tags)) {
        const originalTags = [...prompt.tags];
        const updatedTags = prompt.tags.filter((tag) => !deletedTags.includes(tag));

        if (originalTags.length !== updatedTags.length) {
          updatePrompt(prompt.id, { tags: updatedTags });
          updatedPromptsCount++;
        }
      }
    });

    if (updatedPromptsCount > 0) {
      console.log(`已从 ${updatedPromptsCount} 个提示词中移除删除的标签`);
    }
  }

  // 保存新的标签设置
  if (updatePresetTags(tempPresetTags)) {
    hideSettingsModal();

    // 同步更新所有相关界面
    updateTagFilter(); // 更新首页标签筛选栏
    updatePresetTagsDisplay(); // 更新编辑框中的预置标签
    refreshPromptList(); // 刷新提示词列表

    let message = '设置保存成功';
    if (deletedTags.length > 0) {
      message += `，已删除 ${deletedTags.length} 个标签`;
    }
    showToast(message, 'success');
  } else {
    showToast('设置保存失败', 'error');
  }
}

/**
 * 处理导入
 */
function handleImport() {
  elements.fileInput.click();
}

/**
 * 处理导出
 */
function handleExport() {
  const data = exportData();
  if (!data) {
    showToast('导出失败', 'error');
    return;
  }

  const jsonStr = safeJsonStringify(data, null);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `prompt-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('数据导出成功', 'success');
}

/**
 * 处理文件选择
 */
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.json')) {
    showToast('请选择JSON文件', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = safeJsonParse(e.target.result);
      if (!data) {
        throw new Error('无效的JSON格式');
      }

      const validation = validateImportData(data);
      if (!validation.valid) {
        showToast(validation.message, 'error');
        return;
      }

      const shouldMerge = confirm('是否与现有数据合并？\n点击"确定"合并，点击"取消"覆盖现有数据。');
      const result = importData(data, shouldMerge);

      if (result.success) {
        showToast(result.message, 'success');
        refreshPromptList();
        updateTagFilter(); // 这会更新标签数量显示
        updatePresetTagsDisplay(); // 更新编辑框中的预置标签
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      console.error('文件读取失败:', error);
      showToast('文件读取失败', 'error');
    }
  };

  reader.readAsText(file);
  elements.fileInput.value = ''; // 清空文件输入
}

/**
 * 显示消息提示
 */
function showToast(message, type = 'success') {
  elements.toastMessage.textContent = message;
  elements.toast.className = `toast ${type} show`;

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
