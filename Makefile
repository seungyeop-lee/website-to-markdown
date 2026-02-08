NAME := wtm

.PHONY: install start test build clean real-test-crawl real-test-basic

install:
	bun install

start:
	bun run start

test:
	bun run test

build:
	bun run build
	bun run build:types

clean:
	rm -rf node_modules dist

real-test-crawl:
	bun start crawl --output-dir ./test-docs/spring --link-depth 1 --concurrency 5 --url https://docs.spring.io/spring-boot/index.html

real-test-basic:
	bun start convert --debug https://docs.spring.io/spring-boot/index.html
