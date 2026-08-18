import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AnalysisAiClient,
  AnalysisAiResult,
  AnalysisInsight,
} from 'src/analysis/domain/client/analysis-ai.client';

@Injectable()
export class OpenAiAnalysisAiClient implements AnalysisAiClient {
  private readonly logger = new Logger(OpenAiAnalysisAiClient.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.model =
      this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  async analyze(input: {
    answers: string[];
    nearestPhilosopher: string;
    philosopherComposition: string[];
  }): Promise<AnalysisAiResult> {
    const response = await this.createResponse(input);

    return this.parseResult(response.output_text);
  }

  private async createResponse(input: {
    answers: string[];
    nearestPhilosopher: string;
    philosopherComposition: string[];
  }) {
    try {
      return await this.client.responses.create(
        {
          model: this.model,
          input: this.buildPrompt(input),
          text: {
            format: this.buildTextFormat(),
          },
        },
        {
          timeout: 10_000,
          maxRetries: 0,
        },
      );
    } catch (error: unknown) {
      this.logger.error('OpenAI analysis request failed', {
        model: this.model,
        ...this.toLoggableOpenAiError(error),
      });
      throw new BadGatewayException('AI 분석 요청에 실패했습니다.');
    }
  }

  private toLoggableOpenAiError(error: unknown): {
    status?: unknown;
    code?: unknown;
    type?: unknown;
    message?: unknown;
  } {
    if (typeof error !== 'object' || error === null) {
      return { message: String(error) };
    }

    const openAiError = error as {
      status?: unknown;
      code?: unknown;
      type?: unknown;
      message?: unknown;
      error?: {
        code?: unknown;
        type?: unknown;
        message?: unknown;
      };
    };

    return {
      status: openAiError.status,
      code: openAiError.code ?? openAiError.error?.code,
      type: openAiError.type ?? openAiError.error?.type,
      message: openAiError.message ?? openAiError.error?.message,
    };
  }

  private buildPrompt(input: {
    answers: string[];
    nearestPhilosopher: string;
    philosopherComposition: string[];
  }): string {
    return `
You are Ethica's philosophical reflection editor.
You analyze a user's selected follow-up answers and turn them into accordion-ready user-facing insights.

Writing rules:
- Write in Korean using natural polite speech.
- Keep the tone close to a human-written service analysis, not an AI assistant response.
- Do not list facts mechanically. Interpret what the answer pattern says about the user's priorities, habits, and blind spots.
- overallSummaries: exactly 3 accordion items about the user's overall patterns.
- contradictions: exactly 2 accordion items about tensions, contradictions, or ambivalent values.
- Do not invent contradictions that are not supported by the answers.
- Each title must be a hooky Korean phrase, usually 4 to 8 words.
- Avoid one-word or generic titles. Titles should sound like compact editorial labels, such as "verification-driven strategist" or "realist who designs agreement", but written naturally in Korean.
- Each summary should usually be 4 to 6 sentences when there is enough evidence.
- Do not pad the writing to reach a sentence count. If evidence is thin, write a shorter but sharper analysis.
- Avoid generic AI-like coaching phrases, decorative metaphors, and polished filler.
- Prefer plain, specific analysis over comforting or motivational language.
- Do not repeat the same point in different words just to make the answer longer.
- Ground each item in the user's actual answer patterns, then explain what that pattern implies.
- Prefer concrete interpretation over advice. Include advice only when it directly follows from the tension being analyzed.
- Avoid repeating the same idea across items.
- Mention the nearest philosopher naturally once if helpful.
- accuracy: integer from 0 to 100. It means how consistently the user's answers align with the nearest philosopher and composition.

Nearest philosopher: ${input.nearestPhilosopher}

Philosopher composition:
${input.philosopherComposition.map((item) => `- ${item}`).join('\n')}

User follow-up answers:
${input.answers.map((answer, index) => `${index + 1}. ${answer}`).join('\n')}
`.trim();
  }

  private buildTextFormat() {
    const insightSchema = {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'summary'],
      properties: {
        title: {
          type: 'string',
          minLength: 1,
        },
        summary: {
          type: 'string',
          minLength: 1,
        },
      },
    };

    return {
      type: 'json_schema' as const,
      name: 'analysis_contradiction_result',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['overallSummaries', 'contradictions', 'accuracy'],
        properties: {
          overallSummaries: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: insightSchema,
          },
          contradictions: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: insightSchema,
          },
          accuracy: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
        },
      },
    };
  }

  private parseResult(outputText: string): AnalysisAiResult {
    try {
      const parsed = JSON.parse(outputText) as Partial<AnalysisAiResult>;

      if (
        !Array.isArray(parsed.overallSummaries) ||
        !Array.isArray(parsed.contradictions) ||
        typeof parsed.accuracy !== 'number'
      ) {
        throw new Error('Invalid analysis result shape');
      }

      return {
        overallSummaries: this.normalizeInsights(parsed.overallSummaries),
        contradictions: this.normalizeInsights(parsed.contradictions),
        accuracy: Math.max(0, Math.min(100, Math.round(parsed.accuracy))),
      };
    } catch {
      throw new BadGatewayException('AI 분석 결과를 해석할 수 없습니다.');
    }
  }

  private normalizeInsights(insights: AnalysisInsight[]): AnalysisInsight[] {
    const normalized = insights
      .filter(
        (insight) =>
          typeof insight.title === 'string' &&
          typeof insight.summary === 'string',
      )
      .map((insight) => ({
        title: insight.title.trim(),
        summary: insight.summary.trim(),
      }))
      .filter(
        (insight) => insight.title.length > 0 && insight.summary.length > 0,
      )
      .slice(0, 5);

    if (normalized.length === 0) {
      throw new Error('Empty analysis insight list');
    }

    return normalized;
  }
}
