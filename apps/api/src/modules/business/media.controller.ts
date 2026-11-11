import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessService } from './business.service';

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private businessService: BusinessService) {}

  @Get(':id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @ApiOperation({ summary: 'Load a stored restaurant or dish photo' })
  async open(@Param('id') id: string) {
    const photo = await this.businessService.readPhoto(id);
    return new StreamableFile(photo.data, { type: photo.mimeType, disposition: 'inline' });
  }
}
