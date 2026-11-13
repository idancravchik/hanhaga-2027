/**
 * HTML Sanitization Utility for Bulletin Board and Rich Text
 * Mitigates Stored & Reflected Cross-Site Scripting (XSS)
 * Conforms to SEC-CRIT-05
 */

const ALLOWED_TAGS = new Set([
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'del',
    'div',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    's',
    'small',
    'span',
    'strike',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'u',
    'ul',
]);

const DANGEROUS_TAGS = new Set([
    'script',
    'style',
    'iframe',
    'object',
    'embed',
    'link',
    'meta',
    'base',
    'form',
    'input',
    'button',
    'select',
    'textarea',
    'svg',
    'math',
    'template',
    'applet',
    'noscript',
    'audio',
    'video',
    'source',
    'track',
    'frame',
    'frameset',
]);

const ALLOWED_ATTRIBUTES = new Set([
    'href',
    'src',
    'alt',
    'title',
    'class',
    'style',
    'dir',
    'target',
    'rel',
    'aria-label',
    'aria-hidden',
]);

const SAFE_CSS_PROPERTIES = new Set([
    'color',
    'background-color',
    'font-size',
    'font-weight',
    'font-style',
    'font-family',
    'text-decoration',
    'text-align',
    'display',
    'margin',
    'margin-top',
    'margin-bottom',
    'margin-left',
    'margin-right',
    'padding',
    'padding-top',
    'padding-bottom',
    'padding-left',
    'padding-right',
    'line-height',
    'border-radius',
    'max-width',
    'width',
    'height',
]);

const SAFE_URL_PATTERN = /^(?:https?:|mailto:|tel:|\/|\.\/|#)/i;

/**
 * Sanitizes CSS style attribute strings, preserving safe styling while blocking expressions and imports.
 */
function sanitizeStyle(styleStr: string): string {
    if (!styleStr) return '';
    // Disallow dangerous CSS expressions, urls, and behavior
    if (/(?:expression|url|behavior|-moz-binding|javascript|@import)/i.test(styleStr)) {
        return '';
    }

    const declarations = styleStr.split(';');
    const safeDeclarations: string[] = [];

    for (const decl of declarations) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx === -1) continue;

        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const value = decl.slice(colonIdx + 1).trim();

        if (SAFE_CSS_PROPERTIES.has(prop)) {
            // Check that the value does not contain forbidden constructs
            if (!/[<>"'`\\()]/.test(value)) {
                safeDeclarations.push(`${prop}: ${value}`);
            }
        }
    }

    return safeDeclarations.join('; ');
}

/**
 * Recursively cleans a DOM node and its children in-place.
 */
function cleanNode(node: Node): void {
    const children = Array.from(node.childNodes);

    for (const child of children) {
        if (child.nodeType === Node.COMMENT_NODE) {
            node.removeChild(child);
            continue;
        }

        if (child.nodeType === Node.TEXT_NODE) {
            continue;
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
            const el = child as HTMLElement;
            const tagName = el.tagName.toLowerCase();

            // Completely eliminate dangerous tags
            if (DANGEROUS_TAGS.has(tagName)) {
                node.removeChild(el);
                continue;
            }

            // If tag is not in whitelist, unwrap its contents into parent
            if (!ALLOWED_TAGS.has(tagName)) {
                cleanNode(el);
                while (el.firstChild) {
                    node.insertBefore(el.firstChild, el);
                }
                node.removeChild(el);
                continue;
            }

            // Strip forbidden or event handler attributes
            const attrs = Array.from(el.attributes);
            for (const attr of attrs) {
                const attrName = attr.name.toLowerCase();

                // Strip any event handler (onload, onerror, onclick, etc.)
                if (attrName.startsWith('on')) {
                    el.removeAttribute(attr.name);
                    continue;
                }

                if (!ALLOWED_ATTRIBUTES.has(attrName)) {
                    el.removeAttribute(attr.name);
                    continue;
                }

                // Check URLs in href/src
                if (attrName === 'href' || attrName === 'src') {
                    const val = attr.value.trim();
                    if (!SAFE_URL_PATTERN.test(val)) {
                        el.removeAttribute(attr.name);
                    }
                    continue;
                }

                // Sanitize style attributes
                if (attrName === 'style') {
                    const cleanedStyle = sanitizeStyle(attr.value);
                    if (cleanedStyle) {
                        el.setAttribute('style', cleanedStyle);
                    } else {
                        el.removeAttribute('style');
                    }
                    continue;
                }

                // Sanitize class attribute
                if (attrName === 'class') {
                    // Allow safe alphanumeric, hyphens, brackets, colons, slashes, hash (standard Tailwind utility tokens)
                    if (/[<>"'`]/.test(attr.value)) {
                        el.removeAttribute('class');
                    }
                    continue;
                }
            }

            // Enforce secure anchor attributes
            if (tagName === 'a') {
                el.setAttribute('target', '_blank');
                el.setAttribute('rel', 'noopener noreferrer');
            }

            // Recurse into children
            cleanNode(el);
        }
    }
}

/**
 * Robust HTML sanitizer for user-generated or Firestore-stored HTML content.
 * Prevents stored XSS attacks while preserving legitimate typography, colors,
 * headers, lists, and Tailwind layouts.
 */
export function sanitizeHtml(dirtyHtml: string | null | undefined): string {
    if (!dirtyHtml || typeof dirtyHtml !== 'string') {
        return '';
    }

    const trimmed = dirtyHtml.trim();
    if (!trimmed) {
        return '';
    }

    // If running in browser environment with DOMParser
    if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(trimmed, 'text/html');
            cleanNode(doc.body);
            return doc.body.innerHTML;
        } catch (err) {
            console.error('HTML sanitization error:', err);
            return '';
        }
    }

    // Server-side or non-DOM fallback: strip all tags
    return trimmed.replace(/<[^>]*>/g, '');
}
