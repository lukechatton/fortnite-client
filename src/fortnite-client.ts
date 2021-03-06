import { CookieJar, RequestAPI, RequestResponse, RequiredUriUrl } from 'request';
import * as request from 'request-promise-native';
import { GroupType } from './enums/group-type.enum';
import { LeaderboardType } from './enums/leaderboard-type.enum';
import { Platform } from './enums/platform.enum';
import { TimeWindow } from './enums/time-window.enum';
import { IFortniteClientCredentials } from './interfaces/fortnite-client-credentials.interface';
import { IFortniteClientOptions } from './interfaces/fortnite-client-options.interface';
import { Leaderboard } from './models/leaderboard/leaderboard';
import { AccessToken } from './models/login/access-token';
import { OAuthExchange } from './models/login/oauth-exchange';
import { Lookup } from './models/lookup/lookup';
import { Welcome } from './models/news/welcome';
import { IPlayerStats, PlayerStats } from './models/stats/player-stats';
import { Status } from './models/status/status';
import { Store } from './models/store/store';
import { FortniteURLHelper } from './utils/fortnite-url-helper';

/**
 * Fortnite client
 */
export class FortniteClient {
  private apiRequest: RequestAPI<request.RequestPromise, request.RequestPromiseOptions, RequiredUriUrl>;
  private credentials: IFortniteClientCredentials;
  private launcherAccessToken: AccessToken;
  private clientAccessToken: AccessToken;

  /**
   * Creates a new fortnite client instance.
   * @param credentials The account's credentials which shall be used for the REST requests.
   * @param options Library specific options (such as a response timeout until it throws an exception).
   */
  constructor(credentials: IFortniteClientCredentials, options?: IFortniteClientOptions) {
    const defaultOptions: IFortniteClientOptions = {
      timeoutMs: 5 * 1000,
      proxy: null
    };
    const fullOptions: IFortniteClientOptions = { ...defaultOptions, ...options };

    this.apiRequest = request.defaults({
      method: 'GET',
      timeout: fullOptions.timeoutMs,
      proxy: fullOptions.proxy,
      rejectUnauthorized: false,
      json: true,
      resolveWithFullResponse: true
    });
    this.credentials = credentials;
  }

  public static async CHECK_STATUS(): Promise<Status> {
    const statusResponse: RequestResponse = <RequestResponse>await request.get({
      url: FortniteURLHelper.serviceStatus,
      timeout: 5 * 1000,
      json: true,
      resolveWithFullResponse: true
    });
    const statusResponseBody: {}[] = <{}[]>statusResponse.body;

    return Status.FROM_JSON(statusResponseBody[0]);
  }

  public static async GET_GAME_NEWS(countryCode: string = 'US'): Promise<Welcome> {
    const jar: CookieJar = request.jar();
    jar.setCookie('epicCountry', countryCode);
    const statusResponse: RequestResponse = <RequestResponse>await request.get({
      url: FortniteURLHelper.gameNews,
      timeout: 5 * 1000,
      json: true,
      resolveWithFullResponse: true,
      jar
    });

    return Welcome.FROM_JSON(<{}>statusResponse.body);
  }

  public async login(): Promise<void> {
    this.launcherAccessToken = await this.requestAccessToken();
    /* istanbul ignore next */
    setTimeout(
      async () => this.onTokenExpired(this.launcherAccessToken, this.credentials.clientLauncherToken),
      this.launcherAccessToken.expiresIn * 1000 - 15 * 1000
    );

    const oAuthExchange: OAuthExchange = await this.requestOAuthExchange(this.launcherAccessToken);
    const clientAccessToken: AccessToken = await this.requestOAuthToken(oAuthExchange.code);
    this.updateClientAccessToken(clientAccessToken);
    /* istanbul ignore next */
    setTimeout(
      async () => this.onTokenExpired(this.clientAccessToken, this.credentials.clientToken),
      this.clientAccessToken.expiresIn * 1000 - 15 * 1000
    );
    await this.killOtherSessions();
  }

  public async getBattleRoyaleStatsById(
    userId: string,
    timeWindow: TimeWindow = TimeWindow.Alltime
  ): Promise<PlayerStats> {
    const playerStats: RequestResponse = <RequestResponse>await this.apiRequest({
      url: FortniteURLHelper.GET_PLAYER_PROFILE_REQUEST_URL(userId, timeWindow)
    });
    const playerStatsBody: {}[] = <{}[]>playerStats.body;
    const preparedObject: IPlayerStats = {
      stats: playerStatsBody
    };

    return PlayerStats.FROM_JSON(preparedObject);
  }

  public async getLeaderboards(
    leaderboardType: LeaderboardType,
    platform: Platform,
    groupType: GroupType,
    timeWindow: TimeWindow = TimeWindow.Alltime,
    limit: number = 50
  ): Promise<Leaderboard> {
    const params: {} = { ownertype: 1, itemsPerPage: limit };
    const leaderboardsResponse: RequestResponse = <RequestResponse>await this.apiRequest({
      url: FortniteURLHelper.GET_LEADERBOARDS_URL(leaderboardType, platform, groupType, timeWindow),
      method: 'POST',
      qs: params
    });

    return Leaderboard.FROM_JSON(<{}>leaderboardsResponse.body);
  }

  public async getStore(locale: string = 'en-US'): Promise<Store> {
    const storeResponse: RequestResponse = <RequestResponse>await this.apiRequest({
      url: FortniteURLHelper.store,
      headers: {
        'X-EpicGames-Language': locale
      }
    });

    return Store.FROM_JSON(<{}>storeResponse.body);
  }

  /**
   * Checks if a player with the given name exists. If it exists, it will return the playerId
   * @param username Full text playername (e. g. 'NinjasHyper')
   */
  public async lookup(username: string): Promise<Lookup> {
    const targetUrl: string = FortniteURLHelper.lookup;
    const params: {} = { q: username };
    const lookupResponse: RequestResponse = <RequestResponse>await this.apiRequest({
      url: targetUrl,
      qs: params
    });

    return Lookup.FROM_JSON(<{}>lookupResponse.body);
  }

  /**
   * Updates the default auth header for client requests and sets the property
   * @param token The new client access token
   */
  private updateClientAccessToken(token: AccessToken): void {
    this.clientAccessToken = token;
    this.apiRequest = this.apiRequest.defaults({
      headers: {
        Authorization: `bearer ${token.accessToken}`
      }
    });
  }

  /* istanbul ignore next */
  private async onTokenExpired(token: AccessToken, secretKey: string): Promise<void> {
    const refreshedToken: AccessToken = await this.refreshToken(token, secretKey);
    switch (secretKey) {
      case this.credentials.clientToken:
        this.updateClientAccessToken(refreshedToken);
        break;

      case this.credentials.clientLauncherToken:
        this.launcherAccessToken = refreshedToken;
        break;

      default:
        throw new Error('Expired token could not be identified by comparing the secret key');
    }

    setTimeout(async () => this.onTokenExpired(refreshedToken, secretKey), refreshedToken.expiresIn * 1000 - 15 * 1000);
  }

  /**
   * Required to send right after successful login, when logging in frequently
   */
  private async killOtherSessions(): Promise<void> {
    await this.apiRequest({
      url: FortniteURLHelper.killOtherSessions,
      form: { killType: 'OTHERS_ACCOUNT_CLIENT_SERVICE' },
      method: 'DELETE'
    });
  }

  /* istanbul ignore next */
  private async refreshToken(token: AccessToken, secretKey: string): Promise<AccessToken> {
    const tokenRequestConfig: IRequestRefreshTokenConfig = {
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
      includePerms: true
    };
    const refreshTokenResponse: RequestResponse = <RequestResponse>await this.apiRequest({
      url: FortniteURLHelper.oAuthToken,
      headers: {
        Authorization: `basic ${secretKey}`
      },
      form: tokenRequestConfig,
      method: 'POST'
    });

    return AccessToken.FROM_JSON(<{}>refreshTokenResponse.body);
  }

  private async requestOAuthToken(authCode: string): Promise<AccessToken> {
    const requestTokenConfig: IRequestOAuthTokenConfig = {
      grant_type: 'exchange_code',
      exchange_code: authCode,
      includePerms: true,
      token_type: 'eg1'
    };
    const oAuthTokenResponse: RequestResponse = <RequestResponse>await this.apiRequest({
      url: FortniteURLHelper.oAuthToken,
      headers: {
        Authorization: `basic ${this.credentials.clientToken}`
      },
      form: requestTokenConfig,
      method: 'POST'
    });

    return AccessToken.FROM_JSON(<{}>oAuthTokenResponse.body);
  }

  private async requestOAuthExchange(accessToken: AccessToken): Promise<OAuthExchange> {
    const oAuthExchangeResponse: RequestResponse = <RequestResponse>await this.apiRequest(
      FortniteURLHelper.oAuthExchange,
      {
        headers: {
          Authorization: `bearer ${accessToken.accessToken}`
        }
      }
    );

    return OAuthExchange.FROM_JSON(<{}>oAuthExchangeResponse.body);
  }

  /**
   * Request Login Token after (logging in with password)
   */
  private async requestAccessToken(): Promise<AccessToken> {
    const requestTokenConfig: IRequestAccessTokenConfig = {
      grant_type: 'password',
      username: this.credentials.email,
      password: this.credentials.password,
      includePerms: true
    };
    const accessTokenResponse: RequestResponse = <RequestResponse>await this.apiRequest(FortniteURLHelper.oAuthToken, {
      form: requestTokenConfig,
      headers: {
        Authorization: `basic ${this.credentials.clientLauncherToken}`
      },
      method: 'POST'
    });

    return AccessToken.FROM_JSON(<{}>accessTokenResponse.body);
  }
}

interface IRequestAccessTokenConfig {
  grant_type: 'password' | 'exchange_code';
  username: string;
  password: string;
  includePerms: boolean;
}

interface IRequestOAuthTokenConfig {
  grant_type: 'password' | 'exchange_code';
  exchange_code: string;
  includePerms: boolean;
  token_type: 'eg1';
}

interface IRequestRefreshTokenConfig {
  grant_type: 'refresh_token';
  refresh_token: string;
  includePerms: boolean;
}
