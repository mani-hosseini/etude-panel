import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AssistantChatDto, AssistantMessageDto } from './dto/assistant.dto';
import { localMusicReply } from './music-fallback';

const SYSTEM_PROMPT = `تو دستیار موسیقی آموزشگاه تخصصی پیانو اتود هستی.
فقط درباره موسیقی، پیانو، تمرین، تئوری، سلفژ، ریتم، تکنیک، رپرتوار، شنیدن فعال، و مسیر یادگیری هنرجو جواب بده.
فارسی روان، کامل و دوستانه بنویس. جواب را نصفه نگذار. از مارک‌داون و ستاره (**) استفاده نکن. اگر نیاز به اصطلاح تخصصی است همان را بگو و ساده توضیح بده.
اگر سؤال خارج از موسیقی بود (برنامه، سیاست، پزشکی، کدنویسی، تکلیف مدرسه غیرموسیقی، شایعه، و هر موضوع دیگر) مؤدبانه رد کن و بگو فقط درباره موسیقی و پیانو کمک می‌کنی.
قیمت شهریه، شماره تماس، زمان دقیق کلاس یا اطلاعات خصوصی هنرجو را حدس نزن. برای این‌ها بگو از پشتیبانی پنل یا پذیرش بپرسند.
اگر چیزی را نمی‌دانی، حدس نزن.`;

const REFUSAL =
  'من فقط درباره موسیقی و پیانو کمک می‌کنم. موضوع دیگری بپرس یا از پشتیبانی پنل استفاده کن.';

const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
];

const GAPGPT_MODELS = ['gapgpt-qwen-3.5'];
const GAPGPT_HOSTS = [
  'https://api.gapapi.com/v1',
  'https://api.gapgpt.app/v1',
] as const;
const PROVIDER_TIMEOUT_MS = 12_000;

type GeminiPart = { text?: string };
type GeminiContent = { role?: string; parts?: GeminiPart[] };
type GeminiResponse = {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string; code?: number };
};

type GeminiContents = Array<{
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}>;

type OpenAiChatResponse = {
  choices?: Array<{
    message?: { content?: string | Array<{ text?: string }> };
    finish_reason?: string;
  }>;
  error?: { message?: string };
};

@Injectable()
export class AssistantService implements OnModuleInit {
  private readonly logger = new Logger(AssistantService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const gapgpt = Boolean(this.config.get<string>('gapgpt.apiKey'));
    const gemini = Boolean(this.config.get<string>('gemini.apiKey'));
    this.logger.log(
      `Assistant providers: GapGPT ${gapgpt ? 'configured' : 'missing'}, Gemini ${gemini ? 'configured' : 'missing'}`,
    );
  }

  async chat(dto: AssistantChatDto) {
    const history = dto.messages
      .map((item) => ({
        role: item.role,
        content: item.content.trim(),
      }))
      .filter((item) => item.content.length > 0)
      .slice(-10);

    const last = history[history.length - 1];
    if (!last || last.role !== 'user') {
      throw new ServiceUnavailableException('پیام را بنویسید.');
    }

    const gapgpt = await this.tryGapGpt(history);
    if (gapgpt) return { reply: gapgpt };

    const geminiKey = this.config.get<string>('gemini.apiKey') ?? '';
    if (geminiKey) {
      const gemini = await this.tryGemini(geminiKey, history);
      if (gemini) return { reply: gemini };
    }

    this.logger.warn('Assistant using local music fallback');
    return { reply: localMusicReply(last.content) };
  }

  private async tryGapGpt(history: AssistantMessageDto[]) {
    const apiKey = this.config.get<string>('gapgpt.apiKey') ?? '';
    if (!apiKey) return null;

    const preferredBase =
      this.config.get<string>('gapgpt.baseUrl') || GAPGPT_HOSTS[0];
    const hosts = [
      ...new Set([preferredBase.replace(/\/$/, ''), ...GAPGPT_HOSTS]),
    ];
    const model =
      this.config.get<string>('gapgpt.model') || GAPGPT_MODELS[0];

    for (const host of hosts) {
      const text = await this.openaiChat({
        name: `GapGPT ${model} @ ${host}`,
        url: `${host}/chat/completions`,
        apiKey,
        model,
        history,
      });
      if (text) return text;
    }
    return null;
  }

  private async openaiChat(opts: {
    name: string;
    url: string;
    apiKey: string;
    model: string;
    history: AssistantMessageDto[];
  }) {
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...opts.history.map((item) => ({
        role: item.role,
        content: item.content,
      })),
    ];
    let combined = '';
    for (let turn = 0; turn < 2; turn += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
      try {
        const response = await fetch(opts.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${opts.apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: opts.model,
            temperature: 0.55,
            max_tokens: 2048,
            max_completion_tokens: 2048,
            messages,
          }),
        });
        const payload = (await response.json()) as OpenAiChatResponse;
        if (!response.ok) {
          this.logger.warn(
            `${opts.name} failed status=${response.status} msg=${this.shortError(payload.error?.message)}`,
          );
          return combined || null;
        }
        const chunk = this.openAiText(payload);
        if (chunk) combined = `${combined}${chunk}`.trim();
        const reason = payload.choices?.[0]?.finish_reason ?? '';
        if (reason === 'length' && chunk) {
          messages.push({ role: 'assistant', content: chunk });
          messages.push({
            role: 'user',
            content: 'ادامه بده و متن را کامل کن. از همان‌جا که قطع شد.',
          });
          continue;
        }
        return combined || REFUSAL;
      } catch (error) {
        this.logger.warn(
          `${opts.name} error ${error instanceof Error ? error.name : 'unknown'}`,
        );
        return combined || null;
      } finally {
        clearTimeout(timer);
      }
    }
    return combined || null;
  }

  private openAiText(payload: OpenAiChatResponse) {
    const content = payload.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) {
      return content
        .map((part) => part.text ?? '')
        .join('')
        .trim();
    }
    return '';
  }

  private async tryGemini(apiKey: string, history: AssistantMessageDto[]) {
    const preferred =
      this.config.get<string>('gemini.model') || GEMINI_MODELS[0];
    const models = [...new Set([preferred, ...GEMINI_MODELS])];
    const contents = this.toGeminiContents(history);

    for (const model of models) {
      for (const useSystem of [true, false]) {
        let generated: Awaited<ReturnType<typeof this.generateGemini>>;
        try {
          generated = await this.generateGemini(
            apiKey,
            model,
            contents,
            useSystem,
          );
        } catch (error) {
          this.logger.warn(
            `Gemini ${model} error ${error instanceof Error ? error.name : 'unknown'}`,
          );
          return null;
        }
        const { response, payload } = generated;
        if (response.ok) {
          if (payload.promptFeedback?.blockReason) return REFUSAL;
          const text = payload.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? '')
            .join('')
            .trim();
          return text || REFUSAL;
        }

        const message = payload.error?.message ?? '';
        this.logger.warn(
          `Gemini ${model} failed status=${response.status} google=${payload.error?.status || 'n/a'} msg=${this.shortError(message)}`,
        );

        if (this.isLocationBlocked(message) || response.status === 403) {
          return null;
        }
        if (response.status === 400 || response.status === 404) break;
      }
    }
    return null;
  }

  private async generateGemini(
    apiKey: string,
    model: string,
    contents: GeminiContents,
    useSystem: boolean,
  ) {
    const body: Record<string, unknown> = {
      contents: useSystem ? contents : this.withFoldedPrompt(contents),
      generationConfig: {
        temperature: 0.55,
        maxOutputTokens: 2048,
      },
    };
    if (useSystem) {
      body.system_instruction = { parts: [{ text: SYSTEM_PROMPT }] };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json()) as GeminiResponse;
      return { response, payload };
    } finally {
      clearTimeout(timer);
    }
  }

  private withFoldedPrompt(contents: GeminiContents): GeminiContents {
    const copy = contents.map((item) => ({
      role: item.role,
      parts: item.parts.map((part) => ({ text: part.text })),
    }));
    const first = copy[0];
    if (first?.role === 'user') {
      first.parts[0] = {
        text: `${SYSTEM_PROMPT}\n\n---\nسؤال هنرجو:\n${first.parts[0]?.text ?? ''}`,
      };
    }
    return copy;
  }

  private isLocationBlocked(message: string) {
    return /location is not supported/i.test(message);
  }

  private shortError(message?: string) {
    return (message ?? '').replace(/\s+/g, ' ').slice(0, 180);
  }

  private toGeminiContents(history: AssistantMessageDto[]) {
    const contents: GeminiContents = [];
    for (const item of history) {
      const role = item.role === 'assistant' ? 'model' : 'user';
      const last = contents[contents.length - 1];
      if (last && last.role === role) {
        last.parts[0] = {
          text: `${last.parts[0]?.text ?? ''}\n${item.content}`.trim(),
        };
        continue;
      }
      contents.push({ role, parts: [{ text: item.content }] });
    }
    if (contents[0]?.role === 'model') {
      contents.unshift({
        role: 'user',
        parts: [{ text: 'سلام' }],
      });
    }
    return contents;
  }
}
