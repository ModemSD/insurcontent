'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export interface RawContent {
  id?: string | number;
  source: string;
  platform: string;
  title: string;
  content: string;
  topic: string;
  pain_point: string;
  emotional_trigger: string;
  viral_score: number;
  rewrite_angle: string;
  target_audience: string;
  url: string;
  status?: 'new' | 'approved' | 'hidden';
  sent_platforms?: string[];
  created_at?: string;
}

// Global seeding list and database seeding/clearing methods ...
// (Skipping to sendRewriteWebhook...)

const DEMO_SIGNALS: RawContent[] = [
  {
    source: 'Reddit',
    platform: 'reddit',
    title: 'Claims processing is taking 3 weeks and clients are leaving',
    content: 'I run a mid-sized independent agency. Over the last 3 months, our main carrier\'s claims turnaround has lagged by 15 days. Customers are screaming at our front desk, writing 1-star reviews. We can\'t hire fast enough to deal with the follow-ups. Is there an AI system that can read claims documents and automate status updates?',
    topic: 'Claims Automation',
    pain_point: 'Understaffed claims department leads to client attrition and negative reviews.',
    emotional_trigger: 'Fear of agency reputation loss & business failure.',
    viral_score: 89,
    rewrite_angle: 'How automation resolves claims in under 24 hours, boosting client retention by 40%.',
    target_audience: 'Independent agency owners and operations managers.',
    url: 'https://www.reddit.com/r/insurance/comments/claims-lag-ai-solution',
  },
  {
    source: 'LinkedIn',
    platform: 'linkedin',
    title: 'AI underwriter agents just did 50 policies in 1 hour',
    content: 'Yesterday we ran a test. We deployed an AI agent trained on our commercial guidelines to pre-screen 50 complex liability applications. Total human audit time: 1 hour. Total accuracy: 98%. The future is here, and brokers who don\'t adopt this will be left behind.',
    topic: 'Underwriting AI',
    pain_point: 'Manual underwriting review takes hours per commercial policy, losing fast-moving deals.',
    emotional_trigger: 'Excitement over massive productivity gains.',
    viral_score: 94,
    rewrite_angle: 'Ditch the manual spreadsheets: How commercial agency agents use AI to quote and bind in minutes.',
    target_audience: 'Commercial insurance brokers & insurtech founders.',
    url: 'https://www.linkedin.com/posts/insurtech-guru-ai-underwriting',
  },
  {
    source: 'Google',
    platform: 'google',
    title: 'Google News: FTC launches inquiry into automated insurance pricing models',
    content: 'The FTC announced a scoping inquiry into how automated underwriting tools calculate premiums. The focus is on bias and explainability. Agencies using AI must ensure they have \'Human-in-the-loop\' systems and audit trails.',
    topic: 'Regulation & Ethics',
    pain_point: 'Regulatory compliance risks for automated algorithmic underwriting.',
    emotional_trigger: 'Anxiety about compliance fines & audit transparency.',
    viral_score: 62,
    rewrite_angle: 'Why transparency in AI algorithms is the number one priority for insurers in 2026.',
    target_audience: 'Insurtech compliance officers & enterprise risk managers.',
    url: 'https://news.google.com/articles/ftc-insurance-ai-regulations',
  },
  {
    source: 'Reddit',
    platform: 'reddit',
    title: 'Why does our CRM feel like a 1995 database?',
    content: 'Every day my agents spend 2 hours copy-pasting client emails into our CRM. Why doesn\'t the CRM just read the email, summarize it, categorize it, and queue a reply? We are wasting hundreds of hours on manual administrative tasks.',
    topic: 'Agency CRM',
    pain_point: 'Legacy CRMs lack intelligent search and automatic follow-up triggers.',
    emotional_trigger: 'Frustration with outdated technology and slow workflows.',
    viral_score: 78,
    rewrite_angle: 'How AI-enabled CRMs automate client conversations and save 15 hours of admin work per week.',
    target_audience: 'Insurance agency principals.',
    url: 'https://www.reddit.com/r/insuranceagents/comments/legacy-crm-pain',
  },
  {
    source: 'LinkedIn',
    platform: 'linkedin',
    title: 'LinkedIn: How we increased policy renewals by 35% using generative AI emails',
    content: 'Instead of sending \'Your policy is expiring next month\', we fed coverage details into an LLM to generate custom annual reviews highlighting local rate changes, specific risk recommendations, and savings. Renewals jumped 35%.',
    topic: 'Client Retention',
    pain_point: 'Low engagement in standard automated renewal emails leading to policy lapses.',
    emotional_trigger: 'Optimism for low-hanging fruit revenue growth.',
    viral_score: 81,
    rewrite_angle: 'From generic alerts to personalized AI advisory: Rewriting the policy renewal playbook.',
    target_audience: 'Personal lines agents & agency marketing managers.',
    url: 'https://www.linkedin.com/posts/insurance-retention-renewals-ai',
  },
  {
    source: 'Google',
    platform: 'google',
    title: 'Google News: Major carrier replaces Tier 1 support desk with Conversational AI',
    content: 'A tier-1 carrier implemented conversational AI agents for initial customer inquiries, policy changes, and ID card requests. They reported a 60% reduction in agent call volumes and average wait times dropping to 0 seconds.',
    topic: 'Customer Support',
    pain_point: 'High cost of maintaining 24/7 call centers with high employee turnover.',
    emotional_trigger: 'Urgency to cut operational costs and improve response times.',
    viral_score: 74,
    rewrite_angle: 'Is customer service dead? No, it just got automated. The economic case for Conversational AI.',
    target_audience: 'Insurance carriers & enterprise operations directors.',
    url: 'https://news.google.com/articles/carrier-adopts-conversational-ai',
  },
  {
    source: 'Reddit',
    platform: 'reddit',
    title: 'Reddit: Has anyone successfully used AI to write commercial risk summaries?',
    content: 'I need to draft detailed commercial risk profiles for complex accounts. It requires reading loss runs, inspection reports, and financial statements. Has anyone built a GPT prompt or tool that extracts key risks and drafts a summary?',
    topic: 'Commercial Risk',
    pain_point: 'Writing complex multi-page commercial risk summaries takes 3-4 hours per client.',
    emotional_trigger: 'Desire to automate tedious writing work.',
    viral_score: 45,
    rewrite_angle: 'AI commercial risk profiling: Drafting professional narratives from raw policy docs in 60 seconds.',
    target_audience: 'Commercial underwriters & brokers.',
    url: 'https://www.reddit.com/r/insurance/comments/commercial-risk-summaries-gpt',
  },
  {
    source: 'LinkedIn',
    platform: 'linkedin',
    title: 'LinkedIn: The death of cold calling in commercial insurance',
    content: 'Cold calling is dead. Today, we use AI agents to scrape local business registrations, find missing permits, assess property risk via satellite imagery, and email custom risk analyses to the CEO before we even call. It\'s warm outreach on steroids.',
    topic: 'Lead Generation',
    pain_point: 'Cold calling conversion rates have dropped below 1%, wasting producer time.',
    emotional_trigger: 'Rebellion against outdated sales tactics.',
    viral_score: 92,
    rewrite_angle: 'AI Prospecting: Scraping public records to identify under-insured businesses automatically.',
    target_audience: 'Insurance producers and sales directors.',
    url: 'https://www.linkedin.com/posts/commercial-leadgen-ai-warm-outreach',
  },
  {
    source: 'Google',
    platform: 'google',
    title: 'Google News: State Insurance Commissioners issue warnings on AI-driven redlining',
    content: 'The NAIC issued a warning on algorithmic bias, cautioning carriers that using behavioral data processed by machine learning could lead to unintentional bias or discriminatory pricing. Strict auditing guidelines are expected.',
    topic: 'Regulation & Ethics',
    pain_point: 'Ethical bias and legal risks in AI models assessing risk profiles.',
    emotional_trigger: 'Fear of regulatory enforcement and reputational damage.',
    viral_score: 58,
    rewrite_angle: 'Navigating ethical AI: How to audit your algorithms to prevent proxy discrimination.',
    target_audience: 'Actuarial teams and legal counsel.',
    url: 'https://news.google.com/articles/commissioners-warn-ai-bias',
  },
  {
    source: 'Reddit',
    platform: 'reddit',
    title: 'Reddit: We are losing personal auto leads to online digital carriers',
    content: 'Clients want quotes in 30 seconds. By the time my staff replies to an online lead form, the customer has already bought a policy from GEICO or a digital startup. We need to implement automated quoting or we will go bust.',
    topic: 'Client Acquisition',
    pain_point: 'Traditional agencies can\'t compete with instant quotes from direct-to-consumer insurtechs.',
    emotional_trigger: 'Fear of obsolescence and business extinction.',
    viral_score: 83,
    rewrite_angle: 'Speed to lead: Embedding AI instant quote chatbots in local agency websites.',
    target_audience: 'Personal lines agents & agency principals.',
    url: 'https://www.reddit.com/r/insuranceagents/comments/losing-leads-speed-to-quote',
  },
  {
    source: 'Reddit',
    platform: 'reddit',
    title: 'Reddit: Automating certificates of insurance (COI) using AI OCR',
    content: 'Our agents spend a third of their day reviewing COIs to make sure subcontractor coverages match the prime contract. It is mindless and error-prone. Is there a tools that uses AI OCR to extract COI limits and compare them against rules?',
    topic: 'Operations AI',
    pain_point: 'Manual review of COI limits against contracts is highly repetitive and prone to missing exclusions.',
    emotional_trigger: 'Frustration and fear of liability from missed coverage exclusions.',
    viral_score: 67,
    rewrite_angle: 'Zero-touch COI audits: How automated PDF analysis is shielding agencies from multi-million liability lawsuits.',
    target_audience: 'Risk managers and commercial lines brokers.',
    url: 'https://www.reddit.com/r/insurance/comments/coi-ocr-automation',
  },
  {
    source: 'LinkedIn',
    platform: 'linkedin',
    title: 'LinkedIn: The rising cost of cyber liability claims',
    content: 'Cyber insurance claims are up 50% year-over-year. Traditional actuarial models are failing because ransomware strategies shift in days, not years. AI systems running active network risk scans are the only way to write profitable cyber policies today.',
    topic: 'Cyber Insurance',
    pain_point: 'Traditional static underwriting is inadequate for fast-moving cyber threat landscapes.',
    emotional_trigger: 'Anxiety over catastrophic losses and pricing inaccuracy.',
    viral_score: 75,
    rewrite_angle: 'From static risk to active defense: Why cyber insurance requires continuous AI vulnerability scans.',
    target_audience: 'Cyber underwriters and corporate insurance buyers.',
    url: 'https://www.linkedin.com/posts/cyber-underwriting-threat-ai',
  }
];

export async function seedDemoData() {
  try {
    const { count, error: countError } = await supabase
      .from('raw_content')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return { success: false, error: countError.message };
    }

    if (count && count > 0) {
      return { success: false, error: 'Database already contains data.' };
    }

    const { error: insertError } = await supabase
      .from('raw_content')
      .insert(DEMO_SIGNALS);

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
}

export async function clearAllData() {
  try {
    const { error } = await supabase
      .from('raw_content')
      .delete()
      .not('id', 'is', null);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
}

export async function updateSignalStatus(id: string | number, status: 'new' | 'approved' | 'hidden') {
  try {
    const { error } = await supabase
      .from('raw_content')
      .update({ status })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/on-review');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
}

export async function deleteSignal(id: string | number) {
  try {
    const { error } = await supabase
      .from('raw_content')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/on-review');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown error occurred' };
  }
}

export async function sendRewriteWebhook(signal: RawContent, platform: string) {
  try {
    // Bypass self-signed SSL certificate issue on the hostinger cloud domain
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const n8nHost = process.env.NEXT_PUBLIC_N8N_HOST || 'https://n8n.insurcontent.online';
    const webhookType = process.env.NEXT_PUBLIC_N8N_WEBHOOK_TYPE || 'webhook'; // 'webhook' or 'webhook-test'
    const url = `${n8nHost}/${webhookType}/36b26179-26a4-4e9d-8c82-ece5d3fd1835`;

    const body = {
      signalId: signal.id ? String(signal.id) : '',
      title: signal.title || '',
      content: signal.content || '',
      topic: signal.topic || '',
      painPoint: signal.pain_point || '',
      emotionalTrigger: signal.emotional_trigger || '',
      rewriteAngle: signal.rewrite_angle || '',
      targetAudience: signal.target_audience || '',
      url: signal.url || '',
      source: signal.source || '',
      targetPlatform: platform
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return { success: false, error: `Webhook returned status ${response.status}` };
    }

    // Update database to add the platform to sent_platforms
    if (signal.id) {
      const { data, error: fetchError } = await supabase
        .from('raw_content')
        .select('sent_platforms')
        .eq('id', signal.id)
        .single();

      if (!fetchError && data) {
        const currentPlatforms: string[] = data.sent_platforms || [];
        if (!currentPlatforms.includes(platform)) {
          const updatedPlatforms = [...currentPlatforms, platform];
          await supabase
            .from('raw_content')
            .update({ sent_platforms: updatedPlatforms })
            .eq('id', signal.id);
        }
      }
    }

    revalidatePath('/');
    revalidatePath('/on-review');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error occurred' };
  }
}

export interface RewrittenPost {
  id: string;
  raw_content_id?: string;
  platform?: string;
  hook?: string;
  body: string; // actual DB column
  cta?: string;
  tone?: string;
  status?: string | null; // DB column
  engagement_score?: number;
  image_prompt?: string;
  image_id?: string;
  image_file?: string;
  image_url?: string;
  created_at?: string;
  // Join fields
  raw_content?: {
    title: string;
    content: string;
    source: string;
    viral_score: number;
  };
}

export async function getRewrittenPosts() {
  try {
    const { data: posts, error } = await supabase
      .from('rewritten_content')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    // Robustly fetch related raw_content details if raw_content_id is present
    const postsWithSignals = await Promise.all((posts || []).map(async (post) => {
      if (post.raw_content_id) {
        // Try parsing as integer first
        const numericId = parseInt(post.raw_content_id, 10);
        if (!isNaN(numericId)) {
          const { data: raw } = await supabase
            .from('raw_content')
            .select('title, content, source, viral_score')
            .eq('id', numericId)
            .single();
          if (raw) {
            return {
              ...post,
              raw_content: raw
            };
          }
        }
        
        // Fallback for UUID/string IDs
        const { data: raw } = await supabase
          .from('raw_content')
          .select('title, content, source, viral_score')
          .eq('id', post.raw_content_id)
          .single();
        if (raw) {
          return {
            ...post,
            raw_content: raw
          };
        }
      }
      return post;
    }));

    return { success: true, data: postsWithSignals as RewrittenPost[] };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch rewritten posts' };
  }
}

export async function updateRewrittenPostText(id: string | number, text: string) {
  try {
    const { error } = await supabase
      .from('rewritten_content')
      .update({ body: text }) // update 'body' column
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    revalidatePath('/ready-to-post');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update rewritten post' };
  }
}

export async function deleteRewrittenPost(id: string | number) {
  try {
    const { error } = await supabase
      .from('rewritten_content')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    revalidatePath('/ready-to-post');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete rewritten post' };
  }
}

export async function updateRewrittenPostStatus(id: string | number, status: string | null) {
  try {
    const { error } = await supabase
      .from('rewritten_content')
      .update({ status })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    revalidatePath('/ready-to-post');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update rewritten post status' };
  }
}

export async function regeneratePostText(post: RewrittenPost) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const n8nHost = process.env.NEXT_PUBLIC_N8N_HOST || 'https://n8n.insurcontent.online';
    const webhookType = process.env.NEXT_PUBLIC_N8N_WEBHOOK_TYPE || 'webhook';
    const url = `${n8nHost}/${webhookType}/f36d7e24-1412-4d10-854a-1da3cfc5a39a`;

    const body = {
      id: post.id
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return { success: false, error: `Webhook returned status ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error occurred' };
  }
}

export async function regeneratePostImage(post: RewrittenPost) {
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const n8nHost = process.env.NEXT_PUBLIC_N8N_HOST || 'https://n8n.insurcontent.online';
    const webhookType = process.env.NEXT_PUBLIC_N8N_WEBHOOK_TYPE || 'webhook';
    const url = `${n8nHost}/${webhookType}/bc517aea-bc64-4e13-b158-8339d4a189ee`;

    const body = {
      id: post.id
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return { success: false, error: `Webhook returned status ${response.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error occurred' };
  }
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.session) {
      const cookieStore = await cookies();
      cookieStore.set('sb-access-token', data.session.access_token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      cookieStore.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return { success: true };
    }

    return { success: false, error: 'No session returned' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred during sign in' };
  }
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('sb-access-token');
    cookieStore.delete('sb-refresh-token');
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to logout' };
  }
}

export async function getMediaPlanSettings() {
  try {
    const { data, error } = await supabase
      .from('mediaplan_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 is postgrest code for 0 rows returned, which is expected before first save
        return { success: true, data: null };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error fetching media plan settings' };
  }
}

export async function saveMediaPlanSettings(calcData: any, planData: any) {
  try {
    const { error } = await supabase
      .from('mediaplan_settings')
      .upsert({
        id: 'default',
        calc_data: calcData,
        plan_data: planData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error saving media plan settings' };
  }
}




