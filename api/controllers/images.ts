import { Body, Inject, OperationId, Post, Route, Security, Tags } from 'tsoa';
import { TrackingInfo } from '../lib/tracking';
import { generateImage } from '../services/imageGeneration';

interface PostImageRequest {
  prompt: string;
  negativePrompt?: string;
  stylePreset?: ImageStylePreset;
}

export enum ImageStylePreset {
  FANTASY_ART = 'fantasy-art',
  DIGITAL_ART = 'digital-art',
  COMIC_BOOK = 'comic-book',
}

@Route('images')
@Tags('Images')
export default class ImageController {
  @Security('jwt')
  @OperationId('generateImage')
  @Post('/')
  public async postImage(
    @Inject() userId: number,
    @Inject() trackingInfo: TrackingInfo,
    @Body() request: PostImageRequest,
  ): Promise<any> {
    return await generateImage({
      userId,
      prompt: request.prompt,
      count: 3,
      negativePrompt: request.negativePrompt,
      stylePreset: request.stylePreset,
    });
  }
}
