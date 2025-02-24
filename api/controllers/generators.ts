import {
  Get,
  Route,
  Tags,
  Query,
  Path,
  Inject,
  Security,
  OperationId,
  Post,
  Body,
} from 'tsoa';
import { prisma } from '../lib/providers/prisma';
import { Conjuration } from '@prisma/client';
import { AppError, HttpCode } from '../lib/errors/AppError';
import { parentLogger } from '../lib/logger';
import conjurers, { Generator, getGenerator } from '../data/conjurers';
import { AppEvent, track, TrackingInfo } from '../lib/tracking';
import { conjureQueue } from '../worker';
import { sanitizeJson } from '../lib/utils';
import { getClient } from '../lib/providers/openai';
import { ImageStylePreset } from './images';

const logger = parentLogger.getSubLogger();

export interface GetGeneratorsResponse {
  data: any[];
  offset?: number;
  limit?: number;
}

export interface PostGeneratorGenerate {
  campaignId: number;
  count: number;
  customArg?: string;
  prompt?: string;
  imageStylePreset?: ImageStylePreset;
  imagePrompt?: string;
  imageNegativePrompt?: string;
}

export interface PostGenerateArbitraryRequest {
  background: any;
  context: string;
  propertyName: string;
}

@Route('generators')
@Tags('Conjuration')
export class GeneratorController {
  @Get('/')
  @Security('jwt')
  @OperationId('getGenerators')
  public async getGenerators(
    @Inject() userId: number,
    @Inject() trackingInfo: TrackingInfo,
    @Query() offset = 0,
    @Query() limit = 50,
  ): Promise<GetGeneratorsResponse> {
    const data = conjurers.slice(offset, offset + limit);

    track(AppEvent.GetConjurers, userId, trackingInfo);

    return {
      data,
      offset,
      limit,
    };
  }

  @Get('/{code}')
  @Security('jwt')
  @OperationId('getGenerator')
  public getGenerator(
    @Inject() userId: number,
    @Inject() trackingInfo: TrackingInfo,
    @Path() code: string,
  ): Generator | undefined {
    track(AppEvent.GetConjurer, userId, trackingInfo);
    return getGenerator(code);
  }

  @Post('/{code}/generate/quick')
  @Security('jwt')
  @OperationId('quickConjure')
  public async postGeneratorGenerateQuick(
    @Inject() userId: number,
    @Inject() trackingInfo: TrackingInfo,
    @Path() code: string,
  ): Promise<Conjuration | null> {
    const validIdObjects = await prisma.conjuration.findMany({
      where: {
        conjurerCode: code,
        published: true,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: 0,
      take: 1000,
    });
    const validIds = validIdObjects.map((obj) => obj.id);

    let randomConjuration: Conjuration | null = null;

    let tries = 0;
    const maxTries = 20;

    while (randomConjuration === null && tries < maxTries) {
      const idx = Math.floor(Math.random() * (validIds.length + 1));

      try {
        randomConjuration = await prisma.conjuration.findUnique({
          where: {
            id: validIds[idx],
          },
        });
      } catch {
        logger.warn('Failed to get random conjuration', idx, validIds);
      } finally {
        tries++;
      }
    }

    track(AppEvent.QuickConjure, userId, trackingInfo);

    return randomConjuration;
  }

  @Post('/{code}/generate')
  @Security('jwt')
  @OperationId('generate')
  public async postGeneratorGenerate(
    @Inject() userId: number,
    @Inject() trackingInfo: TrackingInfo,
    @Path() code: string,
    @Body() request: PostGeneratorGenerate,
  ): Promise<any> {
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: request.campaignId,
      },
    });

    if (!campaign) {
      throw new AppError({
        description: 'Campaign not found.',
        httpCode: HttpCode.BAD_REQUEST,
      });
    }

    const generator = this.getGenerator(userId, trackingInfo, code);

    if (!generator) {
      throw new AppError({
        description: 'Generator not found.',
        httpCode: HttpCode.BAD_REQUEST,
      });
    }

    track(AppEvent.Conjure, userId, trackingInfo);

    const conjurationRequest = await prisma.conjurationRequest.create({
      data: {
        userId,
        campaignId: request.campaignId,
        generatorCode: code,
        count: request.count,
        args: [request.customArg || request.prompt || ''],
        imageStylePreset: request.imageStylePreset,
        imagePrompt: request.imagePrompt,
        imageNegativePrompt: request.imageNegativePrompt,
      },
    });

    await conjureQueue.add({
      count: request.count,
      campaignId: request.campaignId,
      generatorCode: code,
      arg: request.customArg || request.prompt || '',
      conjurationRequestId: conjurationRequest.id,
      userId,
      imageStylePreset: request.imageStylePreset,
      imagePrompt: request.imagePrompt,
      imageNegativePrompt: request.imageNegativePrompt,
    });

    return {
      conjurationRequestId: conjurationRequest.id,
    };
  }
  @Get('/requests/{conjurationRequestId}')
  @Security('jwt')
  @OperationId('getConjurationRequest')
  public async getConjurationRequest(
    @Inject() userId: number,
    @Inject() trackingInfo: TrackingInfo,
    @Path() conjurationRequestId: number,
  ): Promise<any> {
    track(AppEvent.GetConjurationRequests, userId, trackingInfo);

    return prisma.conjurationRequest.findUnique({
      where: {
        id: conjurationRequestId,
        userId,
      },
      include: {
        conjurations: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  @Post('/arbitrary')
  @Security('jwt')
  @OperationId('postGenerateArbitrary')
  public async postGenerateArbitrary(
    @Inject() userId: number,
    @Inject() trackingInfo: TrackingInfo,
    @Body() request: PostGenerateArbitraryRequest,
  ): Promise<any> {
    track(AppEvent.GetConjurer, userId, trackingInfo);

    const openai = getClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant who is knowledgeable in dungeons and dragons.',
        },
        {
          role: 'user',
          content: `Please generate me a random ${request.propertyName} for a ${
            request.context
          }. Use the following as general background about the ${
            request.context
          } to help guide you. ${JSON.stringify(
            request.background,
          )}. Please return the response in the following JSON format: { "propertyName": "", "propertyValue": "" }.
          Where propertyValue is a string. 
          Do not include any other text in your response.`,
        },
      ],
    });

    const gptResponse = response.choices[0]?.message?.content;
    logger.info('Received raw response from openai', gptResponse);
    const gptJson = sanitizeJson(gptResponse || '');
    logger.info('Received sanitized json', gptJson);

    return gptJson;
  }
}
