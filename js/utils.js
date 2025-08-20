/**
 * 工具函数模块
 * 提供通用的工具函数
 */

/**
 * 生成唯一ID
 * @returns {string} UUID格式的字符串
 */
function generateId() {
  return 'prompt_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 获取当前时间戳
 * @returns {number} 当前时间戳
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * 文本截取预览
 * @param {string} text - 要截取的文本
 * @param {number} length - 截取长度，默认50
 * @returns {string} 截取后的文本
 */
function truncateText(text, length = 50) {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

/**
 * HTML转义
 * @param {string} text - 要转义的文本
 * @returns {string} 转义后的文本
 */
function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 格式化时间显示
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  // 一分钟内
  if (diff < 60000) {
    return '刚刚';
  }

  // 一小时内
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分钟前`;
  }

  // 一天内
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}小时前`;
  }

  // 一周内
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}天前`;
  }

  // 超过一周，显示具体日期
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (year === now.getFullYear()) {
    return `${month}-${day}`;
  } else {
    return `${year}-${month}-${day}`;
  }
}

/**
 * 深拷贝对象
 * @param {*} obj - 要拷贝的对象
 * @returns {*} 拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * 检查字符串是否为空
 * @param {string} str - 要检查的字符串
 * @returns {boolean} 是否为空
 */
function isEmpty(str) {
  return !str || typeof str !== 'string' || str.trim() === '';
}

/**
 * 数组去重
 * @param {Array} arr - 要去重的数组
 * @returns {Array} 去重后的数组
 */
function uniqueArray(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr)];
}

/**
 * 安全的JSON解析
 * @param {string} jsonStr - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析结果
 */
function safeJsonParse(jsonStr, defaultValue = null) {
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.warn('JSON解析失败:', error);
    return defaultValue;
  }
}

/**
 * 安全的JSON字符串化
 * @param {*} obj - 要字符串化的对象
 * @param {string} defaultValue - 失败时的默认值
 * @returns {string} JSON字符串
 */
function safeJsonStringify(obj, defaultValue = '{}') {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.warn('JSON字符串化失败:', error);
    return defaultValue;
  }
}
