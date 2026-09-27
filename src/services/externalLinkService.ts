/**
 * AI Podium External Link Attachment Pipeline (GitHub & Web)
 * Fetches content directly from raw GitHub or via Jina Reader proxy (r.jina.ai).
 */

export interface FetchedLinkResult {
  url: string;
  title: string;
  content: string;
}

/**
 * Checks if a string is a valid web URL or GitHub URL
 */
export function isWebOrGitHubUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (trimmed.startsWith('github.com/') || trimmed.startsWith('raw.githubusercontent.com/')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes input URL by adding https:// if missing
 */
export function normalizeLinkUrl(input: string): string {
  let trimmed = input.trim();
  if (trimmed.startsWith('github.com/')) {
    trimmed = `https://${trimmed}`;
  } else if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Converts a GitHub repository file URL to raw.githubusercontent.com URL
 * e.g. https://github.com/owner/repo/blob/main/path/to/file.ts ->
 *      https://raw.githubusercontent.com/owner/repo/main/path/to/file.ts
 */
export function convertGitHubUrlToRaw(githubUrl: string): { isGitHub: boolean; rawUrl?: string; isFile: boolean } {
  try {
    const url = new URL(normalizeLinkUrl(githubUrl));
    if (!url.hostname.includes('github.com') && !url.hostname.includes('raw.githubusercontent.com')) {
      return { isGitHub: false, isFile: false };
    }

    if (url.hostname === 'raw.githubusercontent.com') {
      return { isGitHub: true, rawUrl: url.toString(), isFile: true };
    }

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 4 && parts[2] === 'blob') {
      const owner = parts[0];
      const repo = parts[1];
      const branch = parts[3];
      const filePath = parts.slice(4).join('/');
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      return { isGitHub: true, rawUrl, isFile: true };
    }

    // Repository root or directory
    return { isGitHub: true, isFile: false };
  } catch {
    return { isGitHub: false, isFile: false };
  }
}

/**
 * Fetches content from a GitHub or Web URL.
 * - For GitHub file URLs: fetches directly from raw.githubusercontent.com
 * - For Web URLs and GitHub repo pages: fetches through https://r.jina.ai/<target_url> to bypass CORS and extract clean markdown
 */
export async function fetchExternalLinkContent(inputUrl: string): Promise<FetchedLinkResult> {
  const normalizedUrl = normalizeLinkUrl(inputUrl);
  const githubInfo = convertGitHubUrlToRaw(normalizedUrl);

  // 1. If it's a GitHub file blob, attempt direct fetch from raw.githubusercontent.com
  if (githubInfo.isGitHub && githubInfo.isFile && githubInfo.rawUrl) {
    try {
      const resp = await fetch(githubInfo.rawUrl);
      if (resp.ok) {
        const text = await resp.text();
        const urlParts = normalizedUrl.split('/');
        const fileName = urlParts[urlParts.length - 1] || 'GitHub File';
        return {
          url: normalizedUrl,
          title: fileName,
          content: text.trim() || '(내용 없음)',
        };
      }
    } catch {
      // Direct raw fetch failed (e.g. CORS or network restriction), fallback to Jina reader
    }
  }

  // 2. Fetch through Jina Reader (https://r.jina.ai/<target_url>)
  const jinaUrl = `https://r.jina.ai/${normalizedUrl}`;
  try {
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain, text/markdown',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const markdown = await response.text();
    const cleanContent = markdown.trim();

    // Extract title from first markdown heading if present
    let title = '';
    const titleMatch = cleanContent.match(/^#\s+(.+)$/m);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    } else {
      try {
        const parsed = new URL(normalizedUrl);
        title = parsed.pathname.length > 1 ? `${parsed.hostname}${parsed.pathname}` : parsed.hostname;
      } catch {
        title = normalizedUrl;
      }
    }

    return {
      url: normalizedUrl,
      title: title || normalizedUrl,
      content: cleanContent || '(내용 없음)',
    };
  } catch (err: any) {
    throw new Error(`링크 콘텐츠를 가져오지 못했습니다 (${err.message || '네트워크 오류'})`);
  }
}

/**
 * Formats link content reference block for outgoing prompt payload
 */
export function formatLinkReferenceBlock(url: string, content: string): string {
  return `\n\n--- [Reference Web/Repo: ${url}] ---\n${content}\n--- [End] ---\n`;
}
