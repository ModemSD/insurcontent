'use client';

import React, { useState, useEffect, useRef } from 'react';
import { domToPng } from 'modern-screenshot';
import { 
  Download, Image as ImageIcon, Check, Sparkles, Layers, Sliders, LayoutGrid, Eye, HelpCircle, AlertCircle
} from 'lucide-react';

export interface PostTemplateItem {
  day: number;
  theme: string;
  head: string;
  key: string;
  fmt: 'single' | 'carousel';
  inner: string[];
  cta: string;
}

export const POSTS: PostTemplateItem[] = [
  {
    day: 1,
    theme: "Problem awareness",
    head: "Where do your callers go after 5 PM?",
    key: "DEMO",
    fmt: "carousel",
    inner: [
      "40% of prospects call outside business hours",
      "80% never leave a voicemail",
      "They just dial the next agency on the list",
      "95% of calls answered, around the clock"
    ],
    cta: "Comment DEMO and we'll price your after-hours pipeline"
  },
  {
    day: 2,
    theme: "Product feature",
    head: "Listen to our AI talk to a real client",
    key: "TALK",
    fmt: "carousel",
    inner: [
      "It reads tone",
      "It handles interruptions without losing the thread",
      "It slows down when a caller is stressed",
      "It never sounds like a phone tree"
    ],
    cta: "Comment TALK to hear it say your agency's name"
  },
  {
    day: 3,
    theme: "Loss analysis",
    head: "$21,700 a month, walking out the door",
    key: "CALC",
    fmt: "carousel",
    inner: [
      "40 inbound calls a day",
      "31 missed every month",
      "$250 average commission",
      "= $21,700 lost, every month"
    ],
    cta: "Comment CALC for the math on your real call volume"
  },
  {
    day: 4,
    theme: "Customer story",
    head: "My clients never realized they were talking to an AI",
    key: "",
    fmt: "carousel",
    inner: [
      "He thought AI phone agents were a gimmick",
      "Answer rate went from patchy to near-total",
      "Not one new seat added",
      "Clients get instant answers now"
    ],
    cta: "Full story at the link in bio"
  },
  {
    day: 5,
    theme: "Technical value",
    head: "Manual data entry is officially dead",
    key: "",
    fmt: "carousel",
    inner: [
      "Every call ends in five minutes of retyping",
      "Fields get dropped. Details get lost.",
      "We transcribe, score sentiment, extract fields",
      "Straight into AMS360 or EZLynx in 30 seconds"
    ],
    cta: "Drop your AMS in the comments to check compatibility"
  },
  {
    day: 6,
    theme: "Risk reduction",
    head: "TCPA fines don't come with a warning shot",
    key: "SAFE",
    fmt: "single",
    inner: [
      "$500 per improper call",
      "Up to $1,500 if a court finds it willful",
      "Consent checks built into the dial logic",
      "Not a settings toggle bolted on later"
    ],
    cta: "Comment SAFE for our compliance guide"
  },
  {
    day: 7,
    theme: "Voice cloning",
    head: "Your best closer, working 24/7",
    key: "CLONE",
    fmt: "carousel",
    inner: [
      "One recording session",
      "Your top producer's voice, cloned",
      "Same delivery, same pacing, same confidence",
      "At 2 AM on a holiday weekend"
    ],
    cta: "Comment CLONE for voice samples"
  },
  {
    day: 8,
    theme: "Dormant book",
    head: "There's money sitting in your CRM right now",
    key: "REACTIVE",
    fmt: "single",
    inner: [
      "Contacts older than 90 days",
      "Quoted once, never closed",
      "Fresh leads cost more every quarter",
      "Work the book you already paid for"
    ],
    cta: "Comment REACTIVE to start the campaign"
  },
  {
    day: 9,
    theme: "Sales psychology",
    head: "Five minutes decides who closes the deal",
    key: "SPEED",
    fmt: "carousel",
    inner: [
      "Contact inside five minutes and you close",
      "Wait an hour and they've talked to someone else",
      "We pick up in about five seconds",
      "Every time. Including Sunday."
    ],
    cta: "Comment SPEED for a free response-time audit"
  },
  {
    day: 10,
    theme: "FNOL automation",
    head: "The worst moment to put someone on hold",
    key: "",
    fmt: "single",
    inner: [
      "FNOL is when your client is most rattled",
      "It usually has the longest wait time",
      "We collect details, photos and timeline",
      "Filed while they're still on the line"
    ],
    cta: "Run a demo FNOL scenario — link in bio"
  },
  {
    day: 11,
    theme: "Burnout",
    head: "Your best CSR won't tell you they're burning out",
    key: "PEOPLE",
    fmt: "carousel",
    inner: [
      "Same twelve questions all day",
      "Manual entry after every single call",
      "Voicemails to return at 6 PM",
      "They won't complain. They'll resign."
    ],
    cta: "Comment PEOPLE to see what to offload first"
  },
  {
    day: 12,
    theme: "Financial guarantee",
    head: "We pay if our AI gets it wrong",
    key: "SHIELD",
    fmt: "single",
    inner: [
      "The objection we hear most",
      "What if it misstates a policy detail?",
      "Zero-Misinfo Shield",
      "We credit your subscription for the quarter"
    ],
    cta: "Comment SHIELD for the full terms"
  },
  {
    day: 13,
    theme: "Market data",
    head: "The buyer's journey changed while you were on hold",
    key: "FUTURE",
    fmt: "carousel",
    inner: [
      "Buyers ask an AI assistant first",
      "They arrive already compared",
      "Down to two agencies before they dial",
      "They call once. That's the whole funnel."
    ],
    cta: "Comment FUTURE to adapt your intake"
  },
  {
    day: 14,
    theme: "ROI guarantee",
    head: "30 days. No risk. Money back.",
    key: "RISKFREE",
    fmt: "single",
    inner: [
      "20 hours saved in the first 30 days",
      "Or the platform pays for itself",
      "Or you get every dollar back",
      "We take the risk because the math works"
    ],
    cta: "Comment RISKFREE to start"
  },
  {
    day: 15,
    theme: "Interactive",
    head: "What percentage of your calls are you missing?",
    key: "LEAK",
    fmt: "carousel",
    inner: [
      "Missed at lunch",
      "Missed at 5:02",
      "Missed during the Monday meeting",
      "Missed all weekend, when the storm hit"
    ],
    cta: "Comment LEAK for our free lead-leak test"
  },
  {
    day: 16,
    theme: "Integrations",
    head: "Your AI should adapt to your stack",
    key: "",
    fmt: "single",
    inner: [
      "Applied Epic. HawkSoft.",
      "EZLynx. AMS360.",
      "No developer, no data migration",
      "No six-week onboarding series"
    ],
    cta: "DM us your CRM for the exact setup steps"
  },
  {
    day: 17,
    theme: "Humor / Life",
    head: "Friday, 5:01 PM at a typical agency",
    key: "WEEKEND",
    fmt: "carousel",
    inner: [
      "The lights are off",
      "The parking lot is empty",
      "The phone is still ringing",
      "Somebody's commission is on the other end"
    ],
    cta: "Comment WEEKEND to cover after-hours"
  },
  {
    day: 18,
    theme: "Specialization",
    head: "Generic bots fall apart on trucking and Medicare",
    key: "NICHE",
    fmt: "single",
    inner: [
      "Ask one about an MCS-90 endorsement",
      "Or a Part D late enrollment penalty",
      "Watch it improvise. Your caller will notice.",
      "Ours trained on real insurance conversations"
    ],
    cta: "Comment NICHE for dialogues in your line"
  },
  {
    day: 19,
    theme: "Product feature",
    head: "If our system drops a call, we pay for it",
    key: "BOUNTY",
    fmt: "carousel",
    inner: [
      "Uptime promises are cheap",
      "Ours has a price tag",
      "Our failure means credited leads",
      "No ticket, no argument about fault"
    ],
    cta: "Comment BOUNTY for details"
  },
  {
    day: 20,
    theme: "Case study",
    head: "This agency cut churn 40% with one phone call",
    key: "CHURN",
    fmt: "single",
    inner: [
      "Renewal season is peak exposure",
      "Most agencies go quiet exactly then",
      "AI called every client before auto-renewal",
      "Two questions. Unhappy ones flagged same day."
    ],
    cta: "Comment CHURN for the retention script"
  },
  {
    day: 21,
    theme: "Data security",
    head: "Who owns your clients' data?",
    key: "TRUST",
    fmt: "carousel",
    inner: [
      "Never sold",
      "Never used to train public models",
      "Never leaves your account",
      "Export it or delete it, any time"
    ],
    cta: "Comment TRUST for our security documentation"
  },
  {
    day: 22,
    theme: "Value comparison",
    head: "Scripts don't know an HO-3 from an HO-5",
    key: "COMPARE",
    fmt: "single",
    inner: [
      "Your client knows the difference",
      "Every misquote becomes a service ticket",
      "Enough tickets become a lost renewal",
      "Faster, cheaper, and on your compliance rules"
    ],
    cta: "Comment COMPARE for the cost breakdown"
  },
  {
    day: 23,
    theme: "Lowering barriers",
    head: "14 days to change your mind",
    key: "TRY",
    fmt: "carousel",
    inner: [
      "Run it on your real call volume",
      "Two full weeks",
      "Not doing what we promised? Refunded.",
      "No exit interview, no retention offer"
    ],
    cta: "Comment TRY to start"
  },
  {
    day: 24,
    theme: "Expert content",
    head: "Grow the book without growing payroll",
    key: "SCALE",
    fmt: "single",
    inner: [
      "Salary, taxes, benefits, a desk",
      "Eight weeks before they're useful",
      "A third leave inside eighteen months",
      "Scale capacity instead of headcount"
    ],
    cta: "Comment SCALE to build your model"
  },
  {
    day: 25,
    theme: "Technical value",
    head: "AI should know when to hand it over",
    key: "TRANSFER",
    fmt: "carousel",
    inner: [
      "It shouldn't close a $40K commercial account",
      "It should recognise one",
      "Qualified and routed to a live producer",
      "Full transcript already on screen"
    ],
    cta: "Comment TRANSFER to see the handoff"
  },
  {
    day: 26,
    theme: "Humor / Life",
    head: "Nobody sounds great at 4:47 on a Thursday",
    key: "QUALITY",
    fmt: "single",
    inner: [
      "Tired voice. Flat delivery. Skipped questions.",
      "That's not a character flaw",
      "That's a human at the end of a long week",
      "AI doesn't have long weeks"
    ],
    cta: "Comment QUALITY for a call audit"
  },
  {
    day: 27,
    theme: "Niche solutions",
    head: "AEP rewards whoever picks up",
    key: "AEP",
    fmt: "carousel",
    inner: [
      "200 calls in a single afternoon",
      "Headcount can't flex that fast",
      "AI takes every call at once",
      "Qualifies each one and books it"
    ],
    cta: "Comment AEP to prep for the season"
  },
  {
    day: 28,
    theme: "Value guarantee",
    head: "You're not short on leads",
    key: "LEADGEN",
    fmt: "single",
    inner: [
      "Thousands a month on cold, shared lists",
      "Meanwhile inbound calls hit voicemail",
      "Those callers already want to buy",
      "Fix the second problem first"
    ],
    cta: "Comment LEADGEN to rebuild the model"
  },
  {
    day: 29,
    theme: "Expert content",
    head: "Buyers pay for your process, not your book",
    key: "VALUATION",
    fmt: "carousel",
    inner: [
      "Three people who remember everything",
      "That's dependency, not enterprise value",
      "Standardised intake. Documented calls.",
      "Process is what moves the multiple"
    ],
    cta: "Comment VALUATION to talk it through"
  },
  {
    day: 30,
    theme: "Direct CTA",
    head: "Stop donating commissions to the agency down the street",
    key: "START",
    fmt: "single",
    inner: [
      "Missed calls",
      "Overloaded staff",
      "Renewals walking quietly at 11 PM",
      "Fixable in days, not quarters"
    ],
    cta: "Comment START to book your demo"
  }
];

export default function InstagramBuilder() {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [format, setFormat] = useState<'single' | 'carousel'>('carousel');
  const [slideCount, setSlideCount] = useState<number>(5);
  const [activeSlide, setActiveSlide] = useState<number>(0);

  // Custom inputs
  const [customTheme, setCustomTheme] = useState<string>('');
  const [customHeadline, setCustomHeadline] = useState<string>('');
  const [hideTheme, setHideTheme] = useState<boolean>(false);
  const [hideLogo, setHideLogo] = useState<boolean>(false);

  // Corner style
  const [cornerStyle, setCornerStyle] = useState<string>('auto');
  const [cornerCustomText, setCornerCustomText] = useState<string>('');
  const [cornerPill, setCornerPill] = useState<boolean>(false);

  // Background and safe zone
  const [bgDataUrl, setBgDataUrl] = useState<string>('');
  const [showSafeZones, setShowSafeZones] = useState<boolean>(false);

  // Status and export state
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Editable inner slides dictionary { "day:slideIdx": text }
  const [slideEdits, setSlideEdits] = useState<Record<string, string>>({});

  // Container refs for html2canvas export
  const stripRef = useRef<HTMLDivElement>(null);

  // Active post preset
  const currentPost = POSTS.find(p => p.day === selectedDay) || POSTS[0];

  // Sync format when selected day changes
  useEffect(() => {
    setFormat(currentPost.fmt);
    setCustomHeadline('');
    setCustomTheme('');
    setActiveSlide(0);
  }, [selectedDay, currentPost.fmt]);

  // Adjust activeSlide if total slides change
  const totalSlides = format === 'single' ? 1 : slideCount;
  useEffect(() => {
    if (activeSlide >= totalSlides) {
      setActiveSlide(0);
    }
  }, [totalSlides, activeSlide]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setBgDataUrl(ev.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to construct bottom-right corner element
  const renderCornerElement = (idx: number, total: number) => {
    let mode = cornerStyle;
    if (mode === 'auto') {
      mode = format === 'carousel' ? 'swipe' : 'url';
    }
    if (format === 'carousel' && idx === total - 1 && (mode === 'swipe' || mode === 'dots')) {
      mode = 'url';
    }

    switch (mode) {
      case 'swipe':
        return (
          <span className="inline-flex items-center gap-1.5 font-sans font-semibold text-[#04231A] bg-[#10B981] px-2.5 py-1 rounded-full text-[8px] tracking-widest uppercase select-none">
            Swipe 
            <svg width="10" height="8" viewBox="0 0 11 9" fill="none" className="inline-block">
              <path d="M6.4 1L10 4.5L6.4 8M10 4.5H0" stroke="#04231A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        );
      case 'dots':
        return (
          <span className="flex items-center justify-end gap-1 select-none">
            {Array.from({ length: total }).map((_, i) => (
              <i 
                key={i} 
                className={`h-1 rounded-full transition-all ${
                  i === idx ? 'w-3.5 bg-[#10B981]' : 'w-1 bg-neutral-600'
                }`}
              />
            ))}
          </span>
        );
      case 'url':
        return <span className="text-[9px] font-semibold text-neutral-400 tracking-wider">insurvoice.ai</span>;
      case 'key':
        return currentPost.key ? <span className="text-[8.5px] font-semibold text-[#10B981]">Comment &ldquo;{currentPost.key}&rdquo;</span> : null;
      case 'tag':
        return <span className="text-[8.5px] font-medium text-neutral-400 tracking-wider">Every call answered</span>;
      case 'custom':
        if (!cornerCustomText.trim()) return null;
        if (cornerPill) {
          return (
            <span className="inline-flex items-center font-sans font-semibold text-[#04231A] bg-[#10B981] px-2.5 py-1 rounded-full text-[8.5px] select-none">
              {cornerCustomText.trim()}
            </span>
          );
        }
        return <span className="text-[8.5px] font-semibold text-[#10B981] max-w-[150px] leading-tight block">{cornerCustomText.trim()}</span>;
      default:
        return null;
    }
  };

  // Helper for single slide HTML content export via modern-screenshot (domToPng)
  const captureSlide = async (index: number) => {
    if (!stripRef.current) return;
    const artboards = stripRef.current.querySelectorAll<HTMLElement>('.artboard-container');
    const targetBoard = artboards[index];
    if (!targetBoard) return;

    // Temporarily hide safezone guides before capture
    const guideEl = targetBoard.querySelector<HTMLElement>('.guides-layer');
    const wasGuideVisible = guideEl?.classList.contains('block');
    if (guideEl) guideEl.classList.remove('block');
    if (guideEl) guideEl.classList.add('hidden');

    try {
      const dataUrl = await domToPng(targetBoard, {
        scale: 1080 / 324, // High-res 1080x1350 output
        backgroundColor: '#0B0F0E',
        style: {
          outline: 'none',
        }
      });

      const a = document.createElement('a');
      const formattedDay = String(currentPost.day).padStart(2, '0');
      a.download = `insurvoice-day${formattedDay}-slide${index + 1}.png`;
      a.href = dataUrl;
      a.click();
    } finally {
      if (wasGuideVisible && guideEl) {
        guideEl.classList.remove('hidden');
        guideEl.classList.add('block');
      }
    }
  };

  const handleDownloadSingle = async () => {
    setIsExporting(true);
    setStatusMessage('Генерация PNG (1080 × 1350)...');
    try {
      await captureSlide(activeSlide);
      setStatusMessage(`Слайд ${activeSlide + 1} успешно сохранен (1080 × 1350 px).`);
    } catch (err) {
      console.error(err);
      setStatusMessage('Ошибка экспорта изображения.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsExporting(true);
    const count = totalSlides;
    try {
      for (let i = 0; i < count; i++) {
        setStatusMessage(`Рендеринг слайда ${i + 1} из ${count}...`);
        await captureSlide(i);
        await new Promise(res => setTimeout(res, 350));
      }
      setStatusMessage(`Все ${count} слайдов успешно сохранены (1080 × 1350 px).`);
    } catch (err) {
      console.error(err);
      setStatusMessage('Ошибка экспорта изображения.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start w-full">
      {/* Left / Top: Interactive Canvas Stage */}
      <div className="flex-1 min-w-0 w-full">
        <div className="rounded-2xl border border-zinc-800 bg-[#161B1A] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Instagram 4:5 Artboard Canvas (1080 &times; 1350)
              </h2>
            </div>
            <div className="text-[11px] font-medium text-zinc-400">
              Нажмите на текст слайда для редактирования по месту
            </div>
          </div>

          {/* Horizontal Slide Strip */}
          <div 
            ref={stripRef}
            className="flex gap-5 overflow-x-auto pb-4 pt-2 scrollbar-thin scrollbar-thumb-zinc-700"
          >
            {Array.from({ length: totalSlides }).map((_, idx) => {
              const isActive = idx === activeSlide;
              const isCover = idx === 0;
              const isLastCta = idx === totalSlides - 1 && totalSlides > 1;

              // Extract text values
              const themeText = customTheme.trim() || currentPost.theme;
              const headText = customHeadline.trim() || currentPost.head;
              
              const slideEditKey = `${currentPost.day}:${idx}`;
              const defaultInnerLine = currentPost.inner[(idx - 1) % currentPost.inner.length] || '';
              const innerText = slideEdits[slideEditKey] !== undefined ? slideEdits[slideEditKey] : defaultInnerLine;

              return (
                <div key={idx} className="flex-shrink-0 flex flex-col items-center">
                  <div 
                    onClick={() => setActiveSlide(idx)}
                    className="artboard artboard-container relative w-[324px] h-[405px] overflow-hidden rounded-sm cursor-pointer select-none"
                    style={{
                      backgroundColor: '#0B0F0E',
                      outline: isActive ? '2px solid #10B981' : 'none',
                      outlineOffset: '3px'
                    }}
                  >
                    {/* Background gradient/image layer */}
                    <div 
                      className="bg absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: isCover && bgDataUrl 
                          ? `url(${bgDataUrl})` 
                          : `radial-gradient(120% 80% at 50% 108%, rgba(16,185,129,0.30) 0%, rgba(16,185,129,0) 58%), linear-gradient(180deg, #0B0F0E 0%, #12201B 100%)`
                      }}
                    />

                    {/* Cover Scrim Overlay */}
                    {isCover && (
                      <div 
                        className="scrim absolute inset-0" 
                        style={{
                          background: 'linear-gradient(180deg, rgba(11,15,14,0.88) 0%, rgba(11,15,14,0.42) 44%, rgba(11,15,14,0.22) 72%)'
                        }}
                      />
                    )}

                    {/* Content Layer */}
                    <div className="content content-layer absolute inset-0 flex flex-col justify-between z-10" style={{ padding: '33px 30px' }}>
                      <div>
                        {isCover ? (
                          <>
                            {/* Eyebrow / Theme */}
                            {!hideTheme && (
                              <div className="eyebrow eyebrow-text flex items-center gap-2 mb-3.5 text-[8.5px] font-semibold tracking-[0.16em] uppercase" style={{ color: '#10B981' }}>
                                <span className="w-[17px] h-[2px] inline-block" style={{ backgroundColor: '#10B981' }} />
                                <span 
                                  contentEditable 
                                  suppressContentEditableWarning
                                  className="outline-none rounded px-0.5"
                                >
                                  {themeText}
                                </span>
                              </div>
                            )}

                            {/* Main Headline */}
                            <div 
                              contentEditable
                              suppressContentEditableWarning
                              className="headline headline-text text-[31px] leading-[1.05] font-extrabold tracking-[-0.024em] outline-none rounded p-0.5"
                              style={{ color: '#ffffff' }}
                            >
                              {headText}
                            </div>
                          </>
                        ) : isLastCta ? (
                          <>
                            <div className="inner-num inner-num-text text-[8.5px] font-bold tracking-[0.18em] mb-3.5" style={{ color: '#10B981' }}>
                              {String(idx + 1).padStart(2, '0')}
                            </div>
                            <div 
                              contentEditable
                              suppressContentEditableWarning
                              className="cta-body cta-body-text text-[23px] leading-[1.18] font-bold tracking-[-0.016em] outline-none rounded p-0.5"
                              style={{ color: '#ffffff' }}
                            >
                              {currentPost.cta}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="inner-num inner-num-text text-[8.5px] font-bold tracking-[0.18em] mb-3.5" style={{ color: '#10B981' }}>
                              {String(idx + 1).padStart(2, '0')}
                            </div>
                            <div 
                              contentEditable
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                setSlideEdits(prev => ({
                                  ...prev,
                                  [slideEditKey]: e.currentTarget.innerText
                                }));
                              }}
                              className="inner-body inner-body-text text-[25px] leading-[1.16] font-bold tracking-[-0.018em] outline-none rounded p-0.5"
                              style={{ color: '#ffffff' }}
                            >
                              {innerText}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Footer bar */}
                      <div className="foot foot-bar mt-auto flex items-end justify-between gap-3 pt-4">
                        {/* Logo */}
                        {!hideLogo ? (
                          <div className="logo logo-box flex items-center gap-1.5">
                            <svg width="15" height="19" viewBox="0 0 21 26" fill="none">
                              <rect x="0" y="9" width="3.4" height="8" rx="1.7" fill="#10B981"/>
                              <rect x="5.5" y="4.5" width="3.4" height="17" rx="1.7" fill="#10B981"/>
                              <rect x="11" y="0" width="3.4" height="26" rx="1.7" fill="#10B981"/>
                              <rect x="16.5" y="6.5" width="3.4" height="13" rx="1.7" fill="#10B981"/>
                            </svg>
                            <span className="text-[11.5px] font-bold tracking-tight" style={{ color: '#ffffff' }}>
                              insurvoice<span style={{ color: '#10B981' }}>.ai</span>
                            </span>
                          </div>
                        ) : <div />}

                        {/* Bottom-right element */}
                        <div className="corner">
                          {renderCornerElement(idx, totalSlides)}
                        </div>
                      </div>
                    </div>

                    {/* Instagram Safe Zone Overlay */}
                    <div className={`guides-layer absolute inset-0 pointer-events-none ${showSafeZones ? 'block' : 'hidden'}`}>
                      {/* Top & Bottom Header Safe Zones */}
                      <div className="absolute top-0 left-0 right-0 h-9" style={{ borderBottom: '1px dashed rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.1)' }} />
                      <div className="absolute bottom-0 left-0 right-0 h-9" style={{ borderTop: '1px dashed rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.1)' }} />
                      <div className="absolute inset-[33px_30px]" style={{ border: '1px dashed rgba(16,185,129,0.4)' }} />
                    </div>
                  </div>

                  {/* Caption under slide */}
                  <span className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {isCover ? 'Обложка' : `Слайд ${idx + 1}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right / Side Panel: Controls */}
      <div className="w-full xl:w-[380px] flex-shrink-0 space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-[#121615] p-6 shadow-xl space-y-5 text-zinc-200">
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              <span>Instagram 4:5 Post Builder</span>
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed mt-1">
              Выберите пресет или введите свой текст. Элементы визуально подстраиваются под стандарты ленты Instagram (1080&nbsp;&times;&nbsp;1350).
            </p>
          </div>

          {/* Post Selection */}
          <div className="space-y-4 pt-2 border-t border-zinc-800">
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-1.5">
                Готовый Пресет Поста (30 дней)
              </label>
              <select 
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-700 bg-[#0A0D0C] px-3 py-2.5 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {POSTS.map(p => (
                  <option key={p.day} value={p.day}>
                    День {String(p.day).padStart(2, '0')} — {p.theme}
                  </option>
                ))}
              </select>
            </div>

            {/* Format toggle */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-1.5">
                Формат Публикации
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('single')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                    format === 'single' 
                      ? 'bg-emerald-500 border-emerald-500 text-zinc-950 shadow' 
                      : 'bg-[#0A0D0C] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Одиночный пост
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('carousel')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                    format === 'carousel' 
                      ? 'bg-emerald-500 border-emerald-500 text-zinc-950 shadow' 
                      : 'bg-[#0A0D0C] border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Карусель (Multi-slide)
                </button>
              </div>
            </div>

            {/* Slide Count selector */}
            {format === 'carousel' && (
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-1.5">
                  Количество Слайдов
                </label>
                <select 
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-700 bg-[#0A0D0C] px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value={3}>3 слайда</option>
                  <option value={4}>4 слайда</option>
                  <option value={5}>5 слайдов</option>
                  <option value={6}>6 слайдов</option>
                  <option value={7}>7 слайдов</option>
                </select>
              </div>
            )}

            {/* Custom Headline & Theme overrides */}
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-1.5">
                Свой Заголовок (Headline)
              </label>
              <input 
                type="text" 
                placeholder="Оставьте пустым для пресета"
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-[#0A0D0C] px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-1.5">
                Тема / Рубрика (Theme)
              </label>
              <input 
                type="text" 
                placeholder="Например: Агентства 2.0"
                value={customTheme}
                onChange={(e) => setCustomTheme(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-[#0A0D0C] px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="no-theme-check"
                  checked={hideTheme}
                  onChange={(e) => setHideTheme(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="no-theme-check" className="text-xs text-zinc-400 cursor-pointer">
                  Скрыть плашку темы
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="no-logo-check"
                  checked={hideLogo}
                  onChange={(e) => setHideLogo(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="no-logo-check" className="text-xs text-zinc-400 cursor-pointer">
                  Скрыть логотип insurvoice.ai внизу
                </label>
              </div>
            </div>
          </div>

          {/* Bottom Right Corner Options */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-1.5">
                Правый Нижний Элемент
              </label>
              <select 
                value={cornerStyle}
                onChange={(e) => setCornerStyle(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-[#0A0D0C] px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
              >
                <option value="auto">Авто — Swipe плашка на карусели, URL на одиночных</option>
                <option value="swipe">Плюшка Swipe</option>
                <option value="dots">Точки слайдов</option>
                <option value="url">Сайт — insurvoice.ai</option>
                <option value="key">Ключевое слово для комментариев</option>
                <option value="tag">Слоган — Every call answered</option>
                <option value="custom">Свой текст</option>
                <option value="none">Ничего</option>
              </select>
            </div>

            {cornerStyle === 'custom' && (
              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Например: Забронировать демо"
                  value={cornerCustomText}
                  onChange={(e) => setCornerCustomText(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-[#0A0D0C] px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="corner-pill-check"
                    checked={cornerPill}
                    onChange={(e) => setCornerPill(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="corner-pill-check" className="text-xs text-zinc-400 cursor-pointer">
                    Оформить как закрашенную плашку
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Media & Safe Zones */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <div>
              <label className="block text-[10px] font-bold tracking-widest text-zinc-400 uppercase mb-1.5">
                Фоновое Изображение Обложки
              </label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-zinc-950 hover:file:bg-emerald-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input 
                type="checkbox"
                id="safezones-check"
                checked={showSafeZones}
                onChange={(e) => setShowSafeZones(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="safezones-check" className="text-xs text-zinc-400 cursor-pointer">
                Показать безопасные зоны (Instagram Safe Zones)
              </label>
            </div>
          </div>

          {/* Export Actions */}
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <label className="block text-[10px] font-bold tracking-widest text-zinc-400 uppercase">
              Экспорт PNG (1080 &times; 1350 px)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleDownloadSingle}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-3 text-xs font-bold text-zinc-950 hover:bg-emerald-400 transition-all disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                <span>Слайд {activeSlide + 1}</span>
              </button>

              <button
                type="button"
                disabled={isExporting || totalSlides === 1}
                onClick={handleDownloadAll}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-40"
              >
                <Download className="h-4 w-4" />
                <span>Все слайды</span>
              </button>
            </div>

            {statusMessage && (
              <p className="text-[11px] font-semibold text-emerald-400 animate-in fade-in pt-1">
                {statusMessage}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
