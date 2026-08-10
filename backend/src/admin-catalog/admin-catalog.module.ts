import { Module } from '@nestjs/common';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminUploadsController } from './admin-uploads.controller';

@Module({
  controllers: [AdminCatalogController, AdminUploadsController],
  providers: [AdminCatalogService],
})
export class AdminCatalogModule {}
