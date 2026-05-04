import { describe, expect, it } from "bun:test";

import { getSearchParamIgnoreCase, parseUrl, safeDecode } from "../reports-url.lib";

describe("reports-url.lib", () => {
  it("preserves encoded nested RL query when parsing a full tracking URL", () => {
    const ourlRaw =
      "https://tracking.feedmob.com/api/v1/vta?RL=https%3A%2F%2Fapp.chime.com%2Fidentity%3FexternalId%3D69cc5124c35b992f3bbb75cf%26vendor%3Dincode%26vendorToken%3Dtoken123%26userId%3D52938761%26callback%3Dhttps%253A%252F%252Fapp.chime.com%252Fenroll%252Fverify-scan-id%253Fad%253Dch_pf%2526externalId%253D69cc5124c35b992f3bbb75cf&DL=https%3A%2F%2Fapp.chime.com%2Fenroll%2Fsuccess";

    const ourl = parseUrl(ourlRaw);
    expect(ourl).not.toBeNull();

    const rl = safeDecode(getSearchParamIgnoreCase(ourl!, "rl"));
    const dl = safeDecode(getSearchParamIgnoreCase(ourl!, "dl"));

    expect(rl).toBe(
      "https://app.chime.com/identity?externalId=69cc5124c35b992f3bbb75cf&vendor=incode&vendorToken=token123&userId=52938761&callback=https://app.chime.com/enroll/verify-scan-id?ad=ch_pf&externalId=69cc5124c35b992f3bbb75cf",
    );
    expect(dl).toBe("https://app.chime.com/enroll/success");
  });
});
