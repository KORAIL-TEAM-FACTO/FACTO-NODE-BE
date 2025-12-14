import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * WebRTC Configuration Service
 *
 * @description
 * - WebRTC ICE 서버 설정 제공
 * - Google STUN 서버 사용
 * - 클라이언트에게 WebRTC 설정 반환
 */
@Injectable()
export class WebRTCConfigService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get WebRTC ICE servers configuration
   *
   * @returns RTCConfiguration for client
   */
  getIceServers(): RTCIceServer[] {
    const stunUrl =
      this.configService.get<string>('STUN_SERVER_URL') ||
      'stun:stun.l.google.com:19302';

    return [
      {
        urls: stunUrl,
      },
      // 추가 STUN 서버 (백업용)
      {
        urls: 'stun:stun1.l.google.com:19302',
      },
      {
        urls: 'stun:stun2.l.google.com:19302',
      },
    ];
  }

  /**
   * Get complete WebRTC configuration
   */
  getWebRTCConfiguration(): RTCConfiguration {
    return {
      iceServers: this.getIceServers(),
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'all', // 'all' or 'relay'
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };
  }
}

/**
 * RTCConfiguration TypeScript definitions
 */
export interface RTCIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface RTCConfiguration {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
  iceTransportPolicy?: 'all' | 'relay';
  bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
  rtcpMuxPolicy?: 'negotiate' | 'require';
}
