import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ProfileUploadsController } from './profile-uploads.controller';

@Module({
  controllers: [CatalogController, ProfileUploadsController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
