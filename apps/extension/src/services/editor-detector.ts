/**
 * Editor Detector Service
 * Handles detection and interaction with various text editors in web pages.
 */

// Debug logging utility
const debugLog = (...args: any[]): void => {
  console.log('[RCP Editor]', ...args);
};

/**
 * Type definitions for various editor interfaces
 */
declare global {
  interface Window {
    CodeMirror?: any;
    monaco?: {
      editor: {
        getEditors(): any[];
      }
    };
    ace?: any;
    tinymce?: {
      activeEditor?: {
        insertContent(content: string): void;
      }
    };
    CKEDITOR?: {
      instances: {
        [key: string]: {
          insertText(text: string): void;
        }
      }
    };
  }
  
  interface Element {
    isContentEditable?: boolean;
    CodeMirror?: any;
  }
}

/**
 * Safely check if an element has a parent matching a selector
 * @param el - The element to check
 * @param selector - The CSS selector to match against
 * @returns Whether the element has a matching parent
 */
function hasMatchingParent(el: Element | null, selector: string): boolean {
  if (!el) return false;
  const parent = el.closest(selector);
  return parent !== null;
}

/**
 * Detects the type of editor that is currently active
 * @returns The type of editor detected
 */
export function detectEditorType(): string {
  const activeElement = document.activeElement;
  
  if (!activeElement) return 'standard';
  
  // Check for CodeMirror
  if (activeElement.classList.contains('CodeMirror') || 
      hasMatchingParent(activeElement, '.CodeMirror')) {
    return 'codemirror';
  }
  
  // Check for Monaco Editor
  if (activeElement.classList.contains('monaco-editor') || 
      hasMatchingParent(activeElement, '.monaco-editor')) {
    return 'monaco';
  }
  
  // Check for TinyMCE
  if (activeElement.classList.contains('mce-content-body') || 
      hasMatchingParent(activeElement, '.mce-content-body')) {
    return 'tinymce';
  }
  
  // Check for CKEditor
  if (activeElement.classList.contains('cke_editable') || 
      hasMatchingParent(activeElement, '.cke_editable')) {
    return 'ckeditor';
  }
  
  // Check for contentEditable elements
  if (activeElement.getAttribute('contenteditable') === 'true') {
    return 'contenteditable';
  }
  
  // Check for textarea or input
  if (activeElement.tagName === 'TEXTAREA' || 
      (activeElement.tagName === 'INPUT' && 
       (activeElement as HTMLInputElement).type !== 'checkbox' && 
       (activeElement as HTMLInputElement).type !== 'radio' && 
       (activeElement as HTMLInputElement).type !== 'button')) {
    return 'input';
  }
  
  return 'standard';
}

/**
 * Checks if an element is an input-like element that can receive text
 * @param el - The element to check
 * @returns Whether the element is input-like
 */
export function isInputLikeElement(el: Element | null): boolean {
  if (!el) return false;
  
  // Check for standard form elements
  if (el.tagName === 'TEXTAREA') return true;
  
  if (el.tagName === 'INPUT') {
    const inputEl = el as HTMLInputElement;
    if (inputEl.type !== 'checkbox' && inputEl.type !== 'radio' && inputEl.type !== 'button') {
      return true;
    }
  }
  
  // Check for contentEditable elements
  if (el.getAttribute('contenteditable') === 'true' || el.isContentEditable) return true;
  
  // Check for common editor frameworks
  // CodeMirror
  if (el.classList.contains('CodeMirror') || hasMatchingParent(el, '.CodeMirror')) return true;
  
  // Monaco
  if (el.classList.contains('monaco-editor') || hasMatchingParent(el, '.monaco-editor')) return true;
  
  // Ace
  if (el.classList.contains('ace_editor') || hasMatchingParent(el, '.ace_editor')) return true;
  
  // TinyMCE
  if (el.classList.contains('mce-content-body') || hasMatchingParent(el, '.mce-content-body')) return true;
  
  // CKEditor
  if (el.classList.contains('cke_editable') || hasMatchingParent(el, '.cke_editable')) return true;
  
  // Quill
  if (el.classList.contains('ql-editor') || hasMatchingParent(el, '.ql-editor')) return true;
  
  // ChatGPT and other AI tools
  if (el.classList.contains('chat-input') || 
      el.classList.contains('markdown-input') ||
      el.id?.includes('prompt') ||
      el.getAttribute('aria-label')?.toLowerCase().includes('input') ||
      el.getAttribute('placeholder')?.toLowerCase().includes('message')) {
    return true;
  }
  
  // Other common editor classes
  if (el.classList.contains('editor') ||
      el.classList.contains('text-editor') ||
      el.classList.contains('editor-input') ||
      el.classList.contains('richtext-editor') ||
      el.classList.contains('ProseMirror') ||
      el.getAttribute('role') === 'textbox') {
    return true;
  }
  
  return false;
}

/**
 * Finds the best editor element to insert text into
 * @returns The best editor element found
 */
export function findBestEditorElement(): HTMLElement | null {
  // First check the active element
  const activeElement = document.activeElement as HTMLElement;
  
  if (isInputLikeElement(activeElement)) {
    return activeElement;
  }
  
  // Try to find any focused element that might be input-like
  let editorElement: HTMLElement | null = null;
  document.querySelectorAll('*').forEach(el => {
    if (el === document.activeElement && isInputLikeElement(el)) {
      editorElement = el as HTMLElement;
    }
  });
  
  if (editorElement) {
    return editorElement;
  }
  
  // Look for parent elements that might be editors
  let parent = activeElement?.parentElement;
  let depth = 0;
  while (parent && !isInputLikeElement(parent) && depth < 5) {
    parent = parent.parentElement;
    depth++;
  }
  
  if (parent && isInputLikeElement(parent)) {
    return parent as HTMLElement;
  }
  
  // Look for common editor elements in the page
  const editorSelectors = [
    '.CodeMirror',
    '.monaco-editor',
    '.ace_editor',
    '.mce-content-body',
    '.cke_editable',
    '.ql-editor',
    '[contenteditable=true]',
    'textarea',
    'input[type="text"]'
  ];
  
  for (const selector of editorSelectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      return element;
    }
  }
  
  return null;
}

/**
 * Inserts text into the current editor
 * @param text - The text to insert
 * @returns Whether the insertion was successful
 */
export function insertTextIntoEditor(text: string): boolean {
  const editorType = detectEditorType();
  const activeElement = document.activeElement as HTMLElement;
  let success = false;
  
  debugLog(`Inserting text into editor type: ${editorType}`);
  
  switch (editorType) {
    case 'input': {
      // For standard inputs and textareas
      const inputElement = activeElement as HTMLInputElement | HTMLTextAreaElement;
      const startPos = inputElement.selectionStart || 0;
      const endPos = inputElement.selectionEnd || 0;
      
      const beforeText = inputElement.value.substring(0, startPos);
      const afterText = inputElement.value.substring(endPos);
      
      inputElement.value = beforeText + text + afterText;
      
      // Set cursor position after inserted text
      const newCursorPos = startPos + text.length;
      inputElement.selectionStart = newCursorPos;
      inputElement.selectionEnd = newCursorPos;
      
      // Trigger input event for reactive frameworks
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      success = true;
      break;
    }
    
    case 'contenteditable': {
      // For contentEditable elements
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Create DOM nodes from text with proper line breaks
        const fragment = document.createDocumentFragment();
        const lines = text.split('\n');
        
        lines.forEach((line, index) => {
          if (index > 0) {
            fragment.appendChild(document.createElement('br'));
          }
          if (line.length > 0) {
            fragment.appendChild(document.createTextNode(line));
          }
        });
        
        range.insertNode(fragment);
        
        // Move cursor to end of inserted text
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger input event
        activeElement.dispatchEvent(new Event('input', { bubbles: true }));
        success = true;
      }
      break;
    }
    
    case 'codemirror': {
      // For CodeMirror editor
      try {
        let cm = null;
        
        // Try different ways to access the CodeMirror instance
        if (activeElement.CodeMirror) {
          cm = activeElement.CodeMirror;
        } else if (activeElement.closest('.CodeMirror')?.CodeMirror) {
          cm = activeElement.closest('.CodeMirror')?.CodeMirror;
        } else if (window.CodeMirror) {
          // This is a fallback and might not work in all cases
          const cmElements = document.querySelectorAll('.CodeMirror');
          for (const el of Array.from(cmElements)) {
            if ((el as any).CodeMirror) {
              cm = (el as any).CodeMirror;
              break;
            }
          }
        }
        
        if (cm) {
          // CodeMirror's replaceSelection preserves line breaks
          cm.replaceSelection(text);
          success = true;
        }
      } catch (e) {
        debugLog(`Error pasting to CodeMirror: ${e}`);
      }
      break;
    }
    
    case 'monaco': {
      // For Monaco editor
      try {
        if (window.monaco && window.monaco.editor) {
          const editors = window.monaco.editor.getEditors();
          if (editors && editors.length > 0) {
            const editor = editors[0];
            editor.trigger('keyboard', 'type', { text });
            success = true;
          }
        }
      } catch (e) {
        debugLog(`Error pasting to Monaco editor: ${e}`);
      }
      break;
    }
    
    case 'tinymce': {
      // For TinyMCE editor
      try {
        if (window.tinymce && window.tinymce.activeEditor) {
          window.tinymce.activeEditor.insertContent(text);
          success = true;
        }
      } catch (e) {
        debugLog(`Error pasting to TinyMCE: ${e}`);
      }
      break;
    }
    
    case 'ckeditor': {
      // For CKEditor
      try {
        if (window.CKEDITOR) {
          for (const id in window.CKEDITOR.instances) {
            window.CKEDITOR.instances[id].insertText(text);
            success = true;
            break;
          }
        }
      } catch (e) {
        debugLog(`Error pasting to CKEditor: ${e}`);
      }
      break;
    }
    
    default: {
      // Try using execCommand as fallback
      try {
        // Try insertHTML with proper line break handling
        const htmlText = text.replace(/\n/g, '<br>');
        success = document.execCommand('insertHTML', false, htmlText);
        
        if (!success) {
          // Try insertText (may not preserve line breaks in all browsers)
          success = document.execCommand('insertText', false, text);
        }
      } catch (e) {
        debugLog(`Error with execCommand fallbacks: ${e}`);
      }
      break;
    }
  }
  
  return success;
} 