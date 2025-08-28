/**
 * 数据管理模块
 * 负责数据存储、提示词增删改查、导入导出功能
 */

// 存储键名常量
const STORAGE_KEY = 'simple_prompt_manager_data';
const SETTINGS_KEY = 'simple_prompt_manager_settings';

// 默认设置
const DEFAULT_SETTINGS = {
  presetTags: ['工作', '学习', '编程', '写作', '生活'],
  version: '1.0.0',
};

// 同步配置键（不放到导出数据里）
const SYNC_STATE_KEY = 'simple_prompt_manager_sync_state';
const SYNC_PAT_KEY = 'simple_prompt_manager_pat';

/**
 * 从localStorage获取数据
 * @param {string} key - 存储键名
 * @param {*} defaultValue - 默认值
 * @returns {*} 存储的数据
 */
function getStorageData(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? safeJsonParse(data, defaultValue) : defaultValue;
  } catch (error) {
    console.error('获取存储数据失败:', error);
    return defaultValue;
  }
}

/**
 * 向localStorage保存数据
 * @param {string} key - 存储键名
 * @param {*} data - 要保存的数据
 * @returns {boolean} 是否保存成功
 */
function setStorageData(key, data) {
  try {
    localStorage.setItem(key, safeJsonStringify(data));
    return true;
  } catch (error) {
    console.error('保存存储数据失败:', error);
    return false;
  }
}

/**
 * 获取所有提示词
 * @returns {Array} 提示词数组
 */
function getAllPrompts() {
  return getStorageData(STORAGE_KEY, []);
}

/**
 * 保存所有提示词
 * @param {Array} prompts - 提示词数组
 * @returns {boolean} 是否保存成功
 */
function saveAllPrompts(prompts) {
  if (!Array.isArray(prompts)) {
    console.error('提示词数据必须是数组');
    return false;
  }
  return setStorageData(STORAGE_KEY, prompts);
}

/**
 * 根据ID获取单个提示词
 * @param {string} id - 提示词ID
 * @returns {Object|null} 提示词对象或null
 */
function getPromptById(id) {
  const prompts = getAllPrompts();
  return prompts.find((prompt) => prompt.id === id) || null;
}

/**
 * 添加新提示词
 * @param {Object} promptData - 提示词数据 {title, content, tags}
 * @returns {Object|null} 创建的提示词对象或null
 */
function addPrompt(promptData) {
  try {
    // 验证必填字段
    if (!promptData.title || !promptData.content) {
      throw new Error('标题和内容不能为空');
    }

    const prompt = {
      id: generateId(),
      title: promptData.title.trim(),
      content: promptData.content.trim(),
      tags: Array.isArray(promptData.tags) ? promptData.tags : [],
      createTime: getCurrentTimestamp(),
      updateTime: getCurrentTimestamp(),
    };

    const prompts = getAllPrompts();
    prompts.unshift(prompt); // 新提示词添加到开头

    if (saveAllPrompts(prompts)) {
      return prompt;
    } else {
      throw new Error('保存提示词失败');
    }
  } catch (error) {
    console.error('添加提示词失败:', error);
    return null;
  }
}

/**
 * 更新提示词
 * @param {string} id - 提示词ID
 * @param {Object} updateData - 更新的数据
 * @returns {Object|null} 更新后的提示词对象或null
 */
function updatePrompt(id, updateData) {
  try {
    const prompts = getAllPrompts();
    const index = prompts.findIndex((prompt) => prompt.id === id);

    if (index === -1) {
      throw new Error('提示词不存在');
    }

    // 验证必填字段
    if (updateData.title !== undefined && !updateData.title.trim()) {
      throw new Error('标题不能为空');
    }
    if (updateData.content !== undefined && !updateData.content.trim()) {
      throw new Error('内容不能为空');
    }

    // 更新提示词
    const updatedPrompt = {
      ...prompts[index],
      ...updateData,
      updateTime: getCurrentTimestamp(),
    };

    // 确保标题和内容被trim
    if (updatedPrompt.title) updatedPrompt.title = updatedPrompt.title.trim();
    if (updatedPrompt.content) updatedPrompt.content = updatedPrompt.content.trim();

    prompts[index] = updatedPrompt;

    if (saveAllPrompts(prompts)) {
      return updatedPrompt;
    } else {
      throw new Error('保存提示词失败');
    }
  } catch (error) {
    console.error('更新提示词失败:', error);
    return null;
  }
}

/**
 * 删除提示词
 * @param {string} id - 提示词ID
 * @returns {boolean} 是否删除成功
 */
function deletePrompt(id) {
  try {
    const prompts = getAllPrompts();
    const filteredPrompts = prompts.filter((prompt) => prompt.id !== id);

    if (filteredPrompts.length === prompts.length) {
      throw new Error('提示词不存在');
    }

    return saveAllPrompts(filteredPrompts);
  } catch (error) {
    console.error('删除提示词失败:', error);
    return false;
  }
}

/**
 * 搜索提示词
 * @param {string} keyword - 搜索关键词
 * @returns {Array} 搜索结果数组
 */
function searchPrompts(keyword) {
  if (!keyword || typeof keyword !== 'string') {
    return getAllPrompts();
  }

  const searchTerm = keyword.toLowerCase().trim();
  if (!searchTerm) {
    return getAllPrompts();
  }

  const prompts = getAllPrompts();
  return prompts.filter((prompt) => {
    // 搜索标题
    if (prompt.title.toLowerCase().includes(searchTerm)) {
      return true;
    }

    // 搜索内容
    if (prompt.content.toLowerCase().includes(searchTerm)) {
      return true;
    }

    return false;
  });
}

/**
 * 按标签筛选提示词
 * @param {string} tag - 标签名称
 * @returns {Array} 筛选结果数组
 */
function filterPromptsByTag(tag) {
  if (!tag || tag === 'all') {
    return getAllPrompts();
  }

  const prompts = getAllPrompts();
  return prompts.filter((prompt) => {
    return Array.isArray(prompt.tags) && prompt.tags.includes(tag);
  });
}

/**
 * 获取设置
 * @returns {Object} 设置对象
 */
function getSettings() {
  return getStorageData(SETTINGS_KEY, deepClone(DEFAULT_SETTINGS));
}

/**
 * 保存设置
 * @param {Object} settings - 设置对象
 * @returns {boolean} 是否保存成功
 */
function saveSettings(settings) {
  try {
    const validSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
    };

    // 验证预置标签
    if (!Array.isArray(validSettings.presetTags)) {
      validSettings.presetTags = DEFAULT_SETTINGS.presetTags;
    } else {
      // 过滤空标签并去重
      validSettings.presetTags = uniqueArray(validSettings.presetTags.filter((tag) => !isEmpty(tag)));
    }

    return setStorageData(SETTINGS_KEY, validSettings);
  } catch (error) {
    console.error('保存设置失败:', error);
    return false;
  }
}

/**
 * 获取预置标签
 * @returns {Array} 预置标签数组
 */
function getPresetTags() {
  const settings = getSettings();
  return settings.presetTags || DEFAULT_SETTINGS.presetTags;
}

/**
 * 更新预置标签
 * @param {Array} tags - 标签数组
 * @returns {boolean} 是否更新成功
 */
function updatePresetTags(tags) {
  console.log('updatePresetTags 被调用，新标签:', tags);
  const settings = getSettings();
  console.log('当前设置:', settings);
  settings.presetTags = tags;
  const result = saveSettings(settings);
  console.log('保存结果:', result);

  // 验证保存是否成功
  const verifySettings = getSettings();
  console.log('验证保存后的设置:', verifySettings);

  return result;
}

/**
 * 重置设置为默认值
 * @returns {boolean} 是否重置成功
 */
function resetSettings() {
  return saveSettings(deepClone(DEFAULT_SETTINGS));
}

/**
 * 导出数据为JSON
 * @returns {Object} 导出的数据对象
 */
function exportData() {
  try {
    const prompts = getAllPrompts();
    const settings = getSettings();

    // 确保每个提示词都有tags属性，即使为空数组
    const processedPrompts = prompts.map((prompt) => ({
      ...prompt,
      tags: Array.isArray(prompt.tags) ? prompt.tags : [],
    }));

    return {
      prompts: processedPrompts,
      settings,
      exportTime: getCurrentTimestamp(),
      version: '1.0.0',
    };
  } catch (error) {
    console.error('导出数据失败:', error);
    return null;
  }
}

// ========== 云同步：本地凭据与状态的简易读写（不纳入导出） ==========
function getSyncCredentials() {
  try {
    const pat = localStorage.getItem(SYNC_PAT_KEY);
    const state = localStorage.getItem(SYNC_STATE_KEY);
    const parsed = state ? safeJsonParse(state, {}) : {};
    return {
      pat: pat ? safeJsonParse(pat, pat) : '',
      gistId: parsed.gistId || '',
    };
  } catch (e) {
    return { pat: '', gistId: '' };
  }
}

function saveSyncCredentials({ pat, gistId }) {
  try {
    if (typeof pat === 'string') {
      localStorage.setItem(SYNC_PAT_KEY, safeJsonStringify(pat, ''));
    }
    if (typeof gistId === 'string') {
      const current = localStorage.getItem(SYNC_STATE_KEY);
      const parsed = current ? safeJsonParse(current, {}) : {};
      parsed.gistId = gistId;
      localStorage.setItem(SYNC_STATE_KEY, safeJsonStringify(parsed, '{}'));
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 导入数据
 * @param {Object} data - 要导入的数据
 * @param {boolean} merge - 是否合并现有数据，默认false（覆盖）
 * @returns {Object} 导入结果 {success: boolean, message: string, stats: Object}
 */
function importData(data, merge = false) {
  try {
    // 验证数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('无效的数据格式');
    }

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 导入提示词
    if (Array.isArray(data.prompts)) {
      let existingPrompts = merge ? getAllPrompts() : [];
      const existingIds = new Set(existingPrompts.map((p) => p.id));

      for (const promptData of data.prompts) {
        try {
          // 验证提示词数据
          if (!promptData.title || !promptData.content) {
            errorCount++;
            continue;
          }

          // 检查是否已存在（基于ID或标题）
          if (existingIds.has(promptData.id) || existingPrompts.some((p) => p.title === promptData.title)) {
            skippedCount++;
            continue;
          }

          // 过滤掉不存在的标签
          const currentPresetTags = getPresetTags();
          const validTags = Array.isArray(promptData.tags) ? promptData.tags.filter((tag) => currentPresetTags.includes(tag)) : [];

          const prompt = {
            id: promptData.id || generateId(),
            title: promptData.title.trim(),
            content: promptData.content.trim(),
            tags: validTags,
            createTime: promptData.createTime || getCurrentTimestamp(),
            updateTime: getCurrentTimestamp(),
          };

          existingPrompts.unshift(prompt);
          importedCount++;
        } catch (error) {
          console.error('导入单个提示词失败:', error);
          errorCount++;
        }
      }

      if (!saveAllPrompts(existingPrompts)) {
        throw new Error('保存导入的提示词失败');
      }
    }

    // 导入设置（如果不是合并模式）
    if (!merge && data.settings) {
      saveSettings(data.settings);
    }

    return {
      success: true,
      message: `导入完成：成功${importedCount}条，跳过${skippedCount}条，错误${errorCount}条`,
      stats: {
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
    };
  } catch (error) {
    console.error('导入数据失败:', error);
    return {
      success: false,
      message: error.message || '导入失败',
      stats: { imported: 0, skipped: 0, errors: 0 },
    };
  }
}

/**
 * 验证导入数据格式
 * @param {*} data - 要验证的数据
 * @returns {Object} 验证结果 {valid: boolean, message: string}
 */
function validateImportData(data) {
  try {
    if (!data || typeof data !== 'object') {
      return { valid: false, message: '数据格式无效' };
    }

    if (!Array.isArray(data.prompts)) {
      return { valid: false, message: '缺少有效的提示词数据' };
    }

    if (data.prompts.length === 0) {
      return { valid: false, message: '没有可导入的提示词' };
    }

    // 检查提示词格式
    const invalidPrompts = data.prompts.filter((prompt) => !prompt || !prompt.title || !prompt.content);

    if (invalidPrompts.length > 0) {
      return {
        valid: false,
        message: `发现${invalidPrompts.length}个无效的提示词（缺少标题或内容）`,
      };
    }

    return { valid: true, message: '数据格式有效' };
  } catch (error) {
    return { valid: false, message: '数据验证失败' };
  }
}

/**
 * 获取数据统计信息
 * @returns {Object} 统计信息
 */
function getDataStats() {
  const prompts = getAllPrompts();
  const tags = new Set();

  prompts.forEach((prompt) => {
    if (Array.isArray(prompt.tags)) {
      prompt.tags.forEach((tag) => tags.add(tag));
    }
  });

  return {
    totalPrompts: prompts.length,
    totalTags: tags.size,
    recentPrompts: prompts.filter((p) => p.createTime > Date.now() - 7 * 24 * 60 * 60 * 1000).length,
  };
}
