// SC2 Replay Parser
// Based on Blizzard's s2protocol implementation

import { MpqArchive } from './mpq-archive';
import { createLogger } from './logger';
import { VersionedProtocol } from './protocol';
import type { ReplayData, ReplayDetails, ReplayInitData, ReplayOptions, GameEvent, MessageEvent, TrackerEvent, ReplayHeader } from './types';

const logger = createLogger('sc2-replay');

export class SC2Replay {
  private mpqArchive: MpqArchive;
  private header: ReplayHeader | null = null;
  private decoder: VersionedProtocol;
  private details: ReplayDetails | null = null;
  private initData: ReplayInitData | null = null;
  private gameEvents: GameEvent[] = [];
  private messageEvents: MessageEvent[] = [];
  private trackerEvents: TrackerEvent[] = [];
  private static listFiles: string[] = [
    '(attributes)',
    '(listfile)',
    'replay.attributes.events',
    'replay.details',
    'replay.game.events',
    'replay.initData',
    'replay.load.info',
    'replay.message.events',
    'replay.server.battlelobby',
    'replay.sync.events',
    'replay.tracker.events`;',
  ];

  constructor(mpqArchive: MpqArchive) {
    this.mpqArchive = mpqArchive;
    this.decoder = new VersionedProtocol();
  }

  static async fromFile(filepath: string, options?: ReplayOptions): Promise<SC2Replay> {
    const mpqArchive = await MpqArchive.open(filepath, { listFile: this.listFiles.join('\n') });
    const replay = new SC2Replay(mpqArchive);
    await replay.parse(options);
    return replay;
  }

  static fromBuffer(buffer: Buffer, options?: ReplayOptions): SC2Replay {
    const mpqArchive = MpqArchive.fromBuffer(buffer, { listFile: this.listFiles.join('\n') });
    const replay = new SC2Replay(mpqArchive);
    replay.parse(options);
    return replay;
  }

  private parse(options?: ReplayOptions): void {
    // Parse header from MPQ archive header
    this.parseHeader();
    this.decoder = new VersionedProtocol(this.header?.version?.build);

    // Parse details
    this.parseDetails();

    // Parse init data
    this.parseInitData();

    // Parse events if requested
    if (options?.decodeGameEvents !== false) {
      this.parseGameEvents();
    }

    if (options?.decodeMessageEvents !== false) {
      this.parseMessageEvents();
    }

    if (options?.decodeTrackerEvents !== false) {
      this.parseTrackerEvents();
    }
  }

  private parseHeader(): void {
    const mpqHeader = this.mpqArchive.archiveHeader;
    if (!mpqHeader) {
      throw new Error('No MPQ header found');
    }

    // Get user data content from the MPQ archive
    const userDataContent = this.mpqArchive.getUserDataContent();
    if (!userDataContent) {
      logger.warn('No user data content found, using default values');
      throw new Error('No user data content');
    }

    const header = this.decoder.decodeReplayHeader(userDataContent);

    logger.debug('Decoded header info:', { signature: header.signature, version: header.version, length: header.length });

    // Create SC2 replay header using all information from headerInfo
    this.header = header;
  }

  private parseDetails(): void {
    try {
      const detailsFile = this.mpqArchive.getFile('replay.details');
      const details = this.decoder.decodeReplayDetails(detailsFile.data);

      // Use the decoded details directly
      this.details = details;
    } catch (error) {
      logger.warn(`Could not parse replay details: ${error}`);
      this.details = this.getDefaultDetails();
    }
  }


  private parseInitData(): void {
    try {
      const initDataFile = this.mpqArchive.getFile('replay.initData');
      const initData = this.decoder.decodeReplayInitdata(initDataFile.data);

      this.initData = initData;
    } catch (error) {
      logger.warn(`Could not parse init data: ${error}`);
      this.initData = this.getDefaultInitData();
    }
  }

  private parseGameEvents(): void {
    try {
      const gameEventsFile = this.mpqArchive.getFile('replay.game.events');

      // Use decoder to parse game events
      this.gameEvents = this.decoder.decodeReplayGameEvents(gameEventsFile.data);
    } catch (error) {
      logger.warn(`Could not parse game events: ${error}`);
      this.gameEvents = [];
    }
  }

  private parseMessageEvents(): void {
    try {
      const messageEventsFile = this.mpqArchive.getFile('replay.message.events');

      this.messageEvents = this.decoder.decodeReplayMessageEvents(messageEventsFile.data);
    } catch (error) {
      logger.warn(`Could not parse message events: ${error}`);
      this.messageEvents = [];
    }
  }

  private parseTrackerEvents(): void {
    try {
      const trackerEventsFile = this.mpqArchive.getFile('replay.tracker.events');

      this.trackerEvents = this.decoder.decodeReplayTrackerEvents(trackerEventsFile.data);
    } catch (error) {
      logger.warn(`Could not parse tracker events: ${error}`);
      this.trackerEvents = [];
    }
  }


  private getDefaultDetails(): ReplayDetails {
    return {
      playerList: this.getDefaultPlayers(),
      title: 'Unknown Replay',
      difficulty: 'Unknown',
      thumbnail: { file: '' },
      isBlizzardMap: false,
      timeUTC: Date.now(),
      timeLocalOffset: 0,
      description: '',
      imageFilePath: '',
      campaignIndex: 0,
      mapFileName: '',
      cacheHandles: [],
      miniSave: false,
      gameSpeed: 1,
      defaultDifficulty: 0,
      type: 0,
      realTimeLength: 0,
      mapSizeX: 0,
      mapSizeY: 0,
    };
  }

  private getDefaultPlayers(): any[] {
    return [
      {
        name: 'Player 1',
        type: 1,
        race: 'Unknown',
        difficulty: 0,
        aiBuild: 0,
        handicap: 100,
        observe: 0,
        result: 0,
        workingSetSlotId: 0,
        color: { a: 255, r: 255, g: 0, b: 0 },
        control: 1,
        teamId: 0,
        userId: 0,
      },
      {
        name: 'Player 2',
        type: 1,
        race: 'Unknown',
        difficulty: 0,
        aiBuild: 0,
        handicap: 100,
        observe: 0,
        result: 0,
        workingSetSlotId: 1,
        color: { a: 255, r: 0, g: 0, b: 255 },
        control: 1,
        teamId: 1,
        userId: 1,
      },
    ];
  }

  private getDefaultInitData(): ReplayInitData {
    return {
      syncLobbyState: {
        userInitialData: [],
        gameDescription: {
          gameOptions: { lockTeams: false, teamsTogether: false, advancedSharedControl: false, randomRaces: false, battleNet: false, amm: false, competitive: false, practice: false, cooperative: false, noVictoryOrDefeat: false, heroDuplicatesAllowed: false, fog: 0, observers: 0, userDifficulty: 0, clientDebugFlags: 0n, buildCoachEnabled: false },
          gameSpeed: 1,
          gameType: 0,
          maxUsers: 2,
          maxObservers: 0,
          maxPlayers: 2,
          maxTeams: 0,
          maxColors: 0,
          maxRaces: 0,
          maxControls: 0,
          mapSizeX: 0,
          mapSizeY: 0,
          mapFileSyncChecksum: 0,
          mapFileName: '',
          mapAuthorName: '',
          modFileSyncChecksum: 0,
          slotDescriptions: [],
          defaultDifficulty: 0,
          defaultAIBuild: 0,
          cacheHandles: [],
          hasExtensionMod: false,
          hasNonBlizzardExtensionMod: false,
          isBlizzardMap: false,
          isPremadeFFA: false,
          isCoopMode: false,
          isRealtimeMode: false,
          randomValue: 0,
          gameCacheName: '',
        },
        lobbyState: {
          phase: 0,
          maxUsers: 2,
          maxObservers: 0,
          slots: [],
          randomSeed: 0,
          hostUserId: 0,
          isSinglePlayer: false,
          pickedMapTag: 0,
          gameDuration: 0,
          defaultDifficulty: 0,
          defaultAIBuild: 0,
        },
      },
    };
  }

  // Public API
  get replayHeader(): ReplayHeader | null {
    return this.header;
  }

  get replayDetails(): ReplayDetails | null {
    return this.details;
  }

  get replayInitData(): ReplayInitData | null {
    return this.initData;
  }

  get players(): any[] {
    return this.details?.playerList || [];
  }

  get events(): { game: GameEvent[], message: MessageEvent[], tracker: TrackerEvent[] } {
    return {
      game: this.gameEvents,
      message: this.messageEvents,
      tracker: this.trackerEvents,
    };
  }

  getReplayData(): ReplayData {
    if (!this.header || !this.details || !this.initData) {
      throw new Error('Replay not fully parsed');
    }

    return {
      header: this.header,
      details: this.details,
      initData: this.initData,
      gameEvents: this.gameEvents,
      messageEvents: this.messageEvents,
      trackerEvents: this.trackerEvents,
    };
  }

  // Utility methods
  getGameLength(): number {
    const lastEvent = [...this.gameEvents, ...this.trackerEvents]
      .sort((a, b) => b.loop - a.loop)[0];
    return lastEvent ? lastEvent.loop : 0;
  }

  getWinner(): any | null {
    return this.players.find(p => p.result === 1) || null;
  }

  getDuration(): number {
    // Convert game loops to seconds (approximately 16 loops per second)
    return Math.round(this.getGameLength() / 16);
  }
}
