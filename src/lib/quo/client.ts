import { QuoUser, QuoCall, TranscriptUtterance } from '@/types/telephony';

const BASE_URL = 'https://api.openphone.com/v1';

export class QuoClient {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.QUO_API_KEY || '';
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('QUO_API_KEY is not configured');
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Authorization': this.apiKey, // OpenPhone/Quo accepts standard raw token in Authorization header
        'Content-Type': 'application/json',
        ...options.headers,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(`Quo API Error [${res.status}]: ${errorText}`);
    }

    return res.json();
  }

  /**
   * Get team members / users
   */
  async getUsers(): Promise<QuoUser[]> {
    try {
      const res = await this.request<{ data: any[] }>('/users');
      return (res.data || []).map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Unknown',
        email: u.email,
        phoneNumbers: u.phoneNumbers || [],
        role: u.role,
      }));
    } catch (err) {
      console.warn('Failed to fetch Quo users:', err);
      return [];
    }
  }

  /**
   * Get all phone numbers in the workspace
   */
  async getPhoneNumbers(): Promise<{ id: string; number: string; name?: string }[]> {
    try {
      const res = await this.request<{ data: any[] }>('/phone-numbers');
      return (res.data || []).map((p) => ({
        id: p.id,
        number: p.number || p.formattedNumber,
        name: p.name,
      }));
    } catch (err) {
      console.warn('Failed to fetch phone numbers:', err);
      return [];
    }
  }

  /**
   * Get calls list via conversations
   */
  async getCalls(params?: { maxResults?: number }): Promise<{ calls: QuoCall[] }> {
    try {
      // 1. Fetch recent conversations
      const limit = params?.maxResults || 100;
      const convRes = await this.request<{ data: any[] }>(`/conversations?maxResults=${limit}`);
      const conversations = convRes.data || [];
      // 2. Query calls in smaller concurrent chunks (5 at a time) to strictly respect Quo rate limit (10 req/s)
      const batch = conversations.slice(0, 50);
      const callMap = new Map<string, QuoCall>();

      const chunkSize = 5;
      for (let i = 0; i < batch.length; i += chunkSize) {
        const chunk = batch.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (conv) => {
            if (!conv.phoneNumberId || !conv.participants || conv.participants.length === 0) return;

            const query = new URLSearchParams();
            query.set('phoneNumberId', conv.phoneNumberId);
            for (const p of conv.participants) {
              query.append('participants[]', p);
            }

            try {
              const callsRes = await this.request<{ data: any[] }>(`/calls?${query.toString()}`);
              for (const c of callsRes.data || []) {
                if (!c.id || callMap.has(c.id)) continue;

                const direction = c.direction === 'outgoing' ? 'outbound' : 'inbound';
                let status: QuoCall['status'] = 'completed';
                if (c.status === 'missed') status = 'missed';
                else if (c.status === 'voicemail') status = 'voicemail';

                const customerPhone = (c.participants || []).find((p: string) => !p.includes(conv.phoneNumberId)) || c.participants?.[1] || '';
                const ourPhone = (c.participants || []).find((p: string) => p !== customerPhone) || c.participants?.[0] || '';
                
                // Проверяем факт ответа:
                // Если нет answeredAt или длительность <= 5 сек, трубку не взяли (No answer)
                const duration = c.duration || 0;
                const hasAnsweredAt = Boolean(c.answeredAt);
                const answeredByHuman = hasAnsweredAt && duration > 10;

                callMap.set(c.id, {
                  id: c.id,
                  direction,
                  status,
                  duration,
                  createdAt: c.createdAt || new Date().toISOString(),
                  completedAt: c.completedAt,
                  answeredAt: c.answeredAt || null,
                  answeredByHuman,
                  from: direction === 'inbound' ? customerPhone : ourPhone,
                  to: direction === 'inbound' ? ourPhone : customerPhone,
                  userId: c.userId,
                  phoneNumberId: c.phoneNumberId,
                  hasRecording: true,
                });
              }
            } catch (e) {
              // Ignore individual conversation fetch error
            }
          })
        );
      }

      const allCalls = Array.from(callMap.values());
      // Sort descending by created date
      allCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { calls: allCalls };
    } catch (err) {
      console.warn('Failed to fetch calls:', err);
      return { calls: [] };
    }
  }

  /**
   * Get transcript for a call if available in Quo
   */
  async getCallTranscript(callId: string): Promise<TranscriptUtterance[] | null> {
    try {
      const res = await this.request<any>(`/call-transcripts/${callId}`);
      if (res?.data?.dialogue) {
        return res.data.dialogue.map((item: any) => ({
          speaker: item.userId ? 'agent' : 'customer',
          speakerName: item.userId ? 'Менеджер' : 'Клиент',
          text: item.content || item.text,
          start: item.start,
          end: item.end,
        }));
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Get recording URL or media download
   */
  async getCallRecordingUrl(callId: string): Promise<string | null> {
    try {
      const res = await this.request<{ data: any[] }>(`/call-recordings/${callId}`);
      return res?.data?.[0]?.url || null;
    } catch {
      return null;
    }
  }
}
