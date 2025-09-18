// SC2 Replay Parser
// Based on Blizzard's s2protocol implementation

import { MpqArchive } from './mpq-archive';
import { VersionedDecoder } from './sc2-decoder';
import type { SC2ReplayData, SC2ReplayHeader, SC2ReplayDetails, SC2ReplayInitData, SC2ReplayOptions, SC2GameEvent, SC2MessageEvent, SC2TrackerEvent } from './types';

export class SC2Replay {
  private mpqArchive: MpqArchive;
  private header: SC2ReplayHeader | null = null;
  private details: SC2ReplayDetails | null = null;
  private initData: SC2ReplayInitData | null = null;
  private gameEvents: SC2GameEvent[] = [];
  private messageEvents: SC2MessageEvent[] = [];
  private trackerEvents: SC2TrackerEvent[] = [];
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
  }

  static async fromFile(filepath: string, options?: SC2ReplayOptions): Promise<SC2Replay> {
    const mpqArchive = await MpqArchive.open(filepath, { listFile: this.listFiles.join('\n') });
    const replay = new SC2Replay(mpqArchive);
    await replay.parse(options);
    return replay;
  }

  static fromBuffer(buffer: Buffer, options?: SC2ReplayOptions): SC2Replay {
    const mpqArchive = MpqArchive.fromBuffer(buffer, { listFile: this.listFiles.join('\n') });
    const replay = new SC2Replay(mpqArchive);
    replay.parseSync(options);
    return replay;
  }

  private async parse(options?: SC2ReplayOptions): Promise<void> {
    this.parseSync(options);
  }

  private parseSync(options?: SC2ReplayOptions): void {
    try {
      // Parse header from MPQ archive header
      this.parseHeader();

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
    } catch (error) {
      console.warn('SC2 replay parsing warning:', error);
    }
  }

  private parseHeader(): void {
    const mpqHeader = this.mpqArchive.archiveHeader;
    if (!mpqHeader) {
      throw new Error('No MPQ header found');
    }

    // SC2 replay header is embedded in MPQ format
    // For now, create a basic header from MPQ data
    this.header = {
      signature: 'SC2Replay',
      version: {
        major: 2,
        minor: 0,
        revision: 0,
        build: this.detectBuildVersion(),
      },
      length: mpqHeader.archiveSize,
      crc32: 0, // Would need to calculate from actual data
    };
  }

  private detectBuildVersion(): number {
    // Try to detect build version from file structure or content
    // This is a simplified approach - real implementation would analyze specific files
    return 88500; // Default to a recent build
  }

  private parseDetails(): void {
    try {
      const detailsFile = this.mpqArchive.getFile('replay.details');
      const decoder = new VersionedDecoder(detailsFile.data);

      // Basic structure for replay.details - simplified
      this.details = {
        playerList: this.parsePlayerList(decoder),
        title: 'Unknown',
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
        type: 0,
        realTimeLength: 0,
        mapSizeX: 0,
        mapSizeY: 0,
      };
    } catch (error) {
      console.warn('Could not parse replay details:', error);
      this.details = this.getDefaultDetails();
    }
  }

  private parsePlayerList(decoder: VersionedDecoder): any[] {
    try {
      // Simplified player parsing
      const playerCount = Math.min(decoder.decodeValue({ type: 'int', size: 8 }) || 2, 16);
      const players = [];

      for (let i = 0; i < playerCount; i++) {
        players.push({
          name: `Player ${i + 1}`,
          type: 1,
          race: 'Unknown',
          difficulty: 0,
          aiBuild: 0,
          handicap: 100,
          observe: 0,
          result: 0,
          workingSetSlotId: i,
          color: { a: 255, r: 255, g: 255, b: 255 },
          control: 1,
          teamId: i % 2,
          userId: i,
        });
      }

      return players;
    } catch {
      return this.getDefaultPlayers();
    }
  }

  private parseInitData(): void {
    try {
      const initDataFile = this.mpqArchive.getFile('replay.initData');
      new VersionedDecoder(initDataFile.data);

      this.initData = {
        gameDescription: {
          cacheHandles: [],
          gameOptions: {},
          gameSpeed: 1,
          gameCacheName: '',
          mapAuthorName: '',
        },
        lobbyState: {
          slots: [],
        },
        syncLobbyState: {
          userInitialData: [],
        },
      };
    } catch (error) {
      console.warn('Could not parse init data:', error);
      this.initData = this.getDefaultInitData();
    }
  }

  private parseGameEvents(): void {
    try {
      const gameEventsFile = this.mpqArchive.getFile('replay.game.events');
      const decoder = new VersionedDecoder(gameEventsFile.data);

      // Simplified event parsing
      this.gameEvents = this.parseEvents(decoder, 'game');
    } catch (error) {
      console.warn('Could not parse game events:', error);
      this.gameEvents = [];
    }
  }

  private parseMessageEvents(): void {
    try {
      const messageEventsFile = this.mpqArchive.getFile('replay.message.events');
      const decoder = new VersionedDecoder(messageEventsFile.data);

      this.messageEvents = this.parseEvents(decoder, 'message') as SC2MessageEvent[];
    } catch (error) {
      console.warn('Could not parse message events:', error);
      this.messageEvents = [];
    }
  }

  private parseTrackerEvents(): void {
    try {
      const trackerEventsFile = this.mpqArchive.getFile('replay.tracker.events');
      const decoder = new VersionedDecoder(trackerEventsFile.data);

      this.trackerEvents = this.parseEvents(decoder, 'tracker') as SC2TrackerEvent[];
    } catch (error) {
      console.warn('Could not parse tracker events:', error);
      this.trackerEvents = [];
    }
  }

  private parseEvents(decoder: VersionedDecoder, eventType: string): any[] {
    const events = [];
    let currentLoop = 0;

    try {
      while (decoder.remainingBytes > 0) {
        // Basic event structure
        const deltaLoop = decoder.decodeValue({ type: 'int', size: 8 });
        currentLoop += deltaLoop;

        const userId = eventType !== 'tracker' ?
          decoder.decodeValue({ type: 'int', size: 8 }) : undefined;

        const eventId = decoder.decodeValue({ type: 'int', size: 8 });

        // Skip event data for now - would need protocol-specific parsing
        const eventData = this.parseEventData(decoder, eventId);

        const event: any = {
          loop: currentLoop,
          eventType: `${eventType}_event_${eventId}`,
          eventData,
        };

        if (userId !== undefined) {
          event.userId = userId;
        }

        events.push(event);

        if (events.length > 10000) {
          break; // Prevent infinite loops
        }
      }
    } catch (error) {
      console.warn('Event parsing stopped due to error:', error);
    }

    return events;
  }

  private parseEventData(_decoder: VersionedDecoder, eventId: number): any {
    try {
      // Very basic event data parsing - real implementation would be protocol-specific
      return { eventId, raw: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private getDefaultDetails(): SC2ReplayDetails {
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

  private getDefaultInitData(): SC2ReplayInitData {
    return {
      gameDescription: {
        cacheHandles: [],
        gameOptions: {},
        gameSpeed: 1,
        gameCacheName: '',
        mapAuthorName: '',
      },
      lobbyState: {
        slots: [],
      },
      syncLobbyState: {
        userInitialData: [],
      },
    };
  }

  // Public API
  get replayHeader(): SC2ReplayHeader | null {
    return this.header;
  }

  get replayDetails(): SC2ReplayDetails | null {
    return this.details;
  }

  get replayInitData(): SC2ReplayInitData | null {
    return this.initData;
  }

  get players(): any[] {
    return this.details?.playerList || [];
  }

  get events(): { game: SC2GameEvent[], message: SC2MessageEvent[], tracker: SC2TrackerEvent[] } {
    return {
      game: this.gameEvents,
      message: this.messageEvents,
      tracker: this.trackerEvents,
    };
  }

  getReplayData(): SC2ReplayData {
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
