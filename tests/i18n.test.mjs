import test from "node:test";
import assert from "node:assert/strict";
import { en, translate } from "../src/i18n.ts";

test("both UI dictionaries resolve every English key and interpolation", () => {
  const vars = {
    count: 5,
    value: "hello",
    width: 500,
    height: 480,
    name: "photo.png",
  };
  for (const language of ["en", "zh-CN"])
    for (const key of Object.keys(en)) {
      const value = translate(language)(key, vars);
      assert.ok(value.length, `${language}/${key}`);
      assert.doesNotMatch(value, /undefined|\{\w+\}/, `${language}/${key}`);
    }
  assert.equal(
    translate("zh-CN")("submitted", { value: "hello" }),
    "已提交：hello",
  );
});
