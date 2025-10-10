import { getProtocol, isBuildSupported } from "@/protocol";

describe("Build 95248 Protocol Compatibility", () => {
  it("should be listed as a supported build version", () => {
    expect(isBuildSupported(95248)).toBe(true);
  });

  it("should map to protocol 80949", () => {
    const protocol = getProtocol(95248);
    expect(protocol.version).toBe(80949);
  });

  it("should have all required decoder methods", () => {
    const protocol = getProtocol(95248);

    // Verify all required protocol methods exist
    expect(typeof protocol.decodeReplayHeader).toBe("function");
    expect(typeof protocol.decodeReplayDetails).toBe("function");
    expect(typeof protocol.decodeReplayInitdata).toBe("function");
    expect(typeof protocol.decodeReplayGameEvents).toBe("function");
    expect(typeof protocol.decodeReplayMessageEvents).toBe("function");
    expect(typeof protocol.decodeReplayTrackerEvents).toBe("function");
    expect(typeof protocol.decodeReplayAttributesEvents).toBe("function");
  });

  it("should be the latest supported build version", () => {
    const protocol = getProtocol(95248);
    expect(protocol).toBeDefined();

    // 95248 is currently the latest build version
    const { getLatestBuildVersion } = require("@/protocol");
    expect(getLatestBuildVersion()).toBe(95248);
  });
});
