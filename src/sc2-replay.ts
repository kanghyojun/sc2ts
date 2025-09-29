// SC2 Replay Parser
// Based on Blizzard's s2protocol implementation

import { createLogger } from "./logger";
import { MpqArchive } from "./mpq-archive";
import { VersionedProtocol } from "./protocol";
import type { ReplayDetails, ReplayInitData, ReplayOptions, GameEvent, MessageEvent, TrackerEvent, ReplayHeader, Player } from "./types";

const logger = createLogger("sc2-replay");

export class SC2Replay {
  private _mpqArchive: MpqArchive;
  private header: ReplayHeader | null = null;
  private decoder: VersionedProtocol;
  private details: ReplayDetails | null = null;
  private initData: ReplayInitData | null = null;
  private _gameEvents: GameEvent[] = [];
  private _messageEvents: MessageEvent[] = [];
  private _trackerEvents: TrackerEvent[] = [];
  private static listFiles: string[] = [
    "(attributes)",
    "(listfile)",
    "replay.attributes.events",
    "replay.details",
    "replay.game.events",
    "replay.initData",
    "replay.load.info",
    "replay.message.events",
    "replay.server.battlelobby",
    "replay.sync.events",
    "replay.tracker.events`;",
  ];

  constructor(mpqArchive: MpqArchive) {
    this._mpqArchive = mpqArchive;
    this.decoder = new VersionedProtocol();
  }

  static async fromFile(filepath: string, options?: ReplayOptions): Promise<SC2Replay> {
    const mpqArchive = await MpqArchive.open(filepath, { listFile: this.listFiles.join("\n") });
    const replay = new SC2Replay(mpqArchive);
    replay.parse(options);
    return replay;
  }

  static fromBuffer(buffer: Buffer, options?: ReplayOptions): SC2Replay {
    const mpqArchive = MpqArchive.fromBuffer(buffer, { listFile: this.listFiles.join("\n") });
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

    // Parse init data if requested
    if (options?.decodeInitData === true) {
      this.parseInitData();
    }

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
      throw new Error("No MPQ header found");
    }

    // Get user data content from the MPQ archive
    const userDataContent = this.mpqArchive.getUserDataContent();
    if (!userDataContent) {
      logger.warn("No user data content found, using default values");
      throw new Error("No user data content");
    }

    const header = this.decoder.decodeReplayHeader(userDataContent);

    logger.debug("Decoded header info:", { signature: header.signature, version: header.version, length: header.length });

    // Create SC2 replay header using all information from headerInfo
    this.header = header;
  }

  private parseDetails(): void {
    const detailsFile = this.mpqArchive.getFile("replay.details");
    const details = this.decoder.decodeReplayDetails(detailsFile.data);
    this.details = details;
  }


  private parseInitData(): void {
    const initDataFile = this.mpqArchive.getFile("replay.initData");
    const initData = this.decoder.decodeReplayInitdata(initDataFile.data);
    this.initData = initData;
  }

  private parseGameEvents(): void {
    const gameEventsFile = this.mpqArchive.getFile("replay.game.events");
    const rawGameEvents = this.decoder.decodeReplayGameEvents(gameEventsFile.data);

    // Buffer 필드를 문자열로 변환
    this._gameEvents = this.convertBufferFieldsToStringsGame(rawGameEvents);
  }

  private parseMessageEvents(): void {
    const messageEventsFile = this.mpqArchive.getFile("replay.message.events");
    this._messageEvents = this.decoder.decodeReplayMessageEvents(messageEventsFile.data);
  }

  private parseTrackerEvents(): void {
    const trackerEventsFile = this.mpqArchive.getFile("replay.tracker.events");
    const rawTrackerEvents = this.decoder.decodeReplayTrackerEvents(trackerEventsFile.data);
    // Buffer 필드를 문자열로 변환
    this._trackerEvents = this.convertBufferFieldsToStrings(rawTrackerEvents);
  }

  private convertBufferFieldsToStrings(events: TrackerEvent[]): TrackerEvent[] {
    // Buffer를 문자열로 변환해야 하는 필드들
    const stringFields = [
      "m_unitTypeName",
      "m_upgradeTypeName",
      "m_creatorAbilityName",
    ];

    return events.map(event => {
      const convertedEvent = { ...event } as Record<string, unknown>;

      for (const field of stringFields) {
        if (field in convertedEvent && Buffer.isBuffer(convertedEvent[field])) {
          convertedEvent[field] = (convertedEvent[field] as Buffer).toString("utf8");
        }
      }

      return convertedEvent as TrackerEvent;
    });
  }

  private convertBufferFieldsToStringsGame(events: GameEvent[]): GameEvent[] {
    // Buffer를 문자열로 변환해야 하는 필드들
    const stringFields = [
      "m_hotkeyProfile",
    ];

    return events.map(event => {
      const convertedEvent = { ...event } as Record<string, unknown>;

      for (const field of stringFields) {
        if (field in convertedEvent && Buffer.isBuffer(convertedEvent[field])) {
          convertedEvent[field] = (convertedEvent[field] as Buffer).toString("utf8");
        }
      }

      return convertedEvent as unknown as GameEvent;
    });
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

  get players(): Player[] {
    return this.details?.playerList ?? [];
  }

  get gameEvents(): GameEvent[] {
    return this._gameEvents;
  }

  get messageEvents(): MessageEvent[] {
    return this._messageEvents;
  }

  get trackerEvents(): TrackerEvent[] {
    return this._trackerEvents;
  }


  // Utility getters
  get gameLength(): number {
    const lastEvent = [...this._gameEvents, ...this._trackerEvents]
      .sort((a, b) => b.loop - a.loop)[0];
    return lastEvent ? lastEvent.loop : 0;
  }

  get winner(): Player | null {
    return this.players.find(p => p.result === 1) ?? null;
  }

  get duration(): number {
    // Convert game loops to seconds (approximately 16 loops per second)
    return Math.round(this.gameLength / 16);
  }

  get mpqArchive(): MpqArchive {
    return this._mpqArchive;
  }
}
