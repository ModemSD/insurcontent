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
   * Get calls list
   */
  async getCalls(params?: { phoneNumberId?: string; userId?: string; maxResults?: number; pageToken?: string }): Promise<{ calls: QuoCall[]; nextPageToken?: string }> {
    let targetPhoneId = params?.phoneNumberId;

    // If phoneNumberId is not provided, fetch the first available phone number
    if (!targetPhoneId) {
      const numbers = await this.getPhoneNumbers();
      if (numbers.length > 0) {
        targetPhoneId = numbers[0].id;
      }
    }

    if (!targetPhoneId) {
      return { calls: [] };
    }

    const query = new URLSearchParams();
    query.set('phoneNumberId', targetPhoneId);
    if (params?.userId) query.set('userId', params.userId);
    if (params?.maxResults) query.set('maxResults', params.maxResults.toString());
    if (params?.pageToken) query.set('pageToken', params.pageToken);

    const queryString = `?${query.toString()}`;
    const res = await this.request<{ data: any[]; nextPageToken?: string }>(`/calls${queryString}`);

    const calls: QuoCall[] = (res.data || []).map((c) => {
      let status: QuoCall['status'] = 'completed';
      if (c.status === 'missed' || c.disposition === 'missed') status = 'missed';
      else if (c.status === 'voicemail' || c.hasVoicemail) status = 'voicemail';

      return {
        id: c.id,
        direction: c.direction || (c.from?.userId ? 'outbound' : 'inbound'),
        status,
        duration: c.duration || 0,
        createdAt: c.createdAt || new Date().toISOString(),
        completedAt: c.completedAt,
        from: c.from?.phoneNumber || c.from || '',
        to: c.to?.phoneNumber || c.to || '',
        userId: c.userId || c.from?.userId || c.to?.userId,
        phoneNumberId: c.phoneNumberId,
        recordingUrl: c.mediaUrl || c.recordingUrl,
        hasRecording: Boolean(c.mediaUrl || c.recordingUrl || c.hasRecording),
      };
    });

    return {
      calls,
      nextPageToken: res.nextPageToken,
    };
  }

  /**
   * Get transcript for a call if available in Quo
   */
  async getCallTranscript(callId: string): Promise<TranscriptUtterance[] | null> {
    try {
      const res = await this.request<any>(`/call-transcripts/${callId}`);
      if (res?.data?.utterances) {
        return res.data.utterances.map((u: any) => ({
          speaker: u.speaker === 'agent' || u.userId ? 'agent' : 'customer',
          speakerName: u.speakerName,
          text: u.text,
          start: u.start,
          end: u.end,
        }));
      }
      return null;
    } catch (err) {
      // Transcript might not exist yet or not supported on this plan
      return null;
    }
  }

  /**
   * Get recording URL or media download
   */
  async getCallRecordingUrl(callId: string): Promise<string | null> {
    try {
      const res = await this.request<{ data: { url: string } }>(`/call-recordings/${callId}`);
      return res?.data?.url || null;
    } catch {
      return null;
    }
  }
}
