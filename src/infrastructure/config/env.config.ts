import { ConfigModule } from '@nestjs/config';

/**
 * Environment Configuration
 */
export const envConfig = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ['.env.local', '.env'],
});

export interface AppConfig {
  port: number;
  nodeEnv: string;
}

export const getAppConfig = (): AppConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
});
