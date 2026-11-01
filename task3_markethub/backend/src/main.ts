import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

NestFactory.create(AppModule, { cors: true }).then((app) => app.listen(process.env.PORT || 4000));
