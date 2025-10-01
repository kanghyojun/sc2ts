#!/usr/bin/env node

/* eslint-disable no-console */

import {
  type InferValue,
  argument,
  command,
  constant,
  object,
  option,
  optional,
  or,
  withDefault,
} from "@optique/core/parser";
import { choice, integer, string } from "@optique/core/valueparser";
import { path, run } from "@optique/run";

import { getScLogger } from "../logger";
import { SC2Replay } from "../sc2-replay";
import type { Player } from "../types";
import { FileExtractor } from "./utils/extractor";
import { OutputFormatter } from "./utils/formatter";

// Create CLI logger
const logger = getScLogger("cli");

// Type for chat message data structure
interface ChatMessageData {
    m_recipient: number;
    m_string: string;
}

// Type guard for chat message data
function isChatMessageData(data: unknown): data is ChatMessageData {
  return (
    typeof data === "object" &&
        data !== null &&
        "m_string" in data &&
        typeof (data as Record<string, unknown>)["m_string"] === "string" &&
        "m_recipient" in data &&
        typeof (data as Record<string, unknown>)["m_recipient"] === "number"
  );
}

// Extract command parser
const extractCommand = command(
  "extract",
  object({
    action: constant("extract"),
    replayFile: argument(path({ mustExist: true })),
    output: withDefault(option("-o", "--output", path()), "./extracted"),
    format: withDefault(option("-f", "--format", choice(["json", "raw"])), "json"),
    files: withDefault(option("--files", string()), "all"),
    pretty: optional(option("--pretty")),
    verbose: optional(option("-v", "--verbose")),
  }),
);

// List command parser
const listCommand = command(
  "list",
  object({
    action: constant("list"),
    replayFile: argument(path({ mustExist: true })),
    details: optional(option("-d", "--details")),
    filter: optional(option("-f", "--filter", string())),
    verbose: optional(option("-v", "--verbose")),
  }),
);

// Info command parser
const infoCommand = command(
  "info",
  object({
    action: constant("info"),
    replayFile: argument(path({ mustExist: true })),
    json: optional(option("-j", "--json")),
    players: optional(option("-p", "--players")),
    events: optional(option("-e", "--events")),
    verbose: optional(option("-v", "--verbose")),
  }),
);

// Parse command parser
const parseCommand = command(
  "parse",
  object({
    action: constant("parse"),
    replayFile: argument(path({ mustExist: true })),
    output: optional(option("-o", "--output", path())),
    json: optional(option("-j", "--json")),
    pretty: optional(option("--pretty")),
    limit: optional(option("-l", "--limit", integer())),
    verbose: optional(option("-v", "--verbose")),
  }),
);

// Events command parser
const eventsCommand = command(
  "events",
  object({
    action: constant("events"),
    replayFile: argument(path({ mustExist: true })),
    output: optional(option("-o", "--output", path())),
    json: optional(option("-j", "--json")),
    pretty: optional(option("--pretty")),
    type: withDefault(option("-t", "--type", choice(["game", "tracker", "message", "all"])), "all"),
    filter: optional(option("-f", "--filter", string())),
    limit: optional(option("-l", "--limit", integer())),
    gameplayOnly: optional(option("-g", "--gameplay-only")),
    verbose: optional(option("-v", "--verbose")),
  }),
);

// Main CLI parser
const cli = or(extractCommand, listCommand, infoCommand, parseCommand, eventsCommand);

type Config = InferValue<typeof cli>;

// Execute the command
async function executeCommand(config: Config) {
  // Parse and Events commands don't need FileExtractor, handle them separately
  if (config.action === "parse") {
    try {
      await executeParse(config);
    } catch (error) {
      logger.error("CLI execution error", { error });
      console.error("\nCLI Error Details:");
      console.error(`Message: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(`Stack: ${error.stack}`);
      }
      process.exit(1);
    }
    return;
  }

  if (config.action === "events") {
    try {
      await executeEvents(config);
    } catch (error) {
      logger.error("CLI execution error", { error });
      console.error("\nCLI Error Details:");
      console.error(`Message: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        console.error(`Stack: ${error.stack}`);
      }
      process.exit(1);
    }
    return;
  }

  // Other commands use FileExtractor
  const extractor = new FileExtractor();

  try {
    await extractor.openReplay(config.replayFile);

    switch (config.action) {
    case "extract":
      await executeExtract(config, extractor);
      break;
    case "list":
      await executeList(config, extractor);
      break;
    case "info":
      await executeInfo(config, extractor);
      break;
    }
  } catch (error) {
    logger.error("CLI execution error", { error });
    console.error("\nCLI Error Details:");
    console.error(`Message: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    process.exit(1);
  } finally {
    extractor.close();
  }
}

async function executeExtract(config: InferValue<typeof extractCommand>, extractor: FileExtractor) {
  const formatter = new OutputFormatter({
    format: config.format as "json" | "raw",
    pretty: config.pretty ?? false,
    outputDir: config.output,
  });

  if (config.verbose) {
    logger.info("Starting extraction", {
      replayFile: config.replayFile,
      outputDir: config.output,
      format: config.format,
    });
    console.log(`Extracting files from: ${config.replayFile}`);
    console.log(`Output directory: ${config.output}`);
    console.log(`Format: ${config.format}`);
  }

  const filePatterns = config.files.split(",").map((f: string) => f.trim());
  const result = await extractor.extractFiles(filePatterns);

  if (result.errors.length > 0) {
    logger.warn("Errors occurred during extraction", { errors: result.errors });
    if (config.verbose) {
      console.log("Errors occurred during extraction:");
      result.errors.forEach((error) => console.log(`  ${error}`));
    }
  }

  const savedFiles: string[] = [];
  for (const [filename, file] of result.files) {
    try {
      const outputPath = await formatter.saveFile(filename, file);
      savedFiles.push(outputPath);
      if (config.verbose) {
        console.log(`Saved: ${outputPath}`);
      }
    } catch (error) {
      logger.error("Failed to save file", { filename, error });
      console.log(`Failed to save ${filename}: ${error}`);
    }
  }

  console.log("");
  console.log("Extraction Summary:");
  console.log(`  Files found: ${result.total}`);
  console.log(`  Files extracted: ${result.extracted}`);
  console.log(`  Files saved: ${savedFiles.length}`);
  console.log(`  Files skipped: ${result.skipped}`);
  console.log(`  Output directory: ${config.output}`);
  console.log(`  Format: ${config.format}`);

  if (savedFiles.length > 0) {
    console.log("");
    console.log("Extracted files:");
    savedFiles.forEach((file) => console.log(`  ${file}`));
  }
}

async function executeList(config: InferValue<typeof listCommand>, extractor: FileExtractor) {
  if (config.verbose) {
    logger.info("Listing files", { replayFile: config.replayFile });
    console.log(`Listing files in: ${config.replayFile}`);
  }

  const files = extractor.getAvailableFiles();
  const filteredFiles = config.filter
    ? files.filter((file) => file.toLowerCase().includes(config.filter!.toLowerCase()))
    : files;

  if (filteredFiles.length === 0) {
    console.log("No files found matching the criteria.");
    return;
  }

  console.log(`Found ${filteredFiles.length} file(s) in replay archive:`);
  console.log("");

  if (config.details) {
    for (const filename of filteredFiles) {
      try {
        const file = extractor.archive?.getFile(filename);
        if (file) {
          const fileInfo = OutputFormatter.formatFileInfo(file);
          fileInfo.split("\n").forEach((line) => console.log(line));
          console.log("");
        }
      } catch (error) {
        logger.error("Failed to get file details", { filename, error });
        process.stderr.write(`Failed to get details for ${filename}: ${error}\n`);
      }
    }
  } else {
    const fileList = OutputFormatter.formatFileList(filteredFiles);
    fileList.split("\n").forEach((line) => {
      if (line.trim()) console.log(line);
    });
  }

  if (config.verbose) {
    console.log("");
    console.log(`Total files in archive: ${files.length}`);
    if (config.filter) {
      console.log(`Files matching filter '${config.filter}': ${filteredFiles.length}`);
    }
  }
}

async function executeInfo(config: InferValue<typeof infoCommand>, extractor: FileExtractor) {
  if (config.verbose) {
    logger.info("Getting replay info", { replayFile: config.replayFile });
    console.log(`Getting info from: ${config.replayFile}`);
  }

  const replay = extractor.replayInstance;
  const info = {
    header: replay.replayHeader,
    details: replay.replayDetails,
    initData: replay.replayInitData,
    players: replay.players,
    gameLength: replay.gameLength,
    duration: replay.duration,
    winner: replay.winner,
  };

  if (config.json) {
    const jsonOutput = JSON.stringify(
      info,
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    );
    console.log(jsonOutput);
    return;
  }

  console.log("SC2 Replay Information");
  console.log("======================");
  console.log("");

  // Basic replay info
  if (info.header) {
    console.log("Header:");
    console.log(
      `  Version: ${info.header.version?.major}.${info.header.version?.minor}.${info.header.version?.revision}.${info.header.version?.build}`,
    );
    console.log(`  Length: ${info.header.length} bytes`);
    console.log("");
  }

  // Game details
  if (info.details) {
    console.log("Game Details:");
    console.log(`  Title: ${info.details.title ?? "Unknown"}`);
    console.log(`  Map: ${info.details.mapFileName ?? "Unknown"}`);
    console.log(`  Game Speed: ${info.details.gameSpeed ?? "Unknown"}`);
    console.log(`  Duration: ${formatDuration(info.duration)} (${info.duration} seconds)`);
    console.log(`  Game Length: ${info.gameLength} loops`);
    console.log(`  Players: ${info.details.playerList?.length ?? 0}`);
    console.log("");
  }

  // Winner information
  if (info.winner) {
    console.log("Winner:");
    console.log(`  Name: ${info.winner.name}`);
    console.log(`  Race: ${info.winner.race}`);
    console.log(`  Team: ${info.winner.teamId}`);
    console.log("");
  }

  // Player information
  if (config.players && info.players && info.players.length > 0) {
    console.log("Players:");
    info.players.forEach((player: Player, index: number) => {
      console.log(`  ${index + 1}. ${player.name ?? "Unknown"}`);
      console.log(`     Race: ${player.race ?? "Unknown"}`);
      console.log(`     Team: ${player.teamId ?? "Unknown"}`);
      console.log(`     Result: ${formatResult(player.result)}`);
      console.log(`     Color: RGB(${player.color?.r ?? 0}, ${player.color?.g ?? 0}, ${player.color?.b ?? 0})`);
      console.log("");
    });
  }

  // Event counts
  if (config.events) {
    console.log("Events:");
    console.log("  Game Events: Available");
    console.log("  Message Events: Available");
    console.log("  Tracker Events: Available");
    console.log("");
  }

  // Archive information
  console.log("Archive Information:");
  const archiveInfo = extractor.archive?.archiveHeader;
  if (archiveInfo) {
    console.log(`  Format Version: ${archiveInfo.formatVersion}`);
    console.log(`  Archive Size: ${archiveInfo.archiveSize} bytes`);
    console.log(`  Block Size: ${archiveInfo.blockSize}`);
    console.log(`  Hash Table Size: ${archiveInfo.hashTableSize} entries`);
    console.log(`  Block Table Size: ${archiveInfo.blockTableSize} entries`);
  }

  const fileCount = extractor.getAvailableFiles().length;
  console.log(`  Files in Archive: ${fileCount}`);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
}

function formatResult(result: number): string {
  switch (result) {
  case 1:
    return "Victory";
  case 2:
    return "Defeat";
  case 3:
    return "Tie";
  default:
    return "Unknown";
  }
}

function getLoopsPerSecond(gameSpeed: number): number {
  switch (gameSpeed) {
  case 1:
    return 8; // Slower
  case 2:
    return 11.2; // Slow
  case 3:
    return 16; // Normal
  case 4:
    return 22.4; // Fast (기존 값, 실제 측정 필요)
  case 5:
    return 32; // Faster (추정)
  default:
    return 22.4; // 기본값 (게임 속도 4)
  }
}

// Run the CLI
const config = run(cli, {
  programName: "sc2ts",
  help: "both",
  colors: true,
});

async function executeParse(config: InferValue<typeof parseCommand>) {
  if (config.verbose) {
    logger.info("Parsing replay", { replayFile: config.replayFile });
    console.log(`Parsing replay: ${config.replayFile}`);
    if (config.output) {
      console.log(`Output file: ${config.output}`);
    } else {
      console.log("Output: Console");
    }
  }

  try {
    // SC2Replay 클래스를 사용해서 리플레이 파싱
    const replay = await SC2Replay.fromFile(config.replayFile, {
      decodeGameEvents: true,
      decodeMessageEvents: true,
      decodeTrackerEvents: true,
    });

    const limit = config.limit;

    // 파싱된 데이터 수집
    const parsedData = {
      header: replay.replayHeader,
      details: replay.replayDetails,
      initData: replay.replayInitData,
      players: replay.players,
      events: {
        game: limit ? replay.gameEvents.slice(0, limit) : replay.gameEvents,
        message: replay.messageEvents,
        tracker: limit ? replay.trackerEvents.slice(0, limit) : replay.trackerEvents,
      },
      summary: {
        duration: replay.duration,
        gameLength: replay.gameLength,
        winner: replay.winner,
        totalGameEvents: replay.gameEvents.length,
        totalMessageEvents: replay.messageEvents.length,
        totalTrackerEvents: replay.trackerEvents.length,
      },
    };

    if (config.json) {
      // JSON 출력 (BigInt 처리)
      const jsonOutput = config.pretty
        ? JSON.stringify(parsedData, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2)
        : JSON.stringify(parsedData, (_, value) => (typeof value === "bigint" ? value.toString() : value));

      if (config.output) {
        // 파일로 저장
        const { writeFile, mkdir } = await import("node:fs/promises");
        const { dirname } = await import("node:path");
        await mkdir(dirname(config.output), { recursive: true });
        await writeFile(config.output, jsonOutput, "utf8");
        if (config.verbose) {
          console.log(`Parsed data saved to: ${config.output}`);
        }
      } else {
        // stdout으로 직접 출력 (valid JSON을 위해)
        console.log(jsonOutput);
      }
    } else {
      // 사람이 읽기 쉬운 형태로 출력
      console.log("=".repeat(60));
      console.log("SC2 REPLAY PARSED DATA");
      console.log("=".repeat(60));
      console.log("");

      // 기본 정보
      if (parsedData.details) {
        console.log("📋 GAME DETAILS:");
        console.log(`  Title: ${parsedData.details.title ?? "Unknown"}`);
        console.log(`  Map: ${parsedData.details.mapFileName ?? "Unknown"}`);
        console.log(`  Duration: ${parsedData.summary.duration}s (${parsedData.summary.gameLength} loops)`);
        console.log(`  Players: ${parsedData.players.length}`);
        console.log("");
      }

      // 승자 정보
      if (parsedData.summary.winner) {
        console.log("🏆 WINNER:");
        console.log(`  ${parsedData.summary.winner.name} (${parsedData.summary.winner.race})`);
        console.log("");
      }

      // 플레이어 정보
      if (parsedData.players.length > 0) {
        console.log("👥 PLAYERS:");
        parsedData.players.forEach((player, index) => {
          const result = player.result === 1 ? "🏆" : player.result === 2 ? "💀" : "🤝";
          console.log(
            `  ${index + 1}. ${result} ${player.name ?? "Unknown"} (${player.race ?? "Unknown"}) - Team ${player.teamId}`,
          );
        });
        console.log("");
      }

      // 채팅 메시지
      if (parsedData.events.message.length > 0) {
        console.log("💬 CHAT MESSAGES:");
        parsedData.events.message.forEach((msg, index) => {
          if (index < 10) {
            // 처음 10개만 표시
            const playerName =
                            msg.userId !== undefined
                              ? parsedData.players[msg.userId]?.name ?? `Player ${msg.userId}`
                              : "Unknown Player";
            const messageText =
                            typeof msg.messageData === "string"
                              ? msg.messageData
                              : isChatMessageData(msg.messageData)
                                ? msg.messageData.m_string
                                : `(${msg.messageType})`;
            console.log(`  [${Math.floor(msg.loop / 16)}s] ${playerName}: ${messageText}`);
          }
        });
        if (parsedData.events.message.length > 10) {
          console.log(`  ... and ${parsedData.events.message.length - 10} more messages`);
        }
        console.log("");
      }

      // 이벤트 요약
      console.log("📊 EVENT SUMMARY:");
      console.log(`  Game Events: ${parsedData.summary.totalGameEvents}`);
      console.log(`  Chat Messages: ${parsedData.summary.totalMessageEvents}`);
      console.log(`  Tracker Events: ${parsedData.summary.totalTrackerEvents}`);
      console.log("");

      console.log("✅ Parsing completed successfully!");
    }
  } catch (error) {
    logger.error("Failed to parse replay", { error });
    console.error("\nParse Error Details:");
    console.error(`Message: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    throw error;
  }
}

async function executeEvents(config: InferValue<typeof eventsCommand>) {
  if (config.verbose) {
    logger.info("Analyzing game events", { replayFile: config.replayFile });
    console.log(`Analyzing events from: ${config.replayFile}`);
    if (config.output) {
      console.log(`Output file: ${config.output}`);
    } else {
      console.log("Output: Console");
    }
  }

  try {
    // SC2Replay 클래스를 사용해서 리플레이 파싱
    const replay = await SC2Replay.fromFile(config.replayFile, {
      decodeGameEvents: true,
      decodeMessageEvents: true,
      decodeTrackerEvents: true,
    });

    const limit = config.limit;

    // 게임 속도에 따른 초당 게임루프 수 계산
    const gameSpeed = replay.replayDetails?.gameSpeed ?? 4;
    const loopsPerSecond = getLoopsPerSecond(gameSpeed);

    // 이벤트 타입별로 데이터 수집
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eventsData: any = {};

    if (config.type === "all" || config.type === "game") {
      let gameEvents = limit ? replay.gameEvents.slice(0, limit) : replay.gameEvents;

      // 게임플레이 전용 필터링 (맵 초기화 제외)
      if (config.gameplayOnly) {
        gameEvents = gameEvents.filter((event) => {
          return event._gameloop !== 0 && event.loop !== 0;
        });
      }

      eventsData.gameEvents = gameEvents;
    }

    if (config.type === "all" || config.type === "tracker") {
      let trackerEvents = limit ? replay.trackerEvents.slice(0, limit) : replay.trackerEvents;

      // 게임플레이 전용 필터링 (맵 초기화 제외)
      if (config.gameplayOnly) {
        trackerEvents = trackerEvents.filter((event) => {
          // gameloop 0은 맵 초기화, > 0은 실제 게임플레이
          return event._gameloop !== 0 && event.loop !== 0;
        });
      }

      // 필터링 적용 (유닛 관련 이벤트)
      if (config.filter) {
        const filterLower = config.filter.toLowerCase();
        trackerEvents = trackerEvents.filter((event) => {
          const eventStr = JSON.stringify(event).toLowerCase();
          return eventStr.includes(filterLower);
        });
      }

      eventsData.trackerEvents = trackerEvents;

      // 유닛 생성/사망 이벤트 분석
      const unitEvents = trackerEvents.filter(
        (event) =>
          event.eventType?.includes("Unit") ||
                    event._event?.includes("Unit") ||
                    event.eventType?.includes("Birth") ||
                    event.eventType?.includes("Death") ||
                    event._event?.includes("Birth") ||
                    event._event?.includes("Death"),
      );

      eventsData.unitEvents = unitEvents;
    }

    if (config.type === "all" || config.type === "message") {
      eventsData.messageEvents = limit ? replay.messageEvents.slice(0, limit) : replay.messageEvents;
    }

    // 요약 정보 추가
    eventsData.summary = {
      totalGameEvents: replay.gameEvents.length,
      totalTrackerEvents: replay.trackerEvents.length,
      totalMessageEvents: replay.messageEvents.length,
      unitEventsFound: eventsData.unitEvents?.length ?? 0,
      gameLength: replay.gameLength,
      duration: replay.duration,
    };

    if (config.json) {
      // JSON 출력 (BigInt 처리)
      const jsonOutput = config.pretty
        ? JSON.stringify(eventsData, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2)
        : JSON.stringify(eventsData, (_, value) => (typeof value === "bigint" ? value.toString() : value));

      if (config.output) {
        // 파일로 저장
        const { writeFile, mkdir } = await import("node:fs/promises");
        const { dirname } = await import("node:path");
        await mkdir(dirname(config.output), { recursive: true });
        await writeFile(config.output, jsonOutput, "utf8");
        if (config.verbose) {
          console.log(`Events data saved to: ${config.output}`);
        }
      } else {
        // stdout으로 직접 출력 (valid JSON을 위해)
        console.log(jsonOutput);
      }
    } else {
      // 사람이 읽기 쉬운 형태로 출력
      console.log("=".repeat(60));
      console.log("SC2 REPLAY EVENTS ANALYSIS");
      console.log("=".repeat(60));
      console.log("");

      console.log("📊 EVENT SUMMARY:");
      console.log(`  Total Game Events: ${eventsData.summary.totalGameEvents}`);
      console.log(`  Total Tracker Events: ${eventsData.summary.totalTrackerEvents}`);
      console.log(`  Total Message Events: ${eventsData.summary.totalMessageEvents}`);
      if (eventsData.unitEvents) {
        console.log(`  Unit-related Events: ${eventsData.summary.unitEventsFound}`);
      }
      console.log(`  Game Duration: ${eventsData.summary.duration}s (${eventsData.summary.gameLength} loops)`);
      console.log("");

      // 유닛 이벤트 샘플 표시
      if (eventsData.unitEvents && eventsData.unitEvents.length > 0) {
        console.log("🎮 UNIT EVENTS (Sample):");
        console.log(`  Game Speed: ${gameSpeed} (${loopsPerSecond} loops/sec)`);
        console.log("  Unit Events:");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventsData.unitEvents.slice(0, 10).forEach((event: any) => {
          const timeInSeconds = Math.floor(event.loop / loopsPerSecond);
          const minutes = Math.floor(timeInSeconds / 60);
          const seconds = timeInSeconds % 60;
          const timeStr = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, "0")}` : `${seconds}s`;
          console.log(`  [${timeStr}] ${event.eventType ?? event._event ?? "Unknown"}`);
          if (event.m_unitTypeName ?? event.unitTypeName) {
            console.log(`    Unit: ${event.m_unitTypeName ?? event.unitTypeName}`);
          }
          if (event.m_controlPlayerId !== undefined) {
            console.log(`    Player: ${event.m_controlPlayerId}`);
          }
        });

        if (eventsData.unitEvents.length > 10) {
          console.log(`  ... and ${eventsData.unitEvents.length - 10} more unit events`);
        }
        console.log("");
      }

      console.log("✅ Events analysis completed!");
      console.log("💡 Use --json option to get full event data");
    }
  } catch (error) {
    logger.error("Failed to analyze events", { error });
    console.error("\nEvents Analysis Error Details:");
    console.error(`Message: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    throw error;
  }
}

executeCommand(config).catch((error) => {
  logger.error("Fatal CLI error", { error });
  console.error("\nFatal CLI Error Details:");
  console.error(`Message: ${error instanceof Error ? error.message : String(error)}`);
  if (error instanceof Error && error.stack) {
    console.error(`Stack: ${error.stack}`);
  }
  process.exit(1);
});
