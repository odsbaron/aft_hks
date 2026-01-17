/**
 * API Service
 * Communicates with the Relayer API
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

// Types
export interface Market {
  address: string;
  topic: string;
  thresholdPercent: number;
  token: string;
  totalParticipants: number;
  totalStaked: string;
  status: number;
  createdAt: string;
  proposal?: Proposal;
}

export interface Proposal {
  outcome: number;
  attestationCount: number;
  disputeUntil: string;
  ipfsHash: string;
}

export interface MarketDetail extends Market {
  creator: string;
  proposedAt: string;
  resolvedAt: string;
  participants: Participant[];
  attestations: {
    yes: number;
    no: number;
    total: number;
  };
}

export interface Participant {
  address: string;
  stake: string;
  outcome: number;
  hasAttested: boolean;
}

export interface MarketListResponse {
  success: boolean;
  markets: Market[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface MarketResponse {
  success: boolean;
  market: MarketDetail;
  proposal?: Proposal & {
    id: string;
    proposer: string;
    isDisputed: boolean;
    createdAt: string;
  };
  attestations: {
    yes: number;
    no: number;
    total: number;
  };
}

export interface MarketStatusResponse {
  success: boolean;
  status: {
    value: number;
    name: string;
  };
  info: {
    topic: string;
    thresholdPercent: number;
    totalParticipants: number;
    totalStaked: string;
    createdAt: string;
    proposedAt: string | null;
    resolvedAt: string | null;
  };
  proposal?: Proposal;
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.RELAYER_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (request) => {
        return request;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with error
          throw new Error(
            `API Error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`
          );
        } else if (error.request) {
          // Request made but no response
          throw new Error('API Error: No response from server');
        }
        throw error;
      }
    );
  }

  /**
   * Get list of markets
   */
  async getMarkets(options: {
    status?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<MarketListResponse> {
    const { status, limit = 10, offset = 0 } = options;

    const params: Record<string, string> = {
      limit: limit.toString(),
      offset: offset.toString(),
    };

    if (status !== undefined) {
      params.status = status.toString();
    }

    const response = await this.client.get('/api/markets', { params });
    return response.data;
  }

  /**
   * Get detailed market information
   */
  async getMarket(address: string): Promise<MarketResponse> {
    const response = await this.client.get(`/api/markets/${address}`);
    return response.data;
  }

  /**
   * Get market status from blockchain (live)
   */
  async getMarketStatus(address: string): Promise<MarketStatusResponse> {
    const response = await this.client.get(`/api/markets/${address}/status`);
    return response.data;
  }

  /**
   * Get market participants
   */
  async getMarketParticipants(address: string): Promise<{
    success: boolean;
    participants: Participant[];
    total: number;
  }> {
    const response = await this.client.get(`/api/markets/${address}/participants`);
    return response.data;
  }

  /**
   * Get active proposal for a market
   */
  async getMarketProposal(address: string): Promise<{
    success: boolean;
    proposal: (Proposal & {
      id: string;
      proposer: string;
      isDisputed: boolean;
      createdAt: string;
      attestations: Array<{
        signer: string;
        signature: string;
        submittedAt: string;
      }>;
    }) | null;
  }> {
    const response = await this.client.get(`/api/markets/${address}/proposal`);
    return response.data;
  }

  /**
   * Predict market address using CREATE2
   */
  async predictMarketAddress(params: {
    topic: string;
    thresholdPercent: number;
    token: string;
    minStake: string;
    salt?: string;
  }): Promise<{ success: boolean; address: string }> {
    const response = await this.client.post('/api/markets/predict-address', params);
    return response.data;
  }

  /**
   * Submit attestation
   */
  async submitAttestation(data: {
    market: string;
    signer: string;
    outcome: number;
    signature: string;
    nonce: string;
  }): Promise<{ success: boolean; attestation?: { id: string } }> {
    const response = await this.client.post('/api/attestations', data);
    return response.data;
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Sync market from blockchain
   */
  async syncMarket(address: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.post(`/api/markets/${address}/sync`);
    return response.data;
  }
}

// Export singleton instance
export default new ApiService();
