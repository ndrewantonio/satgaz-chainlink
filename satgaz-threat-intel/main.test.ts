/// <reference types="bun-types" />
import { describe, expect } from "bun:test";
import { newTestRuntime, test } from "@chainlink/cre-sdk/test";
import type { Runtime } from "@chainlink/cre-sdk";
import { onCronTrigger, initWorkflow } from "./src/main";
import type { Config } from "./src/main";

describe("onCronTrigger", () => {
  test("logs message and returns greeting", async () => {
    const config: Config = { schedule: "*/5 * * * *" };
    const runtime = newTestRuntime();
    runtime.config = config;

    const result = onCronTrigger(runtime as unknown as Runtime<Config>);

    expect(result).toBe("Hello world!");
    const logs = runtime.getLogs();
    expect(logs).toContain("Hello world! Workflow triggered.");
  });
});

describe("initWorkflow", () => {
  test("returns one handler with correct cron schedule", async () => {
    const testSchedule = "0 0 * * *";
    const config: Config = { schedule: testSchedule };

    const handlers = initWorkflow(config);

    expect(handlers).toBeArray();
    expect(handlers).toHaveLength(1);
    expect((handlers[0].trigger as any).config.schedule).toBe(testSchedule);
  });

  test("handler executes onCronTrigger and returns result", async () => {
    const config: Config = { schedule: "*/5 * * * *" };
    const runtime = newTestRuntime();
    runtime.config = config;
    const handlers = initWorkflow(config);

    const result = handlers[0].fn(
      runtime as unknown as Runtime<Config>,
      {} as any,
    );

    expect(result).toBe(onCronTrigger(runtime as unknown as Runtime<Config>));
  });
});
