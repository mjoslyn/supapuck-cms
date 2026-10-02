// The site's social profiles (Settings > Social: settings.site.social), for the social-links block
// and the home page's structured data.
import { NETWORKS } from './icons';

export interface SocialLink {
  network: string;
  url: string;
}

/** The saved links that have a known network and a web or mail address. */
export function socialLinks(siteSettings: Record<string, any> | undefined): SocialLink[] {
  const raw = Array.isArray(siteSettings?.social) ? siteSettings!.social : [];
  return raw
    .filter((l: any) => l && NETWORKS[l.network] && typeof l.url === 'string' && /^(https?:\/\/|mailto:)/i.test(l.url.trim()))
    .map((l: any) => ({ network: l.network, url: l.url.trim() }));
}
