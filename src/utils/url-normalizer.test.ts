import { test, expect } from "bun:test";
import { normalizeUrl } from "./url-normalizer.ts";

test("트레일링 슬래시 제거", () => {
  expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path");
  expect(normalizeUrl("https://example.com/path")).toBe("https://example.com/path");
});

test("루트 슬래시 보존", () => {
  expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
});

test("index.html 제거", () => {
  expect(normalizeUrl("https://example.com/path/index.html")).toBe("https://example.com/path");
  expect(normalizeUrl("https://example.com/index.html")).toBe("https://example.com/");
});

test("index.htm 제거", () => {
  expect(normalizeUrl("https://example.com/path/index.htm")).toBe("https://example.com/path");
});

test("호스트 소문자화", () => {
  expect(normalizeUrl("https://EXAMPLE.COM/path")).toBe("https://example.com/path");
  expect(normalizeUrl("https://Example.Com/path")).toBe("https://example.com/path");
});

test("쿼리 파라미터 보존", () => {
  expect(normalizeUrl("https://example.com/path?foo=bar")).toBe("https://example.com/path?foo=bar");
});

test("해시 보존", () => {
  expect(normalizeUrl("https://example.com/path#section")).toBe("https://example.com/path#section");
});

test("동일 페이지 다른 형태 통합", () => {
  const url1 = normalizeUrl("https://docs.spring.io/spring-boot/index.html");
  const url2 = normalizeUrl("https://docs.spring.io/spring-boot/");
  expect(url1).toBe(url2);
});
